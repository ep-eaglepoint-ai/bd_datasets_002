
import * as fs from 'fs';
import * as path from 'path';
import { Operation } from '../repository_after/SyncCoordinator';

// Dynamic import based on environment variable
const targetRepo = process.env.TARGET_REPO || 'repository_after';
let SyncCoordinator: any;

try {
  // Try standard import (works for repository_after)
  const module = require(`../${targetRepo}/index`);
  SyncCoordinator = module.SyncCoordinator;
} catch (e: any) {
  // Handling repository_before which has no index and no export
  if (targetRepo === 'repository_before' && e.code === 'MODULE_NOT_FOUND') {
    const srcPath = path.resolve(__dirname, `../${targetRepo}/SyncCoordinator.ts`);
    if (fs.existsSync(srcPath)) {
        let content = fs.readFileSync(srcPath, 'utf8');
        // Inject export
        content = content.replace('class SyncCoordinator', 'export class SyncCoordinator');
        // Inject getState for testing
        content = content.replace(/class SyncCoordinator\s*{/, 'class SyncCoordinator {\n  public getState() { return this.state; }');
        
        console.log('Generating code for repository_before...');
        if (!content.includes('getState')) {
            console.error('FAILED TO INJECT getState');
            console.log('Content snippet:', content.substring(0, 200));
        }

        // Write to a partial temp file in tests dir so it compiles with same config
        const tempPath = path.join(__dirname, 'SyncCoordinator_Generated.ts');
        fs.writeFileSync(tempPath, content);
        
        const module = require('./SyncCoordinator_Generated');
        SyncCoordinator = module.SyncCoordinator;
        
        // Cleanup? Maybe after all keys, but for now strict cleanup isn't critical
    }
  } else {
      throw e;
  }
}

describe('SyncCoordinator', () => {
  let sync: any;

  beforeEach(() => {
    if (!SyncCoordinator) {
        throw new Error(`Failed to load SyncCoordinator from ${targetRepo}`);
    }
    sync = new SyncCoordinator();
  });

  test('should apply basic operation', () => {
    const op: Operation = {
      id: '1',
      userId: 'u1',
      path: ['user', 'name'],
      value: 'Alice',
      timestamp: 10,
    };
    sync.applyOperation(op);
    expect(sync.getState()).toEqual({ user: { name: 'Alice' } });
  });

  test('should handle deep nested updates without overwriting siblings', () => {
    // Op 1: set user.profile.bio
    sync.applyOperation({
      id: '1',
      userId: 'u1',
      path: ['user', 'profile', 'bio'],
      value: 'Hello',
      timestamp: 10,
    });

    // Op 2: set user.profile.avatar
    sync.applyOperation({
      id: '2',
      userId: 'u2',
      path: ['user', 'profile', 'avatar'],
      value: 'img.png',
      timestamp: 20,
    });

    expect(sync.getState()).toEqual({
      user: {
        profile: {
          bio: 'Hello',
          avatar: 'img.png',
        },
      },
    });
  });

  test('should resolve concurrent edits using LWW (Last-Write-Wins)', () => {
    // Op 1: set a=1 at t=10
    sync.applyOperation({
      id: '1',
      userId: 'u1',
      path: ['a'],
      value: 1,
      timestamp: 10,
    });

    // Op 2: set a=2 at t=20
    sync.applyOperation({
      id: '2',
      userId: 'u2',
      path: ['a'],
      value: 2,
      timestamp: 20,
    });

    // Op 3: set a=0 at t=5 (late arrival)
    sync.applyOperation({
      id: '3',
      userId: 'u3',
      path: ['a'],
      value: 0,
      timestamp: 5,
    });

    expect(sync.getState()).toEqual({ a: 2 });
  });

  test('should handle object overwrites vs granular updates correctly', () => {
    // Case 1: Parent update is NEWER -> shadows child
    sync.applyOperation({
        id: '1',
        userId: 'u1',
        path: ['a', 'b'],
        value: 1,
        timestamp: 10
    });
    // Overwrite parent 'a' with new value at t=20
    sync.applyOperation({
        id: '2',
        userId: 'u1',
        path: ['a'],
        value: { c: 2 },
        timestamp: 20
    });
    
    // Expect: { a: { c: 2 } }. 'b' is gone.
    // Note: If implementation merges {c:2} with {b:1} it would be {b:1, c:2}.
    // But t=20 > t=10, so 'a' should be reset to {c:2} (plus any children newer than 20).
    // Here 'b' is older (10), so it should be pruned/ignored.
    expect(sync.getState()).toEqual({ a: { c: 2 } });


    // Case 2: Parent update is OLDER -> child update survives/merges
    sync.applyOperation({
        id: '3',
        userId: 'u1',
        path: ['x'],
        value: { y: 1 },
        timestamp: 10
    });
    // Update child 'x.z' at t=20
    sync.applyOperation({
        id: '4',
        userId: 'u1',
        path: ['x', 'z'],
        value: 2,
        timestamp: 20
    });

    // Expect: x base is {y:1}, merged with z=2. -> { x: { y: 1, z: 2 } }
    // Expect: x base is {y:1}, merged with z=2. -> { x: { y: 1, z: 2 } }
    // The state also contains 'a' from Case 1
    expect(sync.getState().x).toEqual({ y: 1, z: 2 });
    expect(sync.getState().a).toEqual({ c: 2 });
  });

  test('should handle late-arriving operations (offline clients)', () => {
     // Current state: t=100
     sync.applyOperation({
         id: '1', 
         userId: 'u1',
         path: ['status'],
         value: 'online',
         timestamp: 100
     });

     // Late arrival from earlier offline session: t=50
     sync.applyOperation({
         id: '2',
         userId: 'u1',
         path: ['status'],
         value: 'offline',
         timestamp: 50
     });

     // Should verify t=100 wins
     expect(sync.getState()).toEqual({ status: 'online' });
  });

  // Requirement 1: causal relationships
  test('should respect causal consistency (create before edit)', () => {
      // Scenario: 
      // 1. Create 'doc' (ts=10)
      // 2. Edit 'doc.title' (ts=20)
      
      // If we receive Edit first, we might create implicit structure.
      // If we receive Create later, it shouldn't overwrite Edit if Create is strictly older.
      
      // But more subtly: if Create was re-creating after a delete?
      // Let's test the specific case described: 'edit' operation is dependend on 'create'.
      // If our system is robust, order of application shouldn't matter as long as timestamps are correct.
      
      const createOp = {
          id: '1', userId: 'u1', path: ['doc'], value: { created: true }, timestamp: 10
      };
      
      const editOp = {
          id: '2', userId: 'u1', path: ['doc', 'title'], value: 'My Doc', timestamp: 20
      };

      // Case: Apply Edit then Create (out of order delivery)
      sync.applyOperation(editOp);
      sync.applyOperation(createOp); // This is "older" (10 < 20), so it shouldn't nuke 'title'.
      
      expect(sync.getState()).toEqual({
          doc: {
              created: true,
              title: 'My Doc'
          }
      });
  });

  test('long partition simulation', () => {
      // Client A is online, updates 'a' -> 1, 2, 3 ... 10. (ts 100-200)
      // Client B is offline, updates 'b' -> 1 ... 5. (ts 100-150)
      // Client B reconnects.
      
      const syncA = new SyncCoordinator();
      const syncB = new SyncCoordinator();
      const server = new SyncCoordinator(); // Acts as convergence point
      
      const opsA = [];
      const opsB = [];
      
      // Generate ops
      for (let i=0; i<10; i++) {
          opsA.push({
              id: `a-${i}`, userId: 'A', path: ['valA'], value: i, timestamp: 100 + i*10
          });
      }
      // Top 3 ops for B
       for (let i=0; i<3; i++) {
          opsB.push({
              id: `b-${i}`, userId: 'B', path: ['valB'], value: i, timestamp: 100 + i*10
          });
      }

      // Apply locally
      opsA.forEach(op => syncA.applyOperation(op));
      opsB.forEach(op => syncB.applyOperation(op));
      
      // Network Partition: Server receives A's ops, but not B's immediately
      opsA.forEach(op => server.applyOperation(op));
      
      // Current State
      expect(server.getState()).toEqual({ valA: 9 });
      
      // B Reconnects after 10 seconds (simulated by just applying late)
      // B sends all its buffered ops
      opsB.forEach(op => server.applyOperation(op));
      
      expect(server.getState()).toEqual({ valA: 9, valB: 2 });
  });

  test('randomized concurrent simulation', () => {
      // 3 clients, 100 ops each? No, "3 clients perform 100 interleaved operations" (total or each? Assume 100 total or 100 each for robust test).
      // Let's do 100 ops total randomly assigned to clients.
      
      const clients = ['c1', 'c2', 'c3'];
      const ops: Operation[] = [];
      const numOps = 100;
      
      // Use logical time to ensure determinism in checking correctness? 
      // Or use random latencies.
      // We'll generate a canonical list of operations with strictly increasing logical time (or random within range),
      // and assert that no matter the order of application, the final state is the same.
      // Actually, Strong Eventual Consistency means State(All Ops applied in Order A) == State(All Ops applied in Order B).
      
      // Generate 100 operations targeting a few paths to ensure collision
      for (let i = 0; i < numOps; i++) {
          const client = clients[i % 3];
          ops.push({
              id: `${i}`,
              userId: client,
              path: ['shared', 'list', `${i % 5}`], // Collision on keys 0-4
              value: i, // Value is the op ID roughly
              timestamp: i + 1 // Logical timestamp
          });
      }
      
      // Client 1 applies ops in normal order
      const s1 = new SyncCoordinator();
      ops.forEach(op => s1.applyOperation(op));
      
      // Client 2 applies ops in REVERSE order
      const s2 = new SyncCoordinator();
      [...ops].reverse().forEach(op => s2.applyOperation(op));
      
      // Client 3 applies ops in RANDOM order
      const s3 = new SyncCoordinator();
      const shuffled = [...ops].sort(() => Math.random() - 0.5);
      shuffled.forEach(op => s3.applyOperation(op));
      
      // Final states usually should match the result of applying max timestamp per path
      // Logic: for path ['shared','list','0'], max timestamp is the last op with that path.
      // Since timestamps are unique (i+1), the one with highest 'i' for that slot wins.
      
      const state1 = JSON.stringify(s1.getState());
      const state2 = JSON.stringify(s2.getState());
      const state3 = JSON.stringify(s3.getState());
      
      expect(state1).toBe(state2);
      expect(state2).toBe(state3);
      
      // Ensure we didn't just get empty states
      const parsed = s1.getState();
      expect(parsed.shared.list).toBeDefined();
  });
});
