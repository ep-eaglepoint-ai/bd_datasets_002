<script lang="ts">
  import Card from './Card.svelte';
  
  export let mode: 'login' | 'register' = 'login';
  export let error: string = '';
  export let loading: boolean = false;
  export let onModeChange: ((mode: 'login' | 'register') => void) | null = null;
  export let onSubmit: ((data: { email: string; password: string; name?: string }) => void) | null = null;

  let email = '';
  let password = '';
  let name = '';

  function handleSubmit() {
    if (onSubmit) {
      onSubmit({
        email: email.trim(),
        password,
        ...(mode === 'register' ? { name: name.trim() } : {})
      });
    }
  }
</script>

<Card title={mode === 'login' ? 'Login' : 'Register'}>
  {#if error}
    <p class="error" role="alert" aria-live="assertive">{error}</p>
  {/if}
  <form
    on:submit|preventDefault={handleSubmit}
    aria-label={mode === 'login' ? 'Login form' : 'Registration form'}
  >
    <div class="auth-toggle" role="tablist" aria-label="Authentication mode">
      <button
        type="button"
        class:active={mode === 'login'}
        on:click={() => onModeChange?.('login')}
        role="tab"
        aria-selected={mode === 'login'}
        aria-controls="auth-form"
      >
        Login
      </button>
      <button
        type="button"
        class:active={mode === 'register'}
        on:click={() => onModeChange?.('register')}
        role="tab"
        aria-selected={mode === 'register'}
        aria-controls="auth-form"
      >
        Register
      </button>
    </div>
    <div id="auth-form" role="tabpanel">
      {#if mode === 'register'}
        <label>
          Name
          <input
            type="text"
            bind:value={name}
            required
            aria-required="true"
            aria-label="Full name"
          />
        </label>
      {/if}
      <label>
        Email
        <input
          type="email"
          bind:value={email}
          required
          aria-required="true"
          aria-label="Email address"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          bind:value={password}
          minlength="6"
          required
          aria-required="true"
          aria-label="Password"
        />
      </label>
      <button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
      </button>
    </div>
  </form>
</Card>

<style>
  .auth-toggle {
    display: flex;
    gap: 0.5rem;
    background: #f3f4f6;
    padding: 0.25rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
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

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.5rem;
    display: block;
  }

  input[type='email'],
  input[type='password'],
  input[type='text'] {
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
