import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import CrossPlatformStorage from '../../utils/CrossPlatformStorage';

interface ProfileImage {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const ProfileScreen: React.FC = () => {
  const { user, logout, enableBiometric } = useAuth();
  const { t, changeLanguage, currentLanguage } = useLanguage();
  
  const [userBalance, setUserBalance] = useState(0);
  const [selectedProfileImage, setSelectedProfileImage] = useState('default');
  const [showProfileImageModal, setShowProfileImageModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Available profile images/logos
  const profileImages: ProfileImage[] = [
    { id: 'default', name: 'Default', icon: 'person-circle', color: '#007AFF' },
    { id: 'star', name: 'Star Player', icon: 'star', color: '#FF9500' },
    { id: 'trophy', name: 'Champion', icon: 'trophy', color: '#FFD700' },
    { id: 'football', name: 'Football Fan', icon: 'football', color: '#34C759' },
    { id: 'shield', name: 'Defender', icon: 'shield-checkmark', color: '#5AC8FA' },
    { id: 'flash', name: 'Speed Demon', icon: 'flash', color: '#FF3B30' },
    { id: 'crown', name: 'King', icon: 'medal', color: '#AF52DE' },
    { id: 'fire', name: 'Hot Streak', icon: 'flame', color: '#FF6B6B' },
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  // Real-time wallet balance sync - refresh every time screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserBalance();
    }, [])
  );

  const loadUserBalance = async () => {
    try {
      const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
      const balanceKey = `wallet_balance_${userId}`;
      const storedBalance = await CrossPlatformStorage.getItem(balanceKey);
      
      if (storedBalance !== null) {
        const newBalance = parseFloat(storedBalance);
        setUserBalance(newBalance);
        console.log('💰 Profile balance updated:', newBalance);
      } else {
        setUserBalance(0);
      }
    } catch (error) {
      console.error('💥 Error loading balance:', error);
    }
  };

  const loadUserData = async () => {
    try {
      // Load profile image preference
      const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
      const profileImageKey = `profile_image_${userId}`;
      const storedProfileImage = await CrossPlatformStorage.getItem(profileImageKey);
      
      if (storedProfileImage) {
        setSelectedProfileImage(storedProfileImage);
      }
      
      // Load notifications preference
      const notificationsKey = `notifications_enabled_${userId}`;
      const storedNotifications = await CrossPlatformStorage.getItem(notificationsKey);
      
      if (storedNotifications !== null) {
        setNotificationsEnabled(storedNotifications === 'true');
      }
      
      // Load initial balance
      await loadUserBalance();
      
      console.log('👤 Profile data loaded - Image:', storedProfileImage, 'Notifications:', storedNotifications);
    } catch (error) {
      console.error('💥 Error loading profile data:', error);
    }
  };

  const handleProfileImageSelect = async (imageId: string) => {
    try {
      const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
      const profileImageKey = `profile_image_${userId}`;
      
      await CrossPlatformStorage.setItem(profileImageKey, imageId);
      setSelectedProfileImage(imageId);
      setShowProfileImageModal(false);
      
      const selectedImage = profileImages.find(img => img.id === imageId);
      Alert.alert('Success', `Profile image changed to "${selectedImage?.name}"`);
      
      console.log('👤 Profile image updated to:', imageId);
    } catch (error) {
      console.error('💥 Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile image');
    }
  };

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

  const handleBiometricToggle = async () => {
    try {
      await enableBiometric();
      Alert.alert('Success', 'Biometric authentication enabled');
    } catch (error) {
      Alert.alert('Error', 'Failed to enable biometric authentication');
    }
  };

  const getCurrentProfileImage = (): ProfileImage => {
    return profileImages.find(img => img.id === selectedProfileImage) || profileImages[0];
  };

  const renderProfileImageModal = () => (
    <Modal
      visible={showProfileImageModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowProfileImageModal(false)}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Choose Profile Image</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.profileImageGrid}>
            {profileImages.map((image) => (
              <TouchableOpacity
                key={image.id}
                style={[
                  styles.profileImageOption,
                  selectedProfileImage === image.id && styles.profileImageSelected
                ]}
                onPress={() => handleProfileImageSelect(image.id)}
              >
                <View style={[styles.profileImageIcon, { backgroundColor: `${image.color}20` }]}>
                  <Ionicons name={image.icon as any} size={32} color={image.color} />
                </View>
                <Text style={styles.profileImageName}>{image.name}</Text>
                {selectedProfileImage === image.id && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const currentImage = getCurrentProfileImage();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={() => setShowProfileImageModal(true)}
          >
            <View style={[styles.profileImageLarge, { backgroundColor: `${currentImage.color}20` }]}>
              <Ionicons name={currentImage.icon as any} size={48} color={currentImage.color} />
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>{user?.name || 'FantaPay User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@fantapay.com'}</Text>
        </View>

        {/* Wallet Balance Card */}
        <LinearGradient
          colors={['#007AFF', '#5856D6']}
          style={styles.balanceCard}
        >
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
            <Text style={styles.balanceTitle}>Wallet Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>€{userBalance.toFixed(2)}</Text>
          <Text style={styles.balanceNote}>Synchronized with My Wallet</Text>
        </LinearGradient>

        {/* Profile Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Profile Settings</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowProfileImageModal(true)}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="image-outline" size={20} color="#007AFF" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Profile Image</Text>
              <Text style={styles.settingSubtitle}>{currentImage.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleLanguageChange}>
            <View style={styles.settingIcon}>
              <Ionicons name="language-outline" size={20} color="#007AFF" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Language</Text>
              <Text style={styles.settingSubtitle}>
                {currentLanguage === 'en' ? 'English' : 'Italiano'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleBiometricToggle}>
            <View style={styles.settingIcon}>
              <Ionicons name="finger-print-outline" size={20} color="#007AFF" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Biometric Authentication</Text>
              <Text style={styles.settingSubtitle}>Touch ID / Face ID</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.dangerItem} onPress={handleLogout}>
            <View style={[styles.settingIcon, styles.dangerIcon]}>
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, styles.dangerText]}>Logout</Text>
              <Text style={styles.settingSubtitle}>Sign out of your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderProfileImageModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImageLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#2C2C2E',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },
  balanceCard: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceNote: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  settingsSection: {
    marginBottom: 32,
  },
  actionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#1C1C1E',
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dangerIcon: {
    backgroundColor: '#2A0A0A',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  dangerText: {
    color: '#FF3B30',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  profileImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  profileImageOption: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  profileImageSelected: {
    borderColor: '#34C759',
    backgroundColor: '#0A2A12',
  },
  profileImageIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileImageName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default ProfileScreen;