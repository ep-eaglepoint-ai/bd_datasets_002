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
           public getState() { return this.state; }`
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

function createOp(sync: any, path: string[], value: any, id: string) {
  if (hasCRDT(sync)) {
    return sync.createOperation(path, value);
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

  test("causal consistency: create before edit even if delivered out of order", () => {
    const sync = new SyncCoordinator("u1");

    const create = createOp(sync, ["doc"], { created: true }, "1");
    const edit = createOp(sync, ["doc", "title"], "My Doc", "2");

    // out of order delivery
    apply(sync, edit);
    apply(sync, create);

    expect(sync.getState()).toEqual({
      doc: {
        created: true,
        title: "My Doc",
      },
    });
  });

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

  test("long network partition simulation", () => {
    const A = new SyncCoordinator("A");
    const B = new SyncCoordinator("B");

    const opsA: any[] = [];
    const opsB: any[] = [];

    for (let i = 0; i < 10; i++) {
      opsA.push(createOp(A, ["valA"], i, `a-${i}`));
    }

    for (let i = 0; i < 5; i++) {
      opsB.push(createOp(B, ["valB"], i, `b-${i}`));
    }

    opsA.forEach(op => apply(A, op));
    opsB.forEach(op => apply(B, op));

    // reconnect
    [...opsA, ...opsB].forEach(op => {
      apply(A, op);
      apply(B, op);
    });

    expect(A.getState()).toEqual(B.getState());
  });

  test("strong eventual consistency under randomized delivery", () => {
    const clients = [
      new SyncCoordinator("c1"),
      new SyncCoordinator("c2"),
      new SyncCoordinator("c3"),
    ];

    const ops: any[] = [];

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

});
