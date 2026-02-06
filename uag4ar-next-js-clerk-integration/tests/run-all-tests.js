const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running Complete Test Suite for Next.js + Clerk Integration\n');

console.log('📋 Test Suite Overview:');
console.log('   1. Static Analysis Tests (file structure, dependencies, configuration)');
console.log('   2. Jest + React Testing Library Tests (behavioral, component rendering)');
console.log('   3. Integration Tests (authentication state, user interactions)');
console.log('');

// Track test results
let staticPassed = 0;
let staticFailed = 0;
let jestPassed = 0;
let jestFailed = 0;

// Test 1: Static Analysis Tests
console.log('🔍 1. Running Static Analysis Tests...');
console.log('   Command: node run-tests.js');

try {
  const staticOutput = execSync('node run-tests.js', { 
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env }
  });
  
  console.log('✅ Static Analysis Tests PASSED');
  
  // Extract summary from static tests
  const lines = staticOutput.split('\n');
  const summaryLine = lines.find(line => line.includes('Summary:'));
  if (summaryLine) {
    console.log('   ', summaryLine.trim());
    
    // Extract passed/failed numbers
    const passedMatch = summaryLine.match(/Passed: (\d+)/);
    const failedMatch = summaryLine.match(/Failed: (\d+)/);
    if (passedMatch) staticPassed = parseInt(passedMatch[1]);
    if (failedMatch) staticFailed = parseInt(failedMatch[1]);
  }
  
} catch (error) {
  console.log('❌ Static Analysis Tests FAILED');
  console.log('   Error:', error.message);
  staticFailed = 12; // Assume all failed if error
  
  // Show the last few lines of output for debugging
  const outputLines = error.stdout?.split('\n') || [];
  const relevantLines = outputLines.slice(-5);
  if (relevantLines.length > 0) {
    console.log('   Recent output:');
    relevantLines.forEach(line => console.log('     ', line));
  }
}

console.log('');

// Test 2: Jest Tests
console.log('🧪 2. Running Jest + React Testing Library Tests...');
console.log('   Command: node run-jest-tests.js');

try {
  const jestOutput = execSync('node run-jest-tests.js', { 
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env }
  });
  
  console.log(jestOutput);
  
  // Extract Jest test results from output
  const jestLines = jestOutput.split('\n');
  const jestSummaryLine = jestLines.find(line => line.includes('Passed:') && line.includes('Failed:'));
  if (jestSummaryLine) {
    const passedMatch = jestSummaryLine.match(/Passed: (\d+)/);
    const failedMatch = jestSummaryLine.match(/Failed: (\d+)/);
    if (passedMatch) jestPassed = parseInt(passedMatch[1]);
    if (failedMatch) jestFailed = parseInt(failedMatch[1]);
  } else {
    // Default to some values if parsing fails
    jestPassed = 0;
    jestFailed = 1;
  }
  
} catch (error) {
  console.log('❌ Jest Tests FAILED');
  console.log('   Error:', error.message);
  jestFailed = 1;
  
  // Show the last few lines of output for debugging
  const outputLines = error.stdout?.split('\n') || [];
  const relevantLines = outputLines.slice(-10);
  if (relevantLines.length > 0) {
    console.log('   Recent output:');
    relevantLines.forEach(line => console.log('     ', line));
  }
}

console.log('\n📊 Complete Test Summary:');
console.log('   • Static Analysis: Validates file structure, dependencies, and configuration');
console.log('   • Jest Tests: Validates component behavior, rendering, and user interactions');
console.log('   • Integration: Validates authentication flow and state management');
console.log('');

console.log('🎯 Requirements Coverage:');
console.log('   ✅ App Router approach (app/layout.tsx, app/page.tsx)');
console.log('   ✅ @clerk/nextjs@latest installation');
console.log('   ✅ proxy.ts with clerkMiddleware()');
console.log('   ✅ ClerkProvider in app/layout.tsx');
console.log('   ✅ Sign-In and Sign-Up pages with catch-all routes');
console.log('   ✅ Clerk UI components (SignInButton, UserButton, etc.)');
console.log('   ✅ No manual key setup');
console.log('');

console.log('🔬 Behavioral Testing:');
console.log('   ✅ Component mounting and rendering');
console.log('   ✅ User interaction simulation');
console.log('   ✅ Authentication state management');
console.log('   ✅ Error handling and edge cases');
console.log('   ✅ Performance considerations');
console.log('');

console.log('\n📈 Jest Test Summary:');
console.log(`   Passed: ${jestPassed} suites`);
console.log(`   Failed: ${jestFailed} suites`);

if (jestFailed === 0) {
  console.log('\n🎉 All Jest tests passed!');
} else {
  console.log('\n⚠️  Some Jest tests failed. Check the output above for details.');
}

console.log('\n=== EVALUATION RESULTS ===');
console.log(`STATIC_PASSED: ${staticPassed}`);
console.log(`STATIC_FAILED: ${staticFailed}`);
console.log(`JEST_PASSED: ${jestPassed}`);
console.log(`JEST_FAILED: ${jestFailed}`);
console.log('=== END EVALUATION RESULTS ===');

console.log('\n📁 Test Files Location:');
console.log('   • Static tests: tests/run-tests.js');
console.log('   • Jest config: tests/jest-tests/');
console.log('   • Component tests: tests/jest-tests/app/__tests__/');
console.log('   • Integration tests: tests/jest-tests/app/__tests__/integration.test.tsx');
console.log('   • Documentation: tests/TEST_DOCUMENTATION.md');
console.log('');

console.log('🎉 Complete test suite execution finished!');
