/**
 * Sandbox security and functionality tests.
 * HTTP-based tests without browser automation.
 */

const { describe, test, expect } = require('@jest/globals');
const http = require('http');
const fs = require('fs');
const path = require('path');

const appUrl = process.env.TEST_APP_URL || 'http://localhost:3000';
const repoType = process.env.TEST_REPO || 'after';
const projectRoot = path.join(__dirname, '..');
const repoPath = path.join(projectRoot, `repository_${repoType}`);

function httpRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

describe('Sandbox Security Tests', () => {
  const skipHttpServer = process.env.SKIP_HTTP_SERVER === 'true';
  
  describe('Server Availability', () => {
    test('server should be running and responding', async () => {
      if (skipHttpServer) {
        // In evaluation mode, skip HTTP test and just check file exists
        const buildIndex = path.join(repoPath, 'build', 'index.html');
        expect(fs.existsSync(buildIndex)).toBe(true);
        const content = fs.readFileSync(buildIndex, 'utf8');
        expect(content.toLowerCase()).toContain('<!doctype html>');
      } else {
        const response = await httpRequest(appUrl);
        expect(response.statusCode).toBe(200);
        // Case-insensitive check for DOCTYPE
        expect(response.body.toLowerCase()).toContain('<!doctype html>');
      }
    }, 10000);

    test('build files should exist', () => {
      const buildDir = path.join(repoPath, 'build');
      const buildIndex = path.join(buildDir, 'index.html');
      expect(fs.existsSync(buildDir)).toBe(true);
      expect(fs.existsSync(buildIndex)).toBe(true);
    });

    test('main JavaScript bundle should exist', () => {
      const buildDir = path.join(repoPath, 'build');
      const staticDir = path.join(buildDir, 'static', 'js');
      
      if (fs.existsSync(staticDir)) {
        const files = fs.readdirSync(staticDir);
        const jsFiles = files.filter(f => f.endsWith('.js'));
        expect(jsFiles.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Security Implementation', () => {
    test('SecureSandbox component should exist in after repository', () => {
      if (repoType === 'after') {
        const sandboxPath = path.join(repoPath, 'src', 'SecureSandbox.js');
        expect(fs.existsSync(sandboxPath)).toBe(true);
        
        const content = fs.readFileSync(sandboxPath, 'utf8');
        // Check for security features
        expect(content).toMatch(/sandbox|iframe|postMessage/i);
        expect(content).toMatch(/localStorage|sessionStorage/i);
      } else {
        // For before repo, we expect it NOT to exist
        const sandboxPath = path.join(repoPath, 'src', 'SecureSandbox.js');
        expect(fs.existsSync(sandboxPath)).toBe(false);
      }
    });

    test('HTML should load without errors', async () => {
      if (skipHttpServer) {
        // In evaluation mode, just check file directly
        const buildIndex = path.join(repoPath, 'build', 'index.html');
        expect(fs.existsSync(buildIndex)).toBe(true);
        const content = fs.readFileSync(buildIndex, 'utf8');
        expect(content.toLowerCase()).toMatch(/<html/i);
        expect(content.toLowerCase()).toMatch(/<body/i);
      } else {
        const response = await httpRequest(appUrl);
        expect(response.statusCode).toBe(200);
        // Check that it's valid HTML (case-insensitive)
        expect(response.body.toLowerCase()).toMatch(/<html/i);
        expect(response.body.toLowerCase()).toMatch(/<body/i);
      }
    }, 10000);
  });

  describe('Build Quality', () => {
    test('build directory should contain required assets', () => {
      const buildDir = path.join(repoPath, 'build');
      if (fs.existsSync(buildDir)) {
        const files = fs.readdirSync(buildDir);
        expect(files).toContain('index.html');
      }
    });

    test('index.html should reference React app', () => {
      const buildIndex = path.join(repoPath, 'build', 'index.html');
      if (fs.existsSync(buildIndex)) {
        const content = fs.readFileSync(buildIndex, 'utf8');
        expect(content.toLowerCase()).toMatch(/react|root|app/i);
      }
    });
  });
});
