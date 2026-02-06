const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const getToken = () => localStorage.getItem('token');

const request = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${url}`, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
};

export const api = {
  register: (email: string, password: string) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getBoards: () => request('/api/boards'),

  getBoard: (id: number) => request(`/api/boards/${id}`),

  createBoard: (name: string) =>
    request('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  createTask: (boardId: number, columnId: number, title: string, description: string) =>
    request(`/api/boards/${boardId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ column_id: columnId, title, description }),
    }),

  updateTask: (id: number, title: string, description: string) =>
    request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description }),
    }),

  deleteTask: (id: number) =>
    request(`/api/tasks/${id}`, { method: 'DELETE' }),

  moveTask: (id: number, columnId: number, position: number) =>
    request(`/api/tasks/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify({ column_id: columnId, position }),
    }),
};
