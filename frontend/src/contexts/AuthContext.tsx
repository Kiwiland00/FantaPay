import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  picture?: string;
  auth_method: string;
  is_verified: boolean;
  language: string;
  wallet_balance: number;
  biometric_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (sessionId: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signup: (userData: {
    username: string;
    email: string;
    name: string;
    password: string;
  }) => Promise<{ email: string; requiresOTP: boolean }>;
  verifyOTP: (email: string, otpCode: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  updateLanguage: (language: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TEMPORARY: Mock authenticated user for testing core features
  // TODO: Remove this when re-enabling full authentication
  const mockUser: User = {
    id: '650f1f1f1f1f1f1f1f1f1f1f',
    email: 'test@fantapay.com',
    name: 'FantaPay Tester',
    username: 'fantapay_user',
    picture: undefined,
    auth_method: 'email',
    is_verified: true,
    language: 'en',
    wallet_balance: 150.00,
    biometric_enabled: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_login: '2024-01-01T00:00:00Z',
  };

  const isAuthenticated = true; // Always authenticated for testing

  // Initialize with mock user on app start
  useEffect(() => {
    const initMockUser = () => {
      setUser(mockUser);
      setIsLoading(false);
    };

    // Simulate loading time
    const timer = setTimeout(initMockUser, 1000);
    return () => clearTimeout(timer);
  }, []);

  const checkExistingSession = async () => {
    // TEMPORARY: Disabled for testing
    // Original authentication logic will be restored later
  };

  const login = async (sessionId: string) => {
    // TEMPORARY: Mock login for testing
    console.log('Mock login called');
  };

  const loginWithEmail = async (email: string, password: string) => {
    // TEMPORARY: Mock email login for testing  
    console.log('Mock email login called');
  };

  const signup = async (userData: {
    username: string;
    email: string;
    name: string;
    password: string;
  }) => {
    // TEMPORARY: Mock signup for testing
    console.log('Mock signup called');
    return {
      email: userData.email,
      requiresOTP: false
    };
  };

  const verifyOTP = async (email: string, otpCode: string) => {
    // TEMPORARY: Mock OTP verification for testing
    console.log('Mock OTP verification called');
  };

  const resendOTP = async (email: string) => {
    // TEMPORARY: Mock resend OTP for testing
    console.log('Mock resend OTP called');
  };

  const logout = async () => {
    // TEMPORARY: Mock logout for testing
    console.log('Mock logout called - staying logged in for testing');
  };

  const enableBiometric = async () => {
    // TEMPORARY: Mock biometric enable for testing
    if (user) {
      setUser({ ...user, biometric_enabled: true });
      console.log('Mock biometric enabled');
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    // TEMPORARY: Mock biometric auth for testing
    console.log('Mock biometric authentication');
    return true;
  };

  const updateLanguage = async (language: string) => {
    // TEMPORARY: Mock language update for testing
    if (user) {
      setUser({ ...user, language });
      console.log('Mock language updated to:', language);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    loginWithEmail,
    signup,
    verifyOTP,
    resendOTP,
    logout,
    enableBiometric,
    authenticateWithBiometric,
    updateLanguage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};