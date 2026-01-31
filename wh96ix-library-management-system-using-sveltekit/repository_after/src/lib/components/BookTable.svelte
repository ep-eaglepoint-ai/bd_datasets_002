<script lang="ts">
  import type { Book } from '$lib/stores/books';
  import type { User } from '$lib/stores/user';
  import Pagination from './Pagination.svelte';

  export let books: Book[] = [];
  export let loading: boolean = false;
  export let user: User | null = null;
  export let actionLoading: Record<string, boolean> = {};
  export let currentPage: number = 1;
  export let itemsPerPage: number = 10;
  export let onBorrow: ((bookId: number) => void) | null = null;
  export let onEdit: ((book: Book) => void) | null = null;
  export let onDelete: ((bookId: number) => void) | null = null;
  export let onPageChange: ((page: number) => void) | null = null;

  $: startIndex = (currentPage - 1) * itemsPerPage;
  $: endIndex = startIndex + itemsPerPage;
  $: paginatedBooks = books.slice(startIndex, endIndex);
  $: totalPages = Math.ceil(books.length / itemsPerPage);
</script>

{#if loading}
  <p aria-live="polite" aria-busy="true">Loading books...</p>
{:else if books.length === 0}
  <p>No books found.</p>
{:else}
  <div class="table-container">
    <table role="table" aria-label="Books table">
      <thead>
        <tr>
          <th scope="col">Title</th>
          <th scope="col">Author</th>
          <th scope="col">ISBN</th>
          <th scope="col">Available / Total</th>
          <th scope="col">Category</th>
          <th scope="col">Year</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each paginatedBooks as book (book.id)}
          <tr
            class:low-stock={book.availableCopies <= 2 && book.availableCopies > 0}
            class:out-of-stock={book.availableCopies === 0}
          >
            <td data-label="Title">{book.title}</td>
            <td data-label="Author">{book.author}</td>
            <td data-label="ISBN">{book.isbn}</td>
            <td data-label="Available / Total">
              <span
                class:low-stock-badge={book.availableCopies <= 2 && book.availableCopies > 0}
                class:out-of-stock-badge={book.availableCopies === 0}
              >
                {book.availableCopies} / {book.totalCopies}
              </span>
            </td>
            <td data-label="Category">{book.category || '-'}</td>
            <td data-label="Year">{book.publicationYear || '-'}</td>
            <td data-label="Actions">
              {#if user}
                <button
                  on:click={() => onBorrow?.(book.id)}
                  disabled={book.availableCopies <= 0 || actionLoading[`borrow-${book.id}`]}
                  aria-label="Borrow {book.title}"
                >
                  {actionLoading[`borrow-${book.id}`] ? 'Borrowing...' : 'Borrow'}
                </button>
                {#if user.role === 'ADMIN'}
                  <button
                    on:click={() => onEdit?.(book)}
                    disabled={actionLoading[`edit-${book.id}`]}
                    aria-label="Edit {book.title}"
                  >
                    Edit
                  </button>
                  <button
                    class="danger"
                    on:click={() => onDelete?.(book.id)}
                    disabled={actionLoading[`delete-${book.id}`]}
                    aria-label="Delete {book.title}"
                  >
                    {actionLoading[`delete-${book.id}`] ? 'Deleting...' : 'Delete'}
                  </button>
                {/if}
              {:else}
                <span class="muted">Login to borrow</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <Pagination
    {currentPage}
    {totalPages}
    onPageChange={onPageChange}
    label="Books pagination"
  />
{/if}

<style>
  .table-container {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  th,
  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
  }

  th {
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    font-weight: 700;
    color: #374151;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
  }

  tbody tr {
    transition: background-color 0.2s ease;
  }

  tbody tr:hover {
    background-color: #f9fafb;
  }

  tr.low-stock {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
  }

  tr.out-of-stock {
    background: #fef2f2;
    border-left: 4px solid #dc2626;
  }

  .low-stock-badge {
    color: #d97706;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    background: #fef3c7;
    border-radius: 0.375rem;
    font-size: 0.75rem;
  }

  .out-of-stock-badge {
    color: #dc2626;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    background: #fee2e2;
    border-radius: 0.375rem;
    font-size: 0.75rem;
  }

  button {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
    margin-right: 0.5rem;
  }

  button[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }

  button:not([disabled]):hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
  }

  button.danger {
    background: #ef4444;
    box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);
  }

  button.danger:hover:not([disabled]) {
    background: #dc2626;
    box-shadow: 0 6px 12px rgba(239, 68, 68, 0.4);
  }

  .muted {
    color: #9ca3af;
    font-size: 0.875rem;
    font-style: italic;
  }

  @media (max-width: 640px) {
    table thead {
      display: none;
    }
    table tbody tr {
      display: block;
      margin-bottom: 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1rem;
      background: #f9fafb;
    }
    table tbody td {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    table tbody td:last-child {
      border-bottom: none;
    }
    table tbody td:before {
      content: attr(data-label);
      font-weight: 700;
      margin-right: 1rem;
      color: #6b7280;
    }
  }
</style>
