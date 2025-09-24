import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { competitionAPI } from '../../services/api';

interface MatchdayPayment {
  matchday: number;
  amount: number;
  status: 'paid' | 'pending';
  paid_at?: string;
}

interface ParticipantData {
  user_id: string;
  username: string;
  name: string;
  email: string;
  total_paid: number;
  total_pending: number;
  matchday_payments: MatchdayPayment[];
}

interface Competition {
  _id: string;
  name: string;
  total_matchdays: number;
  daily_payment_enabled: boolean;
  daily_payment_amount: number;
}

const ParticipantPaymentHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const { competitionId, participantId, participantName } = route.params as any;
  
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'paid' | 'pending'>('all');

  useEffect(() => {
    loadParticipantData();
  }, []);

  const loadParticipantData = async () => {
    try {
      setIsLoading(true);
      
      // Mock participant payment data
      const mockCompetition: Competition = {
        _id: competitionId,
        name: 'Serie A Fantasy League 2024',
        total_matchdays: 36,
        daily_payment_enabled: true,
        daily_payment_amount: 5.0
      };
      
      const mockPayments: MatchdayPayment[] = [];
      
      // Generate payment history for all matchdays
      for (let i = 1; i <= mockCompetition.total_matchdays; i++) {
        const isPaid = i <= 8 || (i >= 15 && i <= 20) || i === 25; // Mock payment pattern
        mockPayments.push({
          matchday: i,
          amount: mockCompetition.daily_payment_amount,
          status: isPaid ? 'paid' : 'pending',
          paid_at: isPaid ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined
        });
      }
      
      const paidPayments = mockPayments.filter(p => p.status === 'paid');
      const pendingPayments = mockPayments.filter(p => p.status === 'pending');
      
      const mockParticipantData: ParticipantData = {
        user_id: participantId,
        username: participantName || 'FantaPay User',
        name: participantName || 'FantaPay User',
        email: 'user@fantapay.com',
        total_paid: paidPayments.length * mockCompetition.daily_payment_amount,
        total_pending: pendingPayments.length * mockCompetition.daily_payment_amount,
        matchday_payments: mockPayments
      };
      
      setCompetition(mockCompetition);
      setParticipantData(mockParticipantData);
    } catch (error) {
      console.error('💥 Error loading participant data:', error);
      Alert.alert('Error', 'Failed to load payment history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadParticipantData();
    setRefreshing(false);
  };

  const getFilteredPayments = () => {
    if (!participantData) return [];
    
    switch (selectedFilter) {
      case 'paid':
        return participantData.matchday_payments.filter(p => p.status === 'paid');
      case 'pending':
        return participantData.matchday_payments.filter(p => p.status === 'pending');
      default:
        return participantData.matchday_payments;
    }
  };

  const formatPaymentDate = (dateString?: string) => {
    if (!dateString) return 'Not paid';
    
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderPaymentItem = ({ item }: { item: MatchdayPayment }) => {
    const isPaid = item.status === 'paid';
    
    return (
      <View style={[styles.paymentItem, isPaid ? styles.paymentItemPaid : styles.paymentItemPending]}>
        <View style={styles.paymentHeader}>
          <View style={styles.matchdayInfo}>
            <Text style={styles.matchdayNumber}>Matchday {item.matchday}</Text>
            <Text style={styles.paymentAmount}>€{item.amount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIndicator,
              isPaid ? styles.statusPaid : styles.statusPending
            ]}>
              <Ionicons
                name={isPaid ? "checkmark-circle" : "time-outline"}
                size={16}
                color={isPaid ? "#34C759" : "#FF9500"}
              />
            </View>
            <Text style={[
              styles.statusText,
              isPaid ? styles.statusTextPaid : styles.statusTextPending
            ]}>
              {isPaid ? 'PAID' : 'PENDING'}
            </Text>
          </View>
        </View>
        
        <View style={styles.paymentDetails}>
          <Text style={styles.paymentDate}>
            {isPaid ? `Paid: ${formatPaymentDate(item.paid_at)}` : 'Payment pending'}
          </Text>
        </View>
      </View>
    );
  };

  const renderFilterButton = (filter: string, label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter as any)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading payment history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!participantData || !competition) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Failed to load payment history</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredPayments = getFilteredPayments();
  const paidCount = participantData.matchday_payments.filter(p => p.status === 'paid').length;
  const pendingCount = participantData.matchday_payments.filter(p => p.status === 'pending').length;
  const totalCount = participantData.matchday_payments.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Payment History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Participant Info */}
        <View style={styles.participantCard}>
          <View style={styles.participantHeader}>
            <View style={styles.participantAvatar}>
              <Ionicons name="person" size={24} color="#007AFF" />
            </View>
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{participantData.name}</Text>
              <Text style={styles.participantEmail}>{participantData.email}</Text>
            </View>
          </View>
          
          <View style={styles.competitionInfo}>
            <Text style={styles.competitionName}>{competition.name}</Text>
            <Text style={styles.competitionDetails}>
              {competition.total_matchdays} matchdays • €{competition.daily_payment_amount} each
            </Text>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <View style={styles.summaryStatHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                <Text style={styles.summaryStatLabel}>Paid</Text>
              </View>
              <Text style={styles.summaryStatValue}>€{participantData.total_paid.toFixed(2)}</Text>
              <Text style={styles.summaryStatCount}>{paidCount} matchdays</Text>
            </View>
            
            <View style={styles.summaryStatDivider} />
            
            <View style={styles.summaryStatItem}>
              <View style={styles.summaryStatHeader}>
                <Ionicons name="time-outline" size={20} color="#FF9500" />
                <Text style={styles.summaryStatLabel}>Pending</Text>
              </View>
              <Text style={styles.summaryStatValue}>€{participantData.total_pending.toFixed(2)}</Text>
              <Text style={styles.summaryStatCount}>{pendingCount} matchdays</Text>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${(paidCount / totalCount) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {paidCount} of {totalCount} payments completed ({Math.round((paidCount / totalCount) * 100)}%)
            </Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filtersContainer}>
          {renderFilterButton('all', 'All', totalCount)}
          {renderFilterButton('paid', 'Paid', paidCount)}
          {renderFilterButton('pending', 'Pending', pendingCount)}
        </View>

        {/* Payment History List */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>
              {selectedFilter === 'all' ? 'All Payments' :
               selectedFilter === 'paid' ? 'Paid Matchdays' :
               'Pending Matchdays'}
            </Text>
            <Text style={styles.historyCount}>
              {filteredPayments.length} matchdays
            </Text>
          </View>
          
          <FlatList
            data={filteredPayments}
            keyExtractor={(item) => `matchday-${item.matchday}`}
            renderItem={renderPaymentItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
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
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  participantCard: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  participantEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  competitionInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  competitionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  competitionDetails: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryCard: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  summaryStats: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  summaryStatLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summaryStatCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  summaryStatDivider: {
    width: 1,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 20,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#2C2C2E',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  historyCard: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  historyCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  paymentItem: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  paymentItemPaid: {
    backgroundColor: '#0A2A12',
    borderColor: '#34C759',
  },
  paymentItemPending: {
    backgroundColor: '#2A1F0A',
    borderColor: '#FF9500',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchdayInfo: {
    flex: 1,
  },
  matchdayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    padding: 2,
  },
  statusPaid: {
    // No additional styling needed, icon color handles it
  },
  statusPending: {
    // No additional styling needed, icon color handles it
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextPaid: {
    color: '#34C759',
  },
  statusTextPending: {
    color: '#FF9500',
  },
  paymentDetails: {
    marginTop: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  separator: {
    height: 12,
  },
});

export default ParticipantPaymentHistoryScreen;