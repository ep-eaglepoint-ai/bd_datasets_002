import { SearchResponse, SearchParams } from './types';

export const searchProducts = async (params: SearchParams): Promise<SearchResponse> => {
  const queryString = new URLSearchParams({
    q: params.query,
    page: params.page.toString(),
    limit: params.limit.toString(),
  }).toString();

  const response = await fetch(`/api/products/search?${queryString}`);
  
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
};

