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
  console.log(`Building React app from ${repoPath}...`);
  
  // Check if package.json exists
  const packageJson = path.join(repoPath, 'package.json');
  if (!fs.existsSync(packageJson)) {
    throw new Error(`package.json not found in ${repoPath}`);
  }
  
  return new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build'], {
      cwd: repoPath,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, CI: 'true' } // Set CI to avoid interactive prompts
    });
    
    build.on('close', (code) => {
      if (code === 0) {
        const buildDir = path.join(repoPath, 'build');
        if (fs.existsSync(buildDir)) {
          console.log('Build completed successfully');
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
  const maxAttempts = 30;
  const delay = 1000;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(`http://localhost:${serverPort}`, { timeout: 5000, waitUntil: 'domcontentloaded' });
      await browser.close();
      console.log(`App is ready on port ${serverPort}`);
      return;
    } catch (err) {
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error('App failed to start');
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
    const nodeModules = path.join(repoPath, 'node_modules');
    if (!fs.existsSync(nodeModules)) {
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
    
    await buildApp();
    await serveApp();
    await waitForApp();
    
    // Set environment variable for tests
    process.env.TEST_APP_URL = `http://localhost:${serverPort}`;
    
    // Run Jest tests directly (not via npm test to avoid recursion)
    console.log(`Running tests against app at http://localhost:${serverPort}...`);
    const jest = spawn('npx', ['jest', '--testPathPattern=tests/sandbox.test.js', '--no-coverage', '--verbose'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
      env: { 
        ...process.env, 
        TEST_APP_URL: `http://localhost:${serverPort}`,
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
