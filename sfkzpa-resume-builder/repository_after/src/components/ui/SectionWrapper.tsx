import React from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';

interface SectionWrapperProps {
    title: string;
    isVisible: boolean;
    onToggle: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    children: React.ReactNode;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
    title,
    isVisible,
    onToggle,
    onMoveUp,
    onMoveDown,
    children
}) => {
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white mb-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
                <div className="flex items-center gap-1">
                    <button onClick={onMoveUp} className="p-2 hover:bg-gray-200 rounded-md text-gray-600 transition-colors" title="Move Up">
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={onMoveDown} className="p-2 hover:bg-gray-200 rounded-md text-gray-600 transition-colors" title="Move Down">
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-2"></div>
                    <button onClick={onToggle} className={`p-2 rounded-md transition-colors ${isVisible ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`} title={isVisible ? "Hide Section" : "Show Section"}>
                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                </div>
            </div>
            {isVisible && <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">{children}</div>}
        </div>
    )
}
