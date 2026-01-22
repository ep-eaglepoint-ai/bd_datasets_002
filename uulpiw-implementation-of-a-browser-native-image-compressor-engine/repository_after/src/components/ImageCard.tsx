import React from 'react';

interface ImageCardProps {
  file: File;
  preview: string;
  result: {
    blob: Blob;
    width: number;
    height: number;
    originalSize: number;
    compressedSize: number;
    savings: number;
  } | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

const formatBytes = (bytes: number): string => {
  return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
};

export const ImageCard: React.FC<ImageCardProps> = ({ file, preview, result, status, error }) => {
  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace(/\.[^.]+$/, '_compressed.png');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      backgroundColor: '#fff'
    }}>
      <img src={preview} alt={file.name} style={{
        width: '100%',
        height: '200px',
        objectFit: 'cover',
        borderRadius: '4px',
        marginBottom: '12px'
      }} />
      
      <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
        {file.name}
      </div>

      {status === 'processing' && (
        <div style={{ color: '#666', fontSize: '14px' }}>Compressing...</div>
      )}

      {status === 'error' && (
        <div style={{ color: '#d32f2f', fontSize: '14px' }}>{error}</div>
      )}

      {status === 'done' && result && (
        <>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
            Original: {formatBytes(result.originalSize)} | Compressed: {formatBytes(result.compressedSize)} | Saved: {result.savings.toFixed(0)}%
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
            Dimensions: {result.width} × {result.height}
          </div>
          <button
            onClick={handleDownload}
            style={{
              backgroundColor: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              width: '100%'
            }}
          >
            Download PNG
          </button>
        </>
      )}
    </div>
  );
};
