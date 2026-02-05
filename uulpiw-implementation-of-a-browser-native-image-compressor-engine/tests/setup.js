// Lightweight polyfills for browser APIs in Node.js test environment
global.OffscreenCanvas = class OffscreenCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this._data = new Uint8ClampedArray(width * height * 4);
    this._data.fill(0);
  }

  getContext(type, options) {
    const canvas = this;
    return {
      canvas,
      fillStyle: "#000000",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
      
      fillRect(x, y, w, h) {
        const rgba = this._parseColor(this.fillStyle);
        for (let i = y; i < y + h && i < canvas.height; i++) {
          for (let j = x; j < x + w && j < canvas.width; j++) {
            const idx = (i * canvas.width + j) * 4;
            canvas._data[idx] = rgba[0];
            canvas._data[idx + 1] = rgba[1];
            canvas._data[idx + 2] = rgba[2];
            canvas._data[idx + 3] = rgba[3];
          }
        }
      },
      
      drawImage(source, dx, dy, dw, dh) {
        if (source._data) {
          const sw = dw || source.width;
          const sh = dh || source.height;
          for (let i = 0; i < sh && i < canvas.height; i++) {
            for (let j = 0; j < sw && j < canvas.width; j++) {
              const srcIdx = (i * source.width + j) * 4;
              const dstIdx = ((dy + i) * canvas.width + (dx + j)) * 4;
              canvas._data[dstIdx] = source._data[srcIdx];
              canvas._data[dstIdx + 1] = source._data[srcIdx + 1];
              canvas._data[dstIdx + 2] = source._data[srcIdx + 2];
              canvas._data[dstIdx + 3] = source._data[srcIdx + 3];
            }
          }
        }
      },
      
      clearRect(x, y, w, h) {
        for (let i = y; i < y + h && i < canvas.height; i++) {
          for (let j = x; j < x + w && j < canvas.width; j++) {
            const idx = (i * canvas.width + j) * 4;
            canvas._data[idx] = 0;
            canvas._data[idx + 1] = 0;
            canvas._data[idx + 2] = 0;
            canvas._data[idx + 3] = 0;
          }
        }
      },
      
      getImageData(x, y, w, h) {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < h; i++) {
          for (let j = 0; j < w; j++) {
            const srcIdx = ((y + i) * canvas.width + (x + j)) * 4;
            const dstIdx = (i * w + j) * 4;
            data[dstIdx] = canvas._data[srcIdx];
            data[dstIdx + 1] = canvas._data[srcIdx + 1];
            data[dstIdx + 2] = canvas._data[srcIdx + 2];
            data[dstIdx + 3] = canvas._data[srcIdx + 3];
          }
        }
        return { data, width: w, height: h };
      },
      
      _parseColor(color) {
        if (color.startsWith("rgba")) {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          return [
            parseInt(match[1]),
            parseInt(match[2]),
            parseInt(match[3]),
            match[4] ? Math.floor(parseFloat(match[4]) * 255) : 255
          ];
        }
        if (color.startsWith("rgb")) {
          const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), 255];
        }
        return [0, 0, 0, 255];
      }
    };
  }

  async convertToBlob({ type, quality }) {
    const baseSize = this.width * this.height * 0.5;
    const size = type === "image/jpeg" 
      ? Math.floor(baseSize * (quality || 0.92))
      : Math.floor(baseSize);
    
    const blob = new Blob([new Uint8Array(size)], { type });
    blob._canvasData = this._data;
    blob._width = this.width;
    blob._height = this.height;
    return blob;
  }
};

global.createImageBitmap = async (blob) => {
  const width = blob._width || Math.floor(Math.sqrt(blob.size * 2));
  const height = blob._height || Math.floor(Math.sqrt(blob.size * 2));
  
  return {
    width,
    height,
    _data: blob._canvasData || new Uint8ClampedArray(width * height * 4),
    close: () => {},
  };
};

global.Worker = class Worker {
  constructor(url, options) {
    this.onmessage = null;
    this.onerror = null;
  }
  
  postMessage(data) {
    setTimeout(async () => {
      try {
        const { id, file, compressionStrength } = data;
        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: file.type });
        blob._canvasData = file._canvasData;
        blob._width = file._width;
        blob._height = file._height;
        
        const originalSize = file.size;
        const compressedSize = Math.floor(originalSize * 0.4);
        
        const resultBlob = new Blob([new Uint8Array(compressedSize)], { type: "image/png" });
        resultBlob._canvasData = blob._canvasData;
        resultBlob._width = blob._width;
        resultBlob._height = blob._height;
        
        const result = {
          blob: resultBlob,
          width: blob._width || 100,
          height: blob._height || 100,
          originalSize,
          compressedSize,
          savings: ((originalSize - compressedSize) / originalSize) * 100
        };
        
        if (this.onmessage) {
          this.onmessage({ data: { id, result } });
        }
      } catch (error) {
        if (this.onerror) {
          this.onerror(error);
        }
      }
    }, 10);
  }
  
  terminate() {}
};

global.File = class File extends Blob {
  constructor(bits, name, options) {
    super(bits, options);
    this.name = name;
    this.lastModified = Date.now();
    if (bits[0] && bits[0]._canvasData) {
      this._canvasData = bits[0]._canvasData;
      this._width = bits[0]._width;
      this._height = bits[0]._height;
    }
  }
  
  async arrayBuffer() {
    return super.arrayBuffer ? super.arrayBuffer() : Promise.resolve(new ArrayBuffer(this.size));
  }
};
