import React, { useState } from 'react';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from '../../contexts/LanguageContext';
import { competitionAPI } from '../../services/api';

interface PrizeSlot {
  position: number;
  amount: string;
  description: string;
}

const CreateCompetitionScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [competitionName, setCompetitionName] = useState('');
  const [ruleType, setRuleType] = useState<'daily' | 'final' | 'mixed'>('daily');
  const [dailyPrize, setDailyPrize] = useState('');
  const [prizeSlots, setPrizeSlots] = useState<PrizeSlot[]>([
    { position: 1, amount: '', description: '1st Place' },
    { position: 2, amount: '', description: '2nd Place' },
    { position: 3, amount: '', description: '3rd Place' },
  ]);

  const createCompetitionMutation = useMutation({
    mutationFn: (data: any) => {
      // TEMPORARY: Use mock API for testing
      return competitionAPI.createMock ? competitionAPI.createMock(data) : competitionAPI.create(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['myCompetitions'] });
      Alert.alert(
        t('success'),
        `Competition "${competitionName}" created successfully!\n\nInvite Code: ${data.invite_code}`,
        [
          {
            text: 'OK',
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

  const handleNext = () => {
    if (currentStep === 1) {
      if (!competitionName.trim()) {
        Alert.alert(t('error'), 'Please enter a competition name');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleCreateCompetition = () => {
    // Validate inputs
    if (ruleType === 'daily' || ruleType === 'mixed') {
      if (!dailyPrize || isNaN(parseFloat(dailyPrize)) || parseFloat(dailyPrize) <= 0) {
        Alert.alert(t('error'), 'Please enter a valid daily prize amount');
        return;
      }
    }

    if (ruleType === 'final' || ruleType === 'mixed') {
      const validSlots = prizeSlots.filter(slot => 
        slot.amount && !isNaN(parseFloat(slot.amount)) && parseFloat(slot.amount) > 0
      );
      if (validSlots.length === 0) {
        Alert.alert(t('error'), 'Please enter at least one prize slot');
        return;
      }
    }

    // Prepare competition data
    const competitionData = {
      name: competitionName.trim(),
      rules: {
        type: ruleType,
        daily_prize: (ruleType === 'daily' || ruleType === 'mixed') ? parseFloat(dailyPrize) : undefined,
        final_prize_pool: (ruleType === 'final' || ruleType === 'mixed') 
          ? prizeSlots
              .filter(slot => slot.amount && !isNaN(parseFloat(slot.amount)) && parseFloat(slot.amount) > 0)
              .map(slot => ({
                position: slot.position,
                amount: parseFloat(slot.amount),
                description: slot.description || `${slot.position}${slot.position === 1 ? 'st' : slot.position === 2 ? 'nd' : slot.position === 3 ? 'rd' : 'th'} Place`,
              }))
          : [],
      },
    };

    createCompetitionMutation.mutate(competitionData);
  };

  const addPrizeSlot = () => {
    const newPosition = prizeSlots.length + 1;
    setPrizeSlots([
      ...prizeSlots,
      { position: newPosition, amount: '', description: `${newPosition}${newPosition === 1 ? 'st' : newPosition === 2 ? 'nd' : newPosition === 3 ? 'rd' : 'th'} Place` },
    ]);
  };

  const removePrizeSlot = (index: number) => {
    if (prizeSlots.length > 1) {
      const newSlots = prizeSlots.filter((_, i) => i !== index);
      // Re-number positions
      newSlots.forEach((slot, i) => {
        slot.position = i + 1;
        slot.description = `${i + 1}${i + 1 === 1 ? 'st' : i + 1 === 2 ? 'nd' : i + 1 === 3 ? 'rd' : 'th'} Place`;
      });
      setPrizeSlots(newSlots);
    }
  };

  const updatePrizeSlot = (index: number, field: keyof PrizeSlot, value: string) => {
    const newSlots = [...prizeSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setPrizeSlots(newSlots);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: step <= currentStep ? '#007AFF' : '#2C2C2E' }
          ]}>
            <Text style={[
              styles.stepNumber,
              { color: step <= currentStep ? '#FFFFFF' : '#8E8E93' }
            ]}>
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              { backgroundColor: step < currentStep ? '#007AFF' : '#2C2C2E' }
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t('competition.create.name')}</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter competition name"
        placeholderTextColor="#8E8E93"
        value={competitionName}
        onChangeText={setCompetitionName}
        maxLength={50}
        autoFocus
      />
      <Text style={styles.helperText}>
        Choose a memorable name for your fantasy competition
      </Text>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t('competition.create.rules')}</Text>
      
      <View style={styles.ruleOptions}>
        <TouchableOpacity
          style={[styles.ruleOption, { backgroundColor: ruleType === 'daily' ? '#007AFF' : '#2C2C2E' }]}
          onPress={() => setRuleType('daily')}
        >
          <Ionicons name="calendar" size={24} color={ruleType === 'daily' ? '#FFFFFF' : '#8E8E93'} />
          <Text style={[styles.ruleOptionText, { color: ruleType === 'daily' ? '#FFFFFF' : '#8E8E93' }]}>
            {t('competition.rules.daily')}
          </Text>
          <Text style={[styles.ruleOptionDescription, { color: ruleType === 'daily' ? '#FFFFFF' : '#8E8E93' }]}>
            Winner of each matchday gets a prize
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ruleOption, { backgroundColor: ruleType === 'final' ? '#007AFF' : '#2C2C2E' }]}
          onPress={() => setRuleType('final')}
        >
          <Ionicons name="trophy" size={24} color={ruleType === 'final' ? '#FFFFFF' : '#8E8E93'} />
          <Text style={[styles.ruleOptionText, { color: ruleType === 'final' ? '#FFFFFF' : '#8E8E93' }]}>
            {t('competition.rules.final')}
          </Text>
          <Text style={[styles.ruleOptionDescription, { color: ruleType === 'final' ? '#FFFFFF' : '#8E8E93' }]}>
            Prizes distributed at season end
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ruleOption, { backgroundColor: ruleType === 'mixed' ? '#007AFF' : '#2C2C2E' }]}
          onPress={() => setRuleType('mixed')}
        >
          <Ionicons name="medal" size={24} color={ruleType === 'mixed' ? '#FFFFFF' : '#8E8E93'} />
          <Text style={[styles.ruleOptionText, { color: ruleType === 'mixed' ? '#FFFFFF' : '#8E8E93' }]}>
            {t('competition.rules.mixed')}
          </Text>
          <Text style={[styles.ruleOptionDescription, { color: ruleType === 'mixed' ? '#FFFFFF' : '#8E8E93' }]}>
            Both daily and final prizes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Daily Prize Input */}
      {(ruleType === 'daily' || ruleType === 'mixed') && (
        <View style={styles.prizeSection}>
          <Text style={styles.prizeLabel}>Daily Prize Amount</Text>
          <View style={styles.prizeInputContainer}>
            <Text style={styles.currencySymbol}>{t('currency.euro')}</Text>
            <TextInput
              style={styles.prizeInput}
              placeholder="0.00"
              placeholderTextColor="#8E8E93"
              value={dailyPrize}
              onChangeText={setDailyPrize}
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      {/* Final Prize Pool */}
      {(ruleType === 'final' || ruleType === 'mixed') && (
        <View style={styles.prizeSection}>
          <View style={styles.prizeSectionHeader}>
            <Text style={styles.prizeLabel}>Final Prize Pool</Text>
            <TouchableOpacity onPress={addPrizeSlot} style={styles.addButton}>
              <Ionicons name="add" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          {prizeSlots.map((slot, index) => (
            <View key={index} style={styles.prizeSlotContainer}>
              <View style={styles.prizeSlotHeader}>
                <Text style={styles.prizeSlotLabel}>{slot.position}. {slot.description}</Text>
                {prizeSlots.length > 1 && (
                  <TouchableOpacity onPress={() => removePrizeSlot(index)}>
                    <Ionicons name="close" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.prizeInputContainer}>
                <Text style={styles.currencySymbol}>{t('currency.euro')}</Text>
                <TextInput
                  style={styles.prizeInput}
                  placeholder="0.00"
                  placeholderTextColor="#8E8E93"
                  value={slot.amount}
                  onChangeText={(value) => updatePrizeSlot(index, 'amount', value)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t('competition.create.invite')}</Text>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Competition Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name:</Text>
          <Text style={styles.summaryValue}>{competitionName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type:</Text>
          <Text style={styles.summaryValue}>
            {ruleType === 'daily' && 'Daily Prize'}
            {ruleType === 'final' && 'Final Prize Pool'}
            {ruleType === 'mixed' && 'Daily + Final'}
          </Text>
        </View>
        {(ruleType === 'daily' || ruleType === 'mixed') && dailyPrize && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Daily Prize:</Text>
            <Text style={styles.summaryValue}>{t('currency.euro')}{dailyPrize}</Text>
          </View>
        )}
        {(ruleType === 'final' || ruleType === 'mixed') && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryLabel}>Prize Pool:</Text>
            {prizeSlots
              .filter(slot => slot.amount && !isNaN(parseFloat(slot.amount)) && parseFloat(slot.amount) > 0)
              .map((slot, index) => (
                <View key={index} style={styles.summaryRow}>
                  <Text style={styles.summarySubLabel}>{slot.description}:</Text>
                  <Text style={styles.summaryValue}>{t('currency.euro')}{slot.amount}</Text>
                </View>
              ))}
          </View>
        )}
      </View>

      <Text style={styles.inviteInfo}>
        After creating the competition, you'll receive an invite code and link to share with players.
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeArea}>
        {renderStepIndicator()}
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Text style={styles.backButtonText}>
              {currentStep === 1 ? t('cancel') : t('back')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.nextButton}
            onPress={currentStep === 3 ? handleCreateCompetition : handleNext}
            disabled={createCompetitionMutation.isPending}
          >
            <Text style={styles.nextButtonText}>
              {createCompetitionMutation.isPending 
                ? t('loading')
                : currentStep === 3 
                  ? 'Create Competition'
                  : t('next')
              }
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: '#1C1C1E',
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  ruleOptions: {
    gap: 12,
    marginBottom: 24,
  },
  ruleOption: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ruleOptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  ruleOptionDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  prizeSection: {
    marginBottom: 24,
  },
  prizeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  prizeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prizeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
    marginRight: 8,
  },
  prizeInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 16,
  },
  prizeSlotContainer: {
    marginBottom: 16,
  },
  prizeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prizeSlotLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summarySection: {
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summarySubLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 16,
  },
  summaryValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  inviteInfo: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  backButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateCompetitionScreen;