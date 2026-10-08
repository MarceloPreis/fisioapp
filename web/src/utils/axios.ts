import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true, // Enables HttpOnly cookies to be sent and received
});

api.interceptors.response.use(response => response, error => {
  if (!error.response) {
    error.message = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      ? 'O tempo de espera terminou. Tente novamente.'
      : 'Não foi possível conectar ao sistema. Verifique sua conexão e tente novamente.';
  }
  return Promise.reject(error);
});

export default api;
