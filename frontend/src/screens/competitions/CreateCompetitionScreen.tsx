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
  Animated,
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
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // Form data
  const [competitionName, setCompetitionName] = useState('');
  const [selectedRule, setSelectedRule] = useState<'daily' | 'final' | 'mixed'>('daily');
  const [totalMatchdays, setTotalMatchdays] = useState('36'); // Serie A default
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
  
  // Animation for step transitions
  const [fadeAnim] = useState(new Animated.Value(1));
  
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

    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    const timeout = setTimeout(validateName, 500);
    setValidationTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [competitionName]);

  const createCompetitionMutation = useMutation({
    mutationFn: (data: any) => {
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
      Alert.alert(t('common.error'), errorMessage);
    },
  });

  const handleNext = () => {
    if (currentStep === 1) {
      if (!competitionName.trim()) {
        Alert.alert(t('common.error'), 'Please enter a competition name');
        return;
      }
      if (!validation.isAvailable) {
        Alert.alert(t('common.error'), t('competitions.nameExists'));
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      animateStepChange(() => setCurrentStep(currentStep + 1));
    } else {
      handleCreateCompetition();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      animateStepChange(() => setCurrentStep(currentStep - 1));
    }
  };

  const animateStepChange = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleCreateCompetition = () => {
    const competitionData = {
      name: competitionName.trim(),
      total_matchdays: parseInt(totalMatchdays) || 36,
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

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <View style={[
            styles.progressStep,
            {
              backgroundColor: step <= currentStep ? '#007AFF' : '#2C2C2E',
              borderColor: step <= currentStep ? '#007AFF' : '#2C2C2E',
            }
          ]}>
            <Text style={[
              styles.progressStepText,
              { color: step <= currentStep ? '#FFFFFF' : '#8E8E93' }
            ]}>
              {step}
            </Text>
          </View>
          {step < totalSteps && (
            <View style={[
              styles.progressLine,
              { backgroundColor: step < currentStep ? '#007AFF' : '#2C2C2E' }
            ]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="trophy" size={48} color="#007AFF" />
        <Text style={styles.stepTitle}>Competition Details</Text>
        <Text style={styles.stepDescription}>
          Set up your competition name and duration
        </Text>
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.fieldLabel}>{t('competitions.competitionName')}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              !validation.isAvailable && competitionName.trim() && styles.inputError
            ]}
            value={competitionName}
            onChangeText={setCompetitionName}
            placeholder="e.g. Premier League Fantasy"
            placeholderTextColor="#8E8E93"
            maxLength={50}
            autoFocus
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

        {/* Total Matchdays Input */}
        <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Total Matchdays</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={totalMatchdays}
            onChangeText={setTotalMatchdays}
            placeholder="36"
            placeholderTextColor="#8E8E93"
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
        <Text style={styles.helperText}>
          Enter the total number of matchdays (e.g., 38 for Premier League, 36 for Serie A)
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="settings" size={48} color="#007AFF" />
        <Text style={styles.stepTitle}>{t('competitions.selectRules')}</Text>
        <Text style={styles.stepDescription}>
          How do you want to distribute prizes?
        </Text>
      </View>

      <View style={styles.rulesContainer}>
        <TouchableOpacity
          style={[styles.ruleCard, selectedRule === 'daily' && styles.selectedRuleCard]}
          onPress={() => setSelectedRule('daily')}
          activeOpacity={0.8}
        >
          <View style={styles.ruleHeader}>
            <Ionicons name="calendar" size={32} color={selectedRule === 'daily' ? '#007AFF' : '#8E8E93'} />
            <View style={styles.ruleContent}>
              <Text style={[styles.ruleTitle, selectedRule === 'daily' && styles.selectedRuleTitle]}>
                {t('competitions.dailyPrize')}
              </Text>
              <Text style={[styles.ruleDescription, selectedRule === 'daily' && styles.selectedRuleDescription]}>
                Prize for daily winners
              </Text>
            </View>
            {selectedRule === 'daily' && (
              <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ruleCard, selectedRule === 'final' && styles.selectedRuleCard]}
          onPress={() => setSelectedRule('final')}
          activeOpacity={0.8}
        >
          <View style={styles.ruleHeader}>
            <Ionicons name="trophy" size={32} color={selectedRule === 'final' ? '#007AFF' : '#8E8E93'} />
            <View style={styles.ruleContent}>
              <Text style={[styles.ruleTitle, selectedRule === 'final' && styles.selectedRuleTitle]}>
                {t('competitions.finalPrize')}
              </Text>
              <Text style={[styles.ruleDescription, selectedRule === 'final' && styles.selectedRuleDescription]}>
                Prize pool for final positions
              </Text>
            </View>
            {selectedRule === 'final' && (
              <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ruleCard, selectedRule === 'mixed' && styles.selectedRuleCard]}
          onPress={() => setSelectedRule('mixed')}
          activeOpacity={0.8}
        >
          <View style={styles.ruleHeader}>
            <Ionicons name="star" size={32} color={selectedRule === 'mixed' ? '#007AFF' : '#8E8E93'} />
            <View style={styles.ruleContent}>
              <Text style={[styles.ruleTitle, selectedRule === 'mixed' && styles.selectedRuleTitle]}>
                {t('competitions.mixedRules')}
              </Text>
              <Text style={[styles.ruleDescription, selectedRule === 'mixed' && styles.selectedRuleDescription]}>
                Both daily and final prizes
              </Text>
            </View>
            {selectedRule === 'mixed' && (
              <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Ionicons name="cash" size={48} color="#007AFF" />
        <Text style={styles.stepTitle}>Configure Prizes</Text>
        <Text style={styles.stepDescription}>
          Set the prize amounts for your competition
        </Text>
      </View>

      <ScrollView style={styles.prizeConfigContainer} showsVerticalScrollIndicator={false}>
        {/* Daily Prize Configuration */}
        {(selectedRule === 'daily' || selectedRule === 'mixed') && (
          <View style={styles.prizeSection}>
            <Text style={styles.prizeSectionTitle}>Daily Prize Amount</Text>
            <View style={styles.amountInputContainer}>
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
          <View style={styles.prizeSection}>
            <Text style={styles.prizeSectionTitle}>Final Prize Pool</Text>
            {finalPrizes.map((prize, index) => (
              <View key={index} style={styles.prizeRow}>
                <View style={styles.positionBadge}>
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
        )}
      </ScrollView>
    </View>
  );

  const canProceed = () => {
    if (currentStep === 1) {
      return competitionName.trim() && validation.isAvailable;
    }
    return true;
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
            <Ionicons name="close" size={24} color="#8E8E93" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('competitions.createNew')}</Text>
          <Text style={styles.stepIndicator}>{currentStep}/{totalSteps}</Text>
        </View>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </Animated.View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.previousButton}
              onPress={handlePrevious}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color="#007AFF" />
              <Text style={styles.previousButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <View style={{ flex: 1 }} />
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              (!canProceed() || createCompetitionMutation.isPending) && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceed() || createCompetitionMutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                canProceed() && !createCompetitionMutation.isPending
                  ? ['#007AFF', '#0056CC']
                  : ['#2C2C2E', '#1C1C1E']
              }
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {createCompetitionMutation.isPending 
                  ? t('common.loading')
                  : currentStep === totalSteps 
                    ? t('competitions.create') 
                    : 'Next'
                }
              </Text>
              {currentStep < totalSteps && (
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  inputIcon: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  validationContainer: {
    marginTop: 12,
    paddingLeft: 4,
  },
  validationMessage: {
    fontSize: 14,
    fontWeight: '500',
  },
  rulesContainer: {
    gap: 16,
  },
  ruleCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  selectedRuleCard: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF15',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleContent: {
    flex: 1,
    marginLeft: 16,
  },
  ruleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedRuleTitle: {
    color: '#007AFF',
  },
  ruleDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  selectedRuleDescription: {
    color: '#B3D9FF',
  },
  prizeConfigContainer: {
    flex: 1,
  },
  prizeSection: {
    marginBottom: 24,
  },
  prizeSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  currencySymbol: {
    position: 'absolute',
    left: 20,
    top: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    zIndex: 1,
  },
  priceInput: {
    paddingLeft: 50,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  positionBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  positionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  prizeInputs: {
    flex: 1,
    gap: 12,
  },
  amountInputContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  amountInput: {
    paddingLeft: 50,
  },
  descriptionInput: {
    // No additional styles needed
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    backgroundColor: '#000000',
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  previousButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 120,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    lineHeight: 16,
  },
});

export default CreateCompetitionScreen;