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
    
    // Create new competition and add to storage
    const newCompetition = {
      _id: `comp_${Date.now()}`,
      name: data.name,
      rules: data.rules,
      invite_code: Math.random().toString(36).substr(2, 8).toUpperCase(),
      invite_link: `https://fantapay.app/join/${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      admin_id: '650f1f1f1f1f1f1f1f1f1f1f', // Current mock user ID
      participants: [
        { 
          id: '650f1f1f1f1f1f1f1f1f1f1f', 
          name: 'FantaPay Tester', 
          email: 'test@fantapay.com',
          is_admin: true,
          paid_matchdays: [1, 2], // Mock paid matchdays
          points: 0
        }
      ],
      wallet_balance: 0,
      is_active: true,
      current_matchday: 3,
      standings: [
        { position: 1, player_id: '650f1f1f1f1f1f1f1f1f1f1f', name: 'FantaPay Tester', points: 0 }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Store in mock storage
    let mockCompetitions = JSON.parse(localStorage.getItem('mockCompetitions') || '[]');
    mockCompetitions.push(newCompetition);
    localStorage.setItem('mockCompetitions', JSON.stringify(mockCompetitions));
    
    return newCompetition;
  },
  
  getMyCompetitionsMock: async () => {
    console.log('🏆 Mock: Getting my competitions');
    
    // Get stored competitions + default ones
    let mockCompetitions = JSON.parse(localStorage.getItem('mockCompetitions') || '[]');
    
    // Add default competitions if none exist
    if (mockCompetitions.length === 0) {
      mockCompetitions = [
        {
          _id: 'comp_default_1',
          name: 'Serie A Fantasy 2024',
          rules: { type: 'mixed', daily_prize: 10, final_prize_pool: [{ position: 1, amount: 100, description: '1st Place' }] },
          invite_code: 'SERIA24',
          invite_link: 'https://fantapay.app/join/SERIA24',
          admin_id: 'other_user_123', // Not current user, so not admin
          participants: [
            { id: '650f1f1f1f1f1f1f1f1f1f1f', name: 'FantaPay Tester', email: 'test@fantapay.com', is_admin: false, paid_matchdays: [1, 2], points: 82 },
            { id: 'user_2', name: 'Marco Rossi', email: 'marco@email.com', is_admin: false, paid_matchdays: [1, 2, 3], points: 87 },
            { id: 'user_3', name: 'Luca Bianchi', email: 'luca@email.com', is_admin: false, paid_matchdays: [1], points: 71 },
            { id: 'user_4', name: 'Sofia Verde', email: 'sofia@email.com', is_admin: false, paid_matchdays: [1, 2], points: 76 }
          ],
          wallet_balance: 75,
          is_active: true,
          current_matchday: 3,
          standings: [
            { position: 1, player_id: 'user_2', name: 'Marco Rossi', points: 87 },
            { position: 2, player_id: '650f1f1f1f1f1f1f1f1f1f1f', name: 'FantaPay Tester', points: 82 },
            { position: 3, player_id: 'user_4', name: 'Sofia Verde', points: 76 },
            { position: 4, player_id: 'user_3', name: 'Luca Bianchi', points: 71 }
          ],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z'
        }
      ];
      localStorage.setItem('mockCompetitions', JSON.stringify(mockCompetitions));
    }
    
    return mockCompetitions;
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