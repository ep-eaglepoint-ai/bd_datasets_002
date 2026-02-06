import { useEffect, useRef, useCallback } from 'react';
import type { WSMessage } from '../types';

const WS_URL = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8080';

export const useWebSocket = (boardId: number | null, onMessage: (msg: WSMessage) => void) => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | undefined>(undefined);

  const connect = useCallback(() => {
    if (!boardId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    ws.current = new WebSocket(`${WS_URL}/ws/board/${boardId}?token=${token}`);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      onMessage(msg);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      reconnectTimeout.current = window.setTimeout(connect, 2000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [boardId, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) ws.current.close();
    };
  }, [connect]);

  return ws;
};
