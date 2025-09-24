import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get backend URL from environment
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://fintech-fantapay.preview.emergentagent.com';

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

    // Add request interceptor to include auth token and log requests
    this.client.interceptors.request.use(async (config) => {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
      
      const token = await SecureStore.getItemAsync('session_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling and logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status}`, response.data);
        return response;
      },
      (error) => {
        console.log(`❌ API Error: ${error.response?.status || 'Network'}`, error.response?.data || error.message);
        
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
  
  signup: (data: {
    username: string;
    email: string;
    name: string;
    password: string;
    language?: string;
  }) => apiClient.post('/auth/signup', data),
  
  verifyOTP: (data: { email: string; otp_code: string }) =>
    apiClient.post('/auth/verify-otp', data),
  
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),
  
  resendOTP: (email: string) =>
    apiClient.post('/auth/resend-otp', { email }),
  
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
  
  // TEMPORARY: Mock API calls for testing without authentication
  createMock: async (data: {
    name: string;
    rules: {
      type: string;
      daily_prize?: number;
      final_prize_pool?: Array<{ position: number; amount: number; description: string }>;
    };
  }) => {
    console.log('🏆 Mock: Creating competition:', data.name);
    
    // Check for unique name (mock existing competitions)
    const existingNames = ['test', 'serie a fantasy', 'champions league'];
    if (existingNames.includes(data.name.toLowerCase())) {
      throw new Error('Competition name already exists. Please choose another name.');
    }
    
    // Simulate API response
    return {
      _id: `comp_${Date.now()}`,
      name: data.name,
      rules: data.rules,
      invite_code: Math.random().toString(36).substr(2, 8).toUpperCase(),
      admin_id: '650f1f1f1f1f1f1f1f1f1f1f',
      participants: ['650f1f1f1f1f1f1f1f1f1f1f'],
      wallet_balance: 0,
      is_active: true,
      current_matchday: 1,
      created_at: new Date().toISOString()
    };
  },
  
  getMyCompetitionsMock: async () => {
    console.log('🏆 Mock: Getting my competitions');
    // Return mock competitions
    return [
      {
        _id: 'comp_1',
        name: 'Serie A Fantasy 2024',
        rules: { type: 'mixed', daily_prize: 10, final_prize_pool: [{ position: 1, amount: 100, description: '1st Place' }] },
        participants: [{ id: '1', name: 'FantaPay Tester', email: 'test@fantapay.com' }],
        wallet_balance: 50,
        is_active: true,
        current_matchday: 5,
        created_at: '2024-01-01T00:00:00Z'
      }
    ];
  },
  
  joinMock: async (inviteCode: string) => {
    console.log('🏆 Mock: Joining competition with code:', inviteCode);
    if (inviteCode.length < 6) {
      throw new Error('Invalid invite code');
    }
    return { message: 'Successfully joined competition!' };
  },
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