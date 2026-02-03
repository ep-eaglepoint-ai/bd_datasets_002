// Define interfaces for type safety
export interface Transaction {
  order_id: string | number;
  customer_id: string | number;
  product_price: number;
  quantity: number;
  state: string | number;
}

export interface Customer {
  customer_id: string | number;
  tier: string;
}

export interface TaxRate {
  state: string | number;
  tax_rate: number;
}

export interface ProcessedTransaction {
  order_id: string | number;
  customer_id: string | number;
  product_price: number;
  quantity: number;
  state: string | number;
  discount_rate: number;
  discount_amount: number;
  subtotal: number;
  tax_amount: number;
  final_price: number;
}

// Callback type for backward compatibility
export type Callback = (err: Error | null, result: ProcessedTransaction[] | null) => void;