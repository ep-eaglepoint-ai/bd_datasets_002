interface Operation {
  id: string;
  userId: string;
  path: string[];
  value: any;
  timestamp: number;
}

class SyncCoordinator {
  private state: Record<string, any> = {};

  /**
   * CURRENT BUGGY IMPLEMENTATION:
   * Uses simple timestamps which are unreliable in distributed systems.
   * Does not handle concurrent operations at the same path correctly.
   */
  public applyOperation(op: Operation): void {
    const target = this.resolvePath(op.path);
    if (target) {
      target[op.path[op.path.length - 1]] = op.value;
    }
  }

  private resolvePath(path: string[]): any {
    let current = this.state;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    return current;
  }
}