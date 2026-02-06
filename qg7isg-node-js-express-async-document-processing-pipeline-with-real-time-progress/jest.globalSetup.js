const path = require('path');
const { spawnSync } = require('child_process');

// Same defaults as jest.setup.js (globalSetup runs first, so env may not be set yet)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/processing_db';

module.exports = async function globalSetup() {
  const repoAfter = path.join(__dirname, 'repository_after');
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: repoAfter,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DATABASE_URL },
  });
  if (result.status !== 0) {
    throw new Error(`Prisma migrate deploy failed with exit code ${result.status}`);
  }
};
