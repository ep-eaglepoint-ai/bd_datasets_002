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

import { Pool } from 'pg';

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
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getInventoryReport(filters: ReportFilter): Promise<InventoryReportItem[]> {
    let sql = `
      SELECT 
        p.id as "productId", 
        p.name as "productName", 
        p.sku, 
        c.name as "categoryName",
        p.stock_count as "currentStock",
        (SELECT COALESCE(SUM(oi.quantity), 0) 
         FROM order_items oi 
         WHERE oi.product_id = p.id) as "totalSold"
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters.categoryName) {
      params.push(filters.categoryName);
      sql += ` AND c.name = $${params.length}`;
    }

    if (filters.minPrice !== undefined) {
      params.push(filters.minPrice);
      sql += ` AND p.price >= $${params.length}`;
    }

    if (filters.stockStatus === 'in_stock') {
      sql += ` AND p.stock_count > 0`;
    } else if (filters.stockStatus === 'out_of_stock') {
      sql += ` AND p.stock_count = 0`;
    }

    sql += ` ORDER BY p.name ASC`;

    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;
    
    params.push(limit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await this.pool.query(sql, params);
    return result.rows as InventoryReportItem[];
  }
}