import React, { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';

// Types
interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

type AspectRatio = 'free' | '1:1' | '4:3' | '16:9';
type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const App: React.FC = () => {
  // State
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [rotation, setRotation] = useState<number>(0);
  const [sharpening, setSharpening] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(100);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('image/png');
  const [quality, setQuality] = useState<number>(90);
  const [showBefore, setShowBefore] = useState<boolean>(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCropDragging, setIsCropDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Validate and load image
  const handleFileSelect = useCallback((file: File) => {
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Please upload PNG, JPG, or WebP images only.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 20MB.');
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (img.naturalWidth > 8000 || img.naturalHeight > 8000) {
        setError('Warning: Large image detected. Performance may be affected.');
      }
      setImage(img);
      setImageUrl(url);
      setCropArea({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      setError('Failed to load image. Please try another file.');
    };

    img.src = url;
  }, []);

  // File input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // Rotation handler
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset handler
  const handleReset = () => {
    setRotation(0);
    setSharpening(0);
    setZoom(100);
    setAspectRatio('free');
    setQuality(90);
    setShowBefore(false);
    if (image) {
      setCropArea({ x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight });
    }
  };

  // Apply sharpening using convolution kernel
  // The sharpening kernel enhances edges by subtracting neighboring pixel values
  // from the center pixel, weighted by the kernel values.
  // Standard sharpening kernel:
  // [  0, -1,  0 ]
  // [ -1,  5, -1 ]
  // [  0, -1,  0 ]
  const applySharpeningKernel = (
    imageData: ImageData,
    intensity: number
  ): ImageData => {
    const { data, width, height } = imageData;
    const output = new Uint8ClampedArray(data);

    // Sharpening convolution kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    const factor = intensity / 100;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * width + x) * 4 + c;
          // Blend original and sharpened based on intensity
          output[idx] = Math.round(data[idx] * (1 - factor) + sum * factor);
        }
      }
    }

    return new ImageData(output, width, height);
  };

  // Process and render image to canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size based on rotation
    const isRotated90or270 = rotation === 90 || rotation === 270;
    const displayWidth = isRotated90or270 ? image.naturalHeight : image.naturalWidth;
    const displayHeight = isRotated90or270 ? image.naturalWidth : image.naturalHeight;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.save();

    // Apply rotation
    ctx.translate(displayWidth / 2, displayHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);

    // Draw image
    ctx.drawImage(image, 0, 0);
    ctx.restore();

    // Apply sharpening if needed
    if (sharpening > 0 && !showBefore) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const sharpened = applySharpeningKernel(imageData, sharpening);
      ctx.putImageData(sharpened, 0, 0);
    }
  }, [image, rotation, sharpening, showBefore]);

  // Download handler - applies crop before downloading
  const handleDownload = () => {
    if (!canvasRef.current) return;

    // Create a temporary canvas to apply the crop
    const sourceCanvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    // Calculate crop dimensions in actual canvas pixels (accounting for DPR)
    const cropX = cropArea.x * dpr;
    const cropY = cropArea.y * dpr;
    const cropWidth = cropArea.width * dpr;
    const cropHeight = cropArea.height * dpr;

    // Create output canvas with cropped dimensions
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = cropWidth;
    outputCanvas.height = cropHeight;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Draw only the cropped region from source canvas to output canvas
    ctx.drawImage(
      sourceCanvas,
      cropX, cropY, cropWidth, cropHeight,  // Source rectangle (crop area)
      0, 0, cropWidth, cropHeight            // Destination rectangle (full output)
    );

    outputCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edited-image.${outputFormat.split('/')[1]}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      outputFormat,
      outputFormat === 'image/png' ? undefined : quality / 100
    );
  };

  // Get aspect ratio as numeric value
  const getAspectRatioValue = (ratio: AspectRatio): number | null => {
    switch (ratio) {
      case '1:1': return 1;
      case '4:3': return 4 / 3;
      case '16:9': return 16 / 9;
      default: return null;
    }
  };

  // Enforce aspect ratio on crop area
  const enforceAspectRatio = useCallback((crop: CropArea, ratio: AspectRatio): CropArea => {
    const ratioValue = getAspectRatioValue(ratio);
    if (!ratioValue) return crop;

    // Adjust height based on width to maintain ratio
    const newHeight = crop.width / ratioValue;
    return { ...crop, height: newHeight };
  }, []);

  // Get canvas dimensions (accounting for rotation)
  const getCanvasDimensions = useCallback(() => {
    if (!image) return { width: 0, height: 0 };
    const isRotated90or270 = rotation === 90 || rotation === 270;
    return {
      width: isRotated90or270 ? image.naturalHeight : image.naturalWidth,
      height: isRotated90or270 ? image.naturalWidth : image.naturalHeight
    };
  }, [image, rotation]);

  // Crop box mouse handlers for dragging
  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCropDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({ ...cropArea });
  };

  // Resize handle mouse handler
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({ ...cropArea });
  };

  // Mouse move handler (for both dragging and resizing)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isCropDragging && !isResizing) return;

    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions();
    const scale = zoom / 100;
    const deltaX = (e.clientX - dragStart.x) / scale;
    const deltaY = (e.clientY - dragStart.y) / scale;

    if (isCropDragging) {
      // Moving the crop box
      let newX = Math.max(0, cropStart.x + deltaX);
      let newY = Math.max(0, cropStart.y + deltaY);

      // Constrain to canvas bounds
      newX = Math.min(newX, canvasWidth - cropArea.width);
      newY = Math.min(newY, canvasHeight - cropArea.height);

      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
    } else if (isResizing) {
      // Resizing the crop box
      let newWidth = Math.max(20, cropStart.width + deltaX);
      let newHeight = Math.max(20, cropStart.height + deltaY);

      // Constrain to canvas bounds
      newWidth = Math.min(newWidth, canvasWidth - cropArea.x);
      newHeight = Math.min(newHeight, canvasHeight - cropArea.y);

      let newCrop = { ...cropArea, width: newWidth, height: newHeight };

      // Enforce aspect ratio if not free
      if (aspectRatio !== 'free') {
        newCrop = enforceAspectRatio({ ...newCrop, width: newWidth }, aspectRatio);
        // Re-check height bounds after ratio enforcement
        if (newCrop.height > canvasHeight - cropArea.y) {
          newCrop.height = canvasHeight - cropArea.y;
          const ratioValue = getAspectRatioValue(aspectRatio);
          if (ratioValue) {
            newCrop.width = newCrop.height * ratioValue;
          }
        }
      }

      setCropArea(newCrop);
    }
  }, [isCropDragging, isResizing, dragStart, cropStart, cropArea, aspectRatio, zoom, getCanvasDimensions, enforceAspectRatio]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setIsCropDragging(false);
    setIsResizing(false);
  }, []);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isCropDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isCropDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Update crop area when aspect ratio changes
  useEffect(() => {
    if (aspectRatio !== 'free' && image) {
      setCropArea(prev => enforceAspectRatio(prev, aspectRatio));
    }
  }, [aspectRatio, image, enforceAspectRatio]);

  // Crop box keyboard navigation
  const handleCropKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case 'ArrowUp':
        setCropArea(prev => ({ ...prev, y: Math.max(0, prev.y - step) }));
        break;
      case 'ArrowDown':
        setCropArea(prev => ({ ...prev, y: prev.y + step }));
        break;
      case 'ArrowLeft':
        setCropArea(prev => ({ ...prev, x: Math.max(0, prev.x - step) }));
        break;
      case 'ArrowRight':
        setCropArea(prev => ({ ...prev, x: prev.x + step }));
        break;
    }
  };

  return (
    <div className="app">
      <aside className="control-panel" data-testid="control-panel" role="complementary" aria-label="Controls">
        <h1>Image Sharpener & Cropper</h1>

        {/* Upload Section */}
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          data-testid="drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleInputChange}
            aria-label="Upload image"
            data-testid="file-input"
          />
          <p>Drag & drop or click to upload (PNG, JPG, WebP)</p>
        </div>

        {error && <div className="error-message" role="alert">{error}</div>}

        {image && (
          <>
            {/* Aspect Ratio */}
            <fieldset>
              <legend>Aspect Ratio</legend>
              {(['free', '1:1', '4:3', '16:9'] as AspectRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  aria-pressed={aspectRatio === ratio}
                  className={aspectRatio === ratio ? 'active' : ''}
                >
                  {ratio === 'free' ? 'Free' : ratio}
                </button>
              ))}
            </fieldset>

            {/* Rotation */}
            <div className="control-group">
              <button
                onClick={handleRotate}
                aria-label="Rotate image 90 degrees"
                data-testid="rotate-button"
              >
                Rotate 90°
              </button>
              <span data-testid="rotation-value">Rotation: {rotation}°</span>
            </div>

            {/* Sharpening */}
            <div className="control-group">
              <label htmlFor="sharpening-slider">Sharpening Intensity</label>
              <input
                id="sharpening-slider"
                type="range"
                min="0"
                max="100"
                value={sharpening}
                onChange={(e) => setSharpening(Number(e.target.value))}
                aria-label="Sharpening intensity"
                data-testid="sharpening-slider"
              />
              <span>{sharpening}%</span>
            </div>

            {/* Zoom */}
            <div className="control-group">
              <label htmlFor="zoom-slider">Zoom</label>
              <input
                id="zoom-slider"
                type="range"
                min="10"
                max="200"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom preview"
                data-testid="zoom-slider"
              />
              <span>{zoom}%</span>
            </div>

            {/* Before/After Toggle */}
            <button
              onClick={() => setShowBefore(!showBefore)}
              aria-pressed={showBefore}
              data-testid="compare-toggle"
            >
              {showBefore ? 'Show After' : 'Show Before'}
            </button>

            {/* Output Format */}
            <div className="control-group">
              <label htmlFor="format-select">Output Format</label>
              <select
                id="format-select"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                aria-label="Output format"
                data-testid="format-select"
              >
                <option value="image/png">PNG</option>
                <option value="image/jpeg">JPG</option>
                <option value="image/webp">WebP</option>
              </select>
            </div>

            {/* Quality (for JPG/WebP) */}
            {outputFormat !== 'image/png' && (
              <div className="control-group">
                <label htmlFor="quality-slider">Quality</label>
                <input
                  id="quality-slider"
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  aria-label="Output quality"
                  data-testid="quality-slider"
                />
                <span>{quality}%</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                onClick={handleDownload}
                aria-label="Download image"
                data-testid="download-button"
              >
                Download
              </button>
              <button
                onClick={handleReset}
                aria-label="Reset all changes"
                data-testid="reset-button"
              >
                Reset
              </button>
            </div>
          </>
        )}
      </aside>

      <main className="preview-panel" data-testid="preview-panel" role="main">
        {image ? (
          <div
            ref={previewContainerRef}
            className="preview-container"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <canvas
              ref={canvasRef}
              data-testid="image-preview"
              role="img"
              aria-label="Image preview"
            />
            <div
              className="crop-box"
              data-testid="crop-box"
              role="region"
              aria-label="Crop area"
              tabIndex={0}
              onKeyDown={handleCropKeyDown}
              onMouseDown={handleCropMouseDown}
              style={{
                left: cropArea.x,
                top: cropArea.y,
                width: cropArea.width,
                height: cropArea.height,
                cursor: isCropDragging ? 'grabbing' : 'grab',
              }}
            >
              <div
                className="crop-resize-handle"
                data-testid="crop-resize-handle"
                data-resize="se"
                onMouseDown={handleResizeMouseDown}
                style={{ cursor: 'se-resize' }}
              />
            </div>
          </div>
        ) : (
          <p className="placeholder">Upload an image to get started</p>
        )}
      </main>
    </div>
  );
};

export default App;
