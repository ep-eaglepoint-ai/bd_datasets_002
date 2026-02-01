import { create } from 'zustand';
import { Toast, ToastType } from '@/components/Toast';

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (type: ToastType, title: string, message?: string, duration = 5000) => {
    const toast: Toast = {
      id: generateId(),
      type,
      title,
      message,
      duration,
    };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// Convenience functions
export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast('success', title, message, duration);
  },
  error: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast('error', title, message, duration);
  },
  warning: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast('warning', title, message, duration);
  },
  info: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast('info', title, message, duration);
  },
};