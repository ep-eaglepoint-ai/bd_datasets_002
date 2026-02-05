<script lang="ts">
  export let currentPage: number = 1;
  export let totalPages: number = 1;
  export let onPageChange: ((page: number) => void) | null = null;
  export let label: string = '';

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange?.(page);
    }
  }
</script>

{#if totalPages > 1}
  <nav class="pagination" aria-label={label || 'Pagination'}>
    <button
      class="pagination-button"
      on:click={() => goToPage(currentPage - 1)}
      disabled={currentPage === 1}
      aria-label="Previous page"
    >
      Previous
    </button>
    <span class="page-info" aria-live="polite">
      Page {currentPage} of {totalPages}
    </span>
    <button
      class="pagination-button"
      on:click={() => goToPage(currentPage + 1)}
      disabled={currentPage === totalPages}
      aria-label="Next page"
    >
      Next
    </button>
  </nav>
{/if}

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
    padding: 1rem;
  }

  .pagination-button {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 2px solid #e5e7eb;
    background: white;
    color: #374151;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .pagination-button:hover:not([disabled]) {
    background: #f3f4f6;
    border-color: #667eea;
  }

  .pagination-button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }
</style>
