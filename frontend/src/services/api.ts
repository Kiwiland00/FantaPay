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
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://fantasy-fintech.preview.emergentagent.com';

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

// Helper function to log admin actions for transparency
const logAdminAction = async (action: string, competitionName: string, adminName: string, details?: any) => {
  try {
    const logs = await CrossPlatformStorage.getItem('adminLogs') || '[]';
    const adminLogs = JSON.parse(logs);
    
    const logEntry = {
      id: `log_${Date.now()}`,
      action,
      competition_name: competitionName,
      admin_name: adminName,
      details,
      timestamp: new Date().toISOString(),
    };
    
    adminLogs.push(logEntry);
    await CrossPlatformStorage.setItem('adminLogs', JSON.stringify(adminLogs));
    
    console.log('📝 Admin action logged:', action, competitionName);
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
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
    // Financial configuration fields
    total_matchdays?: number;
    participation_cost_per_team?: number;
    expected_teams?: number;
    total_prize_pool?: number;
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
    total_matchdays?: number;
    participation_cost_per_team?: number;
    expected_teams?: number;
    total_prize_pool?: number;
    rules: {
      type: string;
      daily_prize?: number;
      final_prize_pool?: Array<{ position: number; amount: number; description: string }>;
    };
  }) => {
    console.log('🏆 Mock: Creating competition:', data.name);
    console.log('📅 Total matchdays:', data.total_matchdays || 36);
    
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
      total_matchdays: data.total_matchdays || 36,
      participation_cost_per_team: data.participation_cost_per_team || 210.0,
      expected_teams: data.expected_teams || 8,
      total_prize_pool: data.total_prize_pool || 1680.0,
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
      current_matchday: 1, // Start at matchday 1
      standings: [
        { position: 1, player_id: '650f1f1f1f1f1f1f1f1f1f1f', name: 'FantaPay Tester', points: 0 }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add to competitions list and save to storage
    existingCompetitions.push(newCompetition);
    await CrossPlatformStorage.setItem('mockCompetitions', JSON.stringify(existingCompetitions));
    
    // Log the creation action
    await logAdminAction('create', newCompetition.name, 'FantaPay Tester', {
      competition_id: newCompetition._id,
      rules: newCompetition.rules,
      total_matchdays: newCompetition.total_matchdays
    });
    
    console.log('✅ Competition created and logged! New total:', existingCompetitions.length);
    console.log('🆔 Competition ID:', newCompetition._id);
    console.log('📝 Competition Name:', newCompetition.name);
    console.log('📅 Matchdays configured:', newCompetition.total_matchdays);
    
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
    
    console.log('📋 Competitions found in storage:', competitions.length);
    
    // Log each competition for debugging
    competitions.forEach((comp: any, index: number) => {
      console.log(`${index + 1}. ${comp.name} (ID: ${comp._id})`);
    });
    
    return competitions;
  },
  
  joinMock: async (inviteCode: string) => {
    console.log('🏆 Mock: Joining competition with code:', inviteCode);
    if (inviteCode.length < 6) {
      throw new Error('Invalid invite code');
    }
    return { message: 'Successfully joined competition!' };
  },

  // Delete competition (admin only)
  deleteMock: async (competitionId: string) => {
    console.log('🗑️ Mock: Deleting competition:', competitionId);
    
    const storedCompetitions = await CrossPlatformStorage.getItem('mockCompetitions');
    let competitions = storedCompetitions ? JSON.parse(storedCompetitions) : [];
    
    const competitionToDelete = competitions.find((comp: any) => comp._id === competitionId);
    if (!competitionToDelete) {
      throw new Error('Competition not found');
    }

    // Check if user is admin
    if (competitionToDelete.admin_id !== '650f1f1f1f1f1f1f1f1f1f1f') {
      throw new Error('Only admin can delete this competition');
    }

    // Remove competition from storage
    competitions = competitions.filter((comp: any) => comp._id !== competitionId);
    await CrossPlatformStorage.setItem('mockCompetitions', JSON.stringify(competitions));
    
    // Log the action
    await logAdminAction('delete', competitionToDelete.name, 'FantaPay Tester');
    
    console.log('✅ Competition deleted successfully');
    return { message: 'Competition deleted successfully' };
  },

  // Edit competition (admin only)
  editMock: async (competitionId: string, updates: any) => {
    console.log('✏️ Mock: Editing competition:', competitionId, updates);
    
    const storedCompetitions = await CrossPlatformStorage.getItem('mockCompetitions');
    let competitions = storedCompetitions ? JSON.parse(storedCompetitions) : [];
    
    const competitionIndex = competitions.findIndex((comp: any) => comp._id === competitionId);
    if (competitionIndex === -1) {
      throw new Error('Competition not found');
    }

    const competition = competitions[competitionIndex];
    
    // Check if user is admin
    if (competition.admin_id !== '650f1f1f1f1f1f1f1f1f1f1f') {
      throw new Error('Only admin can edit this competition');
    }

    // Update competition
    competitions[competitionIndex] = {
      ...competition,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    await CrossPlatformStorage.setItem('mockCompetitions', JSON.stringify(competitions));
    
    // Log the action
    await logAdminAction('edit', competition.name, 'FantaPay Tester', updates);
    
    console.log('✅ Competition updated successfully');
    return competitions[competitionIndex];
  },

  // Award daily prize (admin only)
  awardDailyPrizeMock: async (competitionId: string, matchday: number, winnerId: string) => {
    console.log('🏆 Mock: Awarding daily prize for matchday', matchday, 'to user', winnerId);
    
    const storedCompetitions = await CrossPlatformStorage.getItem('mockCompetitions');
    let competitions = storedCompetitions ? JSON.parse(storedCompetitions) : [];
    
    const competitionIndex = competitions.findIndex((comp: any) => comp._id === competitionId);
    if (competitionIndex === -1) {
      throw new Error('Competition not found');
    }

    const competition = competitions[competitionIndex];
    
    // Check if user is admin
    if (competition.admin_id !== '650f1f1f1f1f1f1f1f1f1f1f') {
      throw new Error('Only admin can award daily prizes');
    }

    // Check if competition has daily prizes
    if (!competition.rules || !['daily', 'mixed'].includes(competition.rules.type)) {
      throw new Error('This competition does not have daily prizes');
    }

    const dailyPrizeAmount = competition.rules.daily_prize || 5;
    const winner = competition.participants.find((p: any) => p.id === winnerId);
    
    if (!winner) {
      throw new Error('Winner not found in competition');
    }

    // Initialize daily winners if not exists
    if (!competition.daily_winners) {
      competition.daily_winners = {};
    }

    // Check if prize already awarded for this matchday
    if (competition.daily_winners[matchday]) {
      throw new Error(`Daily prize for matchday ${matchday} already awarded to ${competition.daily_winners[matchday].name}`);
    }

    // Award the prize
    competition.daily_winners[matchday] = {
      user_id: winnerId,
      name: winner.name,
      amount: dailyPrizeAmount,
      awarded_at: new Date().toISOString()
    };

    // Update competition
    competitions[competitionIndex] = competition;
    await CrossPlatformStorage.setItem('mockCompetitions', JSON.stringify(competitions));
    
    // Log the action
    await logAdminAction('award_daily_prize', competition.name, 'FantaPay Tester', {
      matchday,
      winner: winner.name,
      amount: dailyPrizeAmount
    });

    // Simulate wallet credit (in a real app, this would update the user's wallet)
    console.log(`💰 ${winner.name} awarded €${dailyPrizeAmount} for winning matchday ${matchday}`);
    
    console.log('✅ Daily prize awarded successfully');
    return {
      message: `Daily prize of €${dailyPrizeAmount} awarded to ${winner.name} for matchday ${matchday}`,
      competition: competition
    };
  },

  // Get admin logs
  getAdminLogsMock: async () => {
    console.log('📝 Mock: Getting admin logs');
    
    try {
      const logs = await CrossPlatformStorage.getItem('adminLogs') || '[]';
      const adminLogs = JSON.parse(logs);
      
      // Sort by timestamp (newest first)
      adminLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      console.log('📋 Admin logs found:', adminLogs.length);
      return adminLogs;
    } catch (error) {
      console.error('💥 Error getting admin logs:', error);
      return [];
    }
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