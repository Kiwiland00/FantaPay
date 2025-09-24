import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  PaymentSummary: {
    competitionId: string;
    participantId: string;
    participantName: string;
    competitionName: string;
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

interface MatchdayPayment {
  matchday: number;
  status: 'paid' | 'pending';
  amount: number;
  paid_date?: string;
}

const PaymentSummaryScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'PaymentSummary'>>();
  const { competitionId, participantId, participantName, competitionName } = route.params;
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [showPayModal, setShowPayModal] = useState<number | null>(null);

  // Get competition details to calculate matchday fees
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

  // Get participant's payment history
  const {
    data: transactions = [],
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['competitionTransactions', competitionId],
    queryFn: () => competitionAPI.getTransactions(competitionId),
    enabled: !!competitionId,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchTransactions()]);
    setRefreshing(false);
  };

  // Calculate payment summary data
  const getPaymentSummary = () => {
    if (!competition) return { matchdayPayments: [], totalPaid: 0, totalPending: 0, matchdayFee: 0 };

    // Calculate matchday fee based on competition rules
    let matchdayFee = 0;
    if (competition.rules.type === 'daily' && competition.rules.daily_prize) {
      matchdayFee = competition.rules.daily_prize / competition.participants.length;
    } else if (competition.rules.type === 'final' && competition.rules.final_prize_pool) {
      const totalPrize = competition.rules.final_prize_pool.reduce((sum, prize) => sum + prize.amount, 0);
      matchdayFee = totalPrize / (competition.participants.length * competition.current_matchday);
    } else if (competition.rules.type === 'mixed') {
      const dailyFee = competition.rules.daily_prize ? competition.rules.daily_prize / competition.participants.length : 0;
      const finalFee = competition.rules.final_prize_pool 
        ? competition.rules.final_prize_pool.reduce((sum, prize) => sum + prize.amount, 0) / (competition.participants.length * competition.current_matchday)
        : 0;
      matchdayFee = dailyFee + finalFee;
    }

    // Get paid transactions for this participant
    const participantTransactions = transactions.filter(
      (tx) => tx.user_id === participantId && tx.type === 'payment'
    );

    // Create matchday payment status - ALWAYS START WITH ALL PENDING
    const matchdayPayments: MatchdayPayment[] = [];
    for (let i = 1; i <= competition.current_matchday; i++) {
      const paidTransaction = participantTransactions.find(tx => 
        tx.description.includes(`Matchday ${i}`) || 
        tx.created_at // We'll assume transactions are for specific matchdays
      );

      matchdayPayments.push({
        matchday: i,
        status: paidTransaction ? 'paid' : 'pending',
        amount: matchdayFee,
        paid_date: paidTransaction?.created_at,
      });
    }

    const totalPaid = matchdayPayments
      .filter(mp => mp.status === 'paid')
      .reduce((sum, mp) => sum + mp.amount, 0);

    const totalPending = matchdayPayments
      .filter(mp => mp.status === 'pending')
      .reduce((sum, mp) => sum + mp.amount, 0);

    return { matchdayPayments, totalPaid, totalPending, matchdayFee };
  };

  const { matchdayPayments, totalPaid, totalPending, matchdayFee } = getPaymentSummary();

  const payMatchdayMutation = useMutation({
    mutationFn: (matchday: number) => competitionAPI.payFee(competitionId, matchdayFee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['competitionTransactions', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      setShowPayModal(null);
      Alert.alert(t('success'), 'Payment successful!');
    },
    onError: (error: any) => {
      Alert.alert(t('error'), error.response?.data?.detail || 'Payment failed');
    },
  });

  const handlePayMatchday = (matchday: number) => {
    if (matchdayFee > (user?.wallet_balance || 0)) {
      Alert.alert(t('error'), 'Insufficient balance in your wallet');
      return;
    }
    
    Alert.alert(
      'Confirm Payment',
      `Pay ${t('currency.euro')}${matchdayFee.toFixed(2)} for Matchday ${matchday}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pay', 
          onPress: () => payMatchdayMutation.mutate(matchday)
        },
      ]
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
      {/* Header with correct competition name */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.competitionName}>{competitionName}</Text>
          <Text style={styles.participantName}>{participantName}</Text>
        </View>
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
        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={[styles.summaryValue, styles.paidValue]}>
                {t('currency.euro')}{totalPaid.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={[styles.summaryValue, styles.pendingValue]}>
                {t('currency.euro')}{totalPending.toFixed(2)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.totalLabel]}>Total</Text>
              <Text style={[styles.summaryValue, styles.totalValue]}>
                {t('currency.euro')}{(totalPaid + totalPending).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Matchday Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Matchday Breakdown</Text>
          <View style={styles.matchdaysList}>
            {matchdayPayments.map((matchdayPayment) => (
              <View key={matchdayPayment.matchday} style={styles.matchdayItem}>
                <View style={styles.matchdayInfo}>
                  <Text style={styles.matchdayNumber}>Matchday {matchdayPayment.matchday}</Text>
                  <Text style={styles.matchdayAmount}>
                    {t('currency.euro')}{matchdayPayment.amount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.matchdayActions}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: matchdayPayment.status === 'paid' ? '#34C759' : '#FF9500' }
                  ]}>
                    <Text style={styles.statusText}>
                      {matchdayPayment.status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                  {matchdayPayment.status === 'pending' && participantId === user?.id && (
                    <TouchableOpacity
                      style={styles.payButton}
                      onPress={() => handlePayMatchday(matchdayPayment.matchday)}
                    >
                      <Text style={styles.payButtonText}>Pay</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {matchdayPayment.paid_date && (
                  <Text style={styles.paidDate}>
                    Paid: {new Date(matchdayPayment.paid_date).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Fee Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Matchday Fee:</Text>
              <Text style={styles.infoValue}>
                {t('currency.euro')}{matchdayFee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Competition Type:</Text>
              <Text style={styles.infoValue}>
                {competition.rules.type === 'daily' && 'Daily Prize'}
                {competition.rules.type === 'final' && 'Final Prize Pool'}
                {competition.rules.type === 'mixed' && 'Daily + Final'}
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
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  competitionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 14,
    color: '#8E8E93',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  paidValue: {
    color: '#34C759',
  },
  pendingValue: {
    color: '#FF9500',
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 8,
  },
  matchdaysList: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 4,
  },
  matchdayItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  matchdayInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchdayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  matchdayAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  matchdayActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  payButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paidDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default PaymentSummaryScreen;