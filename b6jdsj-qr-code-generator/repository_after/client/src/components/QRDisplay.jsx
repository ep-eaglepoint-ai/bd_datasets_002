export default function QRDisplay({ data, error, loading }) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 h-64">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-40 w-40 bg-gray-200 rounded"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded mt-4"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <div className="mt-2 text-sm text-red-700">
                            <p>{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (data) {
        return (
            <div className="mt-8 flex flex-col items-center animate-fade-in-up">
                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <img src={data.qrCode} alt="Generated QR Code" className="w-64 h-64" />
                </div>
                <p className="mt-4 text-xs text-gray-500">
                    Generated at: {new Date(data.timestamp).toLocaleString()}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 h-64 text-gray-400">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <p>Enter text to see QR code</p>
        </div>
    );
}
