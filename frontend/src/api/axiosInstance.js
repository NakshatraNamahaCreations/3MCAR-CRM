import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT + active branch from localStorage to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const branchId = localStorage.getItem('activeBranchId');
  if (branchId) config.headers['X-Branch-Id'] = branchId;
  return config;
});

/**
 * Build a human-readable message that includes per-field validation details.
 * The backend returns validation errors as { message, error: { field: 'reason', ... } }.
 */
const buildErrorMessage = (data, fallback) => {
  if (!data) return fallback;
  const base = data.message || fallback;
  const detail = data.error;
  if (detail && typeof detail === 'object') {
    const parts = Object.entries(detail)
      .map(([field, reason]) => {
        if (reason && typeof reason === 'object') reason = reason.message || JSON.stringify(reason);
        return field === 'detail' ? String(reason) : `${field}: ${reason}`;
      })
      .filter(Boolean);
    if (parts.length) return `${base} — ${parts.join('; ')}`;
  } else if (typeof detail === 'string' && detail.trim()) {
    return `${base} — ${detail}`;
  }
  return base;
};

// Normalize responses and surface errors as toasts.
api.interceptors.response.use(
  (res) => res.data, // backend wraps in { success, message, data }
  (error) => {
    const { response } = error;
    if (response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    const message = buildErrorMessage(response?.data, error.message || 'Request failed');
    if (response?.status !== 401) toast.error(message, { duration: 5000 });
    return Promise.reject(response?.data || { success: false, message });
  }
);

export default api;
