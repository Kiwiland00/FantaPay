import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const LoginScreen: React.FC = () => {
  const { login, authenticateWithBiometric, user } = useAuth();
  const { t, changeLanguage, currentLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  useEffect(() => {
    // Listen for URL changes (deep linking from auth)
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => subscription?.remove();
  }, []);

  const handleDeepLink = async ({ url }: { url: string }) => {
    try {
      // Extract session ID from URL fragment
      const urlObj = new URL(url);
      const fragment = urlObj.hash;
      
      if (fragment && fragment.includes('session_id=')) {
        const sessionId = fragment.split('session_id=')[1]?.split('&')[0];
        if (sessionId) {
          setIsLoading(true);
          await login(sessionId);
        }
      }
    } catch (error) {
      console.error('Deep link handling error:', error);
      Alert.alert(t('error'), 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      
      // Redirect URL should point to the main app, not login
      const redirectUrl = 'fantapay://main';
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      // Open browser for authentication
      await WebBrowser.openBrowserAsync(authUrl);
      
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert(t('error'), 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      const success = await authenticateWithBiometric();
      
      if (!success) {
        Alert.alert(t('error'), 'Biometric authentication failed or not set up.');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert(t('error'), 'Biometric authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = async () => {
    const newLanguage = currentLanguage === 'en' ? 'it' : 'en';
    try {
      await changeLanguage(newLanguage);
    } catch (error) {
      console.error('Language change error:', error);
    }
  };

  return (
    <LinearGradient
      colors={['#000000', '#1C1C1E', '#2C2C2E']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Language selector */}
        <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
          <Text style={styles.languageText}>
            {currentLanguage.toUpperCase()}
          </Text>
          <Ionicons name="language" size={20} color="#007AFF" />
        </TouchableOpacity>

        {/* Logo and title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="wallet" size={80} color="#007AFF" />
          </View>
          <Text style={styles.title}>FantaPay</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>

        {/* Login buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.loginButton, styles.googleButton]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>{t('login.google')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, styles.emailButton]}
            onPress={() => navigation.navigate('EmailLogin' as never)}
            disabled={isLoading}
          >
            <Ionicons name="mail" size={24} color="#007AFF" />
            <Text style={[styles.buttonText, { color: '#007AFF' }]}>
              Sign In with Email
            </Text>
          </TouchableOpacity>

          {user?.biometric_enabled && (
            <TouchableOpacity
              style={[styles.loginButton, styles.biometricButton]}
              onPress={handleBiometricLogin}
              disabled={isLoading}
            >
              <Ionicons name="finger-print" size={24} color="#007AFF" />
              <Text style={[styles.buttonText, { color: '#007AFF' }]}>
                {t('login.biometric')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign Up Link */}
        <View style={styles.signupSection}>
          <Text style={styles.signupText}>New to FantaPay?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup' as never)}>
            <Text style={styles.signupButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('auth.welcome')}
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: 24,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
  },
  languageText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -100,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 40,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#007AFF',
  },
  biometricButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LoginScreen;