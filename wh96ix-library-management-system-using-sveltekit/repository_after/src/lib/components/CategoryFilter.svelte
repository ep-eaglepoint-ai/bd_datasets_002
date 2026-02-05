<script lang="ts">
  import type { Book } from '$lib/stores/books';
  
  export let books: Book[] = [];
  export let selectedCategory: string = 'all';
  export let onCategoryChange: ((category: string) => void) | null = null;

  $: categories = ['all', ...new Set(books.map(b => b.category).filter(Boolean) as string[])].sort();
</script>

<label class="filter-label" aria-label="Filter by category">
  <span>Category:</span>
  <select
    value={selectedCategory}
    on:change={(e) => {
      selectedCategory = e.currentTarget.value;
      onCategoryChange?.(selectedCategory);
    }}
    aria-label="Select category filter"
  >
    {#each categories as category}
      <option value={category}>{category === 'all' ? 'All Categories' : category}</option>
    {/each}
  </select>
</label>

<style>
  .filter-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
  }

  select {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 2px solid #e5e7eb;
    font-size: 0.875rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
</style>
