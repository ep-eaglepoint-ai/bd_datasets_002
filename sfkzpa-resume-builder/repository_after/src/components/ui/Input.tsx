import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', id, ...props }) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}</label>
            <input
                id={inputId}
                className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${className}`}
                {...props}
            />
        </div>
    );
};
