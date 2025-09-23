import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';

// Import screens directly
import LoginScreen from '../src/screens/auth/LoginScreen';
import LoadingScreen from '../src/screens/LoadingScreen';

// Import main app screens
import HomeScreen from '../src/screens/home/HomeScreen';
import CompetitionsScreen from '../src/screens/competitions/CompetitionsScreen';
import CreateCompetitionScreen from '../src/screens/competitions/CreateCompetitionScreen';
import JoinCompetitionScreen from '../src/screens/competitions/JoinCompetitionScreen';
import CompetitionDetailScreen from '../src/screens/competitions/CompetitionDetailScreen';
import WalletScreen from '../src/screens/wallet/WalletScreen';
import ProfileScreen from '../src/screens/profile/ProfileScreen';

// Import auth screens
import SignupScreen from '../src/screens/auth/SignupScreen';
import EmailLoginScreen from '../src/screens/auth/EmailLoginScreen';
import OTPVerificationScreen from '../src/screens/auth/OTPVerificationScreen';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab Navigator for main app
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Competitions') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Wallet') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          borderTopColor: '#2C2C2E',
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        headerStyle: {
          backgroundColor: '#1C1C1E',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: 'Home',
          headerTitle: 'FantaPay'
        }}
      />
      <Tab.Screen 
        name="Competitions" 
        component={CompetitionsScreen}
        options={{ title: 'Competitions' }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{ title: 'Wallet' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1C1C1E',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          // Auth screens
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Signup" 
              component={SignupScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="EmailLogin" 
              component={EmailLoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="OTPVerification" 
              component={OTPVerificationScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // Main app screens
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="CreateCompetition" 
              component={CreateCompetitionScreen}
              options={{ title: 'Create Competition' }}
            />
            <Stack.Screen 
              name="JoinCompetition" 
              component={JoinCompetitionScreen}
              options={{ title: 'Join Competition' }}
            />
            <Stack.Screen 
              name="CompetitionDetail" 
              component={CompetitionDetailScreen}
              options={{ title: 'Competition Details' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function MainApp() {
  return <AppNavigator />;
}

export default function Index() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}