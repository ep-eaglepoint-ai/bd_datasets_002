#!/usr/bin/env node
/**
 * Simple JavaScript runner for evaluation
 * This compiles and runs the TypeScript evaluation script
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('CSV Dataset Explorer - Evaluation Runner');
console.log('========================================');

try {
  // Check if we're in the right directory
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('Error: package.json not found. Please run from project root.');
    process.exit(1);
  }

  // Install dependencies if needed
  console.log('Checking dependencies...');
  try {
    require('uuid');
  } catch (error) {
    console.log('Installing missing dependencies...');
    execSync('npm install uuid @types/uuid ts-node', { stdio: 'inherit' });
  }

  // Run the TypeScript evaluation script
  console.log('Running evaluation...');
  const result = execSync('npx ts-node evaluation/evaluation.ts', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('Evaluation completed successfully!');
  process.exit(0);

} catch (error) {
  console.error('Evaluation failed:', error.message);
  process.exit(1);
}