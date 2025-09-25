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
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { competitionAPI } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface ValidationState {
  isLoading: boolean;
  isAvailable: boolean;
  message: string;
}

const CreateCompetitionScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4; // Adding financial configuration step
  
  // Form data
  const [competitionName, setCompetitionName] = useState('');
  const [selectedRule, setSelectedRule] = useState<'daily' | 'final' | 'mixed'>('daily');
  const [totalMatchdays, setTotalMatchdays] = useState('36'); // Serie A default
  const [dailyPrize, setDailyPrize] = useState('5'); // Default to €5 as requested
  const [finalPrizes, setFinalPrizes] = useState<Array<{ position: number; amount: string; description: string }>>([]);
  
  // Financial configuration
  const [participationCostPerTeam, setParticipationCostPerTeam] = useState('210'); // €210 default
  const [expectedTeams, setExpectedTeams] = useState('8'); // 8 teams default
  const [totalPrizePool, setTotalPrizePool] = useState('1680'); // Calculated automatically
  
  // Daily payment configuration
  const [dailyPaymentEnabled, setDailyPaymentEnabled] = useState(false); // Whether daily payments are required
  const [dailyPaymentAmount, setDailyPaymentAmount] = useState('5'); // Amount per matchday if enabled
  
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

  // Auto-calculate total prize pool when participation cost or expected teams change
  useEffect(() => {
    const costPerTeam = parseFloat(participationCostPerTeam) || 0;
    const numTeams = parseInt(expectedTeams) || 0;
    const calculatedTotal = costPerTeam * numTeams;
    setTotalPrizePool(calculatedTotal.toString());
  }, [participationCostPerTeam, expectedTeams]);

  // Enhanced validation for unique competition names
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (competitionName.trim().length >= 3) {
        try {
          setValidation({ isLoading: true, isAvailable: false, message: '' });
          
          // Check against ALL competitions in the system (not just user's competitions)
          const allCompetitions = await competitionAPI.getAllCompetitions?.() || [];
          const isNameTaken = allCompetitions.some(
            (comp: any) => comp.name.toLowerCase() === competitionName.trim().toLowerCase()
          );
          
          if (isNameTaken) {
            setValidation({
              isLoading: false,
              isAvailable: false,
              message: 'This competition name is already taken. Please choose a different name.',
            });
          } else {
            setValidation({
              isLoading: false,
              isAvailable: true,
              message: 'Competition name is available!',
            });
          }
        } catch (error) {
          console.log('🔍 Name validation error:', error);
          setValidation({
            isLoading: false,
            isAvailable: false,
            message: 'Unable to verify name availability',
          });
        }
      } else if (competitionName.trim().length > 0) {
        setValidation({
          isLoading: false,
          isAvailable: false,
          message: 'Competition name must be at least 3 characters',
        });
      } else {
        setValidation({ isLoading: false, isAvailable: false, message: '' });
      }
    }, 500);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [competitionName]);

  const createCompetitionMutation = useMutation({
    mutationFn: (data: any) => {
      return competitionAPI.createMock ? competitionAPI.createMock(data) : competitionAPI.create(data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['myCompetitions'] });
      queryClient.invalidateQueries({ queryKey: ['allCompetitions'] });
      
      const competition = response.data;
      const inviteCode = competition.invite_code;
      
      console.log('🎉 Competition created successfully:', competition.name);
      console.log('🔑 Invite Code:', inviteCode);
      
      Alert.alert(
        '🎉 Success!',
        `Competition "${competitionName}" created successfully!\n\n🔑 Invite Code: ${inviteCode}\n💰 Total Prize Pool: €${totalPrizePool}\n\nShare this code with participants!`,
        [
          {
            text: 'Copy Code',
            onPress: () => {
              Clipboard.setString(inviteCode);
              Alert.alert('Copied!', `Invite code "${inviteCode}" copied to clipboard!`, [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(), // Auto-close after copying
                }
              ]);
            },
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(), // Return to main dashboard
            style: 'default',
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
      participation_cost_per_team: parseFloat(participationCostPerTeam) || 210,
      expected_teams: parseInt(expectedTeams) || 8,
      total_prize_pool: parseFloat(totalPrizePool) || 1680,
      daily_payment_enabled: dailyPaymentEnabled,
      daily_payment_amount: dailyPaymentEnabled ? (parseFloat(dailyPaymentAmount) || 5) : 0,
      rules: getRulesData(),
    };

    createCompetitionMutation.mutate(competitionData);
  };

  const getRulesData = () => {
    switch (selectedRule) {
      case 'daily':
        return {
          type: 'daily',
          daily_prize: parseFloat(dailyPrize) || 5,
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
          daily_prize: parseFloat(dailyPrize) || 5,
          final_prize_pool: finalPrizes.map(prize => ({
            position: prize.position,
            amount: parseFloat(prize.amount) || 0,
            description: prize.description,
          })),
        };
      default:
        return { type: 'daily', daily_prize: 5 };
    }
  };

  const updateFinalPrize = (index: number, field: 'amount' | 'description', value: string) => {
    const updatedPrizes = [...finalPrizes];
    updatedPrizes[index] = { ...updatedPrizes[index], [field]: value };
    setFinalPrizes(updatedPrizes);
  };

  const addPrizeSlot = () => {
    const newPosition = finalPrizes.length + 1;
    const newSlot = {
      position: newPosition,
      amount: '',
      description: `${getOrdinalSuffix(newPosition)} Place`
    };
    setFinalPrizes([...finalPrizes, newSlot]);
  };

  const removePrizeSlot = (indexToRemove: number) => {
    const updatedPrizes = finalPrizes
      .filter((_, index) => index !== indexToRemove)
      .map((prize, index) => ({
        ...prize,
        position: index + 1,
        description: prize.description.includes('Place') 
          ? `${getOrdinalSuffix(index + 1)} Place`
          : prize.description
      }));
    setFinalPrizes(updatedPrizes);
  };

  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return num + 'st';
    if (j === 2 && k !== 12) return num + 'nd';
    if (j === 3 && k !== 13) return num + 'rd';
    return num + 'th';
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
      {[1, 2, 3, 4].map((step) => (
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
          Set up your prize structure
        </Text>
      </View>

      <ScrollView style={styles.prizeConfigContainer} showsVerticalScrollIndicator={false}>
        {/* Daily Prize Configuration */}
        {(selectedRule === 'daily' || selectedRule === 'mixed') && (
          <View style={styles.prizeSection}>
            <Text style={styles.prizeSectionTitle}>Daily Prize Amount</Text>
            <Text style={styles.prizeDescription}>
              Winner of each matchday receives this amount automatically
            </Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>€</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={dailyPrize}
                onChangeText={setDailyPrize}
                placeholder="5"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Final Prize Slots Configuration */}
        {(selectedRule === 'final' || selectedRule === 'mixed') && (
          <View style={styles.prizeSection}>
            <View style={styles.prizeSectionHeader}>
              <Text style={styles.prizeSectionTitle}>Final Prize Pool</Text>
              <TouchableOpacity
                style={styles.addSlotButton}
                onPress={addPrizeSlot}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={24} color="#007AFF" />
                <Text style={styles.addSlotText}>Add Slot {finalPrizes.length + 1}</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.prizeDescription}>
              Prizes distributed at competition end based on final standings
            </Text>

            {finalPrizes.map((prize, index) => (
              <View key={index} style={styles.prizeSlot}>
                <View style={styles.prizeSlotHeader}>
                  <View style={styles.positionBadge}>
                    <Text style={styles.positionText}>{prize.position}</Text>
                  </View>
                  <Text style={styles.slotTitle}>
                    Slot {index + 1}
                  </Text>
                  {finalPrizes.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeSlotButton}
                      onPress={() => removePrizeSlot(index)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
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

            {finalPrizes.length === 0 && (
              <View style={styles.emptyPrizesState}>
                <Ionicons name="trophy-outline" size={48} color="#8E8E93" />
                <Text style={styles.emptyPrizesText}>No prize slots added</Text>
                <Text style={styles.emptyPrizesSubtext}>
                  Tap "Add Slot" to create prize positions
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Preview Summary */}
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Prize Summary</Text>
          <View style={styles.previewCard}>
            {(selectedRule === 'daily' || selectedRule === 'mixed') && (
              <View style={styles.previewItem}>
                <Ionicons name="calendar" size={16} color="#007AFF" />
                <Text style={styles.previewText}>
                  Daily: €{dailyPrize || '0'} per matchday winner
                </Text>
              </View>
            )}
            {(selectedRule === 'final' || selectedRule === 'mixed') && (
              <View style={styles.previewItem}>
                <Ionicons name="trophy" size={16} color="#007AFF" />
                <Text style={styles.previewText}>
                  Final: {finalPrizes.length} prize slot{finalPrizes.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {finalPrizes.length > 0 && (
              <Text style={styles.previewTotal}>
                Total Pool: €{finalPrizes.reduce((sum, prize) => sum + (parseFloat(prize.amount) || 0), 0)}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderStep4 = () => {
    const matchdayFee = parseFloat(dailyPaymentAmount) || 0;
    const totalMatchdaysNumber = parseInt(totalMatchdays) || 36;
    const totalParticipationCost = matchdayFee * totalMatchdaysNumber;
    const maxParticipants = parseInt(expectedTeams) || 8;
    
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Ionicons name="document-text" size={48} color="#007AFF" />
          <Text style={styles.stepTitle}>Competition Summary</Text>
          <Text style={styles.stepDescription}>
            Review your competition settings before creating
          </Text>
        </View>

        <ScrollView style={styles.prizeConfigContainer} showsVerticalScrollIndicator={false}>
          {/* Competition Costs */}
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>📊 Competition Costs</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cost per matchday per team:</Text>
                <Text style={styles.summaryValue}>€{matchdayFee.toFixed(2)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total matchdays:</Text>
                <Text style={styles.summaryValue}>{totalMatchdaysNumber}</Text>
              </View>
              
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={[styles.summaryLabel, styles.totalLabel]}>Total participation cost per team:</Text>
                <Text style={[styles.summaryValue, styles.totalValue]}>€{totalParticipationCost.toFixed(2)}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Maximum participants allowed:</Text>
                <Text style={styles.summaryValue}>{maxParticipants} teams</Text>
              </View>
            </View>
          </View>

          {/* Competition Details */}
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>🏆 Competition Details</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Competition name:</Text>
                <Text style={styles.summaryValue}>{competitionName || 'Not set'}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total matchdays:</Text>
                <Text style={styles.summaryValue}>{totalMatchdays || '36'}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Prize distribution:</Text>
                <Text style={styles.summaryValue}>
                  {selectedRule === 'daily' && 'Daily prizes only'}
                  {selectedRule === 'final' && 'Final prizes only'}
                  {selectedRule === 'mixed' && 'Daily + Final prizes'}
                </Text>
              </View>
            </View>
          </View>

          {/* Prize Configuration */}
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>🎁 Prize Configuration</Text>
            
            <View style={styles.summaryCard}>
              {(selectedRule === 'daily' || selectedRule === 'mixed') && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Daily prize amount:</Text>
                  <Text style={styles.summaryValue}>€{dailyPrize || '0'} per matchday</Text>
                </View>
              )}
              
              {(selectedRule === 'final' || selectedRule === 'mixed') && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Final prize slots:</Text>
                    <Text style={styles.summaryValue}>{finalPrizes.length} positions</Text>
                  </View>
                  
                  {finalPrizes.map((prize, index) => (
                    <View key={index} style={[styles.summaryRow, styles.prizeDetailRow]}>
                      <Text style={styles.summaryLabel}>
                        {getOrdinalSuffix(prize.position)} Place:
                      </Text>
                      <Text style={styles.summaryValue}>€{prize.amount}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>

          {/* Payment Settings */}
          <View style={styles.summarySection}>
            <Text style={styles.summarySectionTitle}>💳 Payment Settings</Text>
            
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Daily payments enabled:</Text>
                <Text style={styles.summaryValue}>
                  {dailyPaymentEnabled ? 'Yes' : 'No'}
                </Text>
              </View>
              
              {dailyPaymentEnabled && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Matchday payment amount:</Text>
                  <Text style={styles.summaryValue}>€{dailyPaymentAmount || '0'}</Text>
                </View>
              )}
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Participation cost per team:</Text>
                <Text style={styles.summaryValue}>€{participationCostPerTeam || '0'}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Expected total revenue:</Text>
                <Text style={styles.summaryValue}>
                  €{((parseFloat(participationCostPerTeam) || 0) * maxParticipants).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Final Confirmation */}
          <View style={styles.summarySection}>
            <View style={styles.confirmationCard}>
              <Ionicons name="checkmark-circle" size={32} color="#34C759" />
              <Text style={styles.confirmationTitle}>Ready to Create Competition</Text>
              <Text style={styles.confirmationText}>
                Review the settings above. Once created, you can share the invite code with participants.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

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
          {currentStep === 4 && renderStep4()}
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
  prizeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prizeSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  addSlotText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  prizeDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 16,
  },
  prizeSlot: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  prizeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  removeSlotButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPrizesState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderStyle: 'dashed',
  },
  emptyPrizesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyPrizesSubtext: {
    fontSize: 12,
    color: '#6D6D70',
    textAlign: 'center',
  },
  previewSection: {
    marginTop: 24,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  previewTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'right',
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
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  prizeInputs: {
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
  calculationSection: {
    marginBottom: 24,
  },
  calculationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  calculationCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  calculationLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  distributionSection: {
    marginBottom: 24,
  },
  distributionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  distributionCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  distributionContent: {
    flex: 1,
    marginLeft: 12,
  },
  distributionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  distributionText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
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
  // Daily Payment Configuration Styles
  toggleContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  toggleActive: {
    borderColor: '#34C759',
    backgroundColor: '#0A2A12',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleContent: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  dailyAmountSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  inputLabel: {
    fontSize: 14,
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
  // Summary Screen Styles
  summarySection: {
    marginBottom: 24,
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  summarySection: {
    marginBottom: 24,
  },
  summarySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
    flex: 1,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  prizeDetailRow: {
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#007AFF',
    marginLeft: 8,
  },
  confirmationCard: {
    backgroundColor: '#0A2A12',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CreateCompetitionScreen;