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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { walletAPI } from '../../services/api';

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  from_wallet: string;
  to_wallet: string;
  status: string;
  created_at: string;
}

const WalletScreen: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['transactions'],
    queryFn: walletAPI.getTransactions,
  });

  const {
    data: balance,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: walletAPI.getBalance,
  });

  const topUpMutation = useMutation({
    mutationFn: walletAPI.topUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowTopUpModal(false);
      setAmount('');
      Alert.alert(t('success'), 'Wallet topped up successfully!');
    },
    onError: (error: any) => {
      Alert.alert(t('error'), error.response?.data?.detail || 'Top-up failed');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: walletAPI.withdraw,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowWithdrawModal(false);
      setAmount('');
      Alert.alert(t('success'), 'Withdrawal successful!');
    },
    onError: (error: any) => {
      Alert.alert(t('error'), error.response?.data?.detail || 'Withdrawal failed');
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchBalance(), refetchTransactions()]);
    setRefreshing(false);
  };

  const handleTopUp = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('error'), 'Please enter a valid amount');
      return;
    }
    topUpMutation.mutate(numAmount);
  };

  const handleWithdraw = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('error'), 'Please enter a valid amount');
      return;
    }
    if (numAmount > (user?.wallet_balance || 0)) {
      Alert.alert(t('error'), 'Insufficient balance');
      return;
    }
    withdrawMutation.mutate(numAmount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'add-circle';
      case 'withdraw':
        return 'remove-circle';
      case 'payment':
        return 'arrow-forward-circle';
      case 'prize':
        return 'trophy';
      default:
        return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'prize':
        return '#34C759';
      case 'withdraw':
      case 'payment':
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  const renderTransaction = (transaction: Transaction) => (
    <View key={transaction._id} style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: getTransactionColor(transaction.type) + '20' }
        ]}>
          <Ionicons 
            name={getTransactionIcon(transaction.type)} 
            size={20} 
            color={getTransactionColor(transaction.type)} 
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>
            {transaction.description}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(transaction.created_at)}
          </Text>
        </View>
      </View>
      <Text style={[
        styles.transactionAmount,
        { color: getTransactionColor(transaction.type) }
      ]}>
        {transaction.type === 'deposit' || transaction.type === 'prize' ? '+' : '-'}
        {t('currency.euro')}{transaction.amount.toFixed(2)}
      </Text>
    </View>
  );

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
        {/* Wallet Balance Card */}
        <LinearGradient
          colors={['#007AFF', '#5AC8FA']}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={32} color="#FFFFFF" />
            <Text style={styles.balanceTitle}>{t('wallet.personal')}</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {t('currency.euro')}{user?.wallet_balance?.toFixed(2) || '0.00'}
          </Text>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowTopUpModal(true)}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>{t('wallet.topup')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowWithdrawModal(true)}
            >
              <Ionicons name="remove" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>{t('wallet.withdraw')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Transactions Section */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>{t('wallet.transactions')}</Text>
          {transactionsLoading ? (
            <Text style={styles.loadingText}>{t('loading')}</Text>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#8E8E93" />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyDescription}>
                Your transaction history will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map(renderTransaction)}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('wallet.topup')}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount"
              placeholderTextColor="#8E8E93"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowTopUpModal(false);
                  setAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleTopUp}
                disabled={topUpMutation.isPending}
              >
                <Text style={styles.confirmButtonText}>
                  {topUpMutation.isPending ? t('loading') : t('confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('wallet.withdraw')}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount"
              placeholderTextColor="#8E8E93"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowWithdrawModal(false);
                  setAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleWithdraw}
                disabled={withdrawMutation.isPending}
              >
                <Text style={styles.confirmButtonText}>
                  {withdrawMutation.isPending ? t('loading') : t('confirm')}
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
  balanceCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 32,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  balanceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  loadingText: {
    color: '#8E8E93',
    textAlign: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
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

export default WalletScreen;