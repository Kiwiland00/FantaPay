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
  paymentHistory: PaymentHistoryItem[];
}

const ParticipantPaymentHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  
  const { participantName, competitionName, paymentHistory } = route.params as RouteParams;

  // Mock payment history if not provided
  const mockPaymentHistory: PaymentHistoryItem[] = paymentHistory || [
    { matchday: 1, amount: 25, status: 'paid', date: '2024-01-15' },
    { matchday: 2, amount: 25, status: 'paid', date: '2024-01-22' },
    { matchday: 3, amount: 25, status: 'pending' },
    { matchday: 4, amount: 25, status: 'pending' },
    { matchday: 5, amount: 25, status: 'pending' },
  ];

  const renderPaymentItem = (item: PaymentHistoryItem) => (
    <View key={item.matchday} style={styles.paymentItem}>
      <View style={styles.matchdayInfo}>
        <Text style={styles.matchdayText}>
          {t('competitions.matchday')} {item.matchday}
        </Text>
        {item.date && (
          <Text style={styles.dateText}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        )}
      </View>
      
      <View style={styles.paymentStatus}>
        <Text style={styles.amountText}>€{item.amount.toFixed(2)}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'paid' ? '#34C759' : '#FF3B30' }
        ]}>
          <Ionicons
            name={item.status === 'paid' ? 'checkmark' : 'close'}
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>
            {item.status === 'paid' ? t('competitions.paid') : t('competitions.pending')}
          </Text>
        </View>
      </View>
    </View>
  );

  const totalPaid = mockPaymentHistory
    .filter(item => item.status === 'paid')
    .reduce((sum, item) => sum + item.amount, 0);
  
  const totalOwed = mockPaymentHistory
    .filter(item => item.status === 'pending')
    .reduce((sum, item) => sum + item.amount, 0);

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
            <Text style={styles.summaryLabel}>{t('wallet.totalPaid')}</Text>
            <Text style={styles.summaryAmount}>€{totalPaid.toFixed(2)}</Text>
            <View style={styles.summaryIcon}>
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            </View>
          </View>
          
          <View style={[styles.summaryCard, styles.owedCard]}>
            <Text style={styles.summaryLabel}>{t('wallet.totalOwed')}</Text>
            <Text style={styles.summaryAmount}>€{totalOwed.toFixed(2)}</Text>
            <View style={styles.summaryIcon}>
              <Ionicons name="time" size={24} color="#FF3B30" />
            </View>
          </View>
        </View>

        {/* Payment History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>{t('wallet.paymentHistory')}</Text>
          <View style={styles.paymentsList}>
            {mockPaymentHistory.map(renderPaymentItem)}
          </View>
        </View>

        {/* Payment Instructions */}
        <View style={styles.instructionsSection}>
          <View style={styles.instructionCard}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <View style={styles.instructionContent}>
              <Text style={styles.instructionTitle}>
                {t('competitions.paymentInstructions')}
              </Text>
              <Text style={styles.instructionText}>
                {t('competitions.paymentInstructionsDetail')}
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
    position: 'relative',
  },
  paidCard: {
    backgroundColor: '#1C2E1C',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  owedCard: {
    backgroundColor: '#2E1C1C',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  summaryIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
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
  paymentsList: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
  },
  matchdayInfo: {
    flex: 1,
  },
  matchdayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
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

export default ParticipantPaymentHistoryScreen;