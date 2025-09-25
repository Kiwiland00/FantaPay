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
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { competitionAPI } from '../../services/api';
import CrossPlatformStorage from '../../utils/CrossPlatformStorage';

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
  
  // Real Wallet Balance State
  const [userBalance, setUserBalance] = useState(0);
  const [activeTab, setActiveTab] = useState<'summary' | 'participants' | 'standings'>('summary');
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editingPointsType, setEditingPointsType] = useState<'points' | 'totalPoints'>('points');
  const [tempPoints, setTempPoints] = useState<string>('');

  // Fetch competition data
  useEffect(() => {
    if (competitionId) {
      loadCompetition();
    } else {
      console.error('❌ No competition ID provided');
      setIsLoading(false);
    }
  }, [competitionId]);

  // Load payment data when competition is loaded
  useEffect(() => {
    if (competition && competition.daily_payment_enabled) {
      loadPaymentData();
    }
    loadUserBalance();
  }, [competition]);

  const loadUserBalance = async () => {
    try {
      const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
      const balanceKey = `wallet_balance_${userId}`;
      const storedBalance = await CrossPlatformStorage.getItem(balanceKey);
      
      if (storedBalance !== null) {
        setUserBalance(parseFloat(storedBalance));
        console.log('💰 Loaded user balance:', storedBalance);
      } else {
        setUserBalance(0);
        console.log('💰 User balance not found, set to €0');
      }
    } catch (error) {
      console.error('💥 Error loading balance:', error);
      setUserBalance(0);
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

  const addTransactionRecord = async (transaction: any) => {
    try {
      const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
      const transactionsKey = `transactions_${userId}`;
      
      const storedTransactions = await CrossPlatformStorage.getItem(transactionsKey);
      const transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
      
      const newTransaction = {
        ...transaction,
        _id: `txn_${Date.now()}`,
      };

      const updatedTransactions = [newTransaction, ...transactions];
      await CrossPlatformStorage.setItem(transactionsKey, JSON.stringify(updatedTransactions));
      
      console.log('📊 Added transaction:', newTransaction.type, newTransaction.amount);
    } catch (error) {
      console.error('💥 Error adding transaction:', error);
    }
  };

  // Standings Management Functions
  const updateParticipantPoints = async (participantId: string, newPoints: number, pointsType: 'points' | 'totalPoints' = 'points') => {
    try {
      console.log('📊 Updating', pointsType, 'for participant:', participantId, 'to', newPoints);
      
      // Get stored competitions
      const storedCompetitions = await CrossPlatformStorage.getItem('competitions_mock');
      const competitions = storedCompetitions ? JSON.parse(storedCompetitions) : [];
      
      // Find and update the competition
      const updatedCompetitions = competitions.map((comp: any) => {
        if (comp._id === competitionId) {
          const updatedParticipants = comp.participants?.map((participant: any) => {
            if (participant.id === participantId) {
              return { 
                ...participant, 
                [pointsType]: newPoints,
                // Ensure both point types exist
                points: pointsType === 'points' ? newPoints : (participant.points || 0),
                totalPoints: pointsType === 'totalPoints' ? newPoints : (participant.totalPoints || 0)
              };
            }
            return participant;
          }) || [];
          
          return { ...comp, participants: updatedParticipants };
        }
        return comp;
      });
      
      // Save updated competitions
      await CrossPlatformStorage.setItem('competitions_mock', JSON.stringify(updatedCompetitions));
      
      // Update local state
      if (competition) {
        const updatedParticipants = competition.participants?.map((participant: any) => {
          if (participant.id === participantId) {
            return { 
              ...participant, 
              [pointsType]: newPoints,
              points: pointsType === 'points' ? newPoints : (participant.points || 0),
              totalPoints: pointsType === 'totalPoints' ? newPoints : (participant.totalPoints || 0)
            };
          }
          return participant;
        }) || [];
        
        setCompetition({ ...competition, participants: updatedParticipants });
      }
      
      console.log('✅ Points updated successfully');
      return true;
    } catch (error) {
      console.error('💥 Error updating participant points:', error);
      return false;
    }
  };

  const handlePointsEdit = (participantId: string, currentPoints: number, pointsType: 'points' | 'totalPoints') => {
    setEditingParticipantId(participantId);
    setEditingPointsType(pointsType);
    setTempPoints(currentPoints.toString());
  };

  const handlePointsSave = async () => {
    if (!editingParticipantId || !tempPoints) return;
    
    const newPoints = parseFloat(tempPoints);
    if (isNaN(newPoints) || newPoints < 0) {
      Alert.alert('Error', 'Please enter a valid number (0 or greater)');
      return;
    }
    
    const success = await updateParticipantPoints(editingParticipantId, newPoints, editingPointsType);
    if (success) {
      setEditingParticipantId(null);
      setEditingPointsType('points');
      setTempPoints('');
      Alert.alert('Success', `${editingPointsType === 'points' ? 'Points' : 'Total Points'} updated successfully`);
    } else {
      Alert.alert('Error', 'Failed to update points. Please try again.');
    }
  };

  const handlePointsCancel = () => {
    setEditingParticipantId(null);
    setTempPoints('');
  };

  // Get sorted standings (highest points first)
  const getSortedStandings = () => {
    if (!competition?.participants) return [];
    
    return [...competition.participants]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .map((participant, index) => ({
        ...participant,
        position: index + 1,
      }));
  };

  // Calculate total competition balance from all participant payments
  const calculateCompetitionBalance = async () => {
    try {
      if (!competition?.participants) {
        return { totalPaid: 0, totalPrizePool: 0 };
      }

      let totalPaid = 0;
      
      // Calculate total paid by all participants
      for (const participant of competition.participants) {
        const paymentKey = `payments_${participant.id}_${competitionId}`;
        const storedPayments = await CrossPlatformStorage.getItem(paymentKey);
        const payments = storedPayments ? JSON.parse(storedPayments) : [];
        
        // Sum up all paid matchdays for this participant
        const participantPaid = payments
          .filter((payment: any) => payment.status === 'paid')
          .reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        
        console.log(`💰 Participant ${participant.name} paid: €${participantPaid}`);
        totalPaid += participantPaid;
      }

      // Calculate total prize pool based on competition settings
      const participantCount = competition.participants.length;
      const totalMatchdays = competition.total_matchdays || 36;
      const feePerMatchday = competition.daily_payment_amount || 5; // Default fee
      let totalPrizePool = 0;

      if (competition.daily_payment_enabled) {
        totalPrizePool = participantCount * totalMatchdays * feePerMatchday;
      } else {
        // If daily payments not enabled, use participation cost
        const participationCost = competition.participation_cost_per_team || 210;
        totalPrizePool = participantCount * participationCost;
      }

      console.log(`💰 Competition Balance: €${totalPaid} / €${totalPrizePool} (${participantCount} participants)`);
      return { totalPaid, totalPrizePool };
    } catch (error) {
      console.error('💥 Error calculating competition balance:', error);
      return { totalPaid: 0, totalPrizePool: 0 };
    }
  };

  // State for competition balance
  const [competitionBalance, setCompetitionBalance] = useState({ totalPaid: 0, totalPrizePool: 0 });

  // Load competition balance when competition data changes
  useEffect(() => {
    if (competition) {
      calculateCompetitionBalance().then(setCompetitionBalance);
    }
  }, [competition, competitionId]);

  // Add focus listener to refresh balance when returning from payment screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (competition) {
        refreshCompetitionBalance();
      }
    });

    return unsubscribe;
  }, [navigation, competition]);

  // Refresh competition balance after payments
  const refreshCompetitionBalance = async () => {
    const balance = await calculateCompetitionBalance();
    setCompetitionBalance(balance);
  };

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

  const loadPaymentData = async () => {
    try {
      console.log('💳 Loading payment data for competition:', competitionId);
      
      const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
      const paymentKey = `payments_${userId}_${competitionId}`;
      const storedPayments = await CrossPlatformStorage.getItem(paymentKey);
      
      let payments: MatchdayPayment[] = [];
      
      if (storedPayments) {
        payments = JSON.parse(storedPayments);
        console.log('💳 Loaded stored payments:', payments.length);
      } else {
        // Generate default payment status for all matchdays - ALL START AS UNPAID
        const totalMatchdays = competition?.total_matchdays || 36;
        
        for (let i = 1; i <= totalMatchdays; i++) {
          payments.push({
            _id: `payment_${i}`,
            user_id: userId,
            competition_id: competitionId,
            matchday: i,
            amount: competition?.daily_payment_amount || 5,
            status: 'pending', // ALL matchdays start as UNPAID/pending
            paid_at: undefined
          });
        }
        
        // Store initial payment status
        await CrossPlatformStorage.setItem(paymentKey, JSON.stringify(payments));
        console.log('💳 Generated initial payment records - ALL UNPAID for', totalMatchdays, 'matchdays');
      }
      
      setUserPayments(payments);
      
      // If user is admin, load payment status table
      if (competition?.admin_id === user?.id) {
        loadAdminPaymentTable();
      }
    } catch (error) {
      console.error('💥 Error loading payment data:', error);
    }
  };

  const loadAdminPaymentTable = async () => {
    try {
      console.log('🔐 Loading admin payment table');
      
      // Mock admin payment table data - ALL START AS UNPAID
      const mockTable: PaymentStatusTableParticipant[] = [
        {
          user_id: user?.id || '',
          username: 'FantaPay Tester',
          name: 'FantaPay Tester',
          email: 'test@fantapay.com',
          matchday_payments: Array.from({length: competition?.total_matchdays || 36}, (_, i) => ({
            matchday: i + 1,
            status: 'pending' as const, // ALL start as unpaid/pending
            amount: competition?.daily_payment_amount || 5,
            paid_at: undefined // None are paid initially
          }))
        }
      ];
      
      setPaymentStatusTable(mockTable);
      console.log('🔐 Admin payment table loaded - ALL matchdays marked as UNPAID initially');
    } catch (error) {
      console.error('💥 Error loading admin payment table:', error);
    }
  };

  const handleDeleteCompetition = () => {
    Alert.alert(
      'Delete Competition',
      `Are you sure you want to delete "${competition?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting competition:', competition?._id);
              
              // Remove from stored competitions
              const competitionsKey = 'competitions_mock';
              const storedCompetitions = await CrossPlatformStorage.getItem(competitionsKey);
              
              if (storedCompetitions) {
                const competitions = JSON.parse(storedCompetitions);
                const updatedCompetitions = competitions.filter((comp: any) => comp._id !== competition?._id);
                await CrossPlatformStorage.setItem(competitionsKey, JSON.stringify(updatedCompetitions));
                console.log('✅ Competition removed from storage');
              }

              // Remove user's payment records for this competition
              const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
              const paymentKey = `payments_${userId}_${competitionId}`;
              await CrossPlatformStorage.removeItem(paymentKey);
              
              // Add deletion log entry
              await addTransactionRecord({
                type: 'competition_deleted',
                amount: 0,
                description: `Deleted competition: ${competition?.name}`,
                from_wallet: 'system',
                to_wallet: 'system',
                status: 'completed',
                created_at: new Date().toISOString(),
              });

              // Immediately invalidate queries to refresh the competitions list
              queryClient.invalidateQueries({ queryKey: ['myCompetitions'] });
              queryClient.invalidateQueries({ queryKey: ['allCompetitions'] });
              queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
              
              // Navigate back immediately and show success message
              navigation.goBack();
              
              // Show success message after navigation
              setTimeout(() => {
                Alert.alert('Success', `"${competition?.name}" has been deleted successfully`);
              }, 300);
              
            } catch (error) {
              console.error('💥 Error deleting competition:', error);
              Alert.alert('Error', 'Failed to delete competition');
            }
          }
        }
      ]
    );
  };

  const handlePayMatchdays = async () => {
    if (selectedMatchdays.length === 0) {
      Alert.alert('Error', 'Please select at least one matchday to pay for');
      return;
    }

    const totalCost = selectedMatchdays.length * (competition?.daily_payment_amount || 5);
    
    // Check if user has sufficient balance
    if (userBalance < totalCost) {
      Alert.alert(
        'Insufficient Balance', 
        `You need €${totalCost.toFixed(2)} but only have €${userBalance.toFixed(2)}. Please deposit funds to your wallet first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Wallet', 
            onPress: () => {
              setShowPaymentModal(false);
              navigation.navigate('Wallet' as never);
            }
          }
        ]
      );
      return;
    }

    try {
      setIsPaymentLoading(true);
      
      Alert.alert(
        'Confirm Payment',
        `Pay €${totalCost.toFixed(2)} for ${selectedMatchdays.length} matchdays?\n\nMatchdays: ${selectedMatchdays.sort((a, b) => a - b).join(', ')}\n\nYour balance: €${userBalance.toFixed(2)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay Now',
            onPress: async () => {
              try {
                console.log('💳 Processing payment for matchdays:', selectedMatchdays);
                
                // Update user balance
                const newBalance = userBalance - totalCost;
                await updateUserBalance(newBalance);
                
                // Update payment status for selected matchdays
                const updatedPayments = userPayments.map(payment => {
                  if (selectedMatchdays.includes(payment.matchday)) {
                    return {
                      ...payment,
                      status: 'paid' as const,
                      paid_at: new Date().toISOString()
                    };
                  }
                  return payment;
                });
                
                setUserPayments(updatedPayments);
                
                // Add transaction record
                await addTransactionRecord({
                  type: 'matchday_payment',
                  amount: totalCost,
                  description: `Payment for matchdays ${selectedMatchdays.join(', ')} - ${competition?.name}`,
                  from_wallet: 'personal',
                  to_wallet: 'competition',
                  status: 'completed',
                  created_at: new Date().toISOString(),
                });

                // Add detailed payment logs for each matchday
                for (const matchday of selectedMatchdays) {
                  await addTransactionRecord({
                    type: 'matchday_payment_detail',
                    amount: competition?.daily_payment_amount || 5,
                    description: `${user?.name || 'FantaPay Tester'} paid matchday ${matchday}`,
                    from_wallet: 'personal',
                    to_wallet: 'competition',
                    status: 'completed',
                    created_at: new Date().toISOString(),
                  });
                }

                // Store updated payment status 
                const userId = user?.id || '650f1f1f1f1f1f1f1f1f1f1f';
                const paymentKey = `payments_${userId}_${competitionId}`;
                await CrossPlatformStorage.setItem(paymentKey, JSON.stringify(updatedPayments));
                
                // Update admin logs (competition-wide logs)
                const adminLogsKey = 'admin_logs_mock';
                const storedLogs = await CrossPlatformStorage.getItem(adminLogsKey);
                const logs = storedLogs ? JSON.parse(storedLogs) : [];
                
                for (const matchday of selectedMatchdays) {
                  const logEntry = {
                    _id: `log_${Date.now()}_${matchday}`,
                    admin_id: user?.id || '650f1f1f1f1f1f1f1f1f1f1f',
                    admin_username: user?.name || 'FantaPay Tester',
                    competition_id: competitionId,
                    competition_name: competition?.name || 'Competition',
                    action: 'matchday_payment',
                    details: `${user?.name || 'FantaPay Tester'} paid matchday ${matchday} (€${competition?.daily_payment_amount || 5})`,
                    timestamp: new Date().toISOString()
                  };
                  logs.unshift(logEntry); // Add to beginning
                }
                
                await CrossPlatformStorage.setItem(adminLogsKey, JSON.stringify(logs));
                console.log('📝 Added payment logs for matchdays:', selectedMatchdays);
                
                setSelectedMatchdays([]);
                setShowPaymentModal(false);
                
                Alert.alert('Payment Successful!', `€${totalCost.toFixed(2)} paid for ${selectedMatchdays.length} matchdays.\n\nNew balance: €${newBalance.toFixed(2)}`);
                
                // Reload competition data to reflect balance changes
                loadCompetition();
              } catch (error) {
                console.error('💥 Payment error:', error);
                Alert.alert('Error', 'Payment failed. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('💥 Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const toggleMatchdaySelection = (matchday: number) => {
    setSelectedMatchdays(prev => {
      if (prev.includes(matchday)) {
        return prev.filter(m => m !== matchday);
      } else {
        return [...prev, matchday].sort((a, b) => a - b);
      }
    });
  };

  const getPaymentStatusForMatchday = (matchday: number) => {
    const payment = userPayments.find(p => p.matchday === matchday);
    return payment?.status || 'pending';
  };

  const handleShareInvite = async () => {
    try {
      const shareContent = {
        title: `Join ${competition?.name || 'Competition'}`,
        message: `Join my fantasy competition "${competition?.name}" with invite code: ${competition?.invite_code}`,
        url: competition?.invite_link || `fantapay://join/${competition?.invite_code}`
      };
      
      await Share.share(shareContent);
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleCopyInviteCode = () => {
    if (competition?.invite_code) {
      Clipboard.setString(competition.invite_code);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  const renderParticipant = ({ item }: { item: Participant }) => {
    const isCurrentUser = item.id === user?.id;
    const canMakePayments = isCurrentUser;
    
    return (
      <TouchableOpacity
        style={[
          styles.participantItem,
          isCurrentUser && styles.participantItemCurrentUser
        ]}
        onPress={() => {
          // Navigate to participant payment history with payment capability flag
          navigation.navigate('ParticipantPaymentHistory' as never, {
            competitionId,
            participantId: item.id,
            participantName: item.name,
            competitionName: competition.name,
            canMakePayments, // User-specific payment access control
            isCurrentUser
          } as never);
        }}
      >
        <View style={styles.participantInfo}>
          <View style={styles.participantNameContainer}>
            <Text style={[
              styles.participantName,
              isCurrentUser && styles.participantNameCurrentUser
            ]}>
              {item.name}
              {isCurrentUser && (
                <Text style={styles.currentUserIndicator}> (You)</Text>
              )}
            </Text>
            <View style={styles.participantClickIndicator}>
              {canMakePayments ? (
                <>
                  <Ionicons name="card-outline" size={14} color="#34C759" />
                  <Text style={styles.clickIndicatorText}>Tap to Pay</Text>
                </>
              ) : (
                <>
                  <Ionicons name="eye-outline" size={14} color="#8E8E93" />
                  <Text style={styles.clickIndicatorTextReadOnly}>Tap to View</Text>
                </>
              )}
            </View>
          </View>
          <Text style={styles.participantEmail}>{item.email}</Text>
        </View>
        <View style={styles.participantMeta}>
          {item.is_admin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#FF9500" />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="#8E8E93" style={styles.participantChevron} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Pay Matchdays</Text>
          <TouchableOpacity onPress={handlePayMatchdays} disabled={selectedMatchdays.length === 0 || isPaymentLoading}>
            <Text style={[styles.payButtonText, selectedMatchdays.length === 0 && styles.payButtonDisabled]}>
              Pay €{selectedMatchdays.length * (competition?.daily_payment_amount || 5)}
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalDescription}>
            Select matchdays to pay for (€{competition?.daily_payment_amount || 5} each)
          </Text>
          
          <View style={styles.matchdayGrid}>
            {Array.from({length: competition?.total_matchdays || 36}, (_, i) => {
              const matchday = i + 1;
              const status = getPaymentStatusForMatchday(matchday);
              const isSelected = selectedMatchdays.includes(matchday);
              const isPaid = status === 'paid';
              
              return (
                <TouchableOpacity
                  key={matchday}
                  style={[
                    styles.matchdayItem,
                    isPaid && styles.matchdayPaid,
                    isSelected && styles.matchdaySelected,
                    isPaid && styles.matchdayDisabled
                  ]}
                  onPress={() => !isPaid && toggleMatchdaySelection(matchday)}
                  disabled={isPaid}
                >
                  <Text style={[
                    styles.matchdayNumber,
                    isPaid && styles.matchdayPaidText,
                    isSelected && styles.matchdaySelectedText
                  ]}>
                    {matchday}
                  </Text>
                  <View style={styles.matchdayStatus}>
                    <Ionicons
                      name={isPaid ? "checkmark-circle" : isSelected ? "radio-button-on" : "radio-button-off"}
                      size={16}
                      color={isPaid ? "#34C759" : isSelected ? "#007AFF" : "#8E8E93"}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderAdminPaymentTable = () => (
    <Modal
      visible={showAdminPaymentTable}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAdminPaymentTable(false)}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Payment Status</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ScrollView style={styles.paymentTableContainer}>
            <View style={styles.paymentTableHeader}>
              <View style={[styles.paymentTableCell, styles.nameColumn]}>
                <Text style={styles.paymentTableHeaderText}>Participant</Text>
              </View>
              {Array.from({length: Math.min(10, competition?.total_matchdays || 10)}, (_, i) => (
                <View key={i} style={[styles.paymentTableCell, styles.matchdayColumn]}>
                  <Text style={styles.paymentTableHeaderText}>MD{i + 1}</Text>
                </View>
              ))}
            </View>
            
            {paymentStatusTable.map((participant) => (
              <View key={participant.user_id} style={styles.paymentTableRow}>
                <View style={[styles.paymentTableCell, styles.nameColumn]}>
                  <Text style={styles.participantNameText} numberOfLines={1}>
                    {participant.name}
                  </Text>
                </View>
                {participant.matchday_payments.slice(0, 10).map((payment) => (
                  <View key={payment.matchday} style={[styles.paymentTableCell, styles.matchdayColumn]}>
                    <View style={[
                      styles.paymentStatusIndicator,
                      payment.status === 'paid' ? styles.paymentStatusPaid : styles.paymentStatusPending
                    ]}>
                      <Ionicons
                        name={payment.status === 'paid' ? "checkmark" : "close"}
                        size={12}
                        color={payment.status === 'paid' ? "#34C759" : "#FF3B30"}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

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
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Competition not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAdmin = competition.admin_id === user?.id;
  const paidCount = userPayments.filter(p => p.status === 'paid').length;
  const totalMatchdays = competition.total_matchdays || 36;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{competition.name}</Text>
        <TouchableOpacity onPress={handleShareInvite}>
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'summary' && styles.tabItemActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Ionicons 
            name="trophy-outline" 
            size={20} 
            color={activeTab === 'summary' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'summary' && styles.tabTextActive
          ]}>
            {t('competitions.summary') || 'Summary'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'participants' && styles.tabItemActive]}
          onPress={() => setActiveTab('participants')}
        >
          <Ionicons 
            name="people-outline" 
            size={20} 
            color={activeTab === 'participants' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'participants' && styles.tabTextActive
          ]}>
            {t('competitions.participants') || 'Participants'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'standings' && styles.tabItemActive]}
          onPress={() => setActiveTab('standings')}
        >
          <Ionicons 
            name="podium-outline" 
            size={20} 
            color={activeTab === 'standings' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'standings' && styles.tabTextActive
          ]}>
            {t('competitions.standings') || 'Standings'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadCompetition} />
        }
      >
        {/* Tab Content */}
        {activeTab === 'summary' && (
          <>
            {/* Competition Info */}
            <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="trophy-outline" size={24} color="#FF9500" />
            <Text style={styles.infoTitle}>League Summary</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Matchdays:</Text>
            <Text style={styles.infoValue}>{competition.total_matchdays || totalMatchdays}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fee per Matchday:</Text>
            <Text style={styles.infoValue}>
              {competition.daily_payment_enabled 
                ? `€${(competition.daily_payment_amount || 0).toFixed(2)}` 
                : 'Free'
              }
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Participation Cost:</Text>
            <Text style={styles.infoValue}>
              €{competition.participation_cost_per_team ? competition.participation_cost_per_team.toFixed(2) : 
                ((competition.daily_payment_amount || 0) * (competition.total_matchdays || totalMatchdays)).toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Participants:</Text>
            <Text style={styles.infoValue}>
              {competition.participants?.length || 0} / {competition.expected_teams || 8}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Prize Structure:</Text>
            <Text style={styles.infoValue}>
              {competition.rules?.type === 'final' && 'Final Prize Pool'}
              {competition.rules?.type === 'mixed' && 'Daily + Final Prizes'}
              {competition.rules?.type === 'daily' && 'Daily Prizes Only'}
              {!competition.rules?.type && 'Final Prize Pool'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Matchday:</Text>
            <Text style={styles.infoValue}>{competition.current_matchday || 1}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Competition Balance:</Text>
            <Text style={styles.infoValue}>
              €{competitionBalance.totalPaid.toFixed(2)} / €{competitionBalance.totalPrizePool.toFixed(2)}
            </Text>
          </View>

          {isAdmin && (
            <TouchableOpacity style={styles.inviteCodeContainer} onPress={handleCopyInviteCode}>
              <View style={styles.inviteCodeRow}>
                <Text style={styles.inviteCodeLabel}>Invite Code:</Text>
                <Text style={styles.inviteCodeValue}>{competition.invite_code}</Text>
              </View>
              <Ionicons name="copy-outline" size={18} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Daily Payment Section */}
        {competition.daily_payment_enabled && (
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Ionicons name="card-outline" size={24} color="#34C759" />
              <Text style={styles.paymentTitle}>Daily Payments</Text>
            </View>
            
            <View style={styles.paymentSummary}>
              <Text style={styles.paymentSummaryText}>
                {paidCount} of {totalMatchdays} matchdays paid (€{competition.daily_payment_amount} each)
              </Text>
              <View style={styles.paymentProgressBar}>
                <View 
                  style={[
                    styles.paymentProgress, 
                    { width: `${(paidCount / totalMatchdays) * 100}%` }
                  ]} 
                />
              </View>
            </View>

            {/* Wallet Balance Display */}
            <View style={styles.walletBalanceContainer}>
              <View style={styles.walletBalanceRow}>
                <Ionicons name="wallet-outline" size={20} color="#007AFF" />
                <Text style={styles.walletBalanceLabel}>Your Wallet Balance:</Text>
                <Text style={styles.walletBalanceAmount}>€{userBalance.toFixed(2)}</Text>
              </View>
              {userBalance < (competition.daily_payment_amount * 5) && (
                <Text style={styles.lowBalanceWarning}>
                  ⚠️ Low balance. Consider depositing funds for upcoming payments.
                </Text>
              )}
            </View>

            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => setShowPaymentModal(true)}
              >
                <Ionicons name="card" size={20} color="#FFFFFF" />
                <Text style={styles.payButtonText}>Pay Matchdays</Text>
              </TouchableOpacity>

              {isAdmin && (
                <TouchableOpacity
                  style={styles.adminTableButton}
                  onPress={() => setShowAdminPaymentTable(true)}
                >
                  <Ionicons name="list" size={20} color="#007AFF" />
                  <Text style={styles.adminTableButtonText}>Payment Table</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

            {/* Admin Actions */}
            {isAdmin && (
              <View style={styles.adminCard}>
                <View style={styles.adminHeader}>
                  <Ionicons name="settings-outline" size={24} color="#FF3B30" />
                  <Text style={styles.adminTitle}>Admin Actions</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteCompetition}
                >
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.deleteButtonText}>Delete Competition</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <View style={styles.participantsCard}>
            <View style={styles.participantsHeader}>
              <Ionicons name="people-outline" size={24} color="#007AFF" />
              <Text style={styles.participantsTitle}>Participants</Text>
            </View>
            
            <FlatList
              data={competition.participants || []}
              keyExtractor={(item) => item.id}
              renderItem={renderParticipant}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <View style={styles.standingsCard}>
            <View style={styles.standingsHeader}>
              <Ionicons name="podium-outline" size={24} color="#FF9500" />
              <Text style={styles.standingsTitle}>{t('competitions.standings') || 'Standings'}</Text>
            </View>
            
            {isAdmin && (
              <View style={styles.standingsAdminNotice}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#34C759" />
                <Text style={styles.standingsAdminText}>
                  Admin Mode: Tap any points value to edit
                </Text>
              </View>
            )}
            
            {/* Standings Table Header */}
            <View style={styles.standingsTableHeader}>
              <Text style={[styles.standingsHeaderText, styles.positionColumn]}>#</Text>
              <Text style={[styles.standingsHeaderText, styles.nameColumn]}>Name</Text>
              <Text style={[styles.standingsHeaderText, styles.pointsColumn]}>Pt</Text>
              <Text style={[styles.standingsHeaderText, styles.pointsColumn]}>Total Pt</Text>
            </View>
            
            {/* Standings List */}
            <FlatList
              data={getSortedStandings()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.standingsRow}>
                  <View style={[styles.standingsCell, styles.positionColumn]}>
                    <View style={[
                      styles.positionBadge,
                      item.position === 1 && styles.positionBadgeGold,
                      item.position === 2 && styles.positionBadgeSilver,
                      item.position === 3 && styles.positionBadgeBronze,
                    ]}>
                      <Text style={[
                        styles.positionText,
                        item.position <= 3 && styles.positionTextMedal
                      ]}>
                        {item.position}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.standingsCell, styles.nameColumn]}>
                    <Text style={styles.participantNameText} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  
                  {/* Points Column */}
                  <View style={[styles.standingsCell, styles.pointsColumn]}>
                    {isAdmin && editingParticipantId === item.id && editingPointsType === 'points' ? (
                      <View style={styles.pointsEditContainer}>
                        <TextInput
                          style={styles.pointsInput}
                          value={tempPoints}
                          onChangeText={setTempPoints}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#8E8E93"
                          autoFocus
                        />
                        <TouchableOpacity
                          style={styles.pointsSaveButton}
                          onPress={handlePointsSave}
                        >
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.pointsCancelButton}
                          onPress={handlePointsCancel}
                        >
                          <Ionicons name="close" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.pointsContainer}
                        onPress={isAdmin ? () => handlePointsEdit(item.id, item.points || 0, 'points') : undefined}
                        disabled={!isAdmin}
                      >
                        <Text style={styles.pointsText}>
                          {(item.points || 0).toFixed(1)}
                        </Text>
                        {isAdmin && (
                          <Ionicons name="pencil-outline" size={14} color="#8E8E93" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Total Points Column */}
                  <View style={[styles.standingsCell, styles.pointsColumn]}>
                    {isAdmin && editingParticipantId === item.id && editingPointsType === 'totalPoints' ? (
                      <View style={styles.pointsEditContainer}>
                        <TextInput
                          style={styles.pointsInput}
                          value={tempPoints}
                          onChangeText={setTempPoints}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#8E8E93"
                          autoFocus
                        />
                        <TouchableOpacity
                          style={styles.pointsSaveButton}
                          onPress={handlePointsSave}
                        >
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.pointsCancelButton}
                          onPress={handlePointsCancel}
                        >
                          <Ionicons name="close" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.pointsContainer}
                        onPress={isAdmin ? () => handlePointsEdit(item.id, item.totalPoints || 0, 'totalPoints') : undefined}
                        disabled={!isAdmin}
                      >
                        <Text style={styles.pointsText}>
                          {(item.totalPoints || 0).toFixed(1)}
                        </Text>
                        {isAdmin && (
                          <Ionicons name="pencil-outline" size={14} color="#8E8E93" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
            
            {(!competition.participants || competition.participants.length === 0) && (
              <View style={styles.emptyStandingsContainer}>
                <Ionicons name="trophy-outline" size={48} color="#8E8E93" />
                <Text style={styles.emptyStandingsText}>No participants yet</Text>
                <Text style={styles.emptyStandingsSubtext}>
                  Share the invite code to get participants
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {renderPaymentModal()}
      {renderAdminPaymentTable()}
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
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
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 8,
  },
  inviteCodeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: 1,
  },
  paymentCard: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  paymentSummary: {
    marginBottom: 20,
  },
  paymentSummaryText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  paymentProgressBar: {
    height: 6,
    backgroundColor: '#2C2C2E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  paymentProgress: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  walletBalanceContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
  },
  walletBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  walletBalanceLabel: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
  },
  walletBalanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lowBalanceWarning: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  payButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  payButtonDisabled: {
    color: '#8E8E93',
  },
  adminTableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  adminTableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  participantsCard: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  participantEmail: {
    fontSize: 12,
    color: '#8E8E93',
  },
  participantMeta: {
    alignItems: 'flex-end',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF9500',
  },
  participantPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
  },
  matchdayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  matchdayItem: {
    width: 60,
    height: 60,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  matchdaySelected: {
    backgroundColor: '#1a4480',
    borderColor: '#007AFF',
  },
  matchdayPaid: {
    backgroundColor: '#0A2A12',
    borderColor: '#34C759',
  },
  matchdayDisabled: {
    opacity: 0.6,
  },
  matchdayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  matchdaySelectedText: {
    color: '#007AFF',
  },
  matchdayPaidText: {
    color: '#34C759',
  },
  matchdayStatus: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  paymentTableContainer: {
    flex: 1,
    padding: 20,
  },
  paymentTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    marginBottom: 1,
  },
  paymentTableRow: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    marginBottom: 1,
  },
  paymentTableCell: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#3C3C3E',
  },
  nameColumn: {
    width: 120,
    alignItems: 'flex-start',
  },
  matchdayColumn: {
    width: 50,
  },
  paymentTableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  participantNameText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  paymentStatusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentStatusPaid: {
    backgroundColor: '#0A2A12',
  },
  paymentStatusPending: {
    backgroundColor: '#2A0A0A',
  },
  // Admin Actions Styles
  adminCard: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Tab Bar Styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // Standings Styles
  standingsCard: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  standingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  standingsAdminNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A2A12',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  standingsAdminText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  standingsTableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    marginBottom: 12,
  },
  standingsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  standingsCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionColumn: {
    flex: 0.8,
  },
  nameColumn: {
    flex: 2,
    alignItems: 'flex-start',
    paddingHorizontal: 12,
  },
  pointsColumn: {
    flex: 1.2,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionBadgeGold: {
    backgroundColor: '#FFD700',
  },
  positionBadgeSilver: {
    backgroundColor: '#C0C0C0',
  },
  positionBadgeBronze: {
    backgroundColor: '#CD7F32',
  },
  positionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  positionTextMedal: {
    color: '#000000',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pointsEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 60,
  },
  pointsSaveButton: {
    backgroundColor: '#34C759',
    borderRadius: 6,
    padding: 6,
  },
  pointsCancelButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    padding: 6,
  },
  emptyStandingsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStandingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyStandingsSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },

  // Enhanced Participant Styles
  participantItemCurrentUser: {
    backgroundColor: '#0A2A12',
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  participantNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  participantNameCurrentUser: {
    color: '#34C759',
    fontWeight: '600',
  },
  currentUserIndicator: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '500',
  },
  participantClickIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clickIndicatorText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '500',
  },
  clickIndicatorTextReadOnly: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  participantChevron: {
    marginLeft: 8,
  },
});

export default CompetitionDetailScreen;