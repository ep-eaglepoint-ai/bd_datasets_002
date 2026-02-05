<script lang="ts">
  import type { Loan } from '$lib/stores/loans';
  import type { User } from '$lib/stores/user';
  import Pagination from './Pagination.svelte';

  export let loans: Loan[] = [];
  export let loading: boolean = false;
  export let user: User | null = null;
  export let actionLoading: Record<string, boolean> = {};
  export let currentPage: number = 1;
  export let itemsPerPage: number = 10;
  export let onReturn: ((loanId: number) => void) | null = null;
  export let onPageChange: ((page: number) => void) | null = null;

  $: startIndex = (currentPage - 1) * itemsPerPage;
  $: endIndex = startIndex + itemsPerPage;
  $: paginatedLoans = loans.slice(startIndex, endIndex);
  $: totalPages = Math.ceil(loans.length / itemsPerPage);
</script>

{#if !user}
  <p>Please login to view your loans.</p>
{:else if loading}
  <p aria-live="polite" aria-busy="true">Loading loans...</p>
{:else if loans.length === 0}
  <p>No loans yet.</p>
{:else}
  <div class="table-container">
    <table role="table" aria-label="Loans table">
      <thead>
        <tr>
          <th scope="col">Book</th>
          {#if user?.role === 'ADMIN'}
            <th scope="col">Borrower</th>
          {/if}
          <th scope="col">Borrowed</th>
          <th scope="col">Due</th>
          <th scope="col">Status</th>
          <th scope="col">Fine</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each paginatedLoans as loan (loan.id)}
          <tr class:overdue={loan.isOverdue && !loan.returnedAt}>
            <td data-label="Book">{loan.book.title}</td>
            {#if user?.role === 'ADMIN'}
              <td data-label="Borrower">{loan.user?.name || 'Unknown'}</td>
            {/if}
            <td data-label="Borrowed">{new Date(loan.borrowedAt).toLocaleDateString()}</td>
            <td data-label="Due">
              {new Date(loan.dueDate).toLocaleDateString()}
              {#if !loan.returnedAt}
                {@const daysUntilDue = Math.ceil((new Date(loan.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                {#if daysUntilDue < 0}
                  <span class="days-badge overdue-badge" aria-label="{Math.abs(daysUntilDue)} days overdue">
                    ({Math.abs(daysUntilDue)} days overdue)
                  </span>
                {:else if daysUntilDue <= 3}
                  <span class="days-badge warning-badge" aria-label="{daysUntilDue} days left">
                    ({daysUntilDue} days left)
                  </span>
                {:else}
                  <span class="days-badge" aria-label="{daysUntilDue} days left">
                    ({daysUntilDue} days left)
                  </span>
                {/if}
              {/if}
            </td>
            <td data-label="Status">
              {#if loan.returnedAt}
                <span class="status-badge returned" aria-label="Returned">Returned</span>
              {:else if loan.isOverdue}
                <span class="status-badge overdue" aria-label="Overdue">Overdue</span>
              {:else}
                <span class="status-badge active" aria-label="Active">Active</span>
              {/if}
            </td>
            <td data-label="Fine">
              {#if loan.fineCents && loan.fineCents > 0}
                ${(loan.fineCents / 100).toFixed(2)}
              {:else}
                -
              {/if}
            </td>
            <td data-label="Actions">
              {#if !loan.returnedAt}
                <button
                  on:click={() => onReturn?.(loan.id)}
                  disabled={actionLoading[`return-${loan.id}`]}
                  aria-label="Return {loan.book.title}"
                >
                  {actionLoading[`return-${loan.id}`] ? 'Returning...' : 'Return'}
                </button>
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
    label="Loans pagination"
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

  tr.overdue {
    background: #fef2f2;
    border-left: 4px solid #ef4444;
  }

  .days-badge {
    font-size: 0.75rem;
    margin-left: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-weight: 600;
    display: inline-block;
  }

  .days-badge.overdue-badge {
    background: #fee2e2;
    color: #dc2626;
  }

  .days-badge.warning-badge {
    background: #fef3c7;
    color: #d97706;
  }

  .days-badge:not(.overdue-badge):not(.warning-badge) {
    background: #dbeafe;
    color: #1e40af;
  }

  .status-badge {
    display: inline-block;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge.active {
    background: #dbeafe;
    color: #1e40af;
  }

  .status-badge.overdue {
    background: #fee2e2;
    color: #dc2626;
  }

  .status-badge.returned {
    background: #d1fae5;
    color: #065f46;
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
