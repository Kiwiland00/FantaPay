import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Cross-platform storage utility
class CrossPlatformStorage {
  static async getItem(key: string): Promise<string | null> {
    try {
      // Try AsyncStorage first (works on both platforms)
      return await AsyncStorage.getItem(key);
    } catch (error) {
      // Fallback to localStorage on web if AsyncStorage fails
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      // Try AsyncStorage first (works on both platforms)
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      // Fallback to localStorage on web if AsyncStorage fails
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    }
  }
}

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
    
    // Get existing competitions from cross-platform storage
    const storedCompetitions = await CrossPlatformStorage.getItem('mockCompetitions');
    let existingCompetitions = storedCompetitions ? JSON.parse(storedCompetitions) : [];
    
    console.log('📋 Current competitions before creation:', existingCompetitions.length);
    
    // Check for unique name validation
    const existingNames = existingCompetitions.map((comp: any) => comp.name.toLowerCase());
    if (existingNames.includes(data.name.toLowerCase())) {
      throw new Error('Competition name already exists. Please choose another name.');
    }
    
    // Create new competition
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
    
    // Add to competitions list and save to storage
    existingCompetitions.push(newCompetition);
    await CrossPlatformStorage.setItem('mockCompetitions', JSON.stringify(existingCompetitions));
    
    return newCompetition;
  },

  // Real-time name validation
  validateNameMock: async (name: string) => {
    console.log('🏆 Mock: Validating competition name:', name);
    
    if (!name.trim()) {
      return { available: true, message: '' };
    }
    
    // Get existing competitions
    const storedCompetitions = await CrossPlatformStorage.getItem('mockCompetitions');
    let existingCompetitions = storedCompetitions ? JSON.parse(storedCompetitions) : [];
    
    // Add some default competition names to check against
    const defaultNames = ['Serie A Fantasy 2024', 'Champions League Fantasy', 'Premier League'];
    const allNames = [
      ...existingCompetitions.map((comp: any) => comp.name.toLowerCase()),
      ...defaultNames.map(name => name.toLowerCase())
    ];
    
    const isAvailable = !allNames.includes(name.toLowerCase());
    
    return {
      available: isAvailable,
      message: isAvailable ? 'Name available' : 'Name already exists'
    };
  },
  
  getMyCompetitionsMock: async () => {
    console.log('🏆 Mock: Getting my competitions');
    
    // Get stored competitions from cross-platform storage
    const storedCompetitions = await CrossPlatformStorage.getItem('mockCompetitions');
    let competitions = storedCompetitions ? JSON.parse(storedCompetitions) : [];
    
    console.log('📋 Competitions found:', competitions.length);
    
    return competitions;
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