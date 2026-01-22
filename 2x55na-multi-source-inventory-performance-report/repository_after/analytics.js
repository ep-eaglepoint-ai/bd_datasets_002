/**
 * Analytics Layer
 * Computes aggregate metrics: Total Revenue, Operating Costs, Net Profit, Weighted Sentiment.
 * Pure functions for performance and testability.
 */

export const InventoryAnalytics = {
    calculateMetrics(orders, expenses, reviews) {
        // 1. Total Revenue
        // Assuming 'orders' has a 'total_amount' field
        const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

        // 2. Operating Costs
        // Assuming 'expenses' has a 'amount' field
        const operatingCosts = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

        // 3. Net Profit
        const netProfit = totalRevenue - operatingCosts;

        // 4. Weighted Sentiment
        // Assuming 'reviews' has 'rating' (1-5) and 'weight' (optional, default 1)
        // If no weight field, we assume 1. Requirement says "Weighted Sentiment", so let's look for weight.
        // If no reviews, return 0.
        let sentimentSum = 0;
        let totalWeight = 0;

        reviews.forEach(review => {
            const rating = Number(review.rating) || 0;
            const weight = Number(review.weight) || 1; // Default weight to 1 if not present
            sentimentSum += rating * weight;
            totalWeight += weight;
        });

        const weightedSentiment = totalWeight > 0 ? (sentimentSum / totalWeight).toFixed(2) : 0;

        return {
            totalRevenue,
            operatingCosts,
            netProfit,
            weightedSentiment: Number(weightedSentiment)
        };
    }
};
