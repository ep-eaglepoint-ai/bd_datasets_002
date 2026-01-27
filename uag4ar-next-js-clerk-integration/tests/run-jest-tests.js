const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoPath = process.env.REPO_PATH || '../repository_after';
const clerkAppPath = path.resolve(process.cwd(), repoPath, 'clerk-app');

console.log('🧪 Running Jest + React Testing Library Tests...\n');

// Check if we're in the correct directory
if (!fs.existsSync(clerkAppPath)) {
  console.error('❌ Error: clerk-app directory not found at:', clerkAppPath);
  process.exit(1);
}

// Change to the clerk-app directory to run Jest tests
const originalCwd = process.cwd();
process.chdir(clerkAppPath);

try {
  console.log('📁 Running tests from:', clerkAppPath);
  console.log('📋 Available test suites:');
  console.log('   • Static Analysis Tests (run-tests.js)');
  console.log('   • Jest Component Tests');
  console.log('   • App Router Structure Tests');
  console.log('   • Middleware Tests');
  console.log('');

  // Run Jest tests with different configurations
  const testSuites = [
    {
      name: 'App Router Structure Tests',
      command: 'npx jest --testPathPattern="app-router" --verbose',
      description: 'Validates App Router file structure and configuration'
    },
    {
      name: 'Clerk Components Tests',
      command: 'npx jest --testPathPattern="clerk-components" --verbose',
      description: 'Tests individual Clerk component rendering and behavior'
    },
    {
      name: 'Integration Tests',
      command: 'npx jest --testPathPattern="integration" --verbose',
      description: 'Tests full integration and authentication state management'
    },
    {
      name: 'Middleware Tests',
      command: 'npx jest --testPathPattern="middleware" --verbose',
      description: 'Tests middleware/proxy configuration'
    }
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of testSuites) {
    console.log(`\n🔍 ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log('   Command:', suite.command);
    
    try {
      const output = execSync(suite.command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('✅ PASSED');
      
      // Extract test results from output
      const lines = output.split('\n');
      const summaryLine = lines.find(line => line.includes('Test Suites:') || line.includes('Tests:'));
      if (summaryLine) {
        console.log('   ', summaryLine.trim());
      }
      
      totalPassed++;
    } catch (error) {
      console.log('❌ FAILED');
      console.log('   Error:', error.message);
      totalFailed++;
    }
  }

  // Run coverage report
  console.log('\n📊 Generating Coverage Report...');
  try {
    const coverageOutput = execSync('npx jest --coverage --passWithNoTests', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ Coverage report generated');
  } catch (error) {
    console.log('⚠️  Coverage report failed:', error.message);
  }

  // Summary
  console.log('\n📈 Jest Test Summary:');
  console.log(`   Passed: ${totalPassed}/${testSuites.length} suites`);
  console.log(`   Failed: ${totalFailed}/${testSuites.length} suites`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 All Jest tests passed!');
  } else {
    console.log('\n⚠️  Some Jest tests failed. Check the output above for details.');
  }

} catch (error) {
  console.error('❌ Error running Jest tests:', error.message);
  process.exit(1);
} finally {
  // Restore original working directory
  process.chdir(originalCwd);
}
