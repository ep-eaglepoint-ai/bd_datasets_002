<script lang="ts">
  import Card from './Card.svelte';
  import type { User } from '$lib/stores/user';

  export let user: User | null = null;
  export let loading: boolean = false;
  export let error: string = '';
  export let onUpdateProfile: ((data: { name: string; email: string }) => void) | null = null;
  export let onChangePassword: ((data: { currentPassword: string; newPassword: string }) => void) | null = null;

  let name = user?.name || '';
  let email = user?.email || '';
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let passwordError = '';
  let activeTab: 'profile' | 'password' = 'profile';

  $: if (user) {
    name = user.name;
    email = user.email;
  }

  function handleUpdateProfile() {
    if (onUpdateProfile && name.trim() && email.trim()) {
      onUpdateProfile({ name: name.trim(), email: email.trim() });
    }
  }

  function handleChangePassword() {
    passwordError = '';
    if (!currentPassword || !newPassword) {
      passwordError = 'All password fields are required';
      return;
    }
    if (newPassword.length < 6) {
      passwordError = 'New password must be at least 6 characters';
      return;
    }
    if (newPassword !== confirmPassword) {
      passwordError = 'New passwords do not match';
      return;
    }
    if (onChangePassword) {
      onChangePassword({ currentPassword, newPassword });
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    }
  }
</script>

{#if user}
  <Card title="User Profile">
    <div class="tabs" role="tablist" aria-label="Profile settings">
      <button
        type="button"
        class="tab-button"
        class:active={activeTab === 'profile'}
        on:click={() => activeTab = 'profile'}
        role="tab"
        aria-selected={activeTab === 'profile'}
        aria-controls="profile-tab"
      >
        Profile Information
      </button>
      <button
        type="button"
        class="tab-button"
        class:active={activeTab === 'password'}
        on:click={() => activeTab = 'password'}
        role="tab"
        aria-selected={activeTab === 'password'}
        aria-controls="password-tab"
      >
        Change Password
      </button>
    </div>

    {#if error}
      <p class="error" role="alert" aria-live="assertive">{error}</p>
    {/if}

    {#if activeTab === 'profile'}
      <div id="profile-tab" role="tabpanel" aria-labelledby="profile-tab-button">
        <form on:submit|preventDefault={handleUpdateProfile} aria-label="Update profile form">
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
          <button type="submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    {:else}
      <div id="password-tab" role="tabpanel" aria-labelledby="password-tab-button">
        {#if passwordError}
          <p class="error" role="alert" aria-live="assertive">{passwordError}</p>
        {/if}
        <form on:submit|preventDefault={handleChangePassword} aria-label="Change password form">
          <label>
            Current Password
            <input
              type="password"
              bind:value={currentPassword}
              required
              aria-required="true"
              aria-label="Current password"
            />
          </label>
          <label>
            New Password
            <input
              type="password"
              bind:value={newPassword}
              minlength="6"
              required
              aria-required="true"
              aria-label="New password"
            />
          </label>
          <label>
            Confirm New Password
            <input
              type="password"
              bind:value={confirmPassword}
              minlength="6"
              required
              aria-required="true"
              aria-label="Confirm new password"
            />
          </label>
          <button type="submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    {/if}
  </Card>
{/if}

<style>
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .tab-button {
    padding: 0.75rem 1.5rem;
    border: none;
    background: transparent;
    color: #6b7280;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
  }

  .tab-button:hover {
    color: #374151;
  }

  .tab-button.active {
    color: #667eea;
    border-bottom-color: #667eea;
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
    display: block;
  }

  input[type='text'],
  input[type='email'],
  input[type='password'] {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 2px solid #e5e7eb;
    font-size: 1rem;
    transition: all 0.2s ease;
    background: white;
    margin-top: 0.5rem;
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
