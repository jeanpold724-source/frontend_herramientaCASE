import axios from 'axios';

/**
 * Instancia global de Axios apuntando al backend Spring Boot.
 * Inyecta automaticamente el Bearer token desde localStorage en cada peticion.
 */
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Interceptor de peticion: inyecta el token JWT si existe ──────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Interceptor de respuesta: manejo global de errores ───────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el token expiró o es inválido y no estamos en /login, limpiar sesión
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
