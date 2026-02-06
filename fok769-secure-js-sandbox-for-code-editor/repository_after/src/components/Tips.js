import React from 'react';

export default function Tips() {
  return (
    <div className="mt-4 bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-2">Editor Features:</h3>
      <ul className="text-xs text-gray-500 space-y-1">
        <li>• Tab key support for proper indentation (2 spaces)</li>
        <li>• Line numbers for easy navigation</li>
        <li>• Copy, download, and upload code files</li>
        <li>• Multiple language syntax support</li>
        <li>• Monospace font for better code readability</li>
        <li>• Run JavaScript code directly in the browser</li>
      </ul>
    </div>
  );
}
