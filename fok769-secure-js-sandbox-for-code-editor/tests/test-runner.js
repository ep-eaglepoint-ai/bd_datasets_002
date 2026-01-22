/**
 * Test runner that builds and serves the React app, then runs tests
 */

const { spawn } = require('child_process');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const projectRoot = path.join(__dirname, '..');
const repoType = process.env.TEST_REPO || 'after';
const repoPath = path.join(projectRoot, `repository_${repoType}`);

let serverProcess = null;
let serverPort = 3000;

async function buildApp() {
  const buildDir = path.join(repoPath, 'build');
  const buildIndex = path.join(buildDir, 'index.html');
  
  // Skip build if it already exists (faster for evaluation)
  const isEvaluation = process.env.EVALUATION_MODE === 'true';
  if (isEvaluation && fs.existsSync(buildIndex)) {
    console.log(`Using existing build from ${repoPath}...`);
    return;
  }
  
  console.log(`Building React app from ${repoPath}...`);
  
  // Check if package.json exists
  const packageJson = path.join(repoPath, 'package.json');
  if (!fs.existsSync(packageJson)) {
    throw new Error(`package.json not found in ${repoPath}`);
  }
  
  return new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build'], {
      cwd: repoPath,
      stdio: isEvaluation ? 'pipe' : 'inherit', // Silent in evaluation mode
      shell: true,
      env: { ...process.env, CI: 'true' } // Set CI to avoid interactive prompts
    });
    
    build.on('close', (code) => {
      if (code === 0) {
        if (fs.existsSync(buildDir)) {
          if (!isEvaluation) console.log('Build completed successfully');
          resolve();
        } else {
          reject(new Error('Build directory was not created'));
        }
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
    
    build.on('error', (err) => {
      reject(new Error(`Build process error: ${err.message}`));
    });
  });
}

async function serveApp() {
  const buildDir = path.join(repoPath, 'build');
  
  if (!fs.existsSync(buildDir)) {
    throw new Error('Build directory not found. Run build first.');
  }
  
  return new Promise((resolve, reject) => {
    // Use a simple HTTP server to serve the built app
    const server = http.createServer((req, res) => {
      let filePath = path.join(buildDir, req.url === '/' ? 'index.html' : req.url);
      
      // Security: prevent directory traversal
      filePath = path.normalize(filePath);
      if (!filePath.startsWith(buildDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        
        const ext = path.extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml'
        }[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    
    server.listen(serverPort, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${serverPort}`);
      serverProcess = server;
      resolve();
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port already in use, try next port
        serverPort++;
        serveApp().then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

async function waitForApp() {
  const isEvaluation = process.env.EVALUATION_MODE === 'true';
  const maxAttempts = isEvaluation ? 20 : 30; // Fewer attempts in evaluation
  const delay = isEvaluation ? 300 : 500; // Faster delay in evaluation
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      const response = await page.goto(`http://localhost:${serverPort}`, { 
        timeout: 3000, // Reduced timeout
        waitUntil: 'domcontentloaded'
      });
      await browser.close();
      
      if (response && response.status() === 200) {
        if (!isEvaluation) console.log(`App is ready on port ${serverPort}`);
        return;
      } else {
        throw new Error(`App returned status ${response ? response.status() : 'unknown'}`);
      }
    } catch (err) {
      if (i < maxAttempts - 1) {
        if (!isEvaluation && i % 5 === 0) {
          console.log(`Waiting for app to start... (attempt ${i + 1}/${maxAttempts})`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`App failed to start after ${maxAttempts} attempts: ${err.message}`);
      }
    }
  }
}

async function cleanup() {
  if (serverProcess) {
    serverProcess.close();
    serverProcess = null;
  }
}

// Handle cleanup on exit
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function main() {
  try {
    // Check if dependencies are installed
    // In evaluation mode, dependencies should already be installed in Docker image
    const isEvaluation = process.env.EVALUATION_MODE === 'true';
    const nodeModules = path.join(repoPath, 'node_modules');
    
    if (!fs.existsSync(nodeModules)) {
      if (isEvaluation) {
        // In evaluation mode, dependencies should be pre-installed
        // Only install if absolutely necessary and do it quietly
        console.log(`Dependencies not found for repository_${repoType}, installing...`);
        await new Promise((resolve, reject) => {
          const install = spawn('npm', ['install', '--no-audit', '--no-fund', '--silent'], {
            cwd: repoPath,
            stdio: 'pipe', // Silent mode
            shell: true
          });
          install.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              // Don't fail in evaluation mode, just warn
              console.log(`Warning: npm install returned code ${code}`);
              resolve();
            }
          });
          install.on('error', (err) => {
            console.log(`Warning: npm install error: ${err.message}`);
            resolve(); // Don't fail
          });
        });
      } else {
        // Normal mode - install dependencies with output
        console.log('Installing dependencies...');
        await new Promise((resolve, reject) => {
          const install = spawn('npm', ['install'], {
            cwd: repoPath,
            stdio: 'inherit',
            shell: true
          });
          install.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm install failed`)));
        });
      }
    }
    
    const isEvaluation = process.env.EVALUATION_MODE === 'true';
    
    if (!isEvaluation) console.log('Step 1: Building React app...');
    await buildApp();
    
    if (!isEvaluation) console.log('Step 2: Starting HTTP server...');
    await serveApp();
    
    if (!isEvaluation) console.log('Step 3: Waiting for app to be ready...');
    await waitForApp();
    
    // Set environment variable for tests
    const testUrl = `http://localhost:${serverPort}`;
    process.env.TEST_APP_URL = testUrl;
    
    if (!isEvaluation) {
      console.log(`Step 4: Running tests against app at ${testUrl}...`);
      console.log(`Repository: ${repoType}`);
      console.log(`Test URL: ${testUrl}`);
    }
    
    // Run Jest tests directly (not via npm test to avoid recursion)
    const isEvaluation = process.env.EVALUATION_MODE === 'true';
    const jestArgs = ['jest', '--testPathPattern=tests/sandbox.test.js', '--no-coverage', '--forceExit'];
    if (!isEvaluation) jestArgs.push('--verbose'); // Skip verbose in evaluation
    
    const jest = spawn('npx', jestArgs, {
      cwd: projectRoot,
      stdio: isEvaluation ? 'pipe' : 'inherit', // Silent in evaluation
      shell: true,
      env: { 
        ...process.env, 
        TEST_APP_URL: testUrl,
        TEST_REPO: repoType,
        NODE_ENV: 'test'
      }
    });
    
    jest.on('error', (error) => {
      console.error('Jest error:', error);
      cleanup();
      process.exit(1);
    });
    
    jest.on('close', (code) => {
      console.log(`Tests completed with exit code: ${code}`);
      cleanup();
      process.exit(code);
    });
    
  } catch (error) {
    console.error('Error:', error);
    cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildApp, serveApp, waitForApp, cleanup };
