import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import BiometricSetupScreen from '../screens/auth/BiometricSetupScreen';

// Main screens
import HomeScreen from '../screens/home/HomeScreen';
import CompetitionsScreen from '../screens/competitions/CompetitionsScreen';
import CreateCompetitionScreen from '../screens/competitions/CreateCompetitionScreen';
import CompetitionDetailScreen from '../screens/competitions/CompetitionDetailScreen';
import JoinCompetitionScreen from '../screens/competitions/JoinCompetitionScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Loading screen
import LoadingScreen from '../screens/LoadingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab Navigator for main app
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

// Stack Navigator for the entire app
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
              name="BiometricSetup" 
              component={BiometricSetupScreen}
              options={{ title: 'Biometric Setup' }}
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

export default AppNavigator;