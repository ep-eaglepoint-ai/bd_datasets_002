import { useState } from 'react'
import QRForm from './components/QRForm'
import QRDisplay from './components/QRDisplay'

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async (text) => {
    setLoading(true);
    setError(null);
    setData(null);
    // Call backend directly on port 4000 (backend runs on 4000; frontend on 3000)
    const apiUrl = 'http://localhost:4000/api/generate';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate QR code');
      }

      // Backend returns base64-only string; convert to data URI for display
      setData({ ...result, qrCode: `data:image/png;base64,${result.qrCode}` });
    } catch (err) {
      // Normalize a common jsdom/XHR error into a user-friendly message
      const msg = err && err.message ? err.message : String(err);
      if (msg.includes('did not match the expected pattern')) {
        setError('Network request failed (invalid URL or environment)');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">QR Generator</h1>
          <p className="mt-2 text-sm text-gray-600">Enter text to generate a QR code</p>
        </div>

        <QRForm onGenerate={handleGenerate} loading={loading} />

        <QRDisplay data={data} error={error} loading={loading} />
      </div>
    </div>
  )
}

export default App
