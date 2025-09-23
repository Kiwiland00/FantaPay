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
  picture?: string;
  language: string;
  wallet_balance: number;
  biometric_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (sessionId: string) => Promise<void>;
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

  const isAuthenticated = !!user;

  // Check existing session on app start
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      setIsLoading(true);
      const sessionToken = await SecureStore.getItemAsync('session_token');
      
      if (sessionToken) {
        const userData = await authAPI.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      try {
        await SecureStore.deleteItemAsync('session_token');
      } catch (deleteError) {
        console.error('Failed to delete session token:', deleteError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.createSession(sessionId);
      
      // Store session token securely
      await SecureStore.setItemAsync('session_token', response.session_token);
      
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      // Always clear local session
      await SecureStore.deleteItemAsync('session_token');
      await AsyncStorage.removeItem('biometric_session');
      setUser(null);
      setIsLoading(false);
    }
  };

  const enableBiometric = async () => {
    try {
      // Check if device supports biometric authentication
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware) {
        Alert.alert('Error', 'This device does not support biometric authentication');
        return;
      }
      
      if (!isEnrolled) {
        Alert.alert('Error', 'No biometric records found. Please set up biometric authentication in your device settings');
        return;
      }

      // Authenticate to confirm
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Use password',
      });

      if (result.success) {
        // Update backend
        await authAPI.toggleBiometric(true);
        
        // Store biometric session locally
        await AsyncStorage.setItem('biometric_session', 'enabled');
        
        // Update user state
        if (user) {
          setUser({ ...user, biometric_enabled: true });
        }
        
        Alert.alert('Success', 'Biometric authentication enabled');
      }
    } catch (error) {
      console.error('Biometric setup failed:', error);
      Alert.alert('Error', 'Failed to enable biometric authentication');
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      const hasSession = await AsyncStorage.getItem('biometric_session');
      if (!hasSession || !user?.biometric_enabled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access FantaPay',
        fallbackLabel: 'Use password',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  };

  const updateLanguage = async (language: string) => {
    try {
      await authAPI.updateLanguage(language);
      if (user) {
        setUser({ ...user, language });
      }
    } catch (error) {
      console.error('Language update failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    enableBiometric,
    authenticateWithBiometric,
    updateLanguage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};