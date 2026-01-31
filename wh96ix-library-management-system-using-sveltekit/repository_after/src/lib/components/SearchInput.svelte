<script lang="ts">
  export let value: string = '';
  export let placeholder: string = 'Search...';
  export let onInput: ((value: string) => void) | null = null;
</script>

<input
  type="search"
  {placeholder}
  bind:value
  on:input={(e) => onInput?.(e.currentTarget.value)}
  aria-label={placeholder}
  role="searchbox"
/>

<style>
  input[type='search'] {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 2px solid #e5e7eb;
    font-size: 1rem;
    transition: all 0.2s ease;
    background: white;
  }

  input[type='search']:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
</style>
