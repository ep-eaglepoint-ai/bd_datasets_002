import React, { useState } from 'react';

/**
 * SearchBar component provides search functionality for filtering messages
 * @param {Function} onSearch - Callback to handle search queries
 * @param {string} query - Current search query string
 * @param {string} scope - Current search scope ('current' or 'all')
 */
function SearchBar({ onSearch, query, scope }) {
  const [localQuery, setLocalQuery] = useState(query || '');
  const [localScope, setLocalScope] = useState(scope || 'current');

  /**
   * Triggers the search with current query and scope
   */
  const handleSearch = () => {
    onSearch(localQuery, localScope);
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-input"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        placeholder="Search messages..."
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      <div className="search-scope">
        <button
          className={`scope-btn ${localScope === 'current' ? 'active' : ''}`}
          onClick={() => setLocalScope('current')}
        >
          This chat
        </button>
        <button
          className={`scope-btn ${localScope === 'all' ? 'active' : ''}`}
          onClick={() => setLocalScope('all')}
        >
          All chats
        </button>
      </div>
    </div>
  );
}

export default SearchBar;