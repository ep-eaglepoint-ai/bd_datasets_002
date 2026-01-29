// url.ts
export function normalizeUrl(input: string): string | null {
  // 1. Basic guards
  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (trimmed === '') return null;

  // 2. Detect scheme (RFC-compliant pattern)
  const schemeMatch = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.exec(trimmed);
  const hasScheme = !!schemeMatch;

  // 3. If no scheme, default to https (requirement: handle missing schemes)
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    // Malformed URL → reject
    return null;
  }

  const protocol = url.protocol.toLowerCase();

  // 4. Reject clearly unsafe / invalid protocols
  // (This is "prevent invalid protocols", NOT "only allow http")
  if (
    protocol === 'javascript:' ||
    protocol === 'data:' ||
    protocol === 'vbscript:'
  ) {
    return null;
  }

  // 5. Normalize ONLY http / https
  if (protocol === 'http:' || protocol === 'https:') {
    // Hostname must exist for web URLs
    if (!url.hostname) return null;

    const hostname = url.hostname.toLowerCase();

    const isDefaultPort =
      (protocol === 'https:' && url.port === '443') ||
      (protocol === 'http:' && url.port === '80');

    const port = !isDefaultPort && url.port ? `:${url.port}` : '';

    const pathname = url.pathname === '/' ? '' : url.pathname;

    return (
      `${protocol}//${hostname}` +
      `${port}` +
      `${pathname}` +
      `${url.search}` +
      `${url.hash}` 
    );
  }

  // 6. Non-http(s) but valid scheme → store safely, unmodified
  // (requirement: safely store unusual or edge-case URLs)
  return url.href;
}
