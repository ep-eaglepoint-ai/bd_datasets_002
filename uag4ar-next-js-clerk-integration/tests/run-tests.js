const fs = require('fs');
const path = require('path');

const repoPath = process.env.REPO_PATH || 'repository_before';
const root = path.resolve(process.cwd(), repoPath);

const tests = [];

// Test 1: clerk-app layout contains ClerkProvider and @clerk/nextjs import
tests.push({
  name: 'layout.tsx contains ClerkProvider and @clerk/nextjs import',
  run: () => {
    const layoutPath = path.join(root, 'clerk-app', 'app', 'layout.tsx');
    if (!fs.existsSync(layoutPath)) throw new Error('clerk-app/app/layout.tsx not found');
    const content = fs.readFileSync(layoutPath, 'utf8');
    const required = ['@clerk/nextjs', 'ClerkProvider'];
    const missing = required.filter(r => !content.includes(r));
    if (missing.length) throw new Error('Missing in layout.tsx: ' + missing.join(', '));
  }
});

// Test 2: clerk-app proxy.ts uses clerkMiddleware from @clerk/nextjs/server
tests.push({
  name: 'proxy.ts uses clerkMiddleware from @clerk/nextjs/server',
  run: () => {
    const proxyPath = path.join(root, 'clerk-app', 'proxy.ts');
    if (!fs.existsSync(proxyPath)) throw new Error('clerk-app/proxy.ts not found');
    const content = fs.readFileSync(proxyPath, 'utf8');
    if (!content.includes('clerkMiddleware') || !content.includes('@clerk/nextjs/server')) {
      throw new Error('proxy.ts does not use clerkMiddleware from @clerk/nextjs/server');
    }
  }
});

// Test 3: sign-in and sign-up catch-all pages exist and use Clerk components
tests.push({
  name: 'sign-in and sign-up catch-all pages exist and use Clerk components',
  run: () => {
    const signInPath = path.join(root, 'clerk-app', 'app', 'sign-in', '[[...sign-in]]', 'page.tsx');
    const signUpPath = path.join(root, 'clerk-app', 'app', 'sign-up', '[[...sign-up]]', 'page.tsx');
    if (!fs.existsSync(signInPath)) throw new Error('sign-in/[[...sign-in]]/page.tsx not found');
    if (!fs.existsSync(signUpPath)) throw new Error('sign-up/[[...sign-up]]/page.tsx not found');
    const sIn = fs.readFileSync(signInPath, 'utf8');
    const sUp = fs.readFileSync(signUpPath, 'utf8');
    if (!sIn.includes('SignIn')) throw new Error('SignIn component not referenced in sign-in page');
    if (!sUp.includes('SignUp')) throw new Error('SignUp component not referenced in sign-up page');
  }
});

// Test 4: Check for Clerk UI components usage (SignInButton, SignUpButton, UserButton, SignedIn, SignedOut)
// Requirement 7: Use Clerk UI components where appropriate.
tests.push({
  name: 'Uses Clerk UI components (UserButton, SignInButton, etc.)',
  run: () => {
    // Scan typical files where these might be used: page.tsx, layout.tsx
    const filesToScan = [
      path.join(root, 'clerk-app', 'app', 'page.tsx'),
      path.join(root, 'clerk-app', 'app', 'layout.tsx')
    ];

    let combinedContent = '';
    for (const f of filesToScan) {
      if (fs.existsSync(f)) {
        combinedContent += fs.readFileSync(f, 'utf8');
      }
    }

    const requiredComponents = ['SignInButton', 'SignUpButton', 'UserButton', 'SignedIn', 'SignedOut'];
    const missing = requiredComponents.filter(c => !combinedContent.includes(c));

    // We expect ALL of them to be used somewhere "appropriate" in this demo app to pass requirement 7
    if (missing.length) {
      throw new Error('Missing usage of Clerk UI components: ' + missing.join(', '));
    }
  }
});

console.log('Running', tests.length, 'test(s) against', repoPath);
let passed = 0;
let failed = 0;
for (const t of tests) {
  try {
    t.run();
    console.log('✓', t.name);
    passed++;
  } catch (err) {
    console.log('✗', t.name);
    console.log('  Error:', err.message);
    failed++;
  }
}

const expectFailure = process.env.EXPECT_FAILURE === 'true';

console.log('\nSummary:');
console.log('Passed:', passed);
console.log('Failed:', failed);

if (expectFailure) {
  if (failed > 0) {
    console.log('Failures expected and found. Exiting with success (0).');
    process.exit(0);
  } else {
    console.log('Expected failures but none found. Exiting with failure (1).');
    process.exit(1);
  }
} else {
  if (failed > 0) process.exit(1);
  process.exit(0);
}
