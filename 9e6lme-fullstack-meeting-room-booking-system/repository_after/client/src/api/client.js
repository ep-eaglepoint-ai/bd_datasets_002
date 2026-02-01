const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email, password, name) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  getMe: () => request('/auth/me'),

  // Rooms
  getRooms: () => request('/rooms'),

  getRoomBookings: (roomId, date) =>
    request(`/rooms/${roomId}/bookings?date=${date}`),

  // Bookings
  createBooking: (roomId, startTime, endTime) =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify({ 
        roomId, 
        startTime, 
        endTime, 
        timezoneOffset: new Date().getTimezoneOffset() 
      }),
    }),

  getMyBookings: () => request('/bookings/mine'),

  cancelBooking: (id) =>
    request(`/bookings/${id}`, { method: 'DELETE' }),
};
