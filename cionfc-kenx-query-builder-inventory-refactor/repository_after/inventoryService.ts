// filename: inventoryService.ts

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

export class InventoryService {
    private knex: Knex;

    constructor(knex: Knex) {
        this.knex = knex;
    }

    async getInventoryReport(filters: ReportFilter): Promise<InventoryReportItem[]> {
        try {
            // Build the subquery for total_sold using Knex
            const totalSoldSubquery = this.knex('order_items as oi')
                .sum('oi.quantity')
                .whereRaw('oi.product_id = p.id')
                .as('totalSold');

            // Start building the main query
            let query = this.knex('products as p')
                .select(
                    'p.id as productId',
                    'p.name as productName',
                    'p.sku',
                    'c.name as categoryName',
                    'p.stock_count as currentStock',
                    this.knex.raw(`COALESCE((${totalSoldSubquery.toString()}), 0) as "totalSold"`)
                )
                .leftJoin('categories as c', 'p.category_id', 'c.id');

            // Apply dynamic filters using conditional query building
            if (filters.categoryName) {
                query = query.where('c.name', filters.categoryName);
            }

            if (filters.minPrice !== undefined) {
                query = query.where('p.price', '>=', filters.minPrice);
            }

            if (filters.maxPrice !== undefined) {
                query = query.where('p.price', '<=', filters.maxPrice);
            }

            // Handle stock_status filter with conditional logic
            if (filters.stockStatus === 'in_stock') {
                query = query.where('p.stock_count', '>', 0);
            } else if (filters.stockStatus === 'out_of_stock') {
                query = query.where('p.stock_count', '=', 0);
            }
            // If stockStatus is 'all' or undefined, no filter is applied

            // Add ordering
            query = query.orderBy('p.name', 'asc');

            // Implement safe pagination with validation
            const limit = Math.min(filters.limit || 20, 100);
            const offset = filters.offset || 0;

            query = query.limit(limit).offset(offset);

            // Execute query and return results
            const results = await query;

            return results as InventoryReportItem[];
        } catch (error) {
            // Handle potential database connection errors
            if (error instanceof Error) {
                throw new Error(`Database query failed: ${error.message}`);
            }
            throw new Error('Database query failed: Unknown error');
        }
    }
}
