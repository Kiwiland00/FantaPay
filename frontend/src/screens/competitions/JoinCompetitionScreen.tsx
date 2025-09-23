import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '../../contexts/LanguageContext';
import { competitionAPI } from '../../services/api';

const JoinCompetitionScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [inviteCode, setInviteCode] = useState('');

  const joinCompetitionMutation = useMutation({
    mutationFn: competitionAPI.join,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCompetitions'] });
      Alert.alert(
        t('success'),
        'Successfully joined the competition!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to join competition';
      Alert.alert(t('error'), errorMessage);
    },
  });

  const handleJoinCompetition = () => {
    const code = inviteCode.trim().toUpperCase();
    
    if (!code) {
      Alert.alert(t('error'), 'Please enter an invite code');
      return;
    }

    if (code.length < 6) {
      Alert.alert(t('error'), 'Please enter a valid invite code');
      return;
    }

    joinCompetitionMutation.mutate(code);
  };

  const formatInviteCode = (text: string) => {
    // Remove any non-alphanumeric characters and convert to uppercase
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Limit to 8 characters (typical invite code length)
    return cleaned.substring(0, 8);
  };

  const handleCodeChange = (text: string) => {
    const formatted = formatInviteCode(text);
    setInviteCode(formatted);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="people" size={48} color="#007AFF" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('competition.join.title')}</Text>
          <Text style={styles.subtitle}>
            Enter the invite code shared by the competition admin to join
          </Text>

          {/* Invite Code Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{t('competition.join.code')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key" size={20} color="#007AFF" />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. ABC12345"
                placeholderTextColor="#8E8E93"
                value={inviteCode}
                onChangeText={handleCodeChange}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect={false}
                maxLength={8}
                autoFocus
              />
            </View>
            
            {/* Helper text */}
            <Text style={styles.helperText}>
              Ask the competition admin for the invite code
            </Text>
          </View>

          {/* Alternative Methods */}
          <View style={styles.alternativeSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.linkButton} disabled>
              <Ionicons name="link" size={20} color="#8E8E93" />
              <Text style={styles.linkButtonText}>
                Use invite link (Coming soon)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Join Button */}
          <TouchableOpacity
            style={[
              styles.joinButton,
              { opacity: inviteCode.length >= 6 ? 1 : 0.5 }
            ]}
            onPress={handleJoinCompetition}
            disabled={inviteCode.length < 6 || joinCompetitionMutation.isPending}
          >
            <Text style={styles.joinButtonText}>
              {joinCompetitionMutation.isPending ? t('loading') : 'Join Competition'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 16,
    paddingLeft: 12,
    letterSpacing: 2,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  alternativeSection: {
    marginBottom: 32,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2C2C2E',
  },
  dividerText: {
    color: '#8E8E93',
    fontSize: 12,
    marginHorizontal: 16,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    opacity: 0.5,
  },
  linkButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default JoinCompetitionScreen;