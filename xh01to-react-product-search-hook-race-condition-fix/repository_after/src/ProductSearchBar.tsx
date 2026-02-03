import React, { useState } from 'react';
import { useProductSearch } from './useProductSearch';

export const ProductSearchBar: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const { products, loading, error, hasMore, page, search, nextPage, refresh } = useProductSearch();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    search(value);
  };

  return (
    <div>
      <div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Search products..."
        />
        <button onClick={refresh}>Refresh</button>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}

      <div>
        {products.map(product => (
          <div key={product.id}>
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <p>{product.category}</p>
          </div>
        ))}
      </div>

      {hasMore && (
        <button onClick={nextPage} disabled={loading}>
          Load More (Page {page})
        </button>
      )}
    </div>
  );
};