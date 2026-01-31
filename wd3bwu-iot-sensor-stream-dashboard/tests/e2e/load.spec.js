/**
 * Browser Load Test - Full Page Refresh with 100 Concurrent Users
 * 
 * This test simulates 100 concurrent users each loading the full dashboard,
 * establishing WebSocket connections, and fetching sensor data.
 * 
 * Requirement 4: Handle 100 concurrent clients performing full dashboard refresh.
 */

const { test, expect } = require('@playwright/test');

const CONCURRENT_USERS = 100;
const DASHBOARD_URL = 'http://localhost:8080';

test.describe('Load Test - Requirement 4', () => {
  test('should handle 100 concurrent full page refreshes', async ({ browser }) => {
    console.log(`Starting load test with ${CONCURRENT_USERS} concurrent browser contexts...`);
    
    const startTime = Date.now();
    const results = [];
    const errors = [];
    
    // Create promises for all concurrent users
    const userPromises = [];
    
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const userPromise = (async (userId) => {
        const userStartTime = Date.now();
        let context;
        let page;
        
        try {
          // Create isolated browser context for each user
          context = await browser.newContext();
          page = await context.newPage();
          
          // Navigate to dashboard (this triggers: page load + WS connect + API calls)
          await page.goto(DASHBOARD_URL, { 
            waitUntil: 'networkidle',
            timeout: 30000 
          });
          
          // Wait for sensors to appear (confirms full load including WS data)
          await page.waitForSelector('.sensor-card', { timeout: 20000 });
          
          // Verify sensor count (confirms API worked)
          const sensorCountEl = page.locator('.stat-item:has-text("Sensors") .stat-value');
          const countText = await sensorCountEl.textContent({ timeout: 5000 });
          const sensorCount = parseInt(countText, 10);
          
          // Verify connection status (confirms WebSocket connected)
          const connectionStatus = page.locator('.connection-status');
          const statusText = await connectionStatus.textContent({ timeout: 5000 });
          const isConnected = statusText.includes('Live');
          
          const loadTime = Date.now() - userStartTime;
          
          return {
            userId,
            success: sensorCount === 50 && isConnected,
            sensorCount,
            isConnected,
            loadTime
          };
        } catch (err) {
          return {
            userId,
            success: false,
            error: err.message,
            loadTime: Date.now() - userStartTime
          };
        } finally {
          if (page) await page.close();
          if (context) await context.close();
        }
      })(i);
      
      userPromises.push(userPromise);
    }
    
    // Execute all users concurrently
    const allResults = await Promise.all(userPromises);
    
    const totalDuration = Date.now() - startTime;
    
    // Analyze results
    const successCount = allResults.filter(r => r.success).length;
    const failedResults = allResults.filter(r => !r.success);
    const avgLoadTime = allResults.reduce((acc, r) => acc + r.loadTime, 0) / allResults.length;
    const maxLoadTime = Math.max(...allResults.map(r => r.loadTime));
    const minLoadTime = Math.min(...allResults.map(r => r.loadTime));
    
    console.log('--- Load Test Results ---');
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Successful Users: ${successCount}/${CONCURRENT_USERS}`);
    console.log(`Average Load Time: ${Math.round(avgLoadTime)}ms`);
    console.log(`Min Load Time: ${minLoadTime}ms`);
    console.log(`Max Load Time: ${maxLoadTime}ms`);
    
    if (failedResults.length > 0) {
      console.log(`Failed Users: ${failedResults.length}`);
      failedResults.slice(0, 5).forEach(r => {
        console.log(`  User ${r.userId}: ${r.error || 'Unknown error'}`);
      });
    }
    
    // Assertions
    // At least 95% success rate (allowing for some timeout variance in CI)
    expect(successCount).toBeGreaterThanOrEqual(Math.floor(CONCURRENT_USERS * 0.95));
    
    // Average load time should be under 10 seconds even under load
    expect(avgLoadTime).toBeLessThan(10000);
  });

  test('should handle 100 concurrent history API requests with page context', async ({ browser }) => {
    // This test establishes browser contexts and makes history API requests
    // to simulate the thundering herd scenario from real browsers
    
    console.log('Testing 100 concurrent history API requests from browsers...');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // First, load the page to establish baseline
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('.sensor-card', { timeout: 15000 });
    
    const startTime = Date.now();
    
    // Make 100 concurrent history API requests from the browser
    const apiResults = await page.evaluate(async () => {
      const requests = [];
      const baseUrl = 'http://localhost:3001/api/history';
      
      for (let i = 0; i < 100; i++) {
        const sensorId = `sensor-${String(i % 10).padStart(3, '0')}`;
        const start = Date.now() - 600000;
        
        requests.push(
          fetch(`${baseUrl}/${sensorId}?start=${start}`)
            .then(res => ({ status: res.status, ok: res.ok }))
            .catch(err => ({ error: err.message }))
        );
      }
      
      return Promise.all(requests);
    });
    
    const duration = Date.now() - startTime;
    const successCount = apiResults.filter(r => r.ok).length;
    
    console.log(`100 API requests completed in ${duration}ms`);
    console.log(`Successful: ${successCount}/100`);
    
    await context.close();
    
    // All requests should succeed
    expect(successCount).toBe(100);
    // Should complete within reasonable time (5 seconds for 100 requests)
    expect(duration).toBeLessThan(5000);
  });
});
