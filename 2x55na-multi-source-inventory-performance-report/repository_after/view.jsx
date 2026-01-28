import React, { useState, useEffect } from 'react';
import { InventoryService } from './service';
import { InventoryAnalytics } from './analytics';

/**
 * View Layer
 * React component to display inventory health.
 */
export function InventoryHealthView({ supabaseClient }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadData() {
            try {
                const { orders, expenses, reviews } = await InventoryService.fetchInventoryData(supabaseClient);

                // Perform calculations without blocking UI (in this simple case, sync is fine, 
                // but we could use web workers if it was massive. For now, we just do it in the effect).
                const computedMetrics = InventoryAnalytics.calculateMetrics(orders, expenses, reviews);

                if (mounted) {
                    setMetrics(computedMetrics);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to load inventory data:', error);
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadData();

        return () => { mounted = false; };
    }, [supabaseClient]);

    if (loading) return <div>Loading Inventory Health...</div>;

    if (!metrics) return <div>No data available.</div>;

    return (
        <div className="inventory-health-dashboard">
            <h1>Inventory Health</h1>
            <div className="metrics-grid">
                <div className="metric-card" data-testid="revenue">
                    <h3>Total Revenue</h3>
                    <p>${metrics.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="metric-card" data-testid="costs">
                    <h3>Operating Costs</h3>
                    <p>${metrics.operatingCosts.toFixed(2)}</p>
                </div>
                <div className="metric-card" data-testid="profit">
                    <h3>Net Profit</h3>
                    <p>${metrics.netProfit.toFixed(2)}</p>
                </div>
                <div className="metric-card" data-testid="sentiment">
                    <h3>Weighted Sentiment</h3>
                    <p>{metrics.weightedSentiment} / 5</p>
                </div>
            </div>
        </div>
    );
}
