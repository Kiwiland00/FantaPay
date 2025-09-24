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

  // Load payment data when competition is loaded
  useEffect(() => {
    if (competition && competition.daily_payment_enabled) {
      loadPaymentData();
    }
  }, [competition]);

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
      
      // Mock payment data (in real implementation, call API)
      const mockPayments: MatchdayPayment[] = [];
      const totalMatchdays = competition?.total_matchdays || 36;
      
      // Generate mock payment status for current user
      for (let i = 1; i <= totalMatchdays; i++) {
        mockPayments.push({
          _id: `payment_${i}`,
          user_id: user?.id || '',
          competition_id: competitionId,
          matchday: i,
          amount: competition?.daily_payment_amount || 5,
          status: i <= 3 ? 'paid' : 'pending', // Mock: first 3 matchdays paid
          paid_at: i <= 3 ? new Date().toISOString() : undefined
        });
      }
      
      setUserPayments(mockPayments);
      
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
      
      // Mock admin payment table data
      const mockTable: PaymentStatusTableParticipant[] = [
        {
          user_id: user?.id || '',
          username: 'FantaPay Tester',
          name: 'FantaPay Tester',
          email: 'test@fantapay.com',
          matchday_payments: Array.from({length: competition?.total_matchdays || 36}, (_, i) => ({
            matchday: i + 1,
            status: (i < 3 ? 'paid' : 'pending') as 'paid' | 'pending',
            amount: competition?.daily_payment_amount || 5,
            paid_at: i < 3 ? new Date().toISOString() : undefined
          }))
        }
      ];
      
      setPaymentStatusTable(mockTable);
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
              
              // Mock deletion - in real implementation, call API
              Alert.alert('Success', 'Competition deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
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

    try {
      setIsPaymentLoading(true);
      
      const totalCost = selectedMatchdays.length * (competition?.daily_payment_amount || 5);
      
      Alert.alert(
        'Confirm Payment',
        `Pay €${totalCost} for ${selectedMatchdays.length} matchdays?\n\nMatchdays: ${selectedMatchdays.sort((a, b) => a - b).join(', ')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay',
            onPress: async () => {
              try {
                // Mock payment success
                console.log('💳 Processing payment for matchdays:', selectedMatchdays);
                
                // Update payment status
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
                setSelectedMatchdays([]);
                setShowPaymentModal(false);
                
                Alert.alert('Success', `Payment successful! Paid €${totalCost} for ${selectedMatchdays.length} matchdays.`);
                
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

  const renderParticipant = ({ item }: { item: Participant }) => (
    <TouchableOpacity
      style={styles.participantItem}
      onPress={() => {
        if (competition?.admin_id === user?.id) {
          // Navigate to participant payment history
          navigation.navigate('ParticipantPaymentHistory' as never, {
            competitionId,
            participantId: item.id,
            participantName: item.name
          } as never);
        }
      }}
    >
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{item.name}</Text>
        <Text style={styles.participantEmail}>{item.email}</Text>
      </View>
      <View style={styles.participantMeta}>
        {item.is_admin && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FF9500" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
        <Text style={styles.participantPoints}>{item.points || 0} pts</Text>
      </View>
    </TouchableOpacity>
  );

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

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadCompetition} />
        }
      >
        {/* Competition Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="trophy-outline" size={24} color="#FF9500" />
            <Text style={styles.infoTitle}>Competition Details</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Matchday:</Text>
            <Text style={styles.infoValue}>{competition.current_matchday || 1} / {totalMatchdays}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Participants:</Text>
            <Text style={styles.infoValue}>{competition.participants?.length || 0}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Competition Balance:</Text>
            <Text style={styles.infoValue}>€{competition.wallet_balance?.toFixed(2) || '0.00'}</Text>
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

        {/* Participants */}
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
});

export default CompetitionDetailScreen;