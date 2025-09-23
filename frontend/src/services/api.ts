import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get backend URL from environment
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${BACKEND_URL}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync('session_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired, clear stored token
          SecureStore.deleteItemAsync('session_token');
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url);
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data);
    return response.data;
  }
}

const apiClient = new ApiClient();

// Auth API
export const authAPI = {
  createSession: (sessionId: string) =>
    apiClient.post('/auth/session', null, {
      headers: { 'X-Session-ID': sessionId },
    }),
  
  getCurrentUser: () => apiClient.get('/auth/me'),
  
  logout: () => apiClient.post('/auth/logout'),
  
  updateLanguage: (language: string) =>
    apiClient.patch('/auth/language', null, {
      params: { language },
    }),
  
  toggleBiometric: (enabled: boolean) =>
    apiClient.patch('/auth/biometric', null, {
      params: { enabled },
    }),
};

// Competition API
export const competitionAPI = {
  create: (data: {
    name: string;
    rules: {
      type: string;
      daily_prize?: number;
      final_prize_pool?: Array<{ position: number; amount: number; description: string }>;
    };
  }) => apiClient.post('/competitions', data),
  
  join: (inviteCode: string) =>
    apiClient.post('/competitions/join', { invite_code: inviteCode }),
  
  getMyCompetitions: () => apiClient.get('/competitions/my'),
  
  getCompetition: (id: string) => apiClient.get(`/competitions/${id}`),
  
  updateStandings: (
    id: string,
    standings: any,
    matchday?: number
  ) =>
    apiClient.patch(`/competitions/${id}/standings`, {
      standings,
      matchday,
    }),
  
  payFee: (id: string, amount: number) =>
    apiClient.post(`/competitions/${id}/pay`, null, {
      params: { amount },
    }),
  
  getTransactions: (id: string) =>
    apiClient.get(`/competitions/${id}/transactions`),
};

// Wallet API
export const walletAPI = {
  getBalance: () => apiClient.get('/wallet/balance'),
  
  topUp: (amount: number) =>
    apiClient.post('/wallet/topup', null, {
      params: { amount },
    }),
  
  withdraw: (amount: number) =>
    apiClient.post('/wallet/withdraw', null, {
      params: { amount },
    }),
  
  getTransactions: () => apiClient.get('/transactions'),
};

export default apiClient;