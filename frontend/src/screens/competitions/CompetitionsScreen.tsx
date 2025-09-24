import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { useLanguage } from '../../contexts/LanguageContext';
import { competitionAPI } from '../../services/api';

interface Competition {
  _id: string;
  name: string;
  admin_id: string;
  rules: {
    type: string;
    daily_prize?: number;
    final_prize_pool?: Array<{ position: number; amount: number; description: string }>;
  };
  participants: Array<{ id: string; name: string; email: string }>;
  wallet_balance: number;
  is_active: boolean;
  current_matchday: number;
  created_at: string;
}

const CompetitionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: competitions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['myCompetitions'],
    queryFn: () => {
      // TEMPORARY: Use mock API for testing
      if (competitionAPI.getMyCompetitionsMock) {
        return competitionAPI.getMyCompetitionsMock();
      }
      return competitionAPI.getMyCompetitions();
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCompetitionPress = (competition: Competition) => {
    navigation.navigate('CompetitionDetail' as never, { competitionId: competition._id } as never);
  };

  const renderCompetitionCard = (competition: Competition) => (
    <TouchableOpacity
      key={competition._id}
      style={styles.competitionCard}
      onPress={() => handleCompetitionPress(competition)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.competitionIcon}>
          <Ionicons name="trophy" size={24} color="#007AFF" />
        </View>
        <View style={styles.competitionInfo}>
          <Text style={styles.competitionName}>{competition.name}</Text>
          <Text style={styles.competitionType}>
            {competition.rules.type === 'daily' && 'Daily Prize'}
            {competition.rules.type === 'final' && 'Final Prize Pool'}
            {competition.rules.type === 'mixed' && 'Daily + Final'}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: competition.is_active ? '#34C759' : '#8E8E93' }
          ]}>
            <Text style={styles.statusText}>
              {competition.is_active ? 'Active' : 'Closed'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t('competition.participants')}</Text>
            <Text style={styles.statValue}>{competition.participants.length}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t('wallet.balance')}</Text>
            <Text style={styles.statValue}>
              {t('currency.euro')}{competition.wallet_balance.toFixed(2)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Matchday</Text>
            <Text style={styles.statValue}>{competition.current_matchday}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>{t('nav.competitions')}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('CreateCompetition' as never)}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('JoinCompetition' as never)}
            >
              <Ionicons name="people" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Competitions List */}
        {competitions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No competitions yet</Text>
            <Text style={styles.emptyDescription}>
              Create your first competition or join an existing one to get started.
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateCompetition' as never)}
              >
                <Text style={styles.createButtonText}>{t('home.createCompetition')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => navigation.navigate('JoinCompetition' as never)}
              >
                <Text style={styles.joinButtonText}>{t('home.joinCompetition')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.competitionsList}>
            {competitions.map(renderCompetitionCard)}
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  competitionsList: {
    gap: 16,
  },
  competitionCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  competitionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  competitionInfo: {
    flex: 1,
  },
  competitionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  competitionType: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardBody: {
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  emptyActions: {
    gap: 12,
    width: '100%',
    paddingHorizontal: 32,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompetitionsScreen;