/* =======================
   Vector Clock
======================= */

type VectorClock = Map<string, number>;

function incrementClock(vc: VectorClock, userId: string) {
  vc.set(userId, (vc.get(userId) ?? 0) + 1);
}

function dominates(a: VectorClock, b: VectorClock): boolean {
  let greater = false;
  for (const [k, v] of b) {
    const av = a.get(k) ?? 0;
    if (av < v) return false;
    if (av > v) greater = true;
  }
  return greater;
}

function concurrent(a: VectorClock, b: VectorClock): boolean {
  return !dominates(a, b) && !dominates(b, a);
}

function cloneClock(vc: VectorClock): VectorClock {
  return new Map(vc);
}

/* =======================
   Operation
======================= */

export interface Operation {
  id: string;
  userId: string;
  path: string[];
  value: any;
  clock: VectorClock;
}

/* =======================
   CRDT Node
======================= */

interface CRDTValue {
  value: any;
  clock: VectorClock;
  userId: string;
}

interface CRDTNode {
  values: CRDTValue[];
  children: Map<string, CRDTNode>;
}

/* =======================
   SyncCoordinator
======================= */

export class SyncCoordinator {
  private root: CRDTNode = { values: [], children: new Map() };
  private localClock: VectorClock = new Map();
  private appliedOps = new Set<string>();

  constructor(private readonly userId: string) {
    this.localClock.set(userId, 0);
  }

  /* -------- create local op -------- */

  public createOperation(path: string[], value: any): Operation {
    incrementClock(this.localClock, this.userId);
    const op = {
      id: crypto.randomUUID(),
      userId: this.userId,
      path,
      value,
      clock: cloneClock(this.localClock),
    };
    this.applyOperation(op);
    return op;
  }

  /* -------- causal buffering & memory -------- */

  private pendingOperations: Operation[] = [];
  private readonly MAX_APPLIED_OPS = 1000;
  private readonly MAX_PENDING_OPS = 1000; // Bound pending queue for Req 5

  /* -------- apply remote/local op -------- */

  public applyOperation(op: Operation) {
    if (this.appliedOps.has(op.id)) return;

    if (this.canApply(op)) {
      this.performApply(op);
      this.processPending();
    } else {
      // Req 5: Bound metadata
      if (this.pendingOperations.length >= this.MAX_PENDING_OPS) {
        // Pruning strategy: Drop oldest pending op? 
        // Or drop new one? Dropping creates gaps, but we must bound memory.
        // Dropping index 0 (oldest arrival).
        this.pendingOperations.shift();
      }
      this.pendingOperations.push(op);
    }
  }

  private canApply(op: Operation): boolean {
    const sender = op.userId;
    // We treat our own operations as always applicable if we are calling this directly
    if (op.userId === this.userId) return true;

    const senderSeq = op.clock.get(sender) ?? 0;
    const localSeq = this.localClock.get(sender) ?? 0;

    // Req 4: Handle 'late-arriving' past ops.
    // If we have already seen sequence 5 (localSeq=5), and we receive sequence 3,
    // we should apply it (idempotency/CRDT merge will handle it) rather than buffer it forever.
    // It's "applicable" in the sense that it doesn't need to Wait.
    if (senderSeq <= localSeq) return true;

    // Strict causal check for FUTURE ops
    if (senderSeq !== localSeq + 1) return false;

    // Also check other dependencies
    for (const [user, time] of op.clock) {
      if (user === sender) continue;
      const localTime = this.localClock.get(user) ?? 0;
      if (time > localTime) return false;
    }

    return true;
  }

  private performApply(op: Operation) {
    if (this.appliedOps.has(op.id)) return;
    this.appliedOps.add(op.id);
    
    // Memory pruning
    if (this.appliedOps.size > this.MAX_APPLIED_OPS) {
      const first = this.appliedOps.values().next().value;
      if (first !== undefined) {
        this.appliedOps.delete(first);
      }
    }

    // merge clocks
    for (const [k, v] of op.clock) {
      this.localClock.set(k, Math.max(this.localClock.get(k) ?? 0, v));
    }

    let node = this.root;
    for (const key of op.path) {
      if (!node.children.has(key)) {
        node.children.set(key, { values: [], children: new Map() });
      }
      node = node.children.get(key)!;
    }

    this.mergeValue(node, {
      value: op.value,
      clock: op.clock,
      userId: op.userId,
    });

    this.garbageCollect(node);
  }

  private processPending() {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < this.pendingOperations.length; i++) {
        const op = this.pendingOperations[i];
        if (this.appliedOps.has(op.id)) {
           this.pendingOperations.splice(i, 1);
           i--;
           continue;
        }
        if (this.canApply(op)) {
          this.performApply(op);
          this.pendingOperations.splice(i, 1);
          i--;
          changed = true;
        }
      }
    }
  }

  /* -------- CRDT merge -------- */

  private mergeValue(node: CRDTNode, incoming: CRDTValue) {
    const survivors: CRDTValue[] = [];

    let dominated = false;

    for (const existing of node.values) {
      if (dominates(existing.clock, incoming.clock)) {
        dominated = true;
        survivors.push(existing);
      } else if (dominates(incoming.clock, existing.clock)) {
        continue; // incoming replaces
      } else {
        survivors.push(existing); // concurrent
      }
    }

    if (!dominated) survivors.push(incoming);
    node.values = survivors;
  }

  /* -------- deterministic resolve -------- */

  private resolveNode(node: CRDTNode): any {
    let base: any = undefined;

    if (node.values.length > 0) {
      node.values.sort((a, b) =>
        a.userId.localeCompare(b.userId)
      );
      base = node.values[node.values.length - 1].value;
    }

    if (node.children.size === 0) return base;

    const result =
      typeof base === "object" && base !== null ? { ...base } : {};

    for (const [k, child] of node.children) {
      const v = this.resolveNode(child);
      if (v !== undefined) result[k] = v;
    }

    return result;
  }

  /* -------- bounded metadata -------- */

  private garbageCollect(node: CRDTNode) {
    node.values = node.values.filter(v =>
      ![...node.values].some(o =>
        o !== v && dominates(o.clock, v.clock)
      )
    );
  }

  /* -------- public state -------- */

  public getState(): any {
    return this.resolveNode(this.root) ?? {};
  }
}
