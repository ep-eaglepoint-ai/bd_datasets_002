// filename: KnexInventoryService.ts

/**
 * DATABASE SCHEMA REFERENCE:
 * 
 * CREATE TABLE categories (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name TEXT NOT NULL UNIQUE
 * );
 * 
 * CREATE TABLE products (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   category_id UUID REFERENCES categories(id),
 *   name TEXT NOT NULL,
 *   sku TEXT NOT NULL UNIQUE,
 *   price DECIMAL(12,2) NOT NULL,
 *   stock_count INTEGER NOT NULL DEFAULT 0
 * );
 * 
 * CREATE TABLE order_items (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   product_id UUID REFERENCES products(id),
 *   quantity INTEGER NOT NULL,
 *   price_at_purchase DECIMAL(12,2) NOT NULL
 * );
 */

import { Knex } from 'knex';

/**
 * Knex configuration interface for database connection
 */
export interface KnexConfig {
    client: string;
    connection: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    };
    pool?: {
        min?: number;
        max?: number;
    };
}

/**
 * Data Shape Documentation:
 * - ReportFilter: Defines optional search criteria for the report.
 * - InventoryReportItem: The expected flat structure returned by the query.
 */

export interface ReportFilter {
    categoryName?: string;
    minPrice?: number;
    maxPrice?: number;
    stockStatus?: 'in_stock' | 'out_of_stock' | 'all';
    limit?: number;
    offset?: number;
}

export interface InventoryReportItem {
    productId: string;
    productName: string;
    sku: string;
    categoryName: string | null;
    totalSold: number;
    currentStock: number;
}

export class KnexInventoryService {
    private knex: Knex;

    constructor(knex: Knex) {
        if (!knex) {
            throw new Error('KnexInventoryService: Knex instance is required');
        }
        this.knex = knex;
    }

    async getInventoryReport(filters: ReportFilter): Promise<InventoryReportItem[]> {
        const k = this.knex;
        try {
            let query = k('products as p')
                .select({
                    productId: 'p.id',
                    productName: 'p.name',
                    sku: 'p.sku',
                    categoryName: 'c.name',
                    currentStock: 'p.stock_count',
                    totalSold: k
                        .select(k['raw']('COALESCE(SUM(quantity), 0)'))
                        .from('order_items')
                        .where('product_id', k.ref('p.id'))
                })
                .leftJoin('categories as c', 'p.category_id', 'c.id');

            // Apply dynamic filters via method chaining
            if (filters.categoryName) {
                query = query.where('c.name', filters.categoryName);
            }

            if (filters.minPrice !== undefined) {
                query = query.where('p.price', '>=', filters.minPrice);
            }

            if (filters.maxPrice !== undefined) {
                query = query.where('p.price', '<=', filters.maxPrice);
            }

            if (filters.stockStatus === 'in_stock') {
                query = query.where('p.stock_count', '>', 0);
            } else if (filters.stockStatus === 'out_of_stock') {
                query = query.where('p.stock_count', '=', 0);
            }

            // Default sorting by product name
            query = query.orderBy('p.name', 'asc');

            // Enforce pagination defaults and safety limits
            const limit = Math.min(filters.limit || 20, 100);
            const offset = filters.offset || 0;
            query = query.limit(limit).offset(offset);

            const results = await query;
            return results as InventoryReportItem[];
        } catch (error) {
            // Wrap database errors with meaningful context
            if (error instanceof Error) {
                throw new Error(`Database query failed: ${error.message}`);
            }
            throw new Error('Database query failed: Unknown error');
        }
    }
}
