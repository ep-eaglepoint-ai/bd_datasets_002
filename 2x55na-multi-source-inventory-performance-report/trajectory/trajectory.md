# Learning Path: Building a Unified Inventory Analytics Dashboard with Supabase and Vite.js

## Goal
Create a performant Vite.js application (plain JavaScript) that fetches from multiple Supabase tables (`orders`, `expenses`, `product_reviews`), calculates aggregate metrics (Total Revenue, Operating Costs, Net Profit, Weighted Sentiment), and maintains a resilient UI.

---

## 1. Environment Setup: Vite.js & Plain JavaScript

- **Learn Vite.js basics**
  - Docs: https://vitejs.dev/guide/
  - Video Tutorial: https://youtu.be/gn7M7oYxG40
- **Project Setup**
  - Initialize a Vite project with JavaScript:  
    ```bash
    npm create vite@latest inventory-dashboard -- --template vanilla
    cd inventory-dashboard
    npm install
    npm run dev
    ```
- **ES Modules & Modern JS**
  - MDN Guide: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
  - Video: https://youtu.be/0t3W4jh8gEc

---

## 2. Supabase Basics & Multi-Table Fetching

- **Supabase JavaScript Client**
  - Docs: https://supabase.com/docs/guides/client-libraries
  - Video: https://youtu.be/OeM6cYkKxXc
- **Fetching Multiple Tables Simultaneously**
  - Strategy: `Promise.all` for parallel fetches to avoid blocking UI.
  - Example:
    ```javascript
    const [orders, expenses, reviews] = await Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('product_reviews').select('*')
    ]);
    ```
- **Handling Partial Failures**
  - Use try/catch per fetch or `Promise.allSettled`:
    ```javascript
    const results = await Promise.allSettled([
      supabase.from('orders').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('product_reviews').select('*')
    ]);
    ```

---

## 3. Aggregate Calculations & Weighted Metrics

- **Total Revenue, Operating Costs, Net Profit**
  - Total Revenue = Sum of `orders.amount`
  - Operating Costs = Sum of `expenses.amount`
  - Net Profit = Total Revenue - Operating Costs
- **Weighted Sentiment Calculation**
  - Weighted Sentiment = (Sum of `review.score * review.weight`) / (Sum of `review.weight`)
- **JavaScript Guide for Aggregates**
  - MDN Array Reduce: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
  - Video: https://youtu.be/2gDwlIim3Uw

---

## 4. Architecture: 3-File Feature-Based Separation

- **Files**
  - `service.js` – Handles API calls to Supabase.
  - `analytics.js` – Performs aggregate calculations.
  - `view.js` – Updates UI and handles error-resilient rendering.
- **Modular JS Approach**
  - MDN Modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
  - Example folder structure:
    ```
    /src
      /service.js
      /analytics.js
      /view.js
      main.js
    ```

---

## 5. Performance & Scalability

- **Avoid Blocking UI**
  - Use `async/await` and render partial results as soon as they arrive.
- **Batching & Aggregation Best Practices**
  - Reference: [SQL Optimization & Avoid N+1 Queries](https://michaelkasingye.medium.com/optimizing-database-queries-avoiding-the-n-1-query-problem-438476198983)
  - Video: https://youtu.be/lptxhwzJK1g
- **Cursor-Based Pagination**
  - Video: https://youtu.be/rhOVF82KY7E
  - Applies if fetching large datasets.

---

## 6. Error Resilience & UI

- **Strategy**
  - Each table fetch independently.
  - Display partial results with warnings for failed tables.
  - Example snippet:
    ```javascript
    if (results[0].status === 'fulfilled') renderOrders(results[0].value);
    else showError('Orders failed to load');
    ```

---

## 7. Testing & Verification

- **Unit Testing**
  - Use Jest: https://jestjs.io/docs/getting-started
  - Mock Supabase responses for:
    - Empty tables
    - Large numbers
    - Failed API requests
  - Example:
    ```javascript
    jest.mock('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: () => ({ select: jest.fn().mockResolvedValue({ data: [], error: null }) })
      })
    }));
    ```
- **Edge Case Testing**
  - Zero revenue
  - Negative expenses
  - No product reviews
  - Weighted sentiment with zero total weight

---

## 8. Recommended External References

- Supabase Docs: https://supabase.com/docs
- Vite.js Docs: https://vitejs.dev/guide/
- JavaScript Aggregates: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
- SQL Optimization & N+1 Problem: https://michaelkasingye.medium.com/optimizing-database-queries-avoiding-the-n-1-query-proble
