import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface Competition {
  id: string;
  name: string;
  participants: Array<{ name: string; paid: boolean; amount?: number }>;
  standings: Array<{ position: number; name: string; points: number }>;
}

const LogsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);

  // Mock joined competitions data
  const joinedCompetitions: Competition[] = [
    {
      id: 'comp_1',
      name: 'Serie A Fantasy 2024',
      participants: [
        { name: 'FantaPay Tester', paid: true, amount: 25 },
        { name: 'Marco Rossi', paid: true, amount: 25 },
        { name: 'Luca Bianchi', paid: false },
        { name: 'Sofia Verde', paid: true, amount: 25 },
      ],
      standings: [
        { position: 1, name: 'Marco Rossi', points: 87 },
        { position: 2, name: 'FantaPay Tester', points: 82 },
        { position: 3, name: 'Sofia Verde', points: 76 },
        { position: 4, name: 'Luca Bianchi', points: 71 },
      ]
    },
    {
      id: 'comp_2', 
      name: 'Champions League Fantasy',
      participants: [
        { name: 'FantaPay Tester', paid: true, amount: 50 },
        { name: 'Andrea Nero', paid: false },
        { name: 'Giulia Giallo', paid: true, amount: 50 },
      ],
      standings: [
        { position: 1, name: 'FantaPay Tester', points: 94 },
        { position: 2, name: 'Giulia Giallo', points: 89 },
        { position: 3, name: 'Andrea Nero', points: 73 },
      ]
    }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderCompetitionCard = (competition: Competition) => (
    <TouchableOpacity
      key={competition.id}
      style={styles.competitionCard}
      onPress={() => setSelectedCompetition(
        selectedCompetition === competition.id ? null : competition.id
      )}
      activeOpacity={0.8}
    >
      <View style={styles.competitionHeader}>
        <View style={styles.competitionIcon}>
          <Ionicons name="trophy" size={20} color="#007AFF" />
        </View>
        <Text style={styles.competitionName}>{competition.name}</Text>
        <Ionicons 
          name={selectedCompetition === competition.id ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#8E8E93" 
        />
      </View>

      {selectedCompetition === competition.id && (
        <View style={styles.competitionDetails}>
          {/* Payment Logs */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{t('logs.payments') || 'Payment Logs'}</Text>
            {competition.participants.map((participant, index) => (
              <View key={index} style={styles.logItem}>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Text style={[
                    styles.paymentStatus,
                    { color: participant.paid ? '#34C759' : '#FF3B30' }
                  ]}>
                    {participant.paid 
                      ? `${t('logs.paid') || 'Paid'} €${participant.amount}` 
                      : t('logs.notPaid') || 'Not Paid'
                    }
                  </Text>
                </View>
                <Ionicons
                  name={participant.paid ? "checkmark-circle" : "close-circle"}
                  size={20}
                  color={participant.paid ? '#34C759' : '#FF3B30'}
                />
              </View>
            ))}
          </View>

          {/* Standings Table */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{t('logs.standings') || 'Current Standings'}</Text>
            <View style={styles.standingsTable}>
              <View style={styles.standingsHeader}>
                <Text style={[styles.standingsHeaderText, { flex: 1 }]}>
                  {t('logs.position') || 'Pos'}
                </Text>
                <Text style={[styles.standingsHeaderText, { flex: 3 }]}>
                  {t('logs.player') || 'Player'}
                </Text>
                <Text style={[styles.standingsHeaderText, { flex: 2 }]}>
                  {t('logs.points') || 'Points'}
                </Text>
              </View>
              {competition.standings.map((standing, index) => (
                <View key={index} style={[
                  styles.standingsRow,
                  standing.name === user?.name && styles.myStandingRow
                ]}>
                  <View style={[styles.positionBadge, getPositionStyle(standing.position)]}>
                    <Text style={[styles.positionText, getPositionTextStyle(standing.position)]}>
                      {standing.position}
                    </Text>
                  </View>
                  <Text style={[
                    styles.standingPlayerName,
                    standing.name === user?.name && styles.myPlayerName
                  ]}>
                    {standing.name}
                  </Text>
                  <Text style={styles.standingPoints}>{standing.points}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const getPositionStyle = (position: number) => {
    if (position === 1) return { backgroundColor: '#FFD700' };
    if (position === 2) return { backgroundColor: '#C0C0C0' };
    if (position === 3) return { backgroundColor: '#CD7F32' };
    return { backgroundColor: '#8E8E93' };
  };

  const getPositionTextStyle = (position: number) => {
    return position <= 3 ? { color: '#FFFFFF', fontWeight: 'bold' } : { color: '#FFFFFF' };
  };

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('nav.logs') || 'Logs & Notifications'}</Text>
        </View>

        {/* Notifications Toggle */}
        <View style={styles.notificationSection}>
          <View style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
              <Ionicons name="notifications" size={24} color="#007AFF" />
              <Text style={styles.notificationTitle}>
                {t('settings.notifications') || 'App Notifications'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#2C2C2E', true: '#007AFF' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#8E8E93'}
            />
          </View>
          <Text style={styles.notificationSubtitle}>
            {t('logs.notificationDesc') || 'Receive updates about competitions, payments, and standings'}
          </Text>
        </View>

        {/* Joined Competitions */}
        <View style={styles.competitionsSection}>
          <Text style={styles.sectionHeader}>
            {t('logs.joinedCompetitions') || 'My Competitions'}
          </Text>
          {joinedCompetitions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color="#8E8E93" />
              <Text style={styles.emptyTitle}>
                {t('logs.noCompetitions') || 'No competitions joined'}
              </Text>
              <Text style={styles.emptyDescription}>
                {t('logs.joinFirst') || 'Join a competition to see logs and standings here'}
              </Text>
            </View>
          ) : (
            <View style={styles.competitionsList}>
              {joinedCompetitions.map(renderCompetitionCard)}
            </View>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  notificationSection: {
    marginBottom: 32,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notificationSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    paddingHorizontal: 4,
  },
  competitionsSection: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  competitionsList: {
    gap: 12,
  },
  competitionCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
  },
  competitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  competitionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  competitionName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  competitionDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    marginBottom: 8,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  standingsTable: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  standingsHeader: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  standingsHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  myStandingRow: {
    backgroundColor: '#007AFF20',
  },
  positionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  positionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  standingPlayerName: {
    flex: 3,
    fontSize: 14,
    color: '#FFFFFF',
    paddingRight: 16,
  },
  myPlayerName: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  standingPoints: {
    flex: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
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
});

export default LogsScreen;