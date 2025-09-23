import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const ProfileScreen: React.FC = () => {
  const { user, logout, enableBiometric } = useAuth();
  const { t, changeLanguage, currentLanguage } = useLanguage();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert(
      t('settings.language'),
      'Select your preferred language',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'English',
          onPress: () => changeLanguage('en'),
        },
        {
          text: 'Italiano',
          onPress: () => changeLanguage('it'),
        },
      ]
    );
  };

  const handleBiometricToggle = () => {
    if (user?.biometric_enabled) {
      Alert.alert(
        'Biometric Authentication',
        'Biometric authentication is already enabled. To disable it, please update from device settings.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Enable Biometric Authentication',
        'Would you like to enable biometric authentication for quick and secure access?',
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: 'Enable',
            onPress: enableBiometric,
          },
        ]
      );
    }
  };

  const settingsItems = [
    {
      id: 'language',
      title: t('settings.language'),
      subtitle: currentLanguage === 'en' ? 'English' : 'Italiano',
      icon: 'language',
      onPress: handleLanguageChange,
    },
    {
      id: 'biometric',
      title: t('settings.biometric'),
      subtitle: user?.biometric_enabled ? 'Enabled' : 'Disabled',
      icon: 'finger-print',
      onPress: handleBiometricToggle,
    },
  ];

  const menuItems = [
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'help-circle-outline',
      onPress: () => {
        Alert.alert('Help & Support', 'Contact us at support@fantapay.com');
      },
    },
    {
      id: 'about',
      title: 'About FantaPay',
      icon: 'information-circle-outline',
      onPress: () => {
        Alert.alert('About FantaPay', 'FantaPay v1.0.0\nManage your fantasy competitions and winnings.');
      },
    },
    {
      id: 'logout',
      title: 'Logout',
      icon: 'log-out-outline',
      onPress: handleLogout,
      destructive: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          {/* Wallet Balance */}
          <View style={styles.balanceContainer}>
            <Ionicons name="wallet" size={20} color="#007AFF" />
            <Text style={styles.balanceText}>
              {t('currency.euro')}{user?.wallet_balance?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuContainer}>
            {settingsItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === settingsItems.length - 1 && styles.lastMenuItem,
                ]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon as any} size={20} color="#007AFF" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* General Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === menuItems.length - 1 && styles.lastMenuItem,
                ]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[
                    styles.menuIcon,
                    item.destructive && styles.destructiveIcon,
                  ]}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.destructive ? '#FF3B30' : '#8E8E93'}
                    />
                  </View>
                  <Text style={[
                    styles.menuItemTitle,
                    item.destructive && styles.destructiveText,
                  ]}>
                    {item.title}
                  </Text>
                </View>
                {!item.destructive && (
                  <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>FantaPay v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  menuContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destructiveIcon: {
    backgroundColor: '#FF3B3020',
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  destructiveText: {
    color: '#FF3B30',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});

export default ProfileScreen;