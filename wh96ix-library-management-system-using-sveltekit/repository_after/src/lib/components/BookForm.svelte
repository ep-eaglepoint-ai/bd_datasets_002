<script lang="ts">
  import Card from './Card.svelte';
  import type { Book } from '$lib/stores/books';

  export let book: Partial<Book> = {};
  export let error: string = '';
  export let loading: boolean = false;
  export let onSubmit: ((book: Partial<Book>) => void) | null = null;
  export let onCancel: (() => void) | null = null;

  $: isEditing = !!book.id;
  $: title = isEditing ? 'Edit book' : 'Add new book';
</script>

<Card {title}>
  {#if error}
    <p class="error" role="alert" aria-live="assertive">{error}</p>
  {/if}
  <form on:submit|preventDefault={() => onSubmit?.(book)} class="book-form" aria-label="Book form">
    <label>
      Title
      <input
        type="text"
        bind:value={book.title}
        required
        aria-required="true"
        aria-label="Book title"
      />
    </label>
    <label>
      Author
      <input
        type="text"
        bind:value={book.author}
        required
        aria-required="true"
        aria-label="Book author"
      />
    </label>
    <label>
      ISBN
      <input
        type="text"
        bind:value={book.isbn}
        required
        aria-required="true"
        aria-label="ISBN"
      />
    </label>
    <label>
      Category
      <input
        type="text"
        bind:value={book.category}
        aria-label="Book category"
      />
    </label>
    <label>
      Total copies
      <input
        type="number"
        min="1"
        bind:value={book.totalCopies}
        required
        aria-required="true"
        aria-label="Total copies"
      />
    </label>
    <label>
      Available copies
      <input
        type="number"
        min="0"
        bind:value={book.availableCopies}
        aria-label="Available copies"
      />
    </label>
    <label>
      Publication year
      <input
        type="number"
        min="0"
        bind:value={book.publicationYear}
        aria-label="Publication year"
      />
    </label>
    <div class="actions">
      <button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? 'Saving...' : isEditing ? 'Save changes' : 'Add book'}
      </button>
      {#if isEditing && onCancel}
        <button type="button" class="secondary" on:click={onCancel}>
          Cancel
        </button>
      {/if}
    </div>
  </form>
</Card>

<style>
  .book-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  @media (max-width: 640px) {
    .book-form {
      grid-template-columns: 1fr;
    }
  }

  .book-form label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  input[type='text'],
  input[type='number'] {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 2px solid #e5e7eb;
    font-size: 1rem;
    transition: all 0.2s ease;
    background: white;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .actions {
    grid-column: 1 / -1;
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
  }

  button {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    border: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
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

  button.secondary {
    background: #6b7280;
    box-shadow: 0 4px 6px rgba(107, 114, 128, 0.3);
  }

  button.secondary:hover:not([disabled]) {
    background: #4b5563;
    box-shadow: 0 6px 12px rgba(107, 114, 128, 0.4);
  }

  .error {
    color: #dc2626;
    margin-bottom: 0.75rem;
    padding: 0.75rem 1rem;
    background: #fee2e2;
    border-radius: 0.5rem;
    border-left: 4px solid #dc2626;
    font-weight: 500;
  }
</style>
