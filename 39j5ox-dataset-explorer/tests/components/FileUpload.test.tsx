import { render, screen, fireEvent } from '@testing-library/react'
import { FileUpload } from '@/components/FileUpload'
import { useDatasetStore } from '@/store/dataset-store'

// Mock the store
jest.mock('@/store/dataset-store')
const mockUseDatasetStore = useDatasetStore as jest.MockedFunction<typeof useDatasetStore>

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
  })),
}))

// Mock CSVParser
jest.mock('@/lib/parser', () => ({
  CSVParser: {
    detectEncoding: jest.fn().mockResolvedValue('utf-8'),
    detectDelimiter: jest.fn().mockReturnValue(','),
  },
}))

describe('FileUpload Component', () => {
  const mockSetCurrentDataset = jest.fn()
  const mockSetError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseDatasetStore.mockReturnValue({
      setCurrentDataset: mockSetCurrentDataset,
      setError: mockSetError,
    } as any)
  })

  it('should render upload interface', () => {
    render(<FileUpload />)

    expect(screen.getByText('Dataset Explorer')).toBeInTheDocument()
    expect(screen.getByText('Upload your CSV dataset')).toBeInTheDocument()
    expect(screen.getByText('Choose File')).toBeInTheDocument()
  })

  it('should show drag and drop instructions', () => {
    render(<FileUpload />)

    expect(screen.getByText('Drag and drop a CSV file, or click to browse')).toBeInTheDocument()
  })

  it('should show file format requirements', () => {
    render(<FileUpload />)

    expect(screen.getByText('CSV files up to 100MB')).toBeInTheDocument()
    expect(screen.getByText('Automatic delimiter and encoding detection')).toBeInTheDocument()
  })

  it('should handle drag active state', () => {
    const { useDropzone } = require('react-dropzone')
    useDropzone.mockReturnValue({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ 'data-testid': 'file-input' }),
      isDragActive: true,
    })

    render(<FileUpload />)

    expect(screen.getByText('Drop your CSV file here')).toBeInTheDocument()
  })

  it('should have dropzone element', () => {
    render(<FileUpload />)

    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
    expect(screen.getByTestId('file-input')).toBeInTheDocument()
  })
})