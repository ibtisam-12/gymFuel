import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Text } from '../../../utils/elements';
import { RootStackScreenProps } from '../../../types/navigation.types';
import useTheme from '../../../styles/theme';
import { useAppDispatch } from '../../../store/store';
import { setOnboarded } from '../../../store/reducer/auth';
import { setProfile } from '../../../store/reducer/profile';
import { profileApi } from '../../../services/backend';
import { UserProfile } from '../../../types';

const OnboardingScreen: React.FC<RootStackScreenProps<'Onboarding'>> = () => {
  const { colors, globalStyles, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [city, setCity] = useState('Lahore');
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [otherMedical, setOtherMedical] = useState('');
  const [allergens, setAllergens] = useState<string[]>([]);
  const [fitnessPhase, setFitnessPhase] = useState<'bulking' | 'cutting' | 'recomposition' | 'maintenance' | 'recovery' | 'deload'>('maintenance');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete'>('moderately_active');
  const [dietaryPref, setDietaryPref] = useState<'non_veg' | 'vegetarian' | 'pescatarian' | 'no_pref'>('no_pref');
  const [budget, setBudget] = useState('15000'); // Monthly food budget in PKR

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 7));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const toggleCondition = (cond: string) => {
    setMedicalConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const toggleAllergen = (allg: string) => {
    setAllergens((prev) =>
      prev.includes(allg) ? prev.filter((a) => a !== allg) : [...prev, allg]
    );
  };

  const handleCompleteOnboarding = async () => {
    // Basic numerical validations
    const parsedAge = parseInt(age, 10) || 24;
    const parsedWeight = parseFloat(weight) || 70;
    const parsedHeight = parseFloat(height) || 172;
    const parsedBodyFat = parseFloat(bodyFat) || null;
    const parsedBudget = parseInt(budget, 10) || 15000;

    // Build the medical conditions list, adding other text if present
    let finalMedical = [...medicalConditions];
    if (otherMedical.trim()) {
      finalMedical.push(`other: ${otherMedical.trim()}`);
    }

    setSubmitting(true);

    try {
      const res = await profileApi.create({
        age: parsedAge,
        gender,
        city,
        weight_kg: parsedWeight,
        height_cm: parsedHeight,
        ...(parsedBodyFat !== null && { body_fat_percent: parsedBodyFat }),
        medical_conditions: finalMedical,
        fitness_phase: fitnessPhase,
        activity_level: activityLevel,
        dietary_preference: dietaryPref,
        allergens: allergens,
        budget_pkr: parsedBudget,
      });

      if (res.success && res.data) {
        // Save the profile details to the Redux profile slice
        dispatch(setProfile(res.data));
        // Flag the user as onboarded so the RootNavigator redirects them to the App Dashboard tabs
        dispatch(setOnboarded(true));
      } else {
        Alert.alert('Profile Setup Failed', res.error || 'Failed to complete profile registration. Please review input fields.');
      }
    } catch (error: any) {
      Alert.alert('Connection Error', error.message || 'Something went wrong while connecting to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = Math.round((step / 7) * 100);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.BACKGROUND }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Step Progress Header */}
        <View style={styles.progressHeader}>
          <Text style={styles.stepIndicator}>Step {step} of 7</Text>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: colors.PRIMARY }]} />
          </View>
        </View>

        {/* Dynamic Wizard Steps */}
        <View style={[globalStyles.card, styles.stepCard]}>
          
          {/* STEP 1: GENDER & AGE */}
          {step === 1 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.DARK_TEXT }]}>Tell us about yourself</Text>
              <Text style={styles.stepSubtitle}>This calibrates your daily caloric baseline & target.</Text>
              
              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Select Gender</Text>
              <View style={styles.genderRow}>
                {/* Male Card */}
                <TouchableOpacity
                  onPress={() => setGender('male')}
                  style={[
                    styles.selectionCard,
                    { borderColor: gender === 'male' ? colors.PRIMARY : colors.BORDER },
                    gender === 'male' && { backgroundColor: colors.PRIMARY + '10' }
                  ]}
                >
                  <Text style={styles.selectionEmoji}>👨</Text>
                  <Text style={[styles.selectionLabel, { color: colors.DARK_TEXT }]}>Male</Text>
                </TouchableOpacity>

                {/* Female Card */}
                <TouchableOpacity
                  onPress={() => setGender('female')}
                  style={[
                    styles.selectionCard,
                    { borderColor: gender === 'female' ? colors.PRIMARY : colors.BORDER },
                    gender === 'female' && { backgroundColor: colors.PRIMARY + '10' }
                  ]}
                >
                  <Text style={styles.selectionEmoji}>👩</Text>
                  <Text style={[styles.selectionLabel, { color: colors.DARK_TEXT }]}>Female</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Age (Years)</Text>
              <TextInput
                placeholder="24"
                placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                keyboardType="numeric"
                style={globalStyles.input}
                value={age}
                onChangeText={setAge}
              />
            </View>
          )}

          {/* STEP 2: METRICS */}
          {step === 2 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.DARK_TEXT }]}>Enter Body Metrics</Text>
              <Text style={styles.stepSubtitle}>Used to calculate your daily Total Daily Energy Expenditure (TDEE).</Text>

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Weight (kg)</Text>
              <TextInput
                placeholder="70"
                placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                keyboardType="numeric"
                style={globalStyles.input}
                value={weight}
                onChangeText={setWeight}
              />

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Height (cm)</Text>
              <TextInput
                placeholder="172"
                placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                keyboardType="numeric"
                style={globalStyles.input}
                value={height}
                onChangeText={setHeight}
              />

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Body Fat Percentage (%, Optional)</Text>
              <TextInput
                placeholder="15"
                placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                keyboardType="numeric"
                style={globalStyles.input}
                value={bodyFat}
                onChangeText={setBodyFat}
              />
            </View>
          )}

          {/* STEP 3: LOCATION */}
          {step === 3 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.DARK_TEXT }]}>Where are you located?</Text>
              <Text style={styles.stepSubtitle}>Helps the AI localizer map prices accurately based on your local market rates.</Text>

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Select City</Text>
              {['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Peshawar', 'Multan'].map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCity(c)}
                  style={[
                    styles.listRow,
                    { borderColor: city === c ? colors.PRIMARY : colors.BORDER },
                    city === c && { backgroundColor: colors.PRIMARY + '10' }
                  ]}
                >
                  <Text style={[styles.listLabel, { color: colors.DARK_TEXT }]}>{c}</Text>
                  {city === c && <Text style={{ color: colors.PRIMARY }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 4: MEDICAL CONDITIONS */}
          {step === 4 && (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.stepTitle, { color: colors.DARK_TEXT }]}>Medical Conditions</Text>
              <Text style={styles.stepSubtitle}>Critical safety check! The AI will strictly filter out foods that aggravate these conditions.</Text>

              {[
                { label: 'Diabetes / Insulin Resistance 🍬', key: 'diabetes' },
                { label: 'High Blood Pressure (Hypertension) 🩸', key: 'hypertension' },
                { label: 'High Cholesterol 🍳', key: 'high_cholesterol' },
                { label: 'Lactose Intolerance 🥛', key: 'lactose_intolerance' },
                { label: 'Gluten Intolerance (Celiac) 🌾', key: 'gluten_intolerance' },
                { label: 'PCOS / Hormone Balance 🔄', key: 'pcos' },
                { label: 'Thyroid Disorders 🦋', key: 'thyroid' },
                { label: 'Kidney Issues 🩺', key: 'kidney' },
              ].map((cond) => {
                const active = medicalConditions.includes(cond.key);
                return (
                  <TouchableOpacity
                    key={cond.key}
                    onPress={() => toggleCondition(cond.key)}
                    style={[
                      styles.listRow,
                      { borderColor: active ? colors.PRIMARY : colors.BORDER },
                      active && { backgroundColor: colors.PRIMARY + '10' }
                    ]}
                  >
                    <Text style={[styles.listLabel, { color: colors.DARK_TEXT }]}>{cond.label}</Text>
                    <Text style={{ color: active ? colors.PRIMARY : colors.SUB_TEXT }}>
                      {active ? '⚠️ Filter Active' : 'None'}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT, marginTop: 16 }]}>Other Medical Conditions / Health Notes</Text>
              <TextInput
                placeholder="E.g. Acid reflux, IBS, custom health constraints..."
                placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                style={globalStyles.input}
                value={otherMedical}
                onChangeText={setOtherMedical}
              />
            </ScrollView>
          )}

          {/* STEP 5: FITNESS PHASE & ACTIVITY */}
          {step === 5 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.DARK_TEXT }]}>Fitness Phase & Activity</Text>
              <Text style={styles.stepSubtitle}>Calibrates dynamic macronutrient targets (Protein, Carbs, Fats) split.</Text>

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Current Phase Goal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {[
                  { key: 'bulking', label: 'Bulking 🏋️' },
                  { key: 'cutting', label: 'Cutting ✂️' },
                  { key: 'recomposition', label: 'Recomp 🔄' },
                  { key: 'maintenance', label: 'Maintain ⚖️' },
                ].map((ph) => {
                  const active = fitnessPhase === ph.key;
                  return (
                    <TouchableOpacity
                      key={ph.key}
                      onPress={() => setFitnessPhase(ph.key as any)}
                      style={[
                        styles.chip,
                        { borderColor: active ? colors.PRIMARY : colors.BORDER },
                        active && { backgroundColor: colors.PRIMARY + '10' }
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? colors.PRIMARY : colors.DARK_TEXT }]}>{ph.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT, marginTop: 16 }]}>Active Activity Level</Text>
              {[
                { key: 'sedentary', label: 'Sedentary (Desk Job)' },
                { key: 'lightly_active', label: 'Lightly Active (1-3 days gym)' },
                { key: 'moderately_active', label: 'Moderately Active (3-5 days gym)' },
                { key: 'very_active', label: 'Heavy Active (Daily training)' },
              ].map((act) => (
                <TouchableOpacity
                  key={act.key}
                  onPress={() => setActivityLevel(act.key as any)}
                  style={[
                    styles.listRow,
                    { borderColor: activityLevel === act.key ? colors.PRIMARY : colors.BORDER },
                    activityLevel === act.key && { backgroundColor: colors.PRIMARY + '10' }
                  ]}
                >
                  <Text style={[styles.listLabel, { color: colors.DARK_TEXT }]}>{act.label}</Text>
                  {activityLevel === act.key && <Text style={{ color: colors.PRIMARY }}>●</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* STEP 6: DIETARY PREFERENCE & ALLERGENS */}
          {step === 6 && (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.stepTitle, { color: colors.DARK_TEXT }]}>Dietary & Allergies</Text>
              <Text style={styles.stepSubtitle}>Enforces strict safety guardrails in your personalized AI coach.</Text>

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Dietary Preference</Text>
              {[
                { key: 'no_pref', label: 'No Specific Preference (Eat everything) 🍕' },
                { key: 'non_veg', label: 'Non-Vegetarian (Poultry & meats) 🍗' },
                { key: 'vegetarian', label: 'Vegetarian Only (Plant proteins) 🥦' },
                { key: 'pescatarian', label: 'Pescatarian (Seafood + Plant) 🐟' },
              ].map((pref) => (
                <TouchableOpacity
                  key={pref.key}
                  onPress={() => setDietaryPref(pref.key as any)}
                  style={[
                    styles.listRow,
                    { borderColor: dietaryPref === pref.key ? colors.PRIMARY : colors.BORDER },
                    dietaryPref === pref.key && { backgroundColor: colors.PRIMARY + '10' }
                  ]}
                >
                  <Text style={[styles.listLabel, { color: colors.DARK_TEXT, fontSize: 13 }]}>{pref.label}</Text>
                  {dietaryPref === pref.key && <Text style={{ color: colors.PRIMARY }}>✓</Text>}
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT, marginTop: 16 }]}>Allergen Safety Filters</Text>
              <View style={styles.allergensGrid}>
                {[
                  { label: 'Nuts 🥜', key: 'nuts' },
                  { label: 'Dairy 🥛', key: 'dairy' },
                  { label: 'Gluten 🌾', key: 'gluten' },
                  { label: 'Soy 🫘', key: 'soy' },
                  { label: 'Eggs 🥚', key: 'eggs' },
                  { label: 'Fish 🐟', key: 'fish' },
                  { label: 'Shellfish 🦀', key: 'shellfish' },
                ].map((allg) => {
                  const active = allergens.includes(allg.key);
                  return (
                    <TouchableOpacity
                      key={allg.key}
                      onPress={() => toggleAllergen(allg.key)}
                      style={[
                        styles.allergenChip,
                        {
                          borderColor: active ? colors.PRIMARY : colors.BORDER,
                          backgroundColor: active ? colors.PRIMARY + '12' : colors.BACKGROUND,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? colors.PRIMARY : colors.DARK_TEXT, fontWeight: '700', fontSize: 11 }}>
                        {allg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* STEP 7: PKR MONTHLY FOOD BUDGET */}
          {step === 7 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.DARK_TEXT }]}>Monthly Food Budget</Text>
              <Text style={styles.stepSubtitle}>The AI uses this budget limit to build high-protein meal suggestions under local market costs.</Text>

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Monthly Budget (PKR)</Text>
              <TextInput
                placeholder="15000"
                placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                keyboardType="numeric"
                style={globalStyles.input}
                value={budget}
                onChangeText={setBudget}
              />
              <Text style={styles.budgetHelper}>
                Typical budget: PKR 10,000 to PKR 25,000 for standard gym-goers.
              </Text>
            </View>
          )}

          {/* Footer Wizard Controls */}
          <View style={styles.wizardControls}>
            {step > 1 ? (
              <TouchableOpacity onPress={prevStep} style={[styles.controlBtn, { borderColor: colors.BORDER, borderWidth: 1 }]}>
                <Text style={{ color: colors.SUB_TEXT, fontWeight: '700' }}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyPlaceholder} />
            )}

            {step < 7 ? (
              <TouchableOpacity onPress={nextStep} style={[styles.controlBtn, { backgroundColor: colors.PRIMARY }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCompleteOnboarding}
                disabled={submitting}
                style={[styles.controlBtn, { backgroundColor: colors.SUCCESS }]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Complete</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  progressHeader: {
    marginBottom: 20,
  },
  stepIndicator: {
    fontSize: 12,
    color: '#8A8D9F',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F2F3F5',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepCard: {
    padding: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#8A8D9F',
    marginTop: 4,
    marginBottom: 24,
    fontWeight: '500',
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  selectionCard: {
    width: '48%',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  selectionLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  listLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalScroll: {
    marginHorizontal: -4,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  allergensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  allergenChip: {
    width: '31%',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  budgetHelper: {
    fontSize: 11,
    color: '#8A8D9F',
    marginTop: 4,
    lineHeight: 16,
  },
  wizardControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
  },
  controlBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlaceholder: {
    width: 80,
  },
});

export default OnboardingScreen;
