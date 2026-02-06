const fs = require('fs');
const path = require('path');

// Helper function to get all files recursively
function getAllFiles(dirPath, extensions = []) {
  const files = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (extensions.length === 0 || extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dirPath);
  return files;
}

const repoPath = process.env.REPO_PATH || '../repository_after';
const root = path.resolve(process.cwd(), repoPath);

const tests = [];

// Test 1: Verify @clerk/nextjs@latest is installed in package.json
tests.push({
  name: '@clerk/nextjs@latest is installed in package.json',
  run: () => {
    const packageJsonPath = path.join(root, 'clerk-app', 'package.json');
    if (!fs.existsSync(packageJsonPath)) throw new Error('clerk-app/package.json not found');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const clerkVersion = packageJson.dependencies?.['@clerk/nextjs'];
    if (!clerkVersion) throw new Error('@clerk/nextjs not found in dependencies');
    if (clerkVersion !== 'latest') throw new Error(`@clerk/nextjs version is "${clerkVersion}", expected "latest"`);
  }
});

// Test 2: Check absence of manual Clerk key setup
tests.push({
  name: 'No manual Clerk key setup found',
  run: () => {
    const filesToCheck = [
      path.join(root, 'clerk-app', '.env.local'),
      path.join(root, 'clerk-app', '.env'),
      path.join(root, 'clerk-app', 'next.config.ts'),
      path.join(root, 'clerk-app', 'app', 'layout.tsx')
    ];

    const clerkKeyPatterns = [
      /CLERK_PUBLISHABLE_KEY/i,
      /CLERK_SECRET_KEY/i,
      /publishableKey/i,
      /secretKey/i,
      /clerk\.configure/i
    ];

    for (const filePath of filesToCheck) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of clerkKeyPatterns) {
          if (pattern.test(content)) {
            throw new Error(`Manual Clerk key setup found in ${filePath}`);
          }
        }
      }
    }
  }
});

// Test 3: Verify App Router exclusivity (no pages router)
tests.push({
  name: 'App Router exclusivity - no pages router detected',
  run: () => {
    const pagesDir = path.join(root, 'clerk-app', 'pages');
    if (fs.existsSync(pagesDir)) {
      const files = fs.readdirSync(pagesDir);
      if (files.length > 0) {
        throw new Error('Pages router directory exists with files - violates App Router exclusivity');
      }
    }

    // Check for pages router imports in app files
    const appDir = path.join(root, 'clerk-app', 'app');
    if (fs.existsSync(appDir)) {
      const files = getAllFiles(appDir, ['.tsx', '.ts', '.js', '.jsx']);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('next/router') || content.includes('next/router')) {
          throw new Error(`Pages router import found in ${file}`);
        }
      }
    }
  }
});

// Test 4: Verify protected route usage patterns
tests.push({
  name: 'Protected route usage patterns implemented',
  run: () => {
    const middlewarePath = path.join(root, 'clerk-app', 'middleware.ts');
    const proxyPath = path.join(root, 'clerk-app', 'proxy.ts');
    
    if (!fs.existsSync(middlewarePath) && !fs.existsSync(proxyPath)) {
      throw new Error('Neither middleware.ts nor proxy.ts found for protected routes');
    }

    // Check for proper middleware configuration
    const middlewareFile = fs.existsSync(middlewarePath) ? middlewarePath : proxyPath;
    const content = fs.readFileSync(middlewareFile, 'utf8');
    
    if (!content.includes('clerkMiddleware')) {
      throw new Error('clerkMiddleware not found in middleware configuration');
    }
  }
});

// Test 5: clerk-app layout contains ClerkProvider and @clerk/nextjs import
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

// Test 6: clerk-app proxy.ts uses clerkMiddleware from @clerk/nextjs/server
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

// Test 7: sign-in and sign-up catch-all pages exist and use Clerk components
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

// Test 8: Check for Clerk UI components usage (SignInButton, SignUpButton, UserButton, SignedIn, SignedOut)
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

// Test 9: Negative test - Check for absence of deprecated patterns
tests.push({
  name: 'No deprecated Clerk patterns found',
  run: () => {
    const appDir = path.join(root, 'clerk-app', 'app');
    if (fs.existsSync(appDir)) {
      const files = getAllFiles(appDir, ['.tsx', '.ts', '.js', '.jsx']);
      
      const deprecatedPatterns = [
        /withClerk/i,
        /useClerk/i,
        /ClerkProvider.*publishableKey/i,
        /<ClerkLoaded>/i,
        /<ClerkLoading>/i,
        /import.*{.*ClerkProvider.*}.*from.*['"]@clerk\/clerk-react['"]/i
      ];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        for (const pattern of deprecatedPatterns) {
          if (pattern.test(content)) {
            throw new Error(`Deprecated Clerk pattern found in ${file}`);
          }
        }
      }
    }
  }
});

// Test 10: Edge case - Verify file structure integrity
tests.push({
  name: 'File structure integrity check',
  run: () => {
    const requiredFiles = [
      'clerk-app/app/layout.tsx',
      'clerk-app/app/page.tsx',
      'clerk-app/app/sign-in/[[...sign-in]]/page.tsx',
      'clerk-app/app/sign-up/[[...sign-up]]/page.tsx',
      'clerk-app/package.json'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(root, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file missing: ${file}`);
      }
      
      // Check files are not empty
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new Error(`Required file is empty: ${file}`);
      }
    }
  }
});

// Test 11: Edge case - Verify proper TypeScript usage
tests.push({
  name: 'Proper TypeScript usage in Clerk components',
  run: () => {
    const clerkFiles = [
      path.join(root, 'clerk-app', 'app', 'layout.tsx'),
      path.join(root, 'clerk-app', 'app', 'page.tsx'),
      path.join(root, 'clerk-app', 'app', 'sign-in', '[[...sign-in]]', 'page.tsx'),
      path.join(root, 'clerk-app', 'app', 'sign-up', '[[...sign-up]]', 'page.tsx')
    ];

    for (const file of clerkFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for proper React imports in TypeScript files
        if (file.endsWith('.tsx') && !content.includes('import React')) {
          throw new Error(`Missing React import in TypeScript component: ${file}`);
        }
        
        // Check for proper typing if using function components
        if (content.includes('export default function') && !content.includes(': React.FC') && !content.includes('React.ReactNode')) {
          // This is a soft check - not all functions need explicit typing
        }
      }
    }
  }
});

// Test 12: Negative test - No hardcoded Clerk configuration
tests.push({
  name: 'No hardcoded Clerk configuration found',
  run: () => {
    const filesToCheck = getAllFiles(path.join(root, 'clerk-app'), ['.tsx', '.ts', '.js', '.jsx', '.json']);
    
    // Exclude auto-generated Clerk directories
    const filteredFiles = filesToCheck.filter(file => 
      !file.includes('.clerk/') && 
      !file.includes('node_modules/') &&
      !file.includes('.next/')
    );
    
    const hardcodedPatterns = [
      /clerk\.[a-z]+\.com/i,
      /sk_test_/i,
      /sk_live_/i,
      /pk_test_/i,
      /pk_live_/i
    ];

    for (const file of filteredFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of hardcodedPatterns) {
        if (pattern.test(content)) {
          throw new Error(`Hardcoded Clerk configuration found in ${file}`);
        }
      }
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
