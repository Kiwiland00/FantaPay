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
  action: 'create_competition' | 'edit_competition' | 'delete_competition' | 'matchday_payment' | 'daily_prize' | 'join_competition' | 'remove_participant';
  details: string;
  timestamp: string;
}

interface Competition {
  _id: string;
  name: string;
  admin_id: string;
  participants?: Array<{ id: string; name: string; email: string }>;
}

interface CompetitionLogGroup {
  competition_id: string;
  competition_name: string;
  logs: ActivityLog[];
  logCount: number;
}

const LogsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [competitionGroups, setCompetitionGroups] = useState<CompetitionLogGroup[]>([]);
  const [userCompetitions, setUserCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);

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
      
      // Group logs by competition
      const logGroups: { [key: string]: CompetitionLogGroup } = {};
      
      // Initialize groups for all user competitions (even if no logs yet)
      competitions.forEach((comp: Competition) => {
        logGroups[comp._id] = {
          competition_id: comp._id,
          competition_name: comp.name,
          logs: [],
          logCount: 0
        };
      });
      
      // Add logs to their respective groups
      filteredLogs.forEach((log: ActivityLog) => {
        if (logGroups[log.competition_id]) {
          logGroups[log.competition_id].logs.push(log);
          logGroups[log.competition_id].logCount++;
        }
      });
      
      // Sort logs within each group by timestamp (newest first)
      Object.values(logGroups).forEach(group => {
        group.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
      
      // Convert to array and sort by most recent activity
      const sortedGroups = Object.values(logGroups).sort((a, b) => {
        const aLatest = a.logs[0]?.timestamp || '0';
        const bLatest = b.logs[0]?.timestamp || '0';
        return new Date(bLatest).getTime() - new Date(aLatest).getTime();
      });
      
      setCompetitionGroups(sortedGroups);
      console.log('📝 Competition log groups created:', sortedGroups.length);
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
    if (details.includes('paid matchday')) {
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

  const renderCompetitionGroup = ({ item }: { item: CompetitionLogGroup }) => (
    <View style={styles.competitionGroup}>
      <TouchableOpacity
        style={[
          styles.competitionHeader,
          selectedCompetition === item.competition_id && styles.competitionHeaderActive
        ]}
        onPress={() => {
          setSelectedCompetition(
            selectedCompetition === item.competition_id ? null : item.competition_id
          );
        }}
      >
        <View style={styles.competitionHeaderLeft}>
          <Ionicons name="trophy-outline" size={20} color="#007AFF" />
          <Text style={styles.competitionName}>{item.competition_name}</Text>
        </View>
        
        <View style={styles.competitionHeaderRight}>
          <View style={styles.logCountBadge}>
            <Text style={styles.logCountText}>{item.logCount}</Text>
          </View>
          <Ionicons
            name={selectedCompetition === item.competition_id ? "chevron-up" : "chevron-down"}
            size={20}
            color="#8E8E93"
          />
        </View>
      </TouchableOpacity>
      
      {selectedCompetition === item.competition_id && (
        <View style={styles.competitionLogs}>
          {item.logs.length === 0 ? (
            <View style={styles.emptyLogs}>
              <Ionicons name="document-text-outline" size={32} color="#48484A" />
              <Text style={styles.emptyLogsText}>No activity yet</Text>
              <Text style={styles.emptyLogsSubtext}>Activity for this competition will appear here</Text>
            </View>
          ) : (
            <FlatList
              data={item.logs}
              keyExtractor={(log) => log._id}
              renderItem={renderLogItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Logs & Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="trophy" size={20} color="#007AFF" />
          <View style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>{competitionGroups.length}</Text>
            <Text style={styles.summaryLabel}>Competitions</Text>
          </View>
        </View>
        
        <View style={styles.summaryCard}>
          <Ionicons name="document" size={20} color="#34C759" />
          <View style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>
              {competitionGroups.reduce((total, group) => total + group.logCount, 0)}
            </Text>
            <Text style={styles.summaryLabel}>Total Logs</Text>
          </View>
        </View>
        
        <View style={styles.summaryCard}>
          <Ionicons name="card" size={20} color="#FF9500" />
          <View style={styles.summaryContent}>
            <Text style={styles.summaryNumber}>
              {competitionGroups.reduce((total, group) => 
                total + group.logs.filter(log => log.action === 'matchday_payment').length, 0
              )}
            </Text>
            <Text style={styles.summaryLabel}>Payments</Text>
          </View>
        </View>
      </View>

      {/* Competition Groups List */}
      <View style={styles.groupsContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading activity logs...</Text>
          </View>
        ) : competitionGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#48484A" />
            <Text style={styles.emptyTitle}>No Competitions Found</Text>
            <Text style={styles.emptySubtitle}>
              Create or join competitions to see activity logs organized by competition
            </Text>
          </View>
        ) : (
          <FlatList
            data={competitionGroups}
            keyExtractor={(item) => item.competition_id}
            renderItem={renderCompetitionGroup}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.groupsList}
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  groupsContainer: {
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
  groupsList: {
    paddingVertical: 8,
  },
  competitionGroup: {
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  competitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 0,
  },
  competitionHeaderActive: {
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  competitionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  competitionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  competitionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logCountBadge: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  logCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  competitionLogs: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyLogs: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyLogsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyLogsSubtext: {
    fontSize: 12,
    color: '#6D6D70',
    textAlign: 'center',
  },
  logItem: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentStatusIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2C2C2E',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logTimestamp: {
    fontSize: 10,
    color: '#8E8E93',
  },
  logDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logAdmin: {
    fontSize: 10,
    color: '#8E8E93',
  },
  paymentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
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
    fontSize: 8,
    fontWeight: '700',
  },
  paymentBadgeTextPaid: {
    color: '#34C759',
  },
  paymentBadgeTextPending: {
    color: '#FF9500',
  },
  logDetails: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 16,
  },
});

export default LogsScreen;