import React from 'react';
import { Bot } from 'lucide-react';

export default function Header() {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Chat Assistant</h1>
          <p className="text-sm text-slate-500">Always here to help</p>
        </div>
      </div>
    </div>
  );
}
