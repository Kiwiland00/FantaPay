import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

interface ActionCard {
  id: string;
  titleKey: string;
  iconName: keyof typeof Ionicons.glyphMap;
  colors: string[];
  onPress: () => void;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const actionCards: ActionCard[] = [
    {
      id: 'create-competition',
      titleKey: 'home.createCompetition',
      iconName: 'add-circle',
      colors: ['#007AFF', '#5AC8FA'],
      onPress: () => navigation.navigate('CreateCompetition' as never),
    },
    {
      id: 'join-competition',
      titleKey: 'home.joinCompetition',
      iconName: 'people',
      colors: ['#34C759', '#32D74B'],
      onPress: () => navigation.navigate('JoinCompetition' as never),
    },
    {
      id: 'my-wallet',
      titleKey: 'home.myWallet',
      iconName: 'wallet',
      colors: ['#FF9500', '#FFCC02'],
      onPress: () => navigation.navigate('Wallet' as never),
    },
    {
      id: 'logs',
      titleKey: 'home.logs',
      iconName: 'notifications',
      colors: ['#AF52DE', '#BF5AF2'],
      onPress: () => navigation.navigate('Logs' as never),
    },
  ];

  const renderActionCard = (card: ActionCard) => (
    <TouchableOpacity
      key={card.id}
      style={styles.cardContainer}
      onPress={card.onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={card.colors}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardIconContainer}>
          <Ionicons name={card.iconName} size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.cardTitle}>{t(card.titleKey)}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>{t('home.welcome')}</Text>
          <Text style={styles.userNameText}>{user?.name}</Text>
        </View>

        {/* Action Cards Grid */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.cardsGrid}>
            {actionCards.map(renderActionCard)}
          </View>
        </View>

        {/* Recent Activity Section (placeholder) */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons name="time-outline" size={20} color="#8E8E93" />
            </View>
            <Text style={styles.activityText}>
              No recent activity. Create or join a competition to get started!
            </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userNameText: {
    fontSize: 18,
    color: '#8E8E93',
    marginBottom: 24,
  },
  balanceCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  actionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardContainer: {
    width: cardWidth,
  },
  card: {
    height: 120,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardIconContainer: {
    alignSelf: 'flex-start',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  recentSection: {
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});

export default HomeScreen;