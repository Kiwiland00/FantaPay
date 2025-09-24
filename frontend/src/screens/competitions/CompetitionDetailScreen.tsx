import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { competitionAPI } from '../../services/api';

type RouteParams = {
  CompetitionDetail: {
    competitionId: string;
  };
};

interface Competition {
  _id: string;
  name: string;
  admin_id: string;
  rules: {
    type: string;
    daily_prize?: number;
    final_prize_pool?: Array<{ position: number; amount: number; description: string }>;
  };
  participants: Array<{ id: string; name: string; email: string }>;
  wallet_balance: number;
  is_active: boolean;
  current_matchday: number;
  standings: any;
  invite_code: string;
  created_at: string;
}

const CompetitionDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'CompetitionDetail'>>();
  const { competitionId } = route.params;
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const navigation = useNavigation();

  const [refreshing, setRefreshing] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [showStandingsModal, setShowStandingsModal] = useState(false);

  const {
    data: competition,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => competitionAPI.getCompetition(competitionId),
    enabled: !!competitionId,
  });

  const {
    data: transactions = [],
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['competitionTransactions', competitionId],
    queryFn: () => competitionAPI.getTransactions(competitionId),
    enabled: !!competitionId,
  });

  const payFeeMutation = useMutation({
    mutationFn: (amount: number) => competitionAPI.payFee(competitionId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['competitionTransactions', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      setShowPayModal(false);
      setPayAmount('');
      Alert.alert(t('success'), 'Payment successful!');
    },
    onError: (error: any) => {
      Alert.alert(t('error'), error.response?.data?.detail || 'Payment failed');
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchTransactions()]);
    setRefreshing(false);
  };

  const handleParticipantPress = (participant: { id: string; name: string; email: string }) => {
    navigation.navigate('PaymentSummary' as never, {
      competitionId: competition?._id,
      participantId: participant.id,
      participantName: participant.name,
      competitionName: competition?.name,
    } as never);
  };

  const handlePayFee = () => {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t('error'), 'Please enter a valid amount');
      return;
    }
    if (amount > (user?.wallet_balance || 0)) {
      Alert.alert(t('error'), 'Insufficient balance in your wallet');
      return;
    }
    payFeeMutation.mutate(amount);
  };

  const isAdmin = user?.id === competition?.admin_id;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderPrizeStructure = () => {
    if (!competition) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prize Structure</Text>
        <View style={styles.prizeCard}>
          {competition.rules.type === 'daily' && (
            <View style={styles.prizeRow}>
              <Ionicons name="calendar" size={20} color="#34C759" />
              <Text style={styles.prizeText}>
                Daily Prize: {t('currency.euro')}{competition.rules.daily_prize?.toFixed(2)}
              </Text>
            </View>
          )}
          
          {competition.rules.type === 'final' && competition.rules.final_prize_pool && (
            <View>
              <View style={styles.prizeHeader}>
                <Ionicons name="trophy" size={20} color="#FFD700" />
                <Text style={styles.prizeHeaderText}>Final Prize Pool</Text>
              </View>
              {competition.rules.final_prize_pool.map((prize, index) => (
                <View key={index} style={styles.prizeRow}>
                  <Text style={styles.prizePosition}>{prize.position}.</Text>
                  <Text style={styles.prizeDescription}>{prize.description}</Text>
                  <Text style={styles.prizeAmount}>
                    {t('currency.euro')}{prize.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          {competition.rules.type === 'mixed' && (
            <View>
              <View style={styles.prizeRow}>
                <Ionicons name="calendar" size={20} color="#34C759" />
                <Text style={styles.prizeText}>
                  Daily Prize: {t('currency.euro')}{competition.rules.daily_prize?.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.prizeHeader}>
                <Ionicons name="trophy" size={20} color="#FFD700" />
                <Text style={styles.prizeHeaderText}>Final Prize Pool</Text>
              </View>
              {competition.rules.final_prize_pool?.map((prize, index) => (
                <View key={index} style={styles.prizeRow}>
                  <Text style={styles.prizePosition}>{prize.position}.</Text>
                  <Text style={styles.prizeDescription}>{prize.description}</Text>
                  <Text style={styles.prizeAmount}>
                    {t('currency.euro')}{prize.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderParticipants = () => {
    if (!competition) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('competition.participants')} ({competition.participants.length})
        </Text>
        <View style={styles.participantsList}>
          {competition.participants.map((participant, index) => (
            <View key={participant.id} style={styles.participantItem}>
              <View style={styles.participantAvatar}>
                <Text style={styles.participantInitial}>
                  {participant.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.name}</Text>
                {participant.id === competition.admin_id && (
                  <Text style={styles.adminBadge}>Admin</Text>
                )}
              </View>
              {participant.id === user?.id && (
                <Ionicons name="person-circle" size={20} color="#007AFF" />
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderWalletInfo = () => {
    if (!competition) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('competition.wallet')}</Text>
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Ionicons name="wallet" size={24} color="#007AFF" />
            <Text style={styles.walletBalance}>
              {t('currency.euro')}{competition.wallet_balance.toFixed(2)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => setShowPayModal(true)}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.payButtonText}>Pay to Competition</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRecentTransactions = () => {
    if (!transactions.length) return null;

    const recentTransactions = transactions.slice(0, 5);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.transactionsList}>
          {recentTransactions.map((transaction) => (
            <View key={transaction._id} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionUser}>{transaction.user_name}</Text>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionDate}>
                  {formatDate(transaction.created_at)}
                </Text>
              </View>
              <Text style={styles.transactionAmount}>
                +{t('currency.euro')}{transaction.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !competition) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Competition not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.competitionName}>{competition.name}</Text>
          <View style={styles.competitionMeta}>
            <Text style={styles.matchdayText}>
              Matchday {competition.current_matchday}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: competition.is_active ? '#34C759' : '#8E8E93' }
            ]}>
              <Text style={styles.statusText}>
                {competition.is_active ? 'Active' : 'Closed'}
              </Text>
            </View>
          </View>
          
          {isAdmin && (
            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCodeLabel}>Invite Code:</Text>
              <Text style={styles.inviteCodeText}>{competition.invite_code}</Text>
            </View>
          )}
        </View>

        {renderPrizeStructure()}
        {renderParticipants()}
        {renderWalletInfo()}
        {renderRecentTransactions()}
      </ScrollView>

      {/* Pay Modal */}
      {showPayModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Pay to Competition</Text>
            <Text style={styles.modalSubtitle}>
              Your balance: {t('currency.euro')}{user?.wallet_balance?.toFixed(2) || '0.00'}
            </Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount"
              placeholderTextColor="#8E8E93"
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowPayModal(false);
                  setPayAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handlePayFee}
                disabled={payFeeMutation.isPending}
              >
                <Text style={styles.confirmButtonText}>
                  {payFeeMutation.isPending ? t('loading') : 'Pay'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
  },
  competitionName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  competitionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  matchdayText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  inviteCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  prizeCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
  },
  prizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  prizeHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  prizeText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  prizePosition: {
    fontSize: 14,
    color: '#8E8E93',
    width: 20,
  },
  prizeDescription: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  prizeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  divider: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 12,
  },
  participantsList: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 4,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  adminBadge: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  walletCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  walletBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsList: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionUser: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  amountInput: {
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompetitionDetailScreen;