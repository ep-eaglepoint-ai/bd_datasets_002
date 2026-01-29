<script lang="ts">
  import { onMount } from 'svelte';
  import { writable, get } from 'svelte/store';

  type Role = 'ADMIN' | 'BORROWER';

  interface User {
    id: number;
    email: string;
    name: string;
    role: Role;
  }

  interface Book {
    id: number;
    title: string;
    author: string;
    isbn: string;
    category?: string | null;
    totalCopies: number;
    availableCopies: number;
    publicationYear?: number | null;
  }

  interface Loan {
    id: number;
    book: Book;
    user?: { id: number; name: string; email: string };
    borrowedAt: string;
    dueDate: string;
    returnedAt?: string | null;
    isOverdue?: boolean;
    fineCents?: number;
  }

  const user = writable<User | null>(null);
  const books = writable<Book[]>([]);
  const loans = writable<Loan[]>([]);
  const search = writable('');
  const loadingBooks = writable(false);
  const loadingLoans = writable(false);
  const authError = writable('');
  const authLoading = writable(false);
  const actionLoading = writable<Record<string, boolean>>({});
  const viewAllLoans = writable(false);

  async function fetchCurrent() {
    await loadBooks();
    await loadLoans();
  }

  async function loadBooks() {
    loadingBooks.set(true);
    const q = get(search);
    const url = q ? `/api/books?q=${encodeURIComponent(q)}` : '/api/books';
    const res = await fetch(url);
    if (res.ok) {
      books.set(await res.json());
    }
    loadingBooks.set(false);
  }

  async function loadLoans() {
    loadingLoans.set(true);
    const view = get(viewAllLoans) && get(user)?.role === 'ADMIN' ? 'all' : 'mine';
    const res = await fetch(`/api/loans?view=${view}`);
    if (res.ok) {
      loans.set(await res.json());
    }
    loadingLoans.set(false);
  }

  // Computed statistics
  $: stats = {
    totalBooks: $books.length,
    availableBooks: $books.filter(b => b.availableCopies > 0).length,
    totalLoans: $loans.length,
    activeLoans: $loans.filter(l => !l.returnedAt).length,
    overdueLoans: $loans.filter(l => l.isOverdue && !l.returnedAt).length,
    totalFines: $loans.reduce((sum, l) => sum + (l.fineCents || 0), 0)
  };

  let authMode: 'login' | 'register' = 'login';
  let email = '';
  let password = '';
  let name = '';

  async function submitAuth() {
    authError.set('');
    authLoading.set(true);
    try {
      const payload: any = { action: authMode, email: email.trim(), password };
      if (authMode === 'register') payload.name = name.trim();
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Authentication failed' }));
        authError.set(errorData.message || 'Authentication failed');
        return;
      }
      const u = (await res.json()) as User;
      user.set(u);
      email = '';
      password = '';
      name = '';
      await fetchCurrent();
    } catch (e) {
      authError.set('Network error. Please try again.');
    } finally {
      authLoading.set(false);
    }
  }

  async function logout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
    user.set(null);
    loans.set([]);
  }

  let bookForm: Partial<Book> = {};
  let bookFormError = '';
  let editingId: number | null = null;

  function startEdit(book: Book) {
    editingId = book.id;
    bookForm = { ...book };
  }

  function resetBookForm() {
    editingId = null;
    bookForm = {};
    bookFormError = '';
  }

  async function saveBook() {
    bookFormError = '';
    
    // Frontend validation
    if (!bookForm.title?.trim()) {
      bookFormError = 'Title is required';
      return;
    }
    if (!bookForm.author?.trim()) {
      bookFormError = 'Author is required';
      return;
    }
    if (!bookForm.isbn?.trim()) {
      bookFormError = 'ISBN is required';
      return;
    }
    const totalCopiesNum = Number(bookForm.totalCopies ?? 0);
    if (totalCopiesNum < 1) {
      bookFormError = 'Total copies must be at least 1';
      return;
    }
    const availableCopiesNum = Number(bookForm.availableCopies ?? bookForm.totalCopies ?? 0);
    if (availableCopiesNum < 0 || availableCopiesNum > totalCopiesNum) {
      bookFormError = `Available copies must be between 0 and ${totalCopiesNum}`;
      return;
    }
    const pubYear = bookForm.publicationYear != null ? Number(bookForm.publicationYear) : null;
    if (pubYear !== null && (pubYear < 0 || pubYear > new Date().getFullYear())) {
      bookFormError = `Publication year must be between 0 and ${new Date().getFullYear()}`;
      return;
    }
    
    const key = editingId ? `edit-${editingId}` : 'create';
    actionLoading.update(loading => ({ ...loading, [key]: true }));
    try {
      const payload = {
        title: bookForm.title?.trim(),
        author: bookForm.author?.trim(),
        isbn: bookForm.isbn?.trim(),
        category: bookForm.category?.trim() || null,
        totalCopies: totalCopiesNum,
        availableCopies: availableCopiesNum,
        publicationYear: pubYear
      };
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...payload } : payload;
      const res = await fetch('/api/books', {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to save book' }));
        bookFormError = errorData.message || 'Failed to save book';
        return;
      }
      resetBookForm();
      await loadBooks();
    } catch (e) {
      bookFormError = 'Network error. Please try again.';
    } finally {
      actionLoading.update(loading => ({ ...loading, [key]: false }));
    }
  }

  async function deleteBook(id: number) {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) return;
    actionLoading.update(loading => ({ ...loading, [`delete-${id}`]: true }));
    try {
      const res = await fetch(`/api/books?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to delete book' }));
        alert(errorData.message || 'Failed to delete book');
        return;
      }
      await loadBooks();
    } catch (e) {
      alert('Network error. Please try again.');
    } finally {
      actionLoading.update(loading => ({ ...loading, [`delete-${id}`]: false }));
    }
  }

  async function borrow(bookId: number) {
    actionLoading.update(loading => ({ ...loading, [`borrow-${bookId}`]: true }));
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookId })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to borrow book' }));
        alert(errorData.message || 'Failed to borrow book');
        return;
      }
      await loadBooks();
      await loadLoans();
    } catch (e) {
      alert('Network error. Please try again.');
    } finally {
      actionLoading.update(loading => ({ ...loading, [`borrow-${bookId}`]: false }));
    }
  }

  async function returnLoan(loanId: number) {
    actionLoading.update(loading => ({ ...loading, [`return-${loanId}`]: true }));
    try {
      const res = await fetch('/api/loans', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ loanId })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to return book' }));
        alert(errorData.message || 'Failed to return book');
        return;
      }
      await loadBooks();
      await loadLoans();
    } catch (e) {
      alert('Network error. Please try again.');
    } finally {
      actionLoading.update(loading => ({ ...loading, [`return-${loanId}`]: false }));
    }
  }

  async function loadCurrentUser() {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const u = await res.json();
        if (u) {
          user.set(u);
          await fetchCurrent();
        }
      }
    } catch (e) {
      // Silently fail if session check fails
    }
  }

  onMount(() => {
    loadCurrentUser();
  });
</script>

<main class="app">
  <header class="topbar">
    <h1>Library Management System</h1>
    {#if $user}
      <div class="user-info">
        <span>{$user.name} ({$user.role})</span>
        <button class="secondary" on:click={logout}>Logout</button>
      </div>
    {:else}
      <div class="auth-toggle">
        <button class:active={authMode === 'login'} on:click={() => (authMode = 'login')}
          >Login</button
        >
        <button
          class:active={authMode === 'register'}
          on:click={() => (authMode = 'register')}
          >Register</button
        >
      </div>
    {/if}
  </header>

  {#if !$user}
    <section class="card">
      <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
      {#if $authError}<p class="error">{$authError}</p>{/if}
      <form
        on:submit|preventDefault={submitAuth}
        aria-label={authMode === 'login' ? 'Login form' : 'Registration form'}
      >
        {#if authMode === 'register'}
          <label>
            Name
            <input bind:value={name} required />
          </label>
        {/if}
        <label>
          Email
          <input type="email" bind:value={email} required />
        </label>
        <label>
          Password
          <input type="password" bind:value={password} minlength="6" required />
        </label>
        <button type="submit" disabled={$authLoading}>
          {$authLoading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create account'}
        </button>
      </form>
    </section>
  {/if}

  <section class="layout">
    <section class="card">
      <header class="card-header">
        <h2>Books</h2>
        <input
          type="search"
          placeholder="Search by title, author, ISBN"
          bind:value={$search}
          on:input={loadBooks}
          aria-label="Search books"
        />
      </header>
      {#if $loadingBooks}
        <p>Loading books...</p>
      {:else if $books.length === 0}
        <p>No books found.</p>
      {:else}
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>ISBN</th>
              <th>Available / Total</th>
              <th>Category</th>
              <th>Year</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each $books as book}
              <tr class:low-stock={book.availableCopies <= 2 && book.availableCopies > 0} class:out-of-stock={book.availableCopies === 0}>
                <td data-label="Title">{book.title}</td>
                <td data-label="Author">{book.author}</td>
                <td data-label="ISBN">{book.isbn}</td>
                <td data-label="Available / Total">
                  <span class:low-stock-badge={book.availableCopies <= 2 && book.availableCopies > 0} class:out-of-stock-badge={book.availableCopies === 0}>
                    {book.availableCopies} / {book.totalCopies}
                  </span>
                </td>
                <td data-label="Category">{book.category || '-'}</td>
                <td data-label="Year">{book.publicationYear || '-'}</td>
                <td data-label="Actions">
                  {#if $user}
                    <button 
                      on:click={() => borrow(book.id)} 
                      disabled={book.availableCopies <= 0 || $actionLoading[`borrow-${book.id}`]}
                    >
                      {$actionLoading[`borrow-${book.id}`] ? 'Borrowing...' : 'Borrow'}
                    </button>
                    {#if $user.role === 'ADMIN'}
                      <button on:click={() => startEdit(book)} disabled={$actionLoading[`edit-${book.id}`]}>
                        Edit
                      </button>
                      <button 
                        class="danger"
                        on:click={() => deleteBook(book.id)} 
                        disabled={$actionLoading[`delete-${book.id}`]}
                      >
                        {$actionLoading[`delete-${book.id}`] ? 'Deleting...' : 'Delete'}
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
      {/if}
    </section>

    <section class="card">
      <header class="card-header">
        <h2>{$user?.role === 'ADMIN' ? 'All Loans &amp; History' : 'Your Loans &amp; History'}</h2>
        {#if $user?.role === 'ADMIN'}
          <label class="toggle-label">
            <input type="checkbox" bind:checked={$viewAllLoans} on:change={loadLoans} />
            <span>View All Loans</span>
          </label>
        {/if}
      </header>
      {#if !$user}
        <p>Please login to view your loans.</p>
      {:else if $loadingLoans}
        <p>Loading loans...</p>
      {:else if $loans.length === 0}
        <p>No loans yet.</p>
      {:else}
        <table>
          <thead>
            <tr>
              <th>Book</th>
              {#if $user?.role === 'ADMIN'}
                <th>Borrower</th>
              {/if}
              <th>Borrowed</th>
              <th>Due</th>
              <th>Status</th>
              <th>Fine</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each $loans as loan}
              <tr class:overdue={loan.isOverdue && !loan.returnedAt}>
                <td data-label="Book">{loan.book.title}</td>
                {#if $user?.role === 'ADMIN'}
                  <td data-label="Borrower">{loan.user?.name || 'Unknown'}</td>
                {/if}
                <td data-label="Borrowed">{new Date(loan.borrowedAt).toLocaleDateString()}</td>
                <td data-label="Due">
                  {new Date(loan.dueDate).toLocaleDateString()}
                  {#if !loan.returnedAt}
                    {@const daysUntilDue = Math.ceil((new Date(loan.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                    {#if daysUntilDue < 0}
                      <span class="days-badge overdue-badge">({Math.abs(daysUntilDue)} days overdue)</span>
                    {:else if daysUntilDue <= 3}
                      <span class="days-badge warning-badge">({daysUntilDue} days left)</span>
                    {:else}
                      <span class="days-badge">({daysUntilDue} days left)</span>
                    {/if}
                  {/if}
                </td>
                <td data-label="Status">
                  {#if loan.returnedAt}
                    <span class="status-badge returned">Returned</span>
                  {:else if loan.isOverdue}
                    <span class="status-badge overdue">Overdue</span>
                  {:else}
                    <span class="status-badge active">Active</span>
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
                      on:click={() => returnLoan(loan.id)}
                      disabled={$actionLoading[`return-${loan.id}`]}
                    >
                      {$actionLoading[`return-${loan.id}`] ? 'Returning...' : 'Return'}
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
  </section>

  {#if $user}
    <section class="card dashboard">
      <h2>Dashboard</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{$books.length}</div>
          <div class="stat-label">Total Books</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{stats.availableBooks}</div>
          <div class="stat-label">Available Books</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{stats.activeLoans}</div>
          <div class="stat-label">Active Loans</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{stats.overdueLoans}</div>
          <div class="stat-label">Overdue Items</div>
        </div>
        {#if $user.role === 'ADMIN'}
          <div class="stat-card">
            <div class="stat-value">{stats.totalLoans}</div>
            <div class="stat-label">Total Loans</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${(stats.totalFines / 100).toFixed(2)}</div>
            <div class="stat-label">Total Fines</div>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  {#if $user && $user.role === 'ADMIN'}
    <section class="card">
      <h2>{editingId ? 'Edit book' : 'Add new book'}</h2>
      {#if bookFormError}<p class="error">{bookFormError}</p>{/if}
      <form on:submit|preventDefault={saveBook} class="book-form">
        <label>
          Title
          <input bind:value={bookForm.title} required />
        </label>
        <label>
          Author
          <input bind:value={bookForm.author} required />
        </label>
        <label>
          ISBN
          <input bind:value={bookForm.isbn} required />
        </label>
        <label>
          Category
          <input bind:value={bookForm.category} />
        </label>
        <label>
          Total copies
          <input type="number" min="1" bind:value={bookForm.totalCopies} required />
        </label>
        <label>
          Available copies
          <input type="number" min="0" bind:value={bookForm.availableCopies} />
        </label>
        <label>
          Publication year
          <input type="number" min="0" bind:value={bookForm.publicationYear} />
        </label>
        <div class="actions">
          <button 
            type="submit" 
            disabled={$actionLoading[editingId ? `edit-${editingId}` : 'create']}
          >
            {$actionLoading[editingId ? `edit-${editingId}` : 'create'] 
              ? 'Saving...' 
              : editingId ? 'Save changes' : 'Add book'}
          </button>
          {#if editingId}
            <button type="button" class="secondary" on:click={resetBookForm}>Cancel</button>
          {/if}
        </div>
      </form>
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    background-attachment: fixed;
    min-height: 100vh;
  }

  .app {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    min-height: 100vh;
    color: #1f2937;
  }
  
  @media (max-width: 768px) {
    .app {
      padding: 1rem;
    }
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    padding: 1.25rem 1.75rem;
    border-radius: 1rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }

  .topbar h1 {
    font-size: 1.875rem;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
    letter-spacing: -0.025em;
  }
  
  @media (max-width: 640px) {
    .topbar {
      flex-direction: column;
      align-items: flex-start;
      padding: 1rem;
    }
    .topbar h1 {
      font-size: 1.5rem;
    }
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-info span {
    font-weight: 600;
    color: #4b5563;
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border-radius: 0.5rem;
    font-size: 0.9rem;
  }

  .auth-toggle {
    display: flex;
    gap: 0.5rem;
    background: #f3f4f6;
    padding: 0.25rem;
    border-radius: 0.5rem;
  }

  .auth-toggle button {
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    color: #6b7280;
    cursor: pointer;
    border-radius: 0.375rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .auth-toggle button.active {
    background: white;
    color: #667eea;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .layout {
    display: grid;
    grid-template-columns: 2fr 1.5fr;
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  @media (max-width: 1024px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }

  .card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
  }

  .card h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 1rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .card h2::before {
    content: '';
    width: 4px;
    height: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 2px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  input[type='search'],
  input[type='email'],
  input[type='password'],
  input[type='number'],
  input:not([type]) {
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

  label {
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.5rem;
    display: block;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    overflow-x: auto;
    display: block;
  }
  
  @media (min-width: 641px) {
    table {
      display: table;
    }
  }
  
  th,
  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
  }
  
  @media (max-width: 640px) {
    th,
    td {
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
    }
  }
  
  th {
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    font-weight: 700;
    color: #374151;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
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

  button:not([disabled]):active {
    transform: translateY(0);
  }

  button.secondary {
    background: #6b7280;
    box-shadow: 0 4px 6px rgba(107, 114, 128, 0.3);
  }

  button.secondary:hover:not([disabled]) {
    background: #4b5563;
    box-shadow: 0 6px 12px rgba(107, 114, 128, 0.4);
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

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  form.book-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  @media (max-width: 640px) {
    form.book-form {
      grid-template-columns: 1fr;
    }
  }

  form.book-form label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .actions {
    grid-column: 1 / -1;
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
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

  .stat-card {
    background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
    border-radius: 0.75rem;
    padding: 1.5rem;
    text-align: center;
    border: 2px solid #e5e7eb;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: 800;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
    line-height: 1;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border-radius: 0.5rem;
    transition: background 0.2s ease;
  }

  .toggle-label:hover {
    background: #e5e7eb;
  }

  .toggle-label input[type="checkbox"] {
    width: auto;
    cursor: pointer;
    width: 18px;
    height: 18px;
    accent-color: #667eea;
  }

  p {
    color: #6b7280;
    line-height: 1.6;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
