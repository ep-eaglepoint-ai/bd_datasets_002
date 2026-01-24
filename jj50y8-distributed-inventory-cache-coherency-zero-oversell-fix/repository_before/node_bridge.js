#!/usr/bin/env node
const path = require('path');
const tsNode = require('ts-node');

const repoPath = '/app/repository_before';

tsNode.register({
  project: path.join(repoPath, 'tsconfig.json'),
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true,
    skipLibCheck: true
  }
});

const { InventoryService } = require(path.join(repoPath, 'src', 'inventory-service.ts'));

let input = '';
process.stdin.on('data', chunk => { input += chunk.toString(); });
process.stdin.on('end', async () => {
  try {
    const cmd = JSON.parse(input);
    const service = new InventoryService();
    let result;
    
    if (cmd.method === 'getStock') {
      result = await service.getStock(cmd.productId);
    } else if (cmd.method === 'decrementStock') {
      await service.decrementStock(cmd.productId, cmd.quantity);
      result = { success: true };
    } else if (cmd.method === 'incrementStock') {
      await service.incrementStock(cmd.productId, cmd.quantity);
      result = { success: true };
    } else {
      throw new Error(`Unknown method: ${cmd.method}`);
    }
    
    process.stdout.write(JSON.stringify({ success: true, result }));
  } catch (error) {
    process.stdout.write(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  }
  process.exit(0);
});
