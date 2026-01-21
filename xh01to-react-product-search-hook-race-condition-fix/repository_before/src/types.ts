export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
}

export interface SearchResponse {
  products: Product[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface SearchParams {
  query: string;
  page: number;
  limit: number;
}

