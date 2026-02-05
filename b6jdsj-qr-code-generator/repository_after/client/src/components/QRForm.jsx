import { useState } from 'react';

export default function QRForm({ onGenerate, loading }) {
    const [text, setText] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const val = e.target.value;
        if (val.length <= 500) {
            setText(val);
            setError('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) {
            setError('Input cannot be empty');
            return;
        }
        if (text.length > 500) {
            setError('Input exceeds 500 characters');
            return;
        }
        onGenerate(text);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="qr-text" className="block text-sm font-medium text-gray-700">
                    Content
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                        type="text"
                        id="qr-text"
                        className={`block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 border ${error ? 'border-red-500' : ''}`}
                        placeholder="Enter text or URL"
                        value={text}
                        onChange={handleChange}
                        disabled={loading}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className={`text-xs ${text.length > 500 ? 'text-red-500' : 'text-gray-500'}`}>
                            {text.length}/500
                        </span>
                    </div>
                </div>
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>

            <button
                type="submit"
                disabled={loading || !text.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                ) : (
                    'Generate QR'
                )}
            </button>
        </form>
    );
}
