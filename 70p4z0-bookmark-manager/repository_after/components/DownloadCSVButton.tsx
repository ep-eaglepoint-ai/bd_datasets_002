import React from 'react';
import { Bookmark } from '../types';

// Import the existing export function
import { exportToCSV } from '../utils/importExport';

interface DownloadCSVButtonProps {
  bookmarks: Bookmark[];
  className?: string;
  children?: React.ReactNode;
}

export const DownloadCSVButton: React.FC<DownloadCSVButtonProps> = ({
  bookmarks,
  className = '',
  children = 'Download CSV'
}) => {
  const handleDownload = () => {
    try {
      // Generate CSV content using existing export logic
      const csvContent = exportToCSV(bookmarks);
      
      // Create a Blob with the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create a download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Set download attributes
      link.setAttribute('href', url);
      link.setAttribute('download', `bookmarks_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      // Append to document, trigger click, and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download CSV:', error);
      // Optionally, you could show an error message here
    }
  };

  return (
    <button
      onClick={handleDownload}
      className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
      disabled={bookmarks.length === 0}
      title={bookmarks.length === 0 ? 'No bookmarks to export' : 'Download bookmarks as CSV'}
    >
      <svg
        className="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {children}
    </button>
  );
};
