import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, className = '', id, ...props }) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}</label>
            <textarea
                id={inputId}
                className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[100px] resize-y ${className}`}
                {...props}
            />
        </div>
    );
};
