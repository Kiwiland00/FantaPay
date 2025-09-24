import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useLanguage } from '../../contexts/LanguageContext';

interface PaymentHistoryItem {
  matchday: number;
  amount: number;
  status: 'paid' | 'pending';
  date?: string;
}

interface RouteParams {
  participantName: string;
  participantId: string;
  competitionName: string;
  competitionMatchdays: number;
  paidMatchdays: number[];
}

const ParticipantPaymentHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  
  const { 
    participantName, 
    competitionName, 
    competitionMatchdays = 36,
    paidMatchdays = []
  } = route.params as RouteParams;

  // Generate detailed payment history based on total matchdays
  const generatePaymentHistory = (): PaymentHistoryItem[] => {
    const history: PaymentHistoryItem[] = [];
    const dailyFee = 25; // €25 per matchday
    
    for (let matchday = 1; matchday <= competitionMatchdays; matchday++) {
      const isPaid = paidMatchdays.includes(matchday);
      const daysSinceStart = matchday - 1;
      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() - (competitionMatchdays - matchday) * 7); // Weekly matchdays
      
      history.push({
        matchday,
        amount: dailyFee,
        status: isPaid ? 'paid' : 'pending',
        date: isPaid ? paymentDate.toISOString().split('T')[0] : undefined,
      });
    }
    
    return history;
  };

  const paymentHistory = generatePaymentHistory();

  const renderPaymentItem = (item: PaymentHistoryItem) => {
    const isCurrentOrFuture = item.matchday > 3; // Assuming current matchday is 3
    
    return (
      <View key={item.matchday} style={[
        styles.paymentItem,
        item.status === 'paid' ? styles.paidItem : styles.pendingItem,
        isCurrentOrFuture && styles.futureItem
      ]}>
        <View style={styles.matchdayInfo}>
          <Text style={styles.matchdayText}>
            {t('competitions.matchday')} {item.matchday}
          </Text>
          {item.date && (
            <Text style={styles.dateText}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          )}
          {isCurrentOrFuture && !item.date && (
            <Text style={styles.futureText}>
              {item.matchday === 4 ? 'Next matchday' : 'Future'}
            </Text>
          )}
        </View>
        
        <View style={styles.paymentStatus}>
          <Text style={styles.amountText}>€{item.amount.toFixed(2)}</Text>
          <View style={[
            styles.statusContainer,
            item.status === 'paid' ? styles.paidContainer : styles.pendingContainer
          ]}>
            <Ionicons
              name={item.status === 'paid' ? 'checkmark-circle' : 'time-outline'}
              size={16}
              color={item.status === 'paid' ? '#34C759' : '#FF3B30'}
            />
            <Text style={[
              styles.statusText,
              { color: item.status === 'paid' ? '#34C759' : '#FF3B30' }
            ]}>
              {item.status === 'paid' ? t('competitions.paid') : t('competitions.pending')}
            </Text>
          </View>
        </div>
      </View>
    );
  };

  const totalPaid = paymentHistory
    .filter(item => item.status === 'paid')
    .reduce((sum, item) => sum + item.amount, 0);
  
  const totalPending = paymentHistory
    .filter(item => item.status === 'pending')
    .reduce((sum, item) => sum + item.amount, 0);

  const paidCount = paymentHistory.filter(item => item.status === 'paid').length;
  const pendingCount = paymentHistory.filter(item => item.status === 'pending').length;

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
          <Text style={styles.title}>{participantName}</Text>
          <Text style={styles.subtitle}>{competitionName}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={[styles.summaryCard, styles.paidCard]}>
            <View style={styles.summaryHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              <Text style={styles.summaryTitle}>{t('competitions.paid')}</Text>
            </View>
            <Text style={styles.summaryAmount}>€{totalPaid.toFixed(2)}</Text>
            <Text style={styles.summarySubtext}>
              {paidCount} of {competitionMatchdays} matchdays
            </Text>
          </View>
          
          <View style={[styles.summaryCard, styles.pendingCard]}>
            <View style={styles.summaryHeader}>
              <Ionicons name="time-outline" size={24} color="#FF3B30" />
              <Text style={styles.summaryTitle}>{t('competitions.pending')}</Text>
            </View>
            <Text style={styles.summaryAmount}>€{totalPending.toFixed(2)}</Text>
            <Text style={styles.summarySubtext}>
              {pendingCount} matchdays remaining
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Payment Progress</Text>
            <Text style={styles.progressPercentage}>
              {Math.round((paidCount / competitionMatchdays) * 100)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(paidCount / competitionMatchdays) * 100}%` }
              ]}
            />
          </View>
        </View>

        {/* Payment History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            {t('wallet.paymentHistory')} - Day by Day
          </Text>
          
          {/* Current/Recent Matchdays */}
          <View style={styles.matchdaysGroup}>
            <Text style={styles.groupTitle}>Recent Matchdays</Text>
            <View style={styles.paymentsList}>
              {paymentHistory.slice(0, 5).map(renderPaymentItem)}
            </View>
          </View>

          {/* Upcoming Matchdays */}
          {competitionMatchdays > 5 && (
            <View style={styles.matchdaysGroup}>
              <Text style={styles.groupTitle}>Upcoming Matchdays</Text>
              <View style={styles.paymentsList}>
                {paymentHistory.slice(5, 10).map(renderPaymentItem)}
              </View>
            </View>
          )}

          {/* Show all if needed */}
          {competitionMatchdays > 10 && (
            <TouchableOpacity style={styles.showAllButton}>
              <Text style={styles.showAllText}>
                Show all {competitionMatchdays} matchdays
              </Text>
              <Ionicons name="chevron-down" size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <View style={styles.instructionCard}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>
                Payment Information
              </Text>
              <Text style={styles.instructionText}>
                Each matchday requires a €25 payment. Green indicates completed payments, red shows pending payments for upcoming matchdays.
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  summarySection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  paidCard: {
    backgroundColor: '#0A1F0A',
    borderColor: '#34C759',
  },
  pendingCard: {
    backgroundColor: '#1F0A0A',
    borderColor: '#FF3B30',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 10,
    color: '#8E8E93',
  },
  progressSection: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  historySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  matchdaysGroup: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
  },
  paymentsList: {
    gap: 8,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  paidItem: {
    backgroundColor: '#0A1F0A',
    borderColor: '#34C759',
  },
  pendingItem: {
    backgroundColor: '#1F0A0A',
    borderColor: '#FF3B30',
  },
  futureItem: {
    backgroundColor: '#1A1A1A',
    borderColor: '#3C3C3E',
  },
  matchdayInfo: {
    flex: 1,
  },
  matchdayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  futureText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    fontStyle: 'italic',
  },
  paymentStatus: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paidContainer: {
    // No additional styles needed
  },
  pendingContainer: {
    // No additional styles needed
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    gap: 8,
  },
  showAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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

export default ParticipantPaymentHistoryScreen;