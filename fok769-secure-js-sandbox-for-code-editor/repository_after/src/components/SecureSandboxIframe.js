import React from 'react';

export default function SecureSandboxIframe({ iframeRef }) {
  return (
    <iframe
      ref={iframeRef}
      title="code-sandbox"
      sandbox="allow-scripts"
      style={{ display: 'none', position: 'absolute', width: 0, height: 0 }}
    />
  );
}
