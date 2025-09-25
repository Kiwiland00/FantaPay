import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { walletAPI } from '../../services/api';
import CrossPlatformStorage from '../../utils/CrossPlatformStorage';

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

interface UserBalance {
  balance: number;
  user_id: string;
}

const WalletScreen: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load user balance on component mount
  useEffect(() => {
    loadUserBalance();
    loadTransactions();
  }, []);

  // Refresh data when screen comes into focus (e.g., after returning from payments)
  useFocusEffect(
    useCallback(() => {
      console.log('💰 WalletScreen focused - refreshing data');
      loadUserBalance();
      loadTransactions();
    }, [])
  );

  const loadUserBalance = async () => {
    try {
      const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
      const balanceKey = `wallet_balance_${userId}`;
      const storedBalance = await CrossPlatformStorage.getItem(balanceKey);
      
      if (storedBalance !== null) {
        setUserBalance(parseFloat(storedBalance));
        console.log('💰 Loaded user balance:', storedBalance);
      } else {
        // Initialize with €0 for new users
        setUserBalance(0);
        await CrossPlatformStorage.setItem(balanceKey, '0');
        console.log('💰 Initialized new user with €0 balance');
      }
    } catch (error) {
      console.error('💥 Error loading balance:', error);
      setUserBalance(0);
    }
  };

  const loadTransactions = async () => {
    try {
      const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
      const transactionsKey = `transactions_${userId}`;
      const storedTransactions = await CrossPlatformStorage.getItem(transactionsKey);
      
      if (storedTransactions) {
        const parsed = JSON.parse(storedTransactions);
        setTransactions(parsed);
        console.log('📊 Loaded transactions:', parsed.length);
      } else {
        setTransactions([]);
        console.log('📊 No transactions found for user');
      }
    } catch (error) {
      console.error('💥 Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const updateUserBalance = async (newBalance: number) => {
    try {
      const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
      const balanceKey = `wallet_balance_${userId}`;
      await CrossPlatformStorage.setItem(balanceKey, newBalance.toString());
      setUserBalance(newBalance);
      console.log('💰 Updated user balance to:', newBalance);
    } catch (error) {
      console.error('💥 Error updating balance:', error);
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, '_id'>) => {
    try {
      const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
      const transactionsKey = `transactions_${userId}`;
      
      const newTransaction: Transaction = {
        ...transaction,
        _id: `txn_${Date.now()}`,
      };

      const updatedTransactions = [newTransaction, ...transactions];
      await CrossPlatformStorage.setItem(transactionsKey, JSON.stringify(updatedTransactions));
      setTransactions(updatedTransactions);
      
      console.log('📊 Added transaction:', newTransaction.type, newTransaction.amount);
    } catch (error) {
      console.error('💥 Error adding transaction:', error);
    }
  };

  const handleTopUp = async () => {
    const topUpAmount = parseFloat(amount);
    
    if (isNaN(topUpAmount) || topUpAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (topUpAmount > 1000) {
      Alert.alert('Error', 'Maximum top-up amount is €1000');
      return;
    }

    try {
      // Simulate payment processing
      Alert.alert(
        'Confirm Deposit',
        `Deposit €${topUpAmount.toFixed(2)} to your wallet?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deposit',
            onPress: async () => {
              const newBalance = userBalance + topUpAmount;
              await updateUserBalance(newBalance);
              
              // Add transaction record
              await addTransaction({
                type: 'deposit',
                amount: topUpAmount,
                description: `Wallet deposit of €${topUpAmount.toFixed(2)}`,
                from_wallet: 'bank',
                to_wallet: 'personal',
                status: 'completed',
                created_at: new Date().toISOString(),
              });

              setAmount('');
              setShowTopUpModal(false);
              Alert.alert('Success', `€${topUpAmount.toFixed(2)} has been added to your wallet`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('💥 Top-up error:', error);
      Alert.alert('Error', 'Failed to process deposit');
    }
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (withdrawAmount > userBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      Alert.alert(
        'Confirm Withdrawal',
        `Withdraw €${withdrawAmount.toFixed(2)} from your wallet?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Withdraw',
            onPress: async () => {
              const newBalance = userBalance - withdrawAmount;
              await updateUserBalance(newBalance);
              
              // Add transaction record
              await addTransaction({
                type: 'withdraw',
                amount: withdrawAmount,
                description: `Wallet withdrawal of €${withdrawAmount.toFixed(2)}`,
                from_wallet: 'personal',
                to_wallet: 'bank',
                status: 'completed',
                created_at: new Date().toISOString(),
              });

              setAmount('');
              setShowWithdrawModal(false);
              Alert.alert('Success', `€${withdrawAmount.toFixed(2)} has been withdrawn from your wallet`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('💥 Withdrawal error:', error);
      Alert.alert('Error', 'Failed to process withdrawal');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserBalance();
    await loadTransactions();
    setRefreshing(false);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return { name: 'add-circle', color: '#34C759' };
      case 'withdraw':
        return { name: 'remove-circle', color: '#FF3B30' };
      case 'matchday_payment':
        return { name: 'card', color: '#007AFF' };
      case 'prize_received':
        return { name: 'trophy', color: '#FF9500' };
      default:
        return { name: 'swap-horizontal', color: '#8E8E93' };
    }
  };

  const formatTransactionAmount = (transaction: Transaction) => {
    const isIncoming = transaction.to_wallet === 'personal';
    const sign = isIncoming ? '+' : '-';
    return `${sign}€${transaction.amount.toFixed(2)}`;
  };

  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const icon = getTransactionIcon(item.type);
    const isIncoming = item.to_wallet === 'personal';
    
    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionIcon}>
          <Ionicons name={icon.name as any} size={24} color={icon.color} />
        </View>
        
        <View style={styles.transactionContent}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>{formatTransactionDate(item.created_at)}</Text>
        </View>
        
        <Text style={[
          styles.transactionAmount,
          { color: isIncoming ? '#34C759' : '#FF3B30' }
        ]}>
          {formatTransactionAmount(item)}
        </Text>
      </View>
    );
  };

  const renderModal = (title: string, isVisible: boolean, onClose: () => void, onConfirm: () => void) => (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onConfirm} disabled={!amount}>
            <Text style={[styles.confirmButtonText, !amount && styles.confirmButtonDisabled]}>
              {title}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <Text style={styles.modalDescription}>
            {title === 'Deposit' 
              ? 'Add funds to your FantaPay wallet'
              : 'Withdraw funds from your FantaPay wallet'
            }
          </Text>
          
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>€</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#8E8E93"
              keyboardType="numeric"
              autoFocus
            />
          </View>
          
          <View style={styles.quickAmounts}>
            {[10, 25, 50, 100].map(quickAmount => (
              <TouchableOpacity
                key={quickAmount}
                style={styles.quickAmountButton}
                onPress={() => setAmount(quickAmount.toString())}
              >
                <Text style={styles.quickAmountText}>€{quickAmount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {title === 'Deposit' && (
            <Text style={styles.depositNote}>
              💡 This is a mock deposit for testing. In production, this would integrate with real payment providers.
            </Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Wallet Balance Card */}
        <LinearGradient
          colors={['#007AFF', '#5856D6']}
          style={styles.balanceCard}
        >
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceTitle}>My Wallet</Text>
            <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
          </View>
          
          <Text style={styles.balanceAmount}>€{userBalance.toFixed(2)}</Text>
          <Text style={styles.balanceSubtitle}>Available Balance</Text>
          
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowTopUpModal(true)}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Deposit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, userBalance <= 0 && styles.actionButtonDisabled]}
              onPress={() => setShowWithdrawModal(true)}
              disabled={userBalance <= 0}
            >
              <Ionicons name="remove" size={20} color={userBalance <= 0 ? "#8E8E93" : "#007AFF"} />
              <Text style={[styles.actionButtonText, userBalance <= 0 && styles.actionButtonTextDisabled]}>
                Withdraw
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats section removed as requested */}

        {/* Transaction History */}
        <View style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>Recent Transactions</Text>
            <Text style={styles.transactionsCount}>
              {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
            </Text>
          </View>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons name="receipt-outline" size={48} color="#48484A" />
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptySubtitle}>
                Your transaction history will appear here
              </Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={(item) => item._id}
              renderItem={renderTransaction}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      {renderModal('Deposit', showTopUpModal, () => {
        setShowTopUpModal(false);
        setAmount('');
      }, handleTopUp)}

      {renderModal('Withdraw', showWithdrawModal, () => {
        setShowWithdrawModal(false);
        setAmount('');
      }, handleWithdraw)}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  balanceCard: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 24,
  },
  balanceActions: {
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
    gap: 6,
  },
  actionButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionButtonTextDisabled: {
    color: '#8E8E93',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  transactionsCard: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transactionsCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6D6D70',
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  confirmButtonDisabled: {
    color: '#8E8E93',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingVertical: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  depositNote: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});

export default WalletScreen;