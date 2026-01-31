<script lang="ts">
  export let value: string | number;
  export let label: string;
</script>

<div class="stat-card" role="region" aria-label="{label}">
  <div class="stat-value">{value}</div>
  <div class="stat-label">{label}</div>
</div>

<style>
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
</style>
