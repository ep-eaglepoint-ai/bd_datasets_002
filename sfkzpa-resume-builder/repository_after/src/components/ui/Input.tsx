import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', id, ...props }) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
                {label} {props.required && <span className="text-red-500">*</span>}
            </label>
            <input
                id={inputId}
                className={`px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${error
                        ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    } ${className}`}
                {...props}
            />
            {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
    );
};
