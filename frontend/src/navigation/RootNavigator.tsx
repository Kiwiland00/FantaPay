import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import EmailLoginScreen from '../screens/auth/EmailLoginScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import LoadingScreen from '../screens/LoadingScreen';

// Main app screens
import HomeScreen from '../screens/home/HomeScreen';
import CompetitionsScreen from '../screens/competitions/CompetitionsScreen';
import CreateCompetitionScreen from '../screens/competitions/CreateCompetitionScreen';
import JoinCompetitionScreen from '../screens/competitions/JoinCompetitionScreen';
import CompetitionDetailScreen from '../screens/competitions/CompetitionDetailScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import LogsScreen from '../screens/logs/LogsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const { t } = useLanguage();

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
          title: t('nav.home'),
          headerTitle: 'FantaPay'
        }}
      />
      <Tab.Screen 
        name="Competitions" 
        component={CompetitionsScreen}
        options={{ title: t('nav.competitions') }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{ title: t('nav.wallet') }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: t('nav.profile') }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // TEMPORARY: Skip authentication for testing core features
  // TODO: Re-enable authentication later
  const skipAuth = true;

  if (isLoading && !skipAuth) {
    return <LoadingScreen />;
  }

  return (
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
      {!skipAuth && !isAuthenticated ? (
        // Auth screens (temporarily disabled)
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
        // Main app screens - Direct access for testing
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
          <Stack.Screen 
            name="Logs" 
            component={LogsScreen}
            options={{ title: 'Logs & Notifications' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}