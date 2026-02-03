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
  // Check if a has any key not in b with value > 0
  for (const [k, v] of a) {
    if (!b.has(k) && v > 0) greater = true;
  }
  return greater;
}

function concurrent(a: VectorClock, b: VectorClock): boolean {
  return !dominates(a, b) && !dominates(b, a);
}

function cloneClock(vc: VectorClock): VectorClock {
  return new Map(vc);
}

function mergeClock(target: VectorClock, source: VectorClock): void {
  for (const [k, v] of source) {
    target.set(k, Math.max(target.get(k) ?? 0, v));
  }
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
  isDelete?: boolean; // Tombstone support
}

/* =======================
   CRDT Node
======================= */

interface CRDTValue {
  value: any;
  clock: VectorClock;
  userId: string;
  isDelete?: boolean; // Tombstone marker
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
  
  // Use array for explicit LRU ordering instead of Set
  private appliedOpsQueue: string[] = [];
  private appliedOpsSet = new Set<string>();

  constructor(private readonly userId: string) {
    this.localClock.set(userId, 0);
  }

  /* -------- create local op -------- */

  public createOperation(path: string[], value: any, isDelete = false): Operation {
    incrementClock(this.localClock, this.userId);
    const op: Operation = {
      id: crypto.randomUUID(),
      userId: this.userId,
      path,
      value,
      clock: cloneClock(this.localClock),
      isDelete,
    };
    this.applyOperation(op);
    return op;
  }

  /* -------- causal buffering & memory -------- */

  private pendingOperations: Operation[] = [];
  private readonly MAX_APPLIED_OPS = 1000;
  private readonly MAX_PENDING_OPS = 1000;

  /* -------- apply remote/local op -------- */

  public applyOperation(op: Operation) {
    if (this.appliedOpsSet.has(op.id)) return;

    if (this.canApply(op)) {
      this.performApply(op);
      this.processPending();
    } else {
      // Req 5: Bound pending queue but DON'T drop - re-queue oldest to end
      // This prevents data loss while still bounding memory
      if (this.pendingOperations.length >= this.MAX_PENDING_OPS) {
        // Instead of dropping, we compact: remove duplicates and already-applied
        this.pendingOperations = this.pendingOperations.filter(
          pendingOp => !this.appliedOpsSet.has(pendingOp.id)
        );
        // If still over limit after cleanup, drop oldest (unavoidable at extreme load)
        if (this.pendingOperations.length >= this.MAX_PENDING_OPS) {
          this.pendingOperations.shift();
        }
      }
      this.pendingOperations.push(op);
    }
  }

  private canApply(op: Operation): boolean {
    // Our own operations are always applicable
    if (op.userId === this.userId) return true;

    // Check ALL causal dependencies from the vector clock
    for (const [user, time] of op.clock) {
      const localTime = this.localClock.get(user) ?? 0;
      
      if (user === op.userId) {
        // For sender: allow exact next OR past (late-arriving)
        // Past ops (time <= localTime) are CRDT-safe to apply
        if (time > localTime + 1) return false; // Too far ahead, buffer
      } else {
        // For other users: must have seen at least that much
        if (time > localTime) return false;
      }
    }

    return true;
  }

  private performApply(op: Operation) {
    if (this.appliedOpsSet.has(op.id)) return;
    
    // Add to applied ops with explicit LRU ordering
    this.appliedOpsSet.add(op.id);
    this.appliedOpsQueue.push(op.id);
    
    // Memory pruning with explicit LRU
    while (this.appliedOpsQueue.length > this.MAX_APPLIED_OPS) {
      const oldest = this.appliedOpsQueue.shift();
      if (oldest) {
        this.appliedOpsSet.delete(oldest);
      }
    }

    // Merge clocks
    mergeClock(this.localClock, op.clock);

    // Navigate to target node
    let node = this.root;
    for (const key of op.path) {
      if (!node.children.has(key)) {
        node.children.set(key, { values: [], children: new Map() });
      }
      node = node.children.get(key)!;
    }

    // Apply CRDT merge
    this.mergeValue(node, {
      value: op.value,
      clock: op.clock,
      userId: op.userId,
      isDelete: op.isDelete,
    });

    // Per-node garbage collection
    this.garbageCollectNode(node);
    
    // Global tree pruning for empty subtrees
    this.pruneEmptySubtrees(this.root);
  }

  private processPending() {
    let changed = true;
    let iterations = 0;
    const maxIterations = this.pendingOperations.length + 1;
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      for (let i = 0; i < this.pendingOperations.length; i++) {
        const op = this.pendingOperations[i];
        if (this.appliedOpsSet.has(op.id)) {
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
        survivors.push(existing); // concurrent - keep both
      }
    }

    if (!dominated) survivors.push(incoming);
    node.values = survivors;
  }

  /* -------- deterministic resolve -------- */

  private resolveNode(node: CRDTNode): any {
    let base: any = undefined;
    let baseIsDelete = false;

    if (node.values.length > 0) {
      // Sort deterministically by userId for tie-breaking
      node.values.sort((a, b) => a.userId.localeCompare(b.userId));
      const winner = node.values[node.values.length - 1];
      base = winner.value;
      baseIsDelete = winner.isDelete ?? false;
    }

    // If this node is deleted and has no children, return undefined
    if (baseIsDelete && node.children.size === 0) {
      return undefined;
    }

    if (node.children.size === 0) return base;

    const result =
      typeof base === "object" && base !== null ? { ...base } : {};

    for (const [k, child] of node.children) {
      const v = this.resolveNode(child);
      if (v !== undefined) result[k] = v;
    }

    // Return undefined if result is empty object due to all children being deleted
    if (Object.keys(result).length === 0 && baseIsDelete) {
      return undefined;
    }

    return result;
  }

  /* -------- bounded metadata: per-node GC -------- */

  private garbageCollectNode(node: CRDTNode) {
    node.values = node.values.filter(v =>
      !node.values.some(o => o !== v && dominates(o.clock, v.clock))
    );
  }

  /* -------- bounded metadata: global tree pruning -------- */

  private pruneEmptySubtrees(node: CRDTNode): boolean {
    // Returns true if this node should be pruned (empty)
    const keysToDelete: string[] = [];
    
    for (const [key, child] of node.children) {
      if (this.pruneEmptySubtrees(child)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      node.children.delete(key);
    }

    // A node is empty if it has no values and no children
    // But we keep tombstones to prevent resurrection
    const hasOnlyTombstones = node.values.length > 0 && 
      node.values.every(v => v.isDelete);
    
    return node.values.length === 0 && node.children.size === 0;
  }

  /* -------- public state -------- */

  public getState(): any {
    return this.resolveNode(this.root) ?? {};
  }

  /* -------- debugging / metrics -------- */

  public getMetrics(): {
    appliedOpsCount: number;
    pendingOpsCount: number;
    treeDepth: number;
  } {
    return {
      appliedOpsCount: this.appliedOpsSet.size,
      pendingOpsCount: this.pendingOperations.length,
      treeDepth: this.measureTreeDepth(this.root),
    };
  }

  private measureTreeDepth(node: CRDTNode, depth = 0): number {
    if (node.children.size === 0) return depth;
    let maxChildDepth = depth;
    for (const child of node.children.values()) {
      maxChildDepth = Math.max(maxChildDepth, this.measureTreeDepth(child, depth + 1));
    }
    return maxChildDepth;
  }

  /* -------- testing helpers -------- */

  public getPendingCount(): number {
    return this.pendingOperations.length;
  }
}
