import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { competitionAPI } from '../../services/api';

interface ActivityLog {
  _id: string;
  admin_id: string;
  admin_username: string;
  competition_id: string;
  competition_name: string;
  action: 'create_competition' | 'edit_competition' | 'delete_competition' | 'matchday_payment' | 'daily_prize' | 'join_competition';
  details: string;
  timestamp: string;
}

interface Competition {
  _id: string;
  name: string;
  admin_id: string;
  participants?: Array<{ id: string; name: string; email: string }>;
}

const LogsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [userCompetitions, setUserCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'payments' | 'admin'>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      
      // Get user's competitions first
      const competitions = await competitionAPI.getMyCompetitionsMock();
      setUserCompetitions(competitions);
      
      // Get all admin logs
      const allLogs = await competitionAPI.getAdminLogsMock();
      
      // Filter logs to only show competitions the user is involved in
      const userCompetitionIds = competitions.map((comp: Competition) => comp._id);
      const filteredLogs = allLogs.filter((log: ActivityLog) => 
        userCompetitionIds.includes(log.competition_id)
      );
      
      console.log('📝 Activity logs loaded:', filteredLogs.length);
      setLogs(filteredLogs);
    } catch (error) {
      console.error('💥 Error loading logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const getFilteredLogs = () => {
    switch (selectedFilter) {
      case 'payments':
        return logs.filter(log => log.action === 'matchday_payment');
      case 'admin':
        return logs.filter(log => ['create_competition', 'edit_competition', 'delete_competition', 'daily_prize'].includes(log.action));
      default:
        return logs;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create_competition':
        return { name: 'add-circle', color: '#34C759' };
      case 'edit_competition':
        return { name: 'pencil', color: '#007AFF' };
      case 'delete_competition':
        return { name: 'trash', color: '#FF3B30' };
      case 'matchday_payment':
        return { name: 'card', color: '#30D158' };
      case 'daily_prize':
        return { name: 'trophy', color: '#FF9500' };
      case 'join_competition':
        return { name: 'person-add', color: '#5AC8FA' };
      default:
        return { name: 'information-circle', color: '#8E8E93' };
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create_competition':
      case 'matchday_payment':
        return '#34C759';
      case 'edit_competition':
        return '#007AFF';
      case 'delete_competition':
        return '#FF3B30';
      case 'daily_prize':
        return '#FF9500';
      case 'join_competition':
        return '#5AC8FA';
      default:
        return '#8E8E93';
    }
  };

  const getActionDisplayName = (action: string) => {
    switch (action) {
      case 'create_competition':
        return 'Competition Created';
      case 'edit_competition':
        return 'Competition Edited';
      case 'delete_competition':
        return 'Competition Deleted';
      case 'matchday_payment':
        return 'Matchday Payment';
      case 'daily_prize':
        return 'Daily Prize Awarded';
      case 'join_competition':
        return 'User Joined';
      default:
        return 'Activity';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const isPaymentAction = (action: string) => {
    return action === 'matchday_payment';
  };

  const getPaymentStatus = (details: string) => {
    // Extract payment information from details
    if (details.includes('Paid for matchdays:')) {
      return 'paid';
    }
    return 'pending';
  };

  const renderLogItem = ({ item }: { item: ActivityLog }) => {
    const actionIcon = getActionIcon(item.action);
    const actionColor = getActionColor(item.action);
    const isPayment = isPaymentAction(item.action);
    const paymentStatus = isPayment ? getPaymentStatus(item.details) : null;

    return (
      <View style={styles.logItem}>
        <View style={styles.logHeader}>
          <View style={styles.logIconContainer}>
            <View style={[styles.logIconBg, { backgroundColor: `${actionColor}20` }]}>
              <Ionicons name={actionIcon.name as any} size={20} color={actionColor} />
            </View>
            {isPayment && (
              <View style={[
                styles.paymentStatusIndicator,
                paymentStatus === 'paid' ? styles.paymentStatusPaid : styles.paymentStatusPending
              ]}>
                <Ionicons
                  name={paymentStatus === 'paid' ? "checkmark" : "time"}
                  size={12}
                  color={paymentStatus === 'paid' ? "#34C759" : "#FF9500"}
                />
              </View>
            )}
          </View>
          
          <View style={styles.logContent}>
            <View style={styles.logTitleRow}>
              <Text style={styles.logAction}>{getActionDisplayName(item.action)}</Text>
              <Text style={styles.logTimestamp}>{formatTimestamp(item.timestamp)}</Text>
            </View>
            
            <Text style={styles.logCompetition}>{item.competition_name}</Text>
            
            <View style={styles.logDetailsRow}>
              <Text style={styles.logAdmin}>Admin: {item.admin_username}</Text>
              {isPayment && (
                <View style={[
                  styles.paymentBadge,
                  paymentStatus === 'paid' ? styles.paymentBadgePaid : styles.paymentBadgePending
                ]}>
                  <Text style={[
                    styles.paymentBadgeText,
                    paymentStatus === 'paid' ? styles.paymentBadgeTextPaid : styles.paymentBadgeTextPending
                  ]}>
                    {paymentStatus === 'paid' ? '✓ PAID' : '⏳ PENDING'}
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={styles.logDetails}>{item.details}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFilterButton = (filter: string, label: string, count?: number) => (
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
        {label}
        {count !== undefined && ` (${count})`}
      </Text>
    </TouchableOpacity>
  );

  const filteredLogs = getFilteredLogs();
  const paymentLogsCount = logs.filter(log => log.action === 'matchday_payment').length;
  const adminLogsCount = logs.filter(log => ['create_competition', 'edit_competition', 'delete_competition', 'daily_prize'].includes(log.action)).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Logs & Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {renderFilterButton('all', 'All', logs.length)}
          {renderFilterButton('payments', 'Payments', paymentLogsCount)}
          {renderFilterButton('admin', 'Admin Actions', adminLogsCount)}
        </ScrollView>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="card" size={20} color="#34C759" />
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{paymentLogsCount}</Text>
            <Text style={styles.statLabel}>Payments</Text>
          </View>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="settings" size={20} color="#007AFF" />
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{adminLogsCount}</Text>
            <Text style={styles.statLabel}>Admin Actions</Text>
          </View>
        </View>
        
        <View style={styles.statCard}>
          <Ionicons name="people" size={20} color="#5AC8FA" />
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{userCompetitions.length}</Text>
            <Text style={styles.statLabel}>Competitions</Text>
          </View>
        </View>
      </View>

      {/* Logs List */}
      <View style={styles.logsContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading activity logs...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#48484A" />
            <Text style={styles.emptyTitle}>No Activity Yet</Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter === 'all'
                ? 'Create or join competitions to see activity logs'
                : selectedFilter === 'payments'
                ? 'No payment activities found'
                : 'No admin actions recorded'
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={(item) => item._id}
            renderItem={renderLogItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.logsList}
          />
        )}
      </View>
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
  filtersContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  logsContainer: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6D6D70',
    textAlign: 'center',
    lineHeight: 20,
  },
  logsList: {
    paddingVertical: 8,
  },
  logItem: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  logIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentStatusIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  paymentStatusPaid: {
    backgroundColor: '#0A2A12',
  },
  paymentStatusPending: {
    backgroundColor: '#2A1F0A',
  },
  logContent: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  logCompetition: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  logDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logAdmin: {
    fontSize: 12,
    color: '#8E8E93',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentBadgePaid: {
    backgroundColor: '#0A2A12',
    borderColor: '#34C759',
  },
  paymentBadgePending: {
    backgroundColor: '#2A1F0A',
    borderColor: '#FF9500',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paymentBadgeTextPaid: {
    color: '#34C759',
  },
  paymentBadgeTextPending: {
    color: '#FF9500',
  },
  logDetails: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
});

export default LogsScreen;