import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { competitionAPI } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface ValidationState {
  isValidating: boolean;
  isAvailable: boolean;
  message: string;
}

const CreateCompetitionScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  const [competitionName, setCompetitionName] = useState('');
  const [selectedRule, setSelectedRule] = useState<'daily' | 'final' | 'mixed'>('daily');
  const [dailyPrize, setDailyPrize] = useState('10');
  const [finalPrizes, setFinalPrizes] = useState([
    { position: 1, amount: '100', description: '1st Place' },
    { position: 2, amount: '50', description: '2nd Place' },
    { position: 3, amount: '25', description: '3rd Place' },
  ]);
  
  // Real-time validation state
  const [validation, setValidation] = useState<ValidationState>({
    isValidating: false,
    isAvailable: true,
    message: ''
  });
  
  // Validation timeout for debouncing
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Real-time name validation
  useEffect(() => {
    const validateName = async () => {
      if (!competitionName.trim()) {
        setValidation({ isValidating: false, isAvailable: true, message: '' });
        return;
      }

      setValidation(prev => ({ ...prev, isValidating: true }));
      
      try {
        // Use the mock validation API
        const result = await competitionAPI.validateNameMock(competitionName);
        setValidation({
          isValidating: false,
          isAvailable: result.available,
          message: result.message
        });
      } catch (error) {
        setValidation({
          isValidating: false,
          isAvailable: false,
          message: 'Error checking name'
        });
      }
    };

    // Clear existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    // Set new timeout for debounced validation
    const timeout = setTimeout(validateName, 500);
    setValidationTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [competitionName]);

  const createCompetitionMutation = useMutation({
    mutationFn: (data: any) => {
      // Use mock API for testing
      return competitionAPI.createMock ? competitionAPI.createMock(data) : competitionAPI.create(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['myCompetitions'] });
      Alert.alert(
        t('success'),
        `${t('competitions.createNew')} "${competitionName}" created successfully!\n\n${t('competitions.inviteCodeLabel')} ${data.invite_code}`,
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.response?.data?.detail || 'Failed to create competition';
      Alert.alert(t('error'), errorMessage);
    },
  });

  const handleCreateCompetition = () => {
    if (!competitionName.trim()) {
      Alert.alert(t('error'), 'Please enter a competition name');
      return;
    }

    if (!validation.isAvailable) {
      Alert.alert(t('error'), t('competitions.nameExists'));
      return;
    }

    const competitionData = {
      name: competitionName.trim(),
      rules: getRulesData(),
    };

    createCompetitionMutation.mutate(competitionData);
  };

  const getRulesData = () => {
    switch (selectedRule) {
      case 'daily':
        return {
          type: 'daily',
          daily_prize: parseFloat(dailyPrize) || 10,
        };
      case 'final':
        return {
          type: 'final',
          final_prize_pool: finalPrizes.map(prize => ({
            position: prize.position,
            amount: parseFloat(prize.amount) || 0,
            description: prize.description,
          })),
        };
      case 'mixed':
        return {
          type: 'mixed',
          daily_prize: parseFloat(dailyPrize) || 10,
          final_prize_pool: finalPrizes.map(prize => ({
            position: prize.position,
            amount: parseFloat(prize.amount) || 0,
            description: prize.description,
          })),
        };
      default:
        return { type: 'daily', daily_prize: 10 };
    }
  };

  const updateFinalPrize = (index: number, field: 'amount' | 'description', value: string) => {
    const updatedPrizes = [...finalPrizes];
    updatedPrizes[index] = { ...updatedPrizes[index], [field]: value };
    setFinalPrizes(updatedPrizes);
  };

  const renderRuleOption = (ruleType: 'daily' | 'final' | 'mixed', title: string, description: string, icon: string) => (
    <TouchableOpacity
      key={ruleType}
      style={[styles.ruleOption, selectedRule === ruleType && styles.selectedRuleOption]}
      onPress={() => setSelectedRule(ruleType)}
      activeOpacity={0.8}
    >
      <View style={styles.ruleHeader}>
        <View style={[styles.ruleIcon, selectedRule === ruleType && styles.selectedRuleIcon]}>
          <Ionicons name={icon as any} size={24} color={selectedRule === ruleType ? '#FFFFFF' : '#007AFF'} />
        </View>
        <View style={styles.ruleContent}>
          <Text style={[styles.ruleTitle, selectedRule === ruleType && styles.selectedRuleTitle]}>
            {title}
          </Text>
          <Text style={[styles.ruleDescription, selectedRule === ruleType && styles.selectedRuleDescription]}>
            {description}
          </Text>
        </View>
        {selectedRule === ruleType && (
          <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
        )}
      </View>
    </TouchableOpacity>
  );

  const getValidationStatusColor = () => {
    if (validation.isValidating) return '#8E8E93';
    if (!competitionName.trim()) return 'transparent';
    return validation.isAvailable ? '#34C759' : '#FF3B30';
  };

  const getValidationStatusIcon = () => {
    if (validation.isValidating) return 'hourglass';
    if (!competitionName.trim()) return null;
    return validation.isAvailable ? 'checkmark-circle' : 'close-circle';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('competitions.createNew')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Competition Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('competitions.competitionName')}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  !validation.isAvailable && competitionName.trim() && styles.inputError
                ]}
                value={competitionName}
                onChangeText={setCompetitionName}
                placeholder="Enter competition name"
                placeholderTextColor="#8E8E93"
                maxLength={50}
              />
              {getValidationStatusIcon() && (
                <View style={styles.inputIcon}>
                  <Ionicons
                    name={getValidationStatusIcon()!}
                    size={20}
                    color={getValidationStatusColor()}
                  />
                </View>
              )}
            </View>
            
            {/* Validation Message */}
            {validation.message && (
              <View style={styles.validationContainer}>
                <Text style={[
                  styles.validationMessage,
                  { color: getValidationStatusColor() }
                ]}>
                  {validation.isAvailable 
                    ? t('competitions.nameAvailable') 
                    : t('competitions.nameExists')
                  }
                </Text>
              </View>
            )}
          </View>

          {/* Prize Rules */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('competitions.selectRules')}</Text>
            <View style={styles.rulesContainer}>
              {renderRuleOption('daily', t('competitions.dailyPrize'), 'Prize for daily winners', 'calendar')}
              {renderRuleOption('final', t('competitions.finalPrize'), 'Prize pool for final positions', 'trophy')}
              {renderRuleOption('mixed', t('competitions.mixedRules'), 'Both daily and final prizes', 'star')}
            </View>
          </View>

          {/* Daily Prize Configuration */}
          {(selectedRule === 'daily' || selectedRule === 'mixed') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Prize Amount</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>€</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  value={dailyPrize}
                  onChangeText={setDailyPrize}
                  placeholder="10"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Final Prize Configuration */}
          {(selectedRule === 'final' || selectedRule === 'mixed') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Final Prize Pool</Text>
              <View style={styles.prizePoolContainer}>
                {finalPrizes.map((prize, index) => (
                  <View key={index} style={styles.prizeRow}>
                    <View style={styles.positionContainer}>
                      <Text style={styles.positionText}>{prize.position}</Text>
                    </View>
                    <View style={styles.prizeInputs}>
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.currencySymbol}>€</Text>
                        <TextInput
                          style={[styles.input, styles.amountInput]}
                          value={prize.amount}
                          onChangeText={(value) => updateFinalPrize(index, 'amount', value)}
                          placeholder="100"
                          placeholderTextColor="#8E8E93"
                          keyboardType="numeric"
                        />
                      </View>
                      <TextInput
                        style={[styles.input, styles.descriptionInput]}
                        value={prize.description}
                        onChangeText={(value) => updateFinalPrize(index, 'description', value)}
                        placeholder="Prize description"
                        placeholderTextColor="#8E8E93"
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Create Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              (!competitionName.trim() || !validation.isAvailable || createCompetitionMutation.isPending) && styles.createButtonDisabled,
            ]}
            onPress={handleCreateCompetition}
            disabled={!competitionName.trim() || !validation.isAvailable || createCompetitionMutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                competitionName.trim() && validation.isAvailable && !createCompetitionMutation.isPending
                  ? ['#007AFF', '#0056CC']
                  : ['#2C2C2E', '#1C1C1E']
              }
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>
                {createCompetitionMutation.isPending ? t('common.loading') : t('competitions.create')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  validationContainer: {
    marginTop: 8,
    paddingLeft: 4,
  },
  validationMessage: {
    fontSize: 12,
    fontWeight: '500',
  },
  rulesContainer: {
    gap: 12,
  },
  ruleOption: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  selectedRuleOption: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF15',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedRuleIcon: {
    backgroundColor: '#007AFF',
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedRuleTitle: {
    color: '#007AFF',
  },
  ruleDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  selectedRuleDescription: {
    color: '#B3D9FF',
  },
  currencySymbol: {
    position: 'absolute',
    left: 16,
    top: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    zIndex: 1,
  },
  priceInput: {
    paddingLeft: 40,
  },
  prizePoolContainer: {
    gap: 12,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  prizeInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  amountInputContainer: {
    position: 'relative',
    flex: 1,
  },
  amountInput: {
    paddingLeft: 40,
  },
  descriptionInput: {
    flex: 2,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CreateCompetitionScreen;