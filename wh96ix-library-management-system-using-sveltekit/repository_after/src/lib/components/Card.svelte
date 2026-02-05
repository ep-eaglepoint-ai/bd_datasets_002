<script lang="ts">
  export let title: string = '';
  export let class: string = '';
</script>

<section class="card {class}" role="region" aria-labelledby={title ? `card-title-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}>
  {#if title}
    <h2 id="card-title-{title.replace(/\s+/g, '-').toLowerCase()}">{title}</h2>
  {/if}
  <slot />
</section>

<style>
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
</style>
