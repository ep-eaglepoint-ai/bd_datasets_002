import React from 'react';
import './App.css';
import Header from './components/Header/Header';
import MessageList from './components/MessageList/MessageList';
import FilePreview from './components/FilePreview/FilePreview';
import InputArea from './components/InputArea/InputArea';

export default function MinimalChatApp() {
  try {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <MessageList />
        <div className="bg-white border-t border-slate-200 px-4 py-4 shadow-lg">
          <div className="max-w-3xl mx-auto">
            <FilePreview />
            <InputArea />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error loading app</h1>
        <p>{error.message}</p>
      </div>
    );
  }
}
