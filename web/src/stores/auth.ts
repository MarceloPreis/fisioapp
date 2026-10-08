import { defineStore } from 'pinia';
import api from '../utils/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any | null,
    isAuthenticated: false,
    isLoading: false,
    error: null as string | null,
  }),
  actions: {
    async login(email: string, password: string) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await api.post('/auth/login', { email, password });
        this.isAuthenticated = true;
        this.user = response.data.user;
      } catch (err: any) {
        const message = err.response?.data?.message;
        this.error = Array.isArray(message)
          ? message.join(' ')
          : message || (err.response
            ? 'Não foi possível realizar o login. Tente novamente.'
            : 'Não foi possível conectar ao sistema. Verifique sua conexão e tente novamente.');
        throw err;
      } finally {
        this.isLoading = false;
      }
    },
    async checkAuth() {
      try {
        const response = await api.get('/auth/profile');
        this.isAuthenticated = true;
        this.user = response.data;
      } catch (error) {
        this.isAuthenticated = false;
        this.user = null;
      }
    },
    async logout() {
      try {
        await api.post('/auth/logout');
      } finally {
        this.isAuthenticated = false;
        this.user = null;
      }
    }
  }
});
