'use client';

import { useToastStore } from '@/store/toastStore';
import { ToastContainer } from './Toast';

export default function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  return <ToastContainer toasts={toasts} onDismiss={removeToast} />;
}