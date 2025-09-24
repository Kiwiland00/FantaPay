import React, { useState, useEffect } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { competitionAPI } from '../../services/api';

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
  invite_link?: string;
  participants?: Participant[];
  current_matchday?: number;
  standings?: any[];
  wallet_balance?: number;
  is_active?: boolean;
  total_matchdays?: number;
  daily_payment_enabled?: boolean;
  daily_payment_amount?: number;
}

interface MatchdayPayment {
  _id: string;
  user_id: string;
  competition_id: string;
  matchday: number;
  amount: number;
  status: 'paid' | 'pending';
  paid_at?: string;
}

interface PaymentStatusTableParticipant {
  user_id: string;
  username: string;
  name: string;
  email: string;
  matchday_payments: Array<{
    matchday: number;
    status: 'paid' | 'pending';
    amount: number;
    paid_at?: string;
  }>;
}

const CompetitionDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const competitionId = (route.params as any)?.competitionId;
  const [refreshing, setRefreshing] = useState(false);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Matchday Payment State
  const [userPayments, setUserPayments] = useState<MatchdayPayment[]>([]);
  const [paymentStatusTable, setPaymentStatusTable] = useState<PaymentStatusTableParticipant[]>([]);
  const [selectedMatchdays, setSelectedMatchdays] = useState<number[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAdminPaymentTable, setShowAdminPaymentTable] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // Fetch competition data
  useEffect(() => {
    if (competitionId) {
      loadCompetition();
    } else {
      console.error('❌ No competition ID provided');
      setIsLoading(false);
    }
  }, [competitionId]);

  const loadCompetition = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Loading competition with ID:', competitionId);
      
      const competitions = await competitionAPI.getMyCompetitionsMock();
      console.log('📋 All competitions:', competitions.length);
      
      const foundCompetition = competitions.find((comp: any) => {
        console.log('🔎 Checking:', comp._id, 'vs', competitionId);
        return comp._id === competitionId;
      });
      
      if (foundCompetition) {
        console.log('✅ Competition found:', foundCompetition.name);
        console.log('🔑 Invite code:', foundCompetition.invite_code);
        setCompetition(foundCompetition);
      } else {
        console.error('❌ Competition not found');
        Alert.alert('Error', 'Competition not found', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('💥 Error loading competition:', error);
      Alert.alert('Error', 'Failed to load competition', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete competition mutation
  const deleteCompetitionMutation = useMutation({
    mutationFn: (competitionId: string) => {
      return competitionAPI.deleteMock ? competitionAPI.deleteMock(competitionId) : Promise.reject('Delete not available');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCompetitions'] });
      Alert.alert(
        'Success',
        'Competition deleted successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to delete competition';
      Alert.alert('Error', errorMessage);
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCompetition();
    setRefreshing(false);
  };

  const handleCopyInviteCode = async () => {
    try {
      await Clipboard.setStringAsync(competition?.invite_code || '');
      Alert.alert('Success', 'Invite code copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy invite code');
    }
  };

  const handleDeleteCompetition = () => {
    if (!competition) return;
    
    Alert.alert(
      'Delete Competition',
      `Are you sure you want to delete "${competition.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCompetitionMutation.mutate(competition._id),
        },
      ]
    );
  };

  const handleViewPaymentHistory = (participant: Participant) => {
    navigation.navigate('ParticipantPaymentHistory' as never, {
      participantId: participant.id,
      participantName: participant.name,
      competitionName: competition?.name,
      competitionMatchdays: competition?.total_matchdays || 36,
      paidMatchdays: participant.paid_matchdays || []
    } as never);
  };

  // Check if current user is admin
  const isAdmin = competition?.admin_id === user?.id;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading competition...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!competition) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.errorTitle}>Competition Not Found</Text>
          <Text style={styles.errorText}>
            The competition you're looking for doesn't exist or has been deleted.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getPaymentStatus = (participant: Participant) => {
    const currentMatchday = competition.current_matchday || 1;
    const isPaid = participant.paid_matchdays?.includes(currentMatchday) || false;
    return {
      status: isPaid ? 'paid' : 'pending',
      color: isPaid ? '#34C759' : '#FF3B30',
      text: isPaid ? 'Paid' : 'Pending'
    };
  };

  const getPositionStyle = (position: number) => {
    if (position === 1) return { backgroundColor: '#FFD700', color: '#000000' };
    if (position === 2) return { backgroundColor: '#C0C0C0', color: '#000000' };
    if (position === 3) return { backgroundColor: '#CD7F32', color: '#000000' };
    return { backgroundColor: '#2C2C2E', color: '#FFFFFF' };
  };

  const renderParticipantRow = (participant: Participant, index: number) => {
    const paymentStatus = getPaymentStatus(participant);
    const position = participant.position || index + 1;
    const positionStyle = getPositionStyle(position);
    
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
              {position}
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
              {participant.points || 0} points
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
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.competitionName}>{competition.name}</Text>
          <Text style={styles.matchdayText}>
            Matchday {competition.current_matchday || 1}
          </Text>
        </View>

        {/* Admin Controls */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => {
              Alert.alert(
                'Admin Controls',
                'What would you like to do?',
                [
                  {
                    text: 'Copy Invite Code',
                    onPress: handleCopyInviteCode,
                  },
                  {
                    text: 'Delete Competition',
                    style: 'destructive',
                    onPress: handleDeleteCompetition,
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
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
            <Text style={styles.statValue}>{competition.participants?.length || 0}</Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>€{(competition.wallet_balance || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Wallet</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{competition.current_matchday || 1}</Text>
            <Text style={styles.statLabel}>Matchday</Text>
          </View>
        </View>

        {/* Admin Section */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Admin Controls</Text>
            <View style={styles.adminCard}>
              <View style={styles.adminInfo}>
                <Text style={styles.inviteCodeLabel}>Invite Code:</Text>
                <Text style={styles.inviteCodeValue}>{competition.invite_code}</Text>
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

        {/* Participants Section */}
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>Standings</Text>
          
          {competition.participants && competition.participants.length > 0 ? (
            <View style={styles.participantsList}>
              {competition.participants
                .sort((a, b) => (a.position || 0) - (b.position || 0))
                .map((participant, index) => renderParticipantRow(participant, index))}
            </View>
          ) : (
            <View style={styles.emptyParticipants}>
              <Ionicons name="people-outline" size={48} color="#8E8E93" />
              <Text style={styles.emptyTitle}>No participants yet</Text>
              <Text style={styles.emptyText}>
                Share the invite code to get people to join
              </Text>
            </View>
          )}
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
  headerBackButton: {
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
  adminButton: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  participantsList: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
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
  emptyParticipants: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default CompetitionDetailScreen;