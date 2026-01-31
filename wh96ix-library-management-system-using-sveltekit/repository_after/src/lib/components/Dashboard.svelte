<script lang="ts">
  import Card from './Card.svelte';
  import StatCard from './StatCard.svelte';
  import type { Book } from '$lib/stores/books';
  import type { Loan } from '$lib/stores/loans';
  import type { User } from '$lib/stores/user';

  export let books: Book[] = [];
  export let loans: Loan[] = [];
  export let user: User | null = null;

  $: stats = {
    totalBooks: books.length,
    availableBooks: books.filter(b => b.availableCopies > 0).length,
    totalLoans: loans.length,
    activeLoans: loans.filter(l => !l.returnedAt).length,
    overdueLoans: loans.filter(l => l.isOverdue && !l.returnedAt).length,
    totalFines: loans.reduce((sum, l) => sum + (l.fineCents || 0), 0)
  };
</script>

<Card title="Dashboard" class="dashboard">
  <div class="stats-grid" role="group" aria-label="Library statistics">
    <StatCard value={stats.totalBooks} label="Total Books" />
    <StatCard value={stats.availableBooks} label="Available Books" />
    <StatCard value={stats.activeLoans} label="Active Loans" />
    <StatCard value={stats.overdueLoans} label="Overdue Items" />
    {#if user?.role === 'ADMIN'}
      <StatCard value={stats.totalLoans} label="Total Loans" />
      <StatCard value={`$${(stats.totalFines / 100).toFixed(2)}`} label="Total Fines" />
    {/if}
  </div>
</Card>

<style>
  .dashboard {
    margin-bottom: 1.5rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1.25rem;
    margin-top: 1.25rem;
  }

  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
  }
</style>
