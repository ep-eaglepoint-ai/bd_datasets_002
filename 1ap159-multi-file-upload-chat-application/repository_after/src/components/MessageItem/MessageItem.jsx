import React from 'react';
import { Bot, User, Loader2, Check } from 'lucide-react';
import { truncateName, formatSpeed } from '../../utils/helpers';

export default function MessageItem({ message }) {
  return (
    <div
      className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        message.role === 'user' ? 'bg-gradient-to-br from-green-400 to-emerald-600' : 'bg-gradient-to-br from-blue-400 to-purple-600'
      }`}>
        {message.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
      </div>
      <div className={`max-w-lg px-4 py-3 rounded-2xl ${
        message.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white text-slate-800 shadow-sm border border-slate-200'
      }`}>
        {message.content ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p> : null}
        {message.files?.length ? (
          <div className="mt-2 space-y-2">
            {message.files.map((f) => {
              const prog = message.fileProgress?.find(p => p.fileId === f.id) || {};
              const done = prog.done || message.uploadState === 'complete';
              return (
                <div key={f.id} className="flex items-center gap-2">
                  {!done ? (
                    <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs truncate">{truncateName(f.name)}</span>
                      {!done && prog.speed != null ? (
                        <span className="text-xs flex-shrink-0">{formatSpeed(prog.speed)}</span>
                      ) : null}
                    </div>
                    {!done ? (
                      <div className="upload-progress-bar mt-0.5">
                        <div className="upload-progress-fill" style={{ width: `${prog.progress || 0}%` }} />
                      </div>
                    ) : null}
                    {!done && prog.progress != null ? (
                      <span className="text-xs">{Math.round(prog.progress)}%</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
