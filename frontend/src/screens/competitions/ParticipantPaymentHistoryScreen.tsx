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
import CrossPlatformStorage from '../../utils/CrossPlatformStorage';

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
      
      console.log('🔍 Loading participant data for:', { competitionId, participantId, participantName });
      
      // Get actual competition data from the competitions storage
      let actualCompetition = null;
      let competitionName = route.params?.competitionName || 'Competition'; // Use route params as fallback
      
      try {
        // First, try to get the actual competition from storage
        console.log('📋 Attempting to load competition from storage...');
        const storedCompetitions = await competitionAPI.getMyCompetitionsMock();
        console.log('📊 Loaded competitions:', storedCompetitions.length);
        
        if (storedCompetitions && storedCompetitions.length > 0) {
          actualCompetition = storedCompetitions.find((comp: any) => comp._id === competitionId);
          
          if (actualCompetition) {
            competitionName = actualCompetition.name;
            console.log('✅ Found actual competition:', competitionName);
            console.log('📊 Competition config:', {
              matchdays: actualCompetition.total_matchdays,
              matchdayFee: actualCompetition.daily_payment_amount,
              participationCost: actualCompetition.participation_cost_per_team,
              prizeType: actualCompetition.rules?.type
            });
          } else {
            console.log('❌ Competition not found in storage, using route params');
          }
        } else {
          console.log('❌ No competitions found in storage');
        }
      } catch (error) {
        console.error('🔍 Error loading competition:', error);
        console.log('📋 Fallback: Using route params for competition data');
      }

      // Use actual competition data or sensible defaults
      const realCompetition: Competition = {
        _id: competitionId,
        name: competitionName,
        total_matchdays: actualCompetition?.total_matchdays || 36,
        daily_payment_enabled: actualCompetition?.daily_payment_enabled !== false,
        daily_payment_amount: actualCompetition?.daily_payment_amount || 5.0 // Default fee if not set
      };
      
      console.log('📋 Using competition config:', realCompetition);
      
      // Get existing payment records for this participant and competition
      const paymentKey = `payments_${participantId}_${competitionId}`;
      console.log('🔑 Payment storage key:', paymentKey);
      
      let existingPayments = [];
      try {
        const storedPayments = await CrossPlatformStorage.getItem(paymentKey);
        existingPayments = storedPayments ? JSON.parse(storedPayments) : [];
        console.log('💳 Existing payment records:', existingPayments.length);
      } catch (paymentError) {
        console.error('💥 Error loading payment records:', paymentError);
        existingPayments = [];
      }
      
      const matchdayPayments: MatchdayPayment[] = [];
      
      // Create payment status for each matchday based on REAL competition data
      for (let i = 1; i <= realCompetition.total_matchdays; i++) {
        // Check if this matchday has been paid
        const existingPayment = existingPayments.find((p: any) => p.matchday === i);
        
        matchdayPayments.push({
          matchday: i,
          amount: realCompetition.daily_payment_amount,
          status: existingPayment ? 'paid' : 'pending', // Only paid if actually paid
          paid_at: existingPayment?.paid_at || undefined
        });
      }
      
      const paidPayments = matchdayPayments.filter(p => p.status === 'paid');
      const pendingPayments = matchdayPayments.filter(p => p.status === 'pending');
      
      const participantData: ParticipantData = {
        user_id: participantId,
        username: participantName || 'FantaPay User',
        name: participantName || 'FantaPay User',
        email: 'user@fantapay.com',
        total_paid: paidPayments.length * realCompetition.daily_payment_amount,
        total_pending: pendingPayments.length * realCompetition.daily_payment_amount,
        matchday_payments: matchdayPayments
      };
      
      console.log('📊 Payment Summary Generated:', {
        totalPaid: participantData.total_paid,
        totalPending: participantData.total_pending,
        paidMatchdays: paidPayments.length,
        pendingMatchdays: pendingPayments.length,
        totalMatchdays: matchdayPayments.length
      });
      
      setCompetition(realCompetition);
      setParticipantData(participantData);
      
      console.log('✅ Participant data loaded successfully');
      
    } catch (error) {
      console.error('💥 Error loading participant data:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        competitionId,
        participantId,
        participantName
      });
      Alert.alert(t('common.error'), t('paymentHistory.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const [selectedMatchdays, setSelectedMatchdays] = useState<number[]>([]);
  const [paymentMode, setPaymentMode] = useState<'single' | 'bulk'>('single');

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadParticipantData();
    setRefreshing(false);
  };

  // Add transaction log entry for payments
  const addPaymentLog = async (matchdays: number[], totalAmount: number) => {
    try {
      const logKey = `competition_logs_${competitionId}`;
      const existingLogs = await CrossPlatformStorage.getItem(logKey);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      const matchdayText = matchdays.length === 1 
        ? `matchday ${matchdays[0]}`
        : `matchday ${matchdays.join(' and matchday ')}`;
      
      const newLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'payment',
        user_id: participantId,
        user_name: participantName || 'User',
        description: `${participantName || 'User'} paid ${matchdayText}`,
        amount: totalAmount,
        matchdays: matchdays,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };
      
      logs.push(newLog);
      await CrossPlatformStorage.setItem(logKey, JSON.stringify(logs));
      
      console.log('📝 Payment log added:', newLog.description);
      return newLog;
    } catch (error) {
      console.error('💥 Error adding payment log:', error);
    }
  };

  // Handle single matchday payment
  const handleSingleMatchdayPayment = async (matchday: number) => {
    if (!competition || !participantData) return;
    
    const amount = competition.daily_payment_amount;
    const totalCost = amount;
    
    Alert.alert(
      'Pay Matchday',
      `Pay €${totalCost.toFixed(2)} for Matchday ${matchday}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: () => processPayment([matchday], totalCost)
        }
      ]
    );
  };

  // Handle bulk matchday payment
  const handleBulkPayment = async () => {
    if (!competition || !participantData || selectedMatchdays.length === 0) return;
    
    const amount = competition.daily_payment_amount;
    const totalCost = selectedMatchdays.length * amount;
    const matchdaysText = selectedMatchdays.length === 1 
      ? `Matchday ${selectedMatchdays[0]}`
      : `Matchdays ${selectedMatchdays.join(', ')}`;
    
    Alert.alert(
      'Pay Multiple Matchdays',
      `Pay €${totalCost.toFixed(2)} for ${matchdaysText}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: () => processPayment(selectedMatchdays, totalCost)
        }
      ]
    );
  };

  // Process payment for one or multiple matchdays
  const processPayment = async (matchdays: number[], totalAmount: number) => {
    try {
      // Update payment records in storage
      const paymentKey = `payments_${participantId}_${competitionId}`;
      const existingPayments = await CrossPlatformStorage.getItem(paymentKey);
      const payments = existingPayments ? JSON.parse(existingPayments) : [];
      
      const paymentTimestamp = new Date().toISOString();
      
      // Add payment records for each matchday
      matchdays.forEach(matchday => {
        payments.push({
          matchday: matchday,
          amount: competition!.daily_payment_amount,
          status: 'paid',
          paid_at: paymentTimestamp,
          transaction_id: `txn_${Date.now()}_${matchday}`
        });
      });
      
      // Save updated payment records
      await CrossPlatformStorage.setItem(paymentKey, JSON.stringify(payments));
      
      // Add payment log to competition logs
      await addPaymentLog(matchdays, totalAmount);
      
      // Clear selections
      setSelectedMatchdays([]);
      setPaymentMode('single');
      
      // Refresh data
      await loadParticipantData();
      
      // Success message
      const matchdaysText = matchdays.length === 1 
        ? `Matchday ${matchdays[0]}`
        : `Matchdays ${matchdays.join(', ')}`;
      
      Alert.alert(
        'Payment Successful!',
        `✅ Paid €${totalAmount.toFixed(2)} for ${matchdaysText}`,
        [{ text: 'OK', style: 'default' }]
      );
      
      console.log('✅ Payment processed successfully:', matchdays);
      
    } catch (error) {
      console.error('💥 Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
  };

  // Toggle matchday selection for bulk payment
  const toggleMatchdaySelection = (matchday: number) => {
    if (selectedMatchdays.includes(matchday)) {
      setSelectedMatchdays(prev => prev.filter(m => m !== matchday));
    } else {
      setSelectedMatchdays(prev => [...prev, matchday]);
    }
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
    const isSelected = selectedMatchdays.includes(item.matchday);
    const canSelectForBulk = paymentMode === 'bulk' && !isPaid;
    
    return (
      <View style={[
        styles.paymentItem, 
        isPaid ? styles.paymentItemPaid : styles.paymentItemPending,
        isSelected && styles.paymentItemSelected
      ]}>
        <View style={styles.paymentHeader}>
          <View style={styles.matchdayInfo}>
            <View style={styles.matchdayTitleRow}>
              {/* Bulk selection checkbox */}
              {canSelectForBulk && (
                <TouchableOpacity
                  style={styles.selectionCheckbox}
                  onPress={() => toggleMatchdaySelection(item.matchday)}
                >
                  <Ionicons
                    name={isSelected ? "checkbox" : "square-outline"}
                    size={24}
                    color={isSelected ? "#007AFF" : "#8E8E93"}
                  />
                </TouchableOpacity>
              )}
              
              <View style={styles.matchdayDetails}>
                <Text style={styles.matchdayNumber}>Matchday {item.matchday}</Text>
                <Text style={styles.paymentAmount}>€{item.amount.toFixed(2)}</Text>
              </View>
            </View>
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
          
          {/* Single payment button - only show for pending payments in single mode */}
          {!isPaid && paymentMode === 'single' && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => handleSingleMatchdayPayment(item.matchday)}
            >
              <Ionicons name="card" size={16} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Pay Now</Text>
            </TouchableOpacity>
          )}
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
          <Text style={styles.loadingText}>{t('paymentHistory.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!participantData || !competition) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{t('paymentHistory.loadFailed')}</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>{t('paymentHistory.title')}</Text>
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
          <Text style={styles.summaryTitle}>{t('paymentHistory.summary')}</Text>
          
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

        {/* Payment Mode Controls - Only show if there are pending payments */}
        {pendingCount > 0 && (
          <View style={styles.paymentControlsCard}>
            <Text style={styles.paymentControlsTitle}>Payment Options</Text>
            
            {/* Payment Mode Toggle */}
            <View style={styles.paymentModeToggle}>
              <TouchableOpacity
                style={[
                  styles.paymentModeButton,
                  paymentMode === 'single' && styles.paymentModeButtonActive
                ]}
                onPress={() => {
                  setPaymentMode('single');
                  setSelectedMatchdays([]);
                }}
              >
                <Ionicons name="card-outline" size={20} color={paymentMode === 'single' ? "#FFFFFF" : "#8E8E93"} />
                <Text style={[
                  styles.paymentModeButtonText,
                  paymentMode === 'single' && styles.paymentModeButtonTextActive
                ]}>
                  Single Payment
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentModeButton,
                  paymentMode === 'bulk' && styles.paymentModeButtonActive
                ]}
                onPress={() => {
                  setPaymentMode('bulk');
                  setSelectedMatchdays([]);
                }}
              >
                <Ionicons name="layers-outline" size={20} color={paymentMode === 'bulk' ? "#FFFFFF" : "#8E8E93"} />
                <Text style={[
                  styles.paymentModeButtonText,
                  paymentMode === 'bulk' && styles.paymentModeButtonTextActive
                ]}>
                  Bulk Payment
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Bulk Payment Actions */}
            {paymentMode === 'bulk' && (
              <View style={styles.bulkPaymentActions}>
                {selectedMatchdays.length > 0 ? (
                  <View style={styles.bulkPaymentInfo}>
                    <View style={styles.bulkPaymentDetails}>
                      <Text style={styles.bulkPaymentText}>
                        Selected: {selectedMatchdays.length} matchdays
                      </Text>
                      <Text style={styles.bulkPaymentAmount}>
                        Total: €{(selectedMatchdays.length * competition.daily_payment_amount).toFixed(2)}
                      </Text>
                    </View>
                    
                    <View style={styles.bulkPaymentButtons}>
                      <TouchableOpacity
                        style={styles.clearSelectionButton}
                        onPress={() => setSelectedMatchdays([])}
                      >
                        <Text style={styles.clearSelectionButtonText}>Clear</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.bulkPayButton}
                        onPress={handleBulkPayment}
                      >
                        <Ionicons name="card" size={16} color="#FFFFFF" />
                        <Text style={styles.bulkPayButtonText}>Pay All</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.bulkPaymentHint}>
                    💡 Select multiple pending matchdays below to pay them all at once
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

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
  // New Payment Functionality Styles
  paymentControlsCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  paymentControlsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  paymentModeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    padding: 2,
  },
  paymentModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  paymentModeButtonActive: {
    backgroundColor: '#007AFF',
  },
  paymentModeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  paymentModeButtonTextActive: {
    color: '#FFFFFF',
  },
  bulkPaymentActions: {
    marginTop: 16,
  },
  bulkPaymentInfo: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
  },
  bulkPaymentDetails: {
    marginBottom: 12,
  },
  bulkPaymentText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bulkPaymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  bulkPaymentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clearSelectionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8E8E93',
    alignItems: 'center',
  },
  clearSelectionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  bulkPayButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    gap: 6,
  },
  bulkPayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bulkPaymentHint: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  // Updated Payment Item Styles
  paymentItemSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  matchdayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionCheckbox: {
    padding: 4,
  },
  matchdayDetails: {
    flex: 1,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  payButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ParticipantPaymentHistoryScreen;