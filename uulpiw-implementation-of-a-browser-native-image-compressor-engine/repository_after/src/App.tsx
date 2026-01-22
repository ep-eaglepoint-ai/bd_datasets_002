import React, { useState } from 'react';
import { ImageCard } from './components/ImageCard';
import { compressImage, CompressionResult } from './utils/compressor';

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  result: CompressionResult | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [maxWidth, setMaxWidth] = useState<string>('');
  const [maxHeight, setMaxHeight] = useState<string>('');
  const [compressionStrength, setCompressionStrength] = useState<number>(0.7);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => 
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );

    const newImages: ImageItem[] = validFiles.map(file => ({
      id: Math.random().toString(36),
      file,
      preview: URL.createObjectURL(file),
      result: null,
      status: 'pending'
    }));

    setImages(prev => [...prev, ...newImages]);

    for (const img of newImages) {
      processImage(img.id, img.file);
    }
  };

  const processImage = async (id: string, file: File) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, status: 'processing' as const } : img
    ));

    try {
      const result = await compressImage(
        file,
        maxWidth ? parseInt(maxWidth) : undefined,
        maxHeight ? parseInt(maxHeight) : undefined,
        compressionStrength
      );

      setImages(prev => prev.map(img =>
        img.id === id ? { ...img, result, status: 'done' as const } : img
      ));
    } catch (error) {
      setImages(prev => prev.map(img =>
        img.id === id ? { 
          ...img, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Compression failed'
        } : img
      ));
    }
  };

  const handleClear = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#333'
        }}>
          Image Compressor
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '24px'
        }}>
          Client-side PNG compression with 50%+ size reduction
        </p>

        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#555' }}>
                Max Width (px)
              </label>
              <input
                type="number"
                value={maxWidth}
                onChange={(e) => setMaxWidth(e.target.value)}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#555' }}>
                Max Height (px)
              </label>
              <input
                type="number"
                value={maxHeight}
                onChange={(e) => setMaxHeight(e.target.value)}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#555' }}>
                Compression: {compressionStrength.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={compressionStrength}
                onChange={(e) => setCompressionStrength(parseFloat(e.target.value))}
                style={{ width: '100%', marginTop: '8px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{
              flex: 1,
              backgroundColor: '#1976d2',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'center',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Select Images
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>

            {images.length > 0 && (
              <button
                onClick={handleClear}
                style={{
                  backgroundColor: '#d32f2f',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {images.map(img => (
            <ImageCard
              key={img.id}
              file={img.file}
              preview={img.preview}
              result={img.result}
              status={img.status}
              error={img.error}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
