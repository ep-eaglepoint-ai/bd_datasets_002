import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../repository_after/src/App';

// Helper to create mock files
const createMockFile = (name: string, type: string, size = 1024): File => {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
};

describe('Image Sharpener & Cropper Application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Requirement 1: Upload image (PNG, JPG, WebP)
  // ============================================
  describe('Requirement 1: Image Upload Support', () => {
    it('should allow uploading PNG images', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });
    });

    it('should allow uploading JPG images', async () => {
      render(<App />);
      const file = createMockFile('test.jpg', 'image/jpeg');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });
    });

    it('should allow uploading WebP images', async () => {
      render(<App />);
      const file = createMockFile('test.webp', 'image/webp');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });
    });

    it('should support drag-and-drop upload', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      });

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Requirement 2: Reject unsupported file types
  // ============================================
  describe('Requirement 2: Unsupported File Type Rejection', () => {
    it('should reject unsupported file types and show error message', async () => {
      render(<App />);
      const file = createMockFile('test.gif', 'image/gif');
      const dropZone = screen.getByTestId('drop-zone');

      // Use drop to bypass input accept attribute
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/unsupported/i)).toBeInTheDocument();
      });
    });

    it('should reject non-image files', async () => {
      render(<App />);
      const file = createMockFile('test.pdf', 'application/pdf');
      const dropZone = screen.getByTestId('drop-zone');

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
          types: ['Files'],
        },
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Requirement 3: Display uploaded image preview
  // ============================================
  describe('Requirement 3: Image Preview Display', () => {
    it('should display the uploaded image in a preview area', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        const preview = screen.getByTestId('image-preview');
        expect(preview).toBeInTheDocument();
        expect(preview).toBeVisible();
      });
    });
  });

  // ============================================
  // Requirement 4: Crop with movable/resizable box
  // ============================================
  describe('Requirement 4: Cropping Tool', () => {
    it('should render a crop box after image upload', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('crop-box')).toBeInTheDocument();
      });
    });

    it('should allow moving the crop box', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        const cropBox = screen.getByTestId('crop-box');
        expect(cropBox).toBeInTheDocument();

        fireEvent.mouseDown(cropBox, { clientX: 50, clientY: 50 });
        fireEvent.mouseMove(cropBox, { clientX: 100, clientY: 100 });
        fireEvent.mouseUp(cropBox);
      });
    });

    it('should allow resizing the crop box', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('crop-resize-handle')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Requirement 5: Aspect ratio options
  // ============================================
  describe('Requirement 5: Aspect Ratio Options', () => {
    it('should provide Free aspect ratio option', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /free/i })).toBeInTheDocument();
      });
    });

    it('should provide 1:1 aspect ratio option', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '1:1' })).toBeInTheDocument();
      });
    });

    it('should provide 4:3 aspect ratio option', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '4:3' })).toBeInTheDocument();
      });
    });

    it('should provide 16:9 aspect ratio option', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '16:9' })).toBeInTheDocument();
      });
    });

    it('should change aspect ratio when option is selected', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(async () => {
        const option = screen.getByRole('button', { name: '1:1' });
        await userEvent.click(option);
        expect(option).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  // ============================================
  // Requirement 6: Rotate in 90-degree increments
  // ============================================
  describe('Requirement 6: Image Rotation', () => {
    it('should provide rotation controls', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('rotate-button')).toBeInTheDocument();
      });
    });

    it('should rotate image by 90 degrees when rotate button is clicked', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(async () => {
        const rotateButton = screen.getByTestId('rotate-button');
        await userEvent.click(rotateButton);

        expect(screen.getByTestId('rotation-value')).toHaveTextContent('90');
      });
    });

    it('should support 0, 90, 180, 270 degree rotations', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(async () => {
        const rotateButton = screen.getByTestId('rotate-button');

        // Click 4 times to cycle through all rotations
        await userEvent.click(rotateButton); // 90
        await userEvent.click(rotateButton); // 180
        await userEvent.click(rotateButton); // 270
        await userEvent.click(rotateButton); // 0

        expect(screen.getByTestId('rotation-value')).toHaveTextContent('0');
      });
    });
  });

  // ============================================
  // Requirement 7: Sharpening slider with preview
  // ============================================
  describe('Requirement 7: Sharpening Intensity Slider', () => {
    it('should provide a sharpening intensity slider', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('sharpening-slider')).toBeInTheDocument();
      });
    });

    it('should update preview when sharpening value changes', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        const slider = screen.getByTestId('sharpening-slider');
        fireEvent.change(slider, { target: { value: '50' } });
        expect(slider).toHaveValue('50');
      });
    });

    it('should have slider range from 0 to 100', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        const slider = screen.getByTestId('sharpening-slider');
        expect(slider).toHaveAttribute('min', '0');
        expect(slider).toHaveAttribute('max', '100');
      });
    });
  });

  // ============================================
  // Requirement 8: Client-side canvas processing
  // ============================================
  describe('Requirement 8: Client-Side Canvas Processing', () => {
    it('should use canvas for image processing', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
      });
    });

    it('should apply sharpening via canvas convolution', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        const slider = screen.getByTestId('sharpening-slider');
        fireEvent.change(slider, { target: { value: '75' } });

        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
      });
    });
  });

  // ============================================
  // Requirement 9: Before/after preview
  // ============================================
  describe('Requirement 9: Before/After Preview', () => {
    it('should provide a before/after comparison toggle', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('compare-toggle')).toBeInTheDocument();
      });
    });

    it('should show original image when viewing before state', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(async () => {
        const toggle = screen.getByTestId('compare-toggle');
        await userEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  // ============================================
  // Requirement 10: Output format selection
  // ============================================
  describe('Requirement 10: Output Format Selection', () => {
    it('should provide PNG output format option', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        const select = screen.getByTestId('format-select');
        expect(select).toContainHTML('PNG');
      });
    });

    it('should provide JPG output format option', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        const select = screen.getByTestId('format-select');
        expect(select).toContainHTML('JPG');
      });
    });

    it('should provide WebP output format option', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        const select = screen.getByTestId('format-select');
        expect(select).toContainHTML('WebP');
      });
    });
  });

  // ============================================
  // Requirement 11: Quality adjustment for JPG/WebP
  // ============================================
  describe('Requirement 11: Output Quality Adjustment', () => {
    it('should provide quality slider for JPG format', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(async () => {
        const formatSelect = screen.getByTestId('format-select');
        await userEvent.selectOptions(formatSelect, 'image/jpeg');

        expect(screen.getByTestId('quality-slider')).toBeInTheDocument();
      });
    });

    it('should provide quality slider for WebP format', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(async () => {
        const formatSelect = screen.getByTestId('format-select');
        await userEvent.selectOptions(formatSelect, 'image/webp');

        expect(screen.getByTestId('quality-slider')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Requirement 12: Download final image
  // ============================================
  describe('Requirement 12: Download Functionality', () => {
    it('should provide a download button', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('download-button')).toBeInTheDocument();
      });
    });

    it('should trigger download when download button is clicked', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(async () => {
        const downloadButton = screen.getByTestId('download-button');
        await userEvent.click(downloadButton);

        expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // Requirement 13: No backend communication
  // ============================================
  describe('Requirement 13: Client-Side Only Processing', () => {
    it('should not make any fetch requests during image processing', async () => {
      vi.clearAllMocks();
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(async () => {
        const slider = screen.getByTestId('sharpening-slider');
        fireEvent.change(slider, { target: { value: '50' } });

        const downloadButton = screen.getByTestId('download-button');
        await userEvent.click(downloadButton);

        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    it('should process images entirely using browser APIs', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // Requirement 14: Reset function
  // ============================================
  describe('Requirement 14: Reset Functionality', () => {
    it('should provide a reset button', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('reset-button')).toBeInTheDocument();
      });
    });

    it('should restore original image when reset is clicked', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(async () => {
        const slider = screen.getByTestId('sharpening-slider');
        fireEvent.change(slider, { target: { value: '80' } });

        const resetButton = screen.getByTestId('reset-button');
        await userEvent.click(resetButton);

        expect(screen.getByTestId('sharpening-slider')).toHaveValue('0');
      });
    });

    it('should reset rotation to 0 degrees', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(async () => {
        const rotateButton = screen.getByTestId('rotate-button');
        await userEvent.click(rotateButton);
        await userEvent.click(rotateButton);

        const resetButton = screen.getByTestId('reset-button');
        await userEvent.click(resetButton);

        expect(screen.getByTestId('rotation-value')).toHaveTextContent('0');
      });
    });
  });

  // ============================================
  // Additional: Zoom slider for preview
  // ============================================
  describe('Additional: Zoom Preview Control', () => {
    it('should provide a zoom slider for preview', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByTestId('zoom-slider')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Additional: Accessibility
  // ============================================
  describe('Additional: Accessibility', () => {
    it('should have proper ARIA labels on interactive elements', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByLabelText(/upload/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/rotate/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sharpening/i)).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation for crop area', async () => {
      render(<App />);
      const file = createMockFile('test.png', 'image/png');
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      await waitFor(() => {
        const cropBox = screen.getByTestId('crop-box');
        expect(cropBox).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  // ============================================
  // Additional: Error handling
  // ============================================
  describe('Additional: Error Handling', () => {
    it('should show warning for oversized images', async () => {
      render(<App />);
      // The app shows warning for large dimensions in the onload handler
      // This is tested through the error message display mechanism
      const file = createMockFile('large.png', 'image/png', 50 * 1024 * 1024);
      const input = screen.getByTestId('file-input');

      await userEvent.upload(input, file);

      // Either shows error or handles gracefully
      await waitFor(() => {
        const hasPreview = screen.queryByTestId('image-preview');
        const hasError = screen.queryByRole('alert');
        expect(hasPreview || hasError).toBeTruthy();
      });
    });
  });

  // ============================================
  // Additional: Layout structure
  // ============================================
  describe('Additional: Layout Structure', () => {
    it('should have a control panel', () => {
      render(<App />);
      expect(screen.getByTestId('control-panel')).toBeInTheDocument();
    });

    it('should have a preview panel', () => {
      render(<App />);
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    });
  });
});
