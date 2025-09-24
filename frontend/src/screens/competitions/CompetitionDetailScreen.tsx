import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface Participant {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  paid_matchdays: number[];
  points: number;
  position?: number;
}

interface Competition {
  _id: string;
  name: string;
  admin_id: string;
  invite_code: string;
  invite_link: string;
  participants: Participant[];
  current_matchday: number;
  standings: any[];
  wallet_balance: number;
  is_active: boolean;
}

const CompetitionDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const competitionId = (route.params as any)?.competitionId;
  const [refreshing, setRefreshing] = useState(false);

  // Mock competition data with enhanced participant info
  const mockCompetition: Competition = {
    _id: competitionId || 'comp_default_1',
    name: 'Serie A Fantasy 2024',
    admin_id: competitionId === 'comp_default_1' ? 'other_user_123' : '650f1f1f1f1f1f1f1f1f1f1f',
    invite_code: 'SERIA24',
    invite_link: 'https://fantapay.app/join/SERIA24',
    participants: [
      { 
        id: '650f1f1f1f1f1f1f1f1f1f1f', 
        name: 'FantaPay Tester', 
        email: 'test@fantapay.com', 
        is_admin: competitionId !== 'comp_default_1',
        paid_matchdays: [1, 2], 
        points: 82,
        position: 2
      },
      { 
        id: 'user_2', 
        name: 'Marco Rossi', 
        email: 'marco@email.com', 
        is_admin: false, 
        paid_matchdays: [1, 2, 3], 
        points: 87,
        position: 1
      },
      { 
        id: 'user_3', 
        name: 'Luca Bianchi', 
        email: 'luca@email.com', 
        is_admin: false, 
        paid_matchdays: [1], 
        points: 71,
        position: 4
      },
      { 
        id: 'user_4', 
        name: 'Sofia Verde', 
        email: 'sofia@email.com', 
        is_admin: false, 
        paid_matchdays: [1, 2], 
        points: 76,
        position: 3
      }
    ],
    current_matchday: 3,
    standings: [],
    wallet_balance: 75,
    is_active: true,
  };

  // Check if current user is admin
  const isAdmin = mockCompetition.admin_id === user?.id;
  const currentUser = mockCompetition.participants.find(p => p.id === user?.id);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleCopyInviteCode = async () => {
    try {
      await Clipboard.setStringAsync(mockCompetition.invite_code);
      Alert.alert(t('success'), 'Invite code copied to clipboard!');
    } catch (error) {
      Alert.alert(t('error'), 'Failed to copy invite code');
    }
  };

  const handleShareInviteLink = async () => {
    try {
      await Share.share({
        message: `Join my FantaPay competition: ${mockCompetition.name}\n\nInvite Code: ${mockCompetition.invite_code}\nLink: ${mockCompetition.invite_link}`,
        title: `Join ${mockCompetition.name}`,
      });
    } catch (error) {
      Alert.alert(t('error'), 'Failed to share invite link');
    }
  };

  const handleViewPaymentHistory = (participant: Participant) => {
    navigation.navigate('ParticipantPaymentHistory' as never, {
      participantId: participant.id,
      participantName: participant.name,
      competitionName: mockCompetition.name,
      paymentHistory: []  // Will be populated in the screen
    } as never);
  };

  const getPositionStyle = (position: number) => {
    if (position === 1) return { backgroundColor: '#FFD700', color: '#000000' };
    if (position === 2) return { backgroundColor: '#C0C0C0', color: '#000000' };
    if (position === 3) return { backgroundColor: '#CD7F32', color: '#000000' };
    return { backgroundColor: '#2C2C2E', color: '#FFFFFF' };
  };

  const getPaymentStatus = (participant: Participant) => {
    const isPaidCurrentMatchday = participant.paid_matchdays.includes(mockCompetition.current_matchday);
    return {
      status: isPaidCurrentMatchday ? 'paid' : 'pending',
      color: isPaidCurrentMatchday ? '#34C759' : '#FF3B30',
      text: isPaidCurrentMatchday ? t('competitions.paid') : t('competitions.pending')
    };
  };

  const renderParticipantRow = (participant: Participant, index: number) => {
    const paymentStatus = getPaymentStatus(participant);
    const positionStyle = getPositionStyle(participant.position || index + 1);
    
    return (
      <TouchableOpacity
        key={participant.id}
        style={[
          styles.participantRow,
          participant.id === user?.id && styles.currentUserRow
        ]}
        onPress={() => handleViewPaymentHistory(participant)}
        activeOpacity={0.8}
      >
        <View style={styles.participantLeft}>
          <View style={[styles.positionBadge, { backgroundColor: positionStyle.backgroundColor }]}>
            <Text style={[styles.positionText, { color: positionStyle.color }]}>
              {participant.position || index + 1}
            </Text>
          </View>
          <View style={styles.participantInfo}>
            <Text style={[
              styles.participantName,
              participant.id === user?.id && styles.currentUserName
            ]}>
              {participant.name}
              {participant.is_admin && (
                <Text style={styles.adminBadge}> (Admin)</Text>
              )}
            </Text>
            <Text style={styles.participantPoints}>
              {participant.points} {t('competitions.points')}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.paymentStatusBadge, { backgroundColor: paymentStatus.color }]}
          onPress={() => handleViewPaymentHistory(participant)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={paymentStatus.status === 'paid' ? 'checkmark' : 'time'}
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.paymentStatusText}>{paymentStatus.text}</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.competitionName}>{mockCompetition.name}</Text>
          <Text style={styles.matchdayText}>
            {t('competitions.matchday')} {mockCompetition.current_matchday}
          </Text>
        </View>

        {/* Admin Info Button */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => {
              Alert.alert(
                t('competitions.info'),
                '',
                [
                  {
                    text: t('competitions.copyInvite'),
                    onPress: handleCopyInviteCode,
                  },
                  {
                    text: 'Share Link',
                    onPress: handleShareInviteLink,
                  },
                  {
                    text: t('common.cancel'),
                    style: 'cancel',
                  },
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="information-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
      >
        {/* Competition Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{mockCompetition.participants.length}</Text>
            <Text style={styles.statLabel}>{t('competitions.participants')}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>€{mockCompetition.wallet_balance}</Text>
            <Text style={styles.statLabel}>{t('competitions.wallet')}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{mockCompetition.current_matchday}</Text>
            <Text style={styles.statLabel}>{t('competitions.matchday')}</Text>
          </View>
        </View>

        {/* Admin Section */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Admin Controls</Text>
            <View style={styles.adminCard}>
              <View style={styles.adminInfo}>
                <Text style={styles.inviteCodeLabel}>{t('competitions.inviteCodeLabel')}</Text>
                <Text style={styles.inviteCodeValue}>{mockCompetition.invite_code}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyInviteCode}
                activeOpacity={0.8}
              >
                <Ionicons name="copy" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Participants Table */}
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>{t('competitions.standings')}</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>
              {t('logs.position')}
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 3 }]}>
              {t('logs.player')}
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>
              {t('logs.points')}
            </Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>
              Payment
            </Text>
          </View>

          {/* Participants List */}
          <View style={styles.participantsList}>
            {mockCompetition.participants
              .sort((a, b) => (a.position || 0) - (b.position || 0))
              .map((participant, index) => renderParticipantRow(participant, index))}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <View style={styles.instructionCard}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>How to view payment details</Text>
              <Text style={styles.instructionText}>
                Tap on any participant's payment status to see their detailed payment history for each matchday.
              </Text>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  competitionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  matchdayText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  adminSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  adminInfo: {
    flex: 1,
  },
  inviteCodeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  inviteCodeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantsSection: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  participantsList: {
    backgroundColor: '#1C1C1E',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  currentUserRow: {
    backgroundColor: '#007AFF15',
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  currentUserName: {
    color: '#007AFF',
  },
  adminBadge: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
  },
  participantPoints: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructionsSection: {
    marginBottom: 24,
  },
  instructionCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  instructionContent: {
    flex: 1,
    marginLeft: 12,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
});

export default CompetitionDetailScreen;