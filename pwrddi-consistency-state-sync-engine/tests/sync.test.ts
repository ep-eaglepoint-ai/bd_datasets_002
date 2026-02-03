import * as fs from "fs";
import * as path from "path";

/* =========================================================
   Dynamic repository loader
   ========================================================= */

const TARGET_REPO = process.env.TARGET_REPO || "repository_after";

let SyncCoordinator: any;

function loadSyncCoordinator() {
  try {
    // repository_after (CRDT) path
    const mod = require(`../${TARGET_REPO}/index`);
    return mod.SyncCoordinator;
  } catch (e: any) {
    // repository_before fallback (no export, no getState)
    if (TARGET_REPO === "repository_before") {
      const srcPath = path.resolve(
        __dirname,
        `../${TARGET_REPO}/SyncCoordinator.ts`
      );

      if (!fs.existsSync(srcPath)) {
        throw new Error("SyncCoordinator.ts not found");
      }

      let content = fs.readFileSync(srcPath, "utf8");

      // inject export
      content = content.replace(
        "class SyncCoordinator",
        "export class SyncCoordinator"
      );

      // inject getState
      content = content.replace(
        /class SyncCoordinator\s*{/,
        `class SyncCoordinator {
           public getState() { return this.state; }
           public getPendingCount() { return 0; }`
      );

      const tempPath = path.join(
        __dirname,
        "SyncCoordinator_Generated.ts"
      );

      fs.writeFileSync(tempPath, content);

      const mod = require("./SyncCoordinator_Generated");
      return mod.SyncCoordinator;
    }

    throw e;
  }
}

SyncCoordinator = loadSyncCoordinator();

/* =========================================================
   Helpers
   ========================================================= */

function hasCRDT(sync: any): boolean {
  return typeof sync.createOperation === "function";
}

function createOp(sync: any, path: string[], value: any, id: string, isDelete = false) {
  if (hasCRDT(sync)) {
    return sync.createOperation(path, value, isDelete);
  }

  // legacy fallback
  return {
    id,
    userId: "legacy",
    path,
    value,
    timestamp: Date.now(),
  };
}

function apply(sync: any, op: any) {
  sync.applyOperation(op);
}

/* =========================================================
   Tests
   ========================================================= */

describe(`SyncCoordinator – ${TARGET_REPO}`, () => {

  /* ---------------------------------------------------------
     Basic Operations
     --------------------------------------------------------- */

  test("basic operation application", () => {
    const sync = new SyncCoordinator("u1");

    const op = createOp(sync, ["user", "name"], "Alice", "1");
    apply(sync, op);

    expect(sync.getState()).toEqual({
      user: { name: "Alice" },
    });
  });

  test("deep nested updates do not overwrite siblings", () => {
    const sync = new SyncCoordinator("u1");

    const bio = createOp(sync, ["user", "profile", "bio"], "Hello", "1");
    const avatar = createOp(
      sync,
      ["user", "profile", "avatar"],
      "img.png",
      "2"
    );

    apply(sync, bio);
    apply(sync, avatar);

    expect(sync.getState()).toEqual({
      user: {
        profile: {
          bio: "Hello",
          avatar: "img.png",
        },
      },
    });
  });

  /* ---------------------------------------------------------
     Requirement 1: Causal Consistency (FIXED - uses two replicas)
     --------------------------------------------------------- */

  test("causal consistency: create before edit with two replicas", () => {
    // FIX: Use TWO separate replicas to properly test out-of-order delivery
    const replicaA = new SyncCoordinator("A");
    const replicaB = new SyncCoordinator("B");

    // A creates doc first, then edits it
    const create = createOp(replicaA, ["doc"], { created: true }, "1");
    const edit = createOp(replicaA, ["doc", "title"], "My Doc", "2");

    // B receives edit FIRST (out of order)
    apply(replicaB, edit);
    
    // Verify B buffered the edit (since it depends on create)
    // Note: edit should be buffered because create hasn't arrived yet
    const stateAfterEdit = replicaB.getState();
    expect(stateAfterEdit.doc?.title).toBeUndefined(); // Still buffered
    
    // Now B receives create
    apply(replicaB, create);

    // Now both should be applied
    expect(replicaB.getState()).toEqual({
      doc: {
        created: true,
        title: "My Doc",
      },
    });
  });

  test("strict causal buffering verification (multi-replica)", () => {
    const A = new SyncCoordinator("A");
    const B = new SyncCoordinator("B");

    // A creates two operations
    const opA1 = createOp(A, ["val"], 1, "a1");
    apply(A, opA1);
    
    const opA2 = createOp(A, ["val"], 2, "a2");
    apply(A, opA2);

    // B receives opA2 FIRST (out of order)
    apply(B, opA2);
    
    // Verify B has buffered opA2
    expect(B.getState()).toEqual({});
    expect(B.getPendingCount()).toBe(1); // Explicit verification of buffering

    // B receives opA1
    apply(B, opA1);

    // Now B should apply both (unblocked)
    expect(B.getState()).toEqual({ val: 2 });
    expect(B.getPendingCount()).toBe(0); // Buffer cleared
  });

  /* ---------------------------------------------------------
     Requirement 2: Strong Eventual Consistency
     --------------------------------------------------------- */

  test("concurrent conflicting edits converge to identical state", () => {
    const A = new SyncCoordinator("A");
    const B = new SyncCoordinator("B");

    const opA = createOp(A, ["value"], "fromA", "1");
    const opB = createOp(B, ["value"], "fromB", "2");

    apply(A, opB);
    apply(B, opA);

    expect(A.getState()).toEqual(B.getState());
  });

  test("offline-first behavior with delayed synchronization", () => {
    const online = new SyncCoordinator("A");
    const offline = new SyncCoordinator("B");

    const opsOnline = [
      createOp(online, ["status"], "online", "1"),
      createOp(online, ["count"], 1, "2"),
    ];

    const opsOffline = [
      createOp(offline, ["status"], "offline", "3"),
      createOp(offline, ["note"], "hello", "4"),
    ];

    opsOnline.forEach(op => apply(online, op));
    opsOffline.forEach(op => apply(offline, op));

    // reconnect
    [...opsOnline, ...opsOffline].forEach(op => {
      apply(online, op);
      apply(offline, op);
    });

    expect(online.getState()).toEqual(offline.getState());
  });

  /* ---------------------------------------------------------
     Requirement 3: Deep-Nested Reconciliation
     --------------------------------------------------------- */

  test("deeply nested paths during partition", () => {
    const A = new SyncCoordinator("A");
    const B = new SyncCoordinator("B");
    const C = new SyncCoordinator("C");

    // A creates deep nested structure
    const op1 = createOp(A, ["level1", "level2", "level3", "level4"], "deep1", "1");
    apply(A, op1);
    
    // B creates sibling at same depth
    const op2 = createOp(B, ["level1", "level2", "level3", "other"], "deep2", "2");
    apply(B, op2);
    
    // C creates parent-level change
    const op3 = createOp(C, ["level1", "meta"], { version: 1 }, "3");
    apply(C, op3);

    // Merge all
    [op1, op2, op3].forEach(op => {
      apply(A, op);
      apply(B, op);
      apply(C, op);
    });

    const expected = {
      level1: {
        level2: {
          level3: {
            level4: "deep1",
            other: "deep2",
          },
        },
        meta: { version: 1 },
      },
    };

    expect(A.getState()).toEqual(expected);
    expect(B.getState()).toEqual(expected);
    expect(C.getState()).toEqual(expected);
  });

  /* ---------------------------------------------------------
     Requirement 5: Bounded Memory
     --------------------------------------------------------- */

  test("bounded memory footprint with LRU pruning", () => {
    const sync = new SyncCoordinator("u1");

    const MAX = 1000;
    const EXTRA = 100;

    for (let i = 0; i < MAX + EXTRA; i++) {
      const op = {
        id: `id-${i}`,
        userId: "u2",
        path: ["x"],
        value: i,
        clock: new Map([["u2", i + 1]])
      };
      apply(sync, op);
    }
    
    // Verify applied ops bound
    const metrics = sync.getMetrics();
    expect(metrics.appliedOpsCount).toBeLessThanOrEqual(MAX);

    // Verify pending ops bound with future ops
    for (let i = 0; i < MAX + EXTRA; i++) {
      const op = {
        id: `pending-${i}`,
        userId: "u3",
        path: ["y"],
        value: i,
        clock: new Map([["u3", 5000 + i]])
      };
      apply(sync, op);
    }
    
    expect(sync.getPendingCount()).toBeLessThanOrEqual(MAX);
  });

  /* ---------------------------------------------------------
     Requirement 6: Long Partition (IMPROVED - more operations)
     --------------------------------------------------------- */

  test("long partition with comprehensive operations", async () => {
    const A = new SyncCoordinator("A");
    const B = new SyncCoordinator("B");
    const C = new SyncCoordinator("C"); // Partitioned node

    // Initial sync
    const initOp = createOp(A, ["init"], true, "init");
    apply(A, initOp); apply(B, initOp); apply(C, initOp);

    const opsAB: any[] = [];
    const opsC: any[] = [];

    // Partition: A and B exchange 20 operations
    for (let i = 0; i < 10; i++) {
      const opA = createOp(A, ["shared", "fromA", String(i)], i, `a-${i}`);
      apply(A, opA); apply(B, opA);
      opsAB.push(opA);
      
      const opB = createOp(B, ["shared", "fromB", String(i)], i * 10, `b-${i}`);
      apply(A, opB); apply(B, opB);
      opsAB.push(opB);
    }

    // C generates 10 ops in isolation with nested paths
    for (let i = 0; i < 10; i++) {
      const opC = createOp(C, ["isolated", "data", String(i)], `val-${i}`, `c-${i}`);
      apply(C, opC);
      opsC.push(opC);
    }

    // Simulate partition duration
    await new Promise(resolve => setTimeout(resolve, 100));

    // Reconnect: C receives all missed ops
    opsAB.forEach(op => apply(C, op));

    // A and B receive C's ops
    opsC.forEach(op => {
      apply(A, op);
      apply(B, op);
    });

    // Convergence check
    expect(A.getState()).toEqual(B.getState());
    expect(B.getState()).toEqual(C.getState());
    
    // Verify structure
    const state = A.getState();
    expect(state.init).toBe(true);
    expect(Object.keys(state.shared.fromA).length).toBe(10);
    expect(Object.keys(state.shared.fromB).length).toBe(10);
    expect(Object.keys(state.isolated.data).length).toBe(10);
  });

  /* ---------------------------------------------------------
     Requirement 6: Async Latency (IMPROVED - diverse paths)
     --------------------------------------------------------- */

  test("async latency simulation with diverse paths", async () => {
    const clients = [
      new SyncCoordinator("c1"),
      new SyncCoordinator("c2"),
      new SyncCoordinator("c3"),
    ];

    const N = 100;
    const ops: any[] = [];

    // Generate ops with DIVERSE paths (not just one path)
    for (let i = 0; i < N; i++) {
      const c = clients[i % 3];
      const pathVariants = [
        ["shared", "slot", String(i % 5)],
        ["users", `user-${i % 10}`, "data"],
        ["metrics", String(i % 20)],
        ["deep", "nested", "level3", String(i % 3)],
      ];
      const path = pathVariants[i % pathVariants.length];
      ops.push(createOp(c, path, i, `op-${i}`));
    }

    // Distribute with random delays 10ms - 200ms (faster for testing)
    const promises: Promise<void>[] = [];

    ops.forEach(op => {
      clients.forEach(client => {
        const delay = Math.floor(Math.random() * 190) + 10;
        const p = new Promise<void>(resolve => {
          setTimeout(() => {
            apply(client, op);
            resolve();
          }, delay);
        });
        promises.push(p);
      });
    });

    await Promise.all(promises);

    // Use deep equality instead of string comparison to avoid key ordering issues
    expect(clients[0].getState()).toEqual(clients[1].getState());
    expect(clients[1].getState()).toEqual(clients[2].getState());
  }, 30000);

  test("strong eventual consistency under randomized delivery", () => {
    const clients = [
      new SyncCoordinator("c1"),
      new SyncCoordinator("c2"),
      new SyncCoordinator("c3"),
    ];

    const ops: any[] = [];

    // Use diverse paths
    for (let i = 0; i < 100; i++) {
      const c = clients[i % 3];
      ops.push(
        createOp(
          c,
          ["shared", "slot", String(i % 5)],
          i,
          String(i)
        )
      );
    }

    // ordered
    ops.forEach(op => apply(clients[0], op));

    // reversed
    [...ops].reverse().forEach(op => apply(clients[1], op));

    // random
    [...ops]
      .sort(() => Math.random() - 0.5)
      .forEach(op => apply(clients[2], op));

    const s1 = JSON.stringify(clients[0].getState());
    const s2 = JSON.stringify(clients[1].getState());
    const s3 = JSON.stringify(clients[2].getState());

    expect(s1).toBe(s2);
    expect(s2).toBe(s3);
  });

  /* ---------------------------------------------------------
     Delete Operations / Tombstones
     --------------------------------------------------------- */

  test("delete operations with tombstone support", () => {
    if (!hasCRDT(new SyncCoordinator("test"))) {
      return; // Skip for legacy
    }

    const sync = new SyncCoordinator("u1");

    // Create
    createOp(sync, ["user", "name"], "Alice", "1");
    createOp(sync, ["user", "email"], "alice@example.com", "2");

    expect(sync.getState()).toEqual({
      user: {
        name: "Alice",
        email: "alice@example.com",
      },
    });

    // Delete email
    createOp(sync, ["user", "email"], undefined, "3", true);

    const state = sync.getState();
    expect(state.user.name).toBe("Alice");
    expect(state.user.email).toBeUndefined();
  });

  /* ---------------------------------------------------------
     Buffering Verification
     --------------------------------------------------------- */

  test("explicit buffering verification during causal delivery", () => {
    const A = new SyncCoordinator("A");
    const B = new SyncCoordinator("B");

    // A creates chain: op1 -> op2 -> op3
    const op1 = createOp(A, ["chain"], 1, "1");
    apply(A, op1);
    
    const op2 = createOp(A, ["chain"], 2, "2");
    apply(A, op2);
    
    const op3 = createOp(A, ["chain"], 3, "3");
    apply(A, op3);

    // B receives in reverse order
    apply(B, op3);
    expect(B.getPendingCount()).toBe(1);
    expect(B.getState()).toEqual({});

    apply(B, op2);
    expect(B.getPendingCount()).toBe(2);
    expect(B.getState()).toEqual({});

    apply(B, op1);
    // All should be applied now
    expect(B.getPendingCount()).toBe(0);
    expect(B.getState()).toEqual({ chain: 3 });
  });

});
