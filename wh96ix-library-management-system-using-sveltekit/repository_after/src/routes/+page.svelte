<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import {
    user,
    books,
    loans,
    loadingBooks,
    loadingLoans,
    searchQuery,
    selectedCategory,
    currentPage,
    itemsPerPage,
    authError,
    authLoading,
    actionLoading,
    viewAllLoans
  } from '$lib/stores';
  import type { Book } from '$lib/stores/books';
  import type { Loan } from '$lib/stores/loans';
  import AuthForm from '$lib/components/AuthForm.svelte';
  import BookTable from '$lib/components/BookTable.svelte';
  import LoanTable from '$lib/components/LoanTable.svelte';
  import BookForm from '$lib/components/BookForm.svelte';
  import Dashboard from '$lib/components/Dashboard.svelte';
  import UserProfile from '$lib/components/UserProfile.svelte';
  import Card from '$lib/components/Card.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import CategoryFilter from '$lib/components/CategoryFilter.svelte';
  import { CONFIG } from '$lib/config';

  let authMode: 'login' | 'register' = 'login';
  let bookForm: Partial<Book> = {};
  let bookFormError = '';
  let editingId: number | null = null;
  let showUserProfile = false;

  // Initialize pagination
  currentPage.set({ books: 1, loans: 1 });
  itemsPerPage.set({ books: CONFIG.ITEMS_PER_PAGE.books, loans: CONFIG.ITEMS_PER_PAGE.loans });

  async function fetchCurrent() {
    await loadBooks();
    await loadLoans();
  }

  async function loadBooks() {
    loadingBooks.set(true);
    const q = get(searchQuery);
    const category = get(selectedCategory);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category && category !== 'all') params.set('category', category);
    const url = `/api/books${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      books.set(await res.json());
      // Reset to page 1 when filtering
      currentPage.update(p => ({ ...p, books: 1 }));
    }
    loadingBooks.set(false);
  }

  async function loadLoans() {
    loadingLoans.set(true);
    const view = get(viewAllLoans) && get(user)?.role === 'ADMIN' ? 'all' : 'mine';
    const res = await fetch(`/api/loans?view=${view}`);
    if (res.ok) {
      loans.set(await res.json());
      currentPage.update(p => ({ ...p, loans: 1 }));
    }
    loadingLoans.set(false);
  }

  function handleAuthModeChange(mode: 'login' | 'register') {
    authMode = mode;
    authError.set('');
  }

  async function handleAuthSubmit(data: { email: string; password: string; name?: string }) {
    authError.set('');
    authLoading.set(true);
    try {
      const payload: any = { action: authMode, email: data.email, password: data.password };
      if (authMode === 'register' && data.name) payload.name = data.name;
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
      const u = await res.json();
      user.set(u);
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
    books.set([]);
  }

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

  async function handleUpdateProfile(data: { name: string; email: string }) {
    authLoading.set(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to update profile' }));
        authError.set(errorData.message || 'Failed to update profile');
        return;
      }
      const updated = await res.json();
      user.set(updated);
      authError.set('');
    } catch (e) {
      authError.set('Network error. Please try again.');
    } finally {
      authLoading.set(false);
    }
  }

  async function handleChangePassword(data: { currentPassword: string; newPassword: string }) {
    authLoading.set(true);
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to change password' }));
        authError.set(errorData.message || 'Failed to change password');
        return;
      }
      authError.set('');
      alert('Password changed successfully');
    } catch (e) {
      authError.set('Network error. Please try again.');
    } finally {
      authLoading.set(false);
    }
  }

  $: filteredBooks = get(books);
  $: filteredLoans = get(loans);
  $: booksPage = get(currentPage).books;
  $: loansPage = get(currentPage).loans;
  $: booksPerPage = get(itemsPerPage).books;
  $: loansPerPage = get(itemsPerPage).loans;

  onMount(() => {
    loadCurrentUser();
  });
</script>

<main class="app">
  <header class="topbar" role="banner">
    <h1>Library Management System</h1>
    {#if $user}
      <div class="user-info">
        <span aria-label="Current user: {$user.name}, Role: {$user.role}">{$user.name} ({$user.role})</span>
        <button class="secondary" on:click={() => showUserProfile = !showUserProfile} aria-label="Toggle user profile">
          Profile
        </button>
        <button class="secondary" on:click={logout} aria-label="Logout">Logout</button>
      </div>
    {:else}
      <div class="auth-toggle" role="tablist" aria-label="Authentication mode">
        <button
          class:active={authMode === 'login'}
          on:click={() => handleAuthModeChange('login')}
          role="tab"
          aria-selected={authMode === 'login'}
        >
          Login
        </button>
        <button
          class:active={authMode === 'register'}
          on:click={() => handleAuthModeChange('register')}
          role="tab"
          aria-selected={authMode === 'register'}
        >
          Register
        </button>
      </div>
    {/if}
  </header>

  {#if !$user}
    <AuthForm
      mode={authMode}
      error={$authError}
      loading={$authLoading}
      onModeChange={handleAuthModeChange}
      onSubmit={handleAuthSubmit}
    />
  {/if}

  {#if $user && showUserProfile}
    <UserProfile
      user={$user}
      loading={$authLoading}
      error={$authError}
      onUpdateProfile={handleUpdateProfile}
      onChangePassword={handleChangePassword}
    />
  {/if}

  {#if $user}
    <Dashboard books={$books} loans={$loans} user={$user} />
  {/if}

  <section class="layout">
    <Card title="Books">
      <div class="card-header">
        <SearchInput
          value={$searchQuery}
          placeholder="Search by title, author, ISBN"
          onInput={(value) => {
            searchQuery.set(value);
            loadBooks();
          }}
        />
        <CategoryFilter
          books={$books}
          selectedCategory={$selectedCategory}
          onCategoryChange={(category) => {
            selectedCategory.set(category);
            loadBooks();
          }}
        />
      </div>
      <BookTable
        books={$books}
        loading={$loadingBooks}
        user={$user}
        actionLoading={$actionLoading}
        currentPage={booksPage}
        itemsPerPage={booksPerPage}
        onBorrow={borrow}
        onEdit={startEdit}
        onDelete={deleteBook}
        onPageChange={(page) => {
          currentPage.update(p => ({ ...p, books: page }));
        }}
      />
    </Card>

    <Card title={$user?.role === 'ADMIN' ? 'All Loans &amp; History' : 'Your Loans &amp; History'}>
      <div class="card-header">
        {#if $user?.role === 'ADMIN'}
          <label class="toggle-label">
            <input
              type="checkbox"
              checked={$viewAllLoans}
              on:change={(e) => {
                viewAllLoans.set(e.currentTarget.checked);
                loadLoans();
              }}
              aria-label="View all loans"
            />
            <span>View All Loans</span>
          </label>
        {/if}
      </div>
      <LoanTable
        loans={$loans}
        loading={$loadingLoans}
        user={$user}
        actionLoading={$actionLoading}
        currentPage={loansPage}
        itemsPerPage={loansPerPage}
        onReturn={returnLoan}
        onPageChange={(page) => {
          currentPage.update(p => ({ ...p, loans: page }));
        }}
      />
    </Card>
  </section>

  {#if $user && $user.role === 'ADMIN'}
    <BookForm
      book={bookForm}
      error={bookFormError}
      loading={$actionLoading[editingId ? `edit-${editingId}` : 'create'] || false}
      onSubmit={saveBook}
      onCancel={resetBookForm}
    />
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

  .card-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
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

  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
