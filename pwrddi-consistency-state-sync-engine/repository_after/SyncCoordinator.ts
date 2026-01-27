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

  /* -------- apply remote/local op -------- */

  public applyOperation(op: Operation) {
    if (this.appliedOps.has(op.id)) return;
    this.appliedOps.add(op.id);

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
    return this.resolveNode(this.root);
  }
}
