import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../utils/elements';
import { BottomTabScreen } from '../../../types/navigation.types';
import useTheme from '../../../styles/theme';
import { useAppDispatch } from '../../../store/store';
import { logout } from '../../../store/reducer/auth';
import { clearProfile, useProfileStore, setProfile } from '../../../store/reducer/profile';
import { clearChat } from '../../../store/reducer/chat';
import { authApi, profileApi, remindersApi } from '../../../services/backend';
import { checkFcmHealth } from '../../../services/pushNotifications';
import { PhaseHistory, ReminderSettings, UserProfile } from '../../../types';
import { decimalInput, isInRange, isNonEmptyText, onlyDigits } from '../../../utils/validation';

const normalizePhaseHistory = (payload: unknown): PhaseHistory[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
    return (payload as any).results;
  }

  return [];
};

const ProfileScreen: React.FC<BottomTabScreen<'Profile'>> = () => {
  const { colors, globalStyles, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top + 12, 16);
  const dispatch = useAppDispatch();
  const { data: profile } = useProfileStore();

  // Local states for reminders & phase history
  const [reminders, setReminders] = useState<ReminderSettings>({
    water_reminder_interval_hours: 2,
    notifications_enabled: true,
    meal_reminder_times: ['08:00', '13:00', '19:00'],
  });
  const [history, setHistory] = useState<PhaseHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingPhase, setUpdatingPhase] = useState<string | null>(null);
  const [checkingFcm, setCheckingFcm] = useState(false);
  const [fcmStatus, setFcmStatus] = useState<string | null>(null);

  // In-line Body Metrics Editor States
  const [isEditing, setIsEditing] = useState(false);
  const [ageInput, setAgeInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [savingMetrics, setSavingMetrics] = useState(false);

  // Fetch reminder settings & phase history on mount
  useEffect(() => {
    fetchProfile();
    fetchReminders();
    fetchPhaseHistory();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await profileApi.get();
      if (res.success && res.data) {
        dispatch(setProfile(res.data));
      }
    } catch (err) {
      console.warn('Could not load profile:', err);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await remindersApi.get();
      if (res.success && res.data) {
        setReminders(res.data);
      }
    } catch (err) {
      console.warn('Could not load reminders:', err);
    }
  };

  const fetchPhaseHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await profileApi.phaseHistory();
      if (res.success && res.data) {
        setHistory(normalizePhaseHistory(res.data));
      } else {
        setHistory([]);
      }
    } catch (err) {
      setHistory([]);
      console.warn('Could not load phase history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Toggle push notifications preferences
  const handleToggleNotifications = async () => {
    const updated = !reminders.notifications_enabled;
    const prev = reminders.notifications_enabled;
    setReminders(prevVal => ({ ...prevVal, notifications_enabled: updated }));

    try {
      const res = await remindersApi.update({
        ...reminders,
        notifications_enabled: updated,
      });
      if (!res.success) {
        setReminders(prevVal => ({ ...prevVal, notifications_enabled: prev }));
        Alert.alert('Update Failed', res.error || 'Failed to toggle reminders.');
      }
    } catch (err: any) {
      setReminders(prevVal => ({ ...prevVal, notifications_enabled: prev }));
      Alert.alert('Error', err.message || 'Connection failure.');
    }
  };

  // Update water reminder hour interval
  const handleSetInterval = async (hours: number) => {
    const prev = reminders.water_reminder_interval_hours;
    setReminders(prevVal => ({ ...prevVal, water_reminder_interval_hours: hours }));

    try {
      const res = await remindersApi.update({
        ...reminders,
        water_reminder_interval_hours: hours,
      });
      if (!res.success) {
        setReminders(prevVal => ({ ...prevVal, water_reminder_interval_hours: prev }));
        Alert.alert('Update Failed', res.error || 'Failed to change reminder interval.');
      }
    } catch (err: any) {
      setReminders(prevVal => ({ ...prevVal, water_reminder_interval_hours: prev }));
      Alert.alert('Error', err.message || 'Connection failure.');
    }
  };

  const handleCheckFcm = async () => {
    if (checkingFcm) return;
    setCheckingFcm(true);
    setFcmStatus(null);

    try {
      const result = await checkFcmHealth(false);
      setFcmStatus(result.ok ? 'FCM ready' : result.message);
      Alert.alert(result.ok ? 'FCM Ready' : 'FCM Check Failed', result.message);
    } catch (err: any) {
      const message = err.message || 'Could not complete FCM check.';
      setFcmStatus(message);
      Alert.alert('FCM Check Failed', message);
    } finally {
      setCheckingFcm(false);
    }
  };

  // Update fitness goal phase
  const handleUpdatePhase = async (phase: string) => {
    if (updatingPhase) return;
    setUpdatingPhase(phase);

    try {
      const res = await profileApi.updatePhase(phase as UserProfile['fitness_phase']);

      if (res.success && res.data) {
        // Sync with Redux immediately so dashboard targets and UI rings adapt!
        if (profile) {
          dispatch(setProfile({
            ...profile,
            fitness_phase: res.data.current_phase,
          }));
        }
        fetchPhaseHistory(); // Refresh historical listing
        Alert.alert('Goal Changed 🎯', `Your active fitness goal is now set to ${phase.toUpperCase()}! Your daily calories target has been re-aggregated.`);
      } else {
        Alert.alert('Update Failed', res.error || 'Failed to update goal phase.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Connection failed.');
    } finally {
      setUpdatingPhase(null);
    }
  };

  // Initialize and Open inline metrics editor
  const handleStartEditing = () => {
    if (profile) {
      setAgeInput(profile.age.toString());
      setWeightInput(profile.weight_kg.toString());
      setHeightInput(profile.height_cm.toString());
      setCityInput(profile.city);
      setBudgetInput(profile.budget_pkr.toString());
      setIsEditing(true);
    }
  };

  // Save modified body metrics to Django backend
  const handleSaveMetrics = async () => {
    const parsedAge = parseInt(ageInput, 10);
    const parsedWeight = parseFloat(weightInput);
    const parsedHeight = parseFloat(heightInput);
    const parsedBudget = parseInt(budgetInput, 10);

    if (!isInRange(ageInput, 13, 100)) {
      Alert.alert('Invalid Age', 'Enter an age between 13 and 100 years.');
      return;
    }
    if (!isInRange(weightInput, 25, 300)) {
      Alert.alert('Invalid Weight', 'Enter weight between 25 and 300 kg.');
      return;
    }
    if (!isInRange(heightInput, 100, 250)) {
      Alert.alert('Invalid Height', 'Enter height between 100 and 250 cm.');
      return;
    }
    if (!isNonEmptyText(cityInput, 2, 100)) {
      Alert.alert('Invalid City', 'Enter a valid city name.');
      return;
    }
    if (!isInRange(budgetInput, 1000, 1000000)) {
      Alert.alert('Invalid Budget', 'Enter a monthly budget between PKR 1,000 and PKR 1,000,000.');
      return;
    }

    setSavingMetrics(true);
    try {
      const res = await profileApi.update({
        age: parsedAge,
        gender: profile?.gender || 'male',
        city: cityInput.trim(),
        weight_kg: parsedWeight,
        height_cm: parsedHeight,
        budget_pkr: parsedBudget,
        fitness_phase: profile?.fitness_phase || 'maintenance',
        activity_level: profile?.activity_level || 'moderately_active',
        dietary_preference: profile?.dietary_preference || 'no_pref',
        medical_conditions: profile?.medical_conditions || [],
        allergens: profile?.allergens || [],
      });

      if (res.success && res.data) {
        dispatch(setProfile(res.data));
        setIsEditing(false);
        Alert.alert('Metrics Synchronized 🎉', 'Body parameters, BMI, TDEE targets and daily PKR budget allocations recalculated successfully!');
      } else {
        Alert.alert('Sync Failed', res.error || 'Failed to update health parameters.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Connection failed.');
    } finally {
      setSavingMetrics(false);
    }
  };

  const handleLogout = async () => {
    // 1. Clear persisted auth tokens and blacklist refresh token when possible
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Token cleanup failed:', err);
    }

    // 2. Reset all Redux slices completely
    dispatch(clearProfile());
    dispatch(clearChat());
    dispatch(logout());
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.BACKGROUND }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.BORDER, paddingTop: headerTopPadding }]}>
        <Text style={[styles.headerTitle, { color: colors.DARK_TEXT }]}>Profile Settings</Text>
        <Text style={styles.headerSubtitle}>Verify credentials & active metrics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ACTIVE PROFILE METRICS SECTION */}
        <View style={[globalStyles.card, styles.infoCard]}>
          <View style={styles.headerRowSpace}>
            <Text style={[styles.cardTitle, { color: colors.DARK_TEXT }]}>Active Fitness Metrics</Text>
            {!isEditing && (
              <TouchableOpacity onPress={handleStartEditing} style={styles.editBtn}>
                <Text style={[styles.editBtnText, { color: colors.PRIMARY }]}>✏️ Edit Metrics</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.separator} />

          {isEditing ? (
            // INLINE EDITOR MODE
            <View>
              <View style={styles.editFormRow}>
                <View style={styles.editFormCol}>
                  <Text style={[styles.inputFieldLabel, { color: colors.DARK_TEXT }]}>Age (Years)</Text>
                  <TextInput
                    keyboardType="numeric"
                    style={[globalStyles.input, styles.editTextInput]}
                    value={ageInput}
                    onChangeText={(value) => setAgeInput(onlyDigits(value).slice(0, 3))}
                  />
                </View>
                <View style={styles.editFormCol}>
                  <Text style={[styles.inputFieldLabel, { color: colors.DARK_TEXT }]}>Location City</Text>
                  <TextInput
                    style={[globalStyles.input, styles.editTextInput]}
                    value={cityInput}
                    onChangeText={(value) => setCityInput(value.slice(0, 100))}
                  />
                </View>
              </View>

              <View style={styles.editFormRow}>
                <View style={styles.editFormCol}>
                  <Text style={[styles.inputFieldLabel, { color: colors.DARK_TEXT }]}>Weight (kg)</Text>
                  <TextInput
                    keyboardType="numeric"
                    style={[globalStyles.input, styles.editTextInput]}
                    value={weightInput}
                    onChangeText={(value) => setWeightInput(decimalInput(value).slice(0, 6))}
                  />
                </View>
                <View style={styles.editFormCol}>
                  <Text style={[styles.inputFieldLabel, { color: colors.DARK_TEXT }]}>Height (cm)</Text>
                  <TextInput
                    keyboardType="numeric"
                    style={[globalStyles.input, styles.editTextInput]}
                    value={heightInput}
                    onChangeText={(value) => setHeightInput(decimalInput(value).slice(0, 6))}
                  />
                </View>
              </View>

              <Text style={[styles.inputFieldLabel, { color: colors.DARK_TEXT }]}>Monthly Budget (PKR)</Text>
              <TextInput
                keyboardType="numeric"
                style={[globalStyles.input, styles.editTextInput]}
                value={budgetInput}
                onChangeText={(value) => setBudgetInput(onlyDigits(value).slice(0, 7))}
              />

              <View style={styles.editActionRow}>
                <TouchableOpacity
                  onPress={() => setIsEditing(false)}
                  disabled={savingMetrics}
                  style={[styles.cancelBtn, { borderColor: colors.BORDER }]}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.SUB_TEXT }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleSaveMetrics}
                  disabled={savingMetrics}
                  style={[globalStyles.button, styles.saveBtn, { backgroundColor: colors.PRIMARY }]}
                >
                  {savingMetrics ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={globalStyles.buttonText}>Save Metrics</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // VIEW ONLY MODE
            <View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Daily TDEE Target</Text>
                <Text style={[styles.metricVal, { color: colors.PRIMARY }]}>
                  {profile?.tdee || 2450} kcal
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Current Weight</Text>
                <Text style={[styles.metricVal, { color: colors.DARK_TEXT }]}>
                  {profile?.weight_kg || 70} kg
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Current Height</Text>
                <Text style={[styles.metricVal, { color: colors.DARK_TEXT }]}>
                  {profile?.height_cm || 172} cm
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Body Mass Index (BMI)</Text>
                <Text style={[styles.metricVal, { color: colors.DARK_TEXT }]}>
                  {profile?.bmi || 23.6}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Fitness Goal Phase</Text>
                <Text style={[styles.metricVal, { color: colors.DARK_TEXT, textTransform: 'capitalize' }]}>
                  {profile?.fitness_phase || 'Maintenance'}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Monthly Food Budget</Text>
                <Text style={[styles.metricVal, { color: colors.DARK_TEXT }]}>
                  PKR {profile?.budget_pkr || 15000}
                </Text>
              </View>

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Location City</Text>
                <Text style={[styles.metricVal, { color: colors.DARK_TEXT }]}>
                  {profile?.city || 'Lahore'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 🎯 Fitness Phase Goal Switcher */}
        <View style={[globalStyles.card, styles.infoCard]}>
          <Text style={[styles.cardTitle, { color: colors.DARK_TEXT }]}>🎯 Update Fitness Phase Goal</Text>
          <Text style={styles.cardDesc}>Dynamically re-calculate daily TDEE requirements & macronutrient distributions in your AI engine.</Text>
          <View style={styles.separator} />

          <View style={styles.phaseSelectorRow}>
            {['bulking', 'cutting', 'maintenance', 'recovery'].map((phaseOption) => {
              const isActive = profile?.fitness_phase?.toLowerCase() === phaseOption;
              const isProcessing = updatingPhase === phaseOption;

              return (
                <TouchableOpacity
                  key={phaseOption}
                  onPress={() => handleUpdatePhase(phaseOption)}
                  disabled={isActive || updatingPhase !== null}
                  style={[
                    styles.phaseChip,
                    {
                      borderColor: isActive ? colors.PRIMARY : colors.BORDER,
                      backgroundColor: isActive ? colors.PRIMARY + '20' : colors.BACKGROUND,
                    },
                  ]}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={colors.PRIMARY} />
                  ) : (
                    <Text
                      style={[
                        styles.phaseChipText,
                        {
                          color: isActive ? colors.PRIMARY : colors.DARK_TEXT,
                          fontWeight: isActive ? '800' : '600',
                        },
                      ]}
                    >
                      {phaseOption}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 🔔 Drinking & Meal Reminders Dashboard */}
        <View style={[globalStyles.card, styles.infoCard]}>
          <View style={styles.headerRowSpace}>
            <Text style={[styles.cardTitle, { color: colors.DARK_TEXT }]}>🔔 Reminder Configurations</Text>
            <TouchableOpacity
              onPress={handleToggleNotifications}
              style={[
                styles.reminderToggle,
                {
                  backgroundColor: reminders.notifications_enabled ? colors.SUCCESS + '18' : colors.BORDER,
                  borderColor: reminders.notifications_enabled ? colors.SUCCESS : colors.SUB_TEXT,
                },
              ]}
            >
              <Text
                style={[
                  styles.reminderToggleText,
                  { color: reminders.notifications_enabled ? colors.SUCCESS : colors.SUB_TEXT },
                ]}
              >
                {reminders.notifications_enabled ? '🔔 Active' : '🔕 Muted'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDesc}>Toggles automated push notification pings to ensure you log your hydration split metrics on time.</Text>
          <View style={styles.separator} />

          <TouchableOpacity
            onPress={handleCheckFcm}
            disabled={checkingFcm}
            style={[styles.fcmCheckButton, { borderColor: colors.BORDER, opacity: checkingFcm ? 0.7 : 1 }]}
          >
            {checkingFcm ? (
              <ActivityIndicator size="small" color={colors.PRIMARY} />
            ) : (
              <Text style={[styles.fcmCheckButtonText, { color: colors.DARK_TEXT }]}>Check FCM Status</Text>
            )}
          </TouchableOpacity>
          {fcmStatus && (
            <Text style={[styles.fcmStatusText, { color: fcmStatus === 'FCM ready' ? colors.SUCCESS : colors.PRIMARY }]}>
              {fcmStatus}
            </Text>
          )}

          <Text style={styles.subHeadingLabel}>Water Log Interval (hours)</Text>
          <View style={styles.intervalRow}>
            {[1, 2, 3, 4].map((h) => {
              const isSelected = reminders.water_reminder_interval_hours === h;
              return (
                <TouchableOpacity
                  key={h}
                  onPress={() => handleSetInterval(h)}
                  disabled={!reminders.notifications_enabled}
                  style={[
                    styles.intervalChip,
                    {
                      backgroundColor: isSelected ? colors.PRIMARY : colors.BACKGROUND,
                      borderColor: isSelected ? colors.PRIMARY : colors.BORDER,
                      opacity: reminders.notifications_enabled ? 1 : 0.4,
                    },
                  ]}
                >
                  <Text style={[styles.intervalChipText, { color: isSelected ? '#FFFFFF' : colors.DARK_TEXT }]}>
                    Every {h} hr{h > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subHeadingLabel, { marginTop: 16 }]}>Scheduled Meal Pings</Text>
          <View style={styles.mealReminderGrid}>
            {reminders.meal_reminder_times?.map((t, idx) => (
              <View key={idx} style={[styles.mealTimeCell, { backgroundColor: colors.BACKGROUND, borderColor: colors.BORDER }]}>
                <Text style={[styles.mealTimeText, { color: colors.DARK_TEXT }]}>🕒 {t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 📜 Goal Phase Transition History logs */}
        <View style={[globalStyles.card, styles.infoCard]}>
          <Text style={[styles.cardTitle, { color: colors.DARK_TEXT }]}>📜 Fitness Goal Phase Logs</Text>
          <Text style={styles.cardDesc}>Audited timeline of fitness phase switches recorded by the backend.</Text>
          <View style={styles.separator} />

          {loadingHistory ? (
            <ActivityIndicator size="small" color={colors.PRIMARY} style={{ marginVertical: 10 }} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No past phase goals recorded yet.</Text>
          ) : (
            <View>
              {history.map((item, idx) => (
                <View key={item.id || idx} style={styles.historyRow}>
                  <View style={styles.historyRowLeft}>
                    <Text style={styles.historyBullet}>•</Text>
                    <Text style={[styles.historyPhaseText, { color: colors.DARK_TEXT }]}>
                      {item.phase?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.historyDate}>
                    Since {new Date(item.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Developer / Project Branding Card */}
        <View style={[globalStyles.card, styles.credentialCard, { borderColor: colors.PRIMARY + '30' }]}>
          <Text style={[styles.credentialHeader, { color: colors.PRIMARY }]}>GymFuel AI System Info</Text>
          <View style={styles.separator} />
          
          <Text style={[styles.credSubHeader, { color: colors.DARK_TEXT }]}>Project Developers</Text>
          <Text style={[styles.credName, { color: colors.DARK_TEXT }]}>• MUHAMMAD IBTISAM (65857)</Text>
          <Text style={[styles.credName, { color: colors.DARK_TEXT }]}>• WALEED ZULFIQAR (65863)</Text>
 
          <Text style={[styles.credSubHeader, { color: colors.DARK_TEXT, marginTop: 14 }]}>Instructor Advisor</Text>
          <Text style={[styles.credName, { color: colors.DARK_TEXT }]}>• MISS ERUM AMAN</Text>
 
          <Text style={[styles.credSubHeader, { color: colors.DARK_TEXT, marginTop: 14 }]}>Academic Platform</Text>
          <Text style={[styles.credName, { color: colors.SUB_TEXT }]}>GymFuel AI Premium Mobile Frontend v1.0.0</Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[globalStyles.button, styles.logoutButton]}
        >
          <Text style={globalStyles.buttonText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8A8D9F',
    marginTop: 2,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  infoCard: {
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 11,
    color: '#8A8D9F',
    fontWeight: '500',
    lineHeight: 15,
    marginBottom: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#2D374825',
    marginBottom: 14,
  },
  editBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editFormRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editFormCol: {
    width: '48%',
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
  },
  editTextInput: {
    marginBottom: 14,
    height: 46,
  },
  editActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    width: '66%',
    marginTop: 0,
    height: 48,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  metricLabel: {
    fontSize: 13,
    color: '#8A8D9F',
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  phaseSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  phaseChip: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseChipText: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerRowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reminderToggle: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reminderToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fcmCheckButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 44,
  },
  fcmCheckButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  fcmStatusText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  subHeadingLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#8A8D9F',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  intervalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intervalChip: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: '23%',
    alignItems: 'center',
  },
  intervalChipText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  mealReminderGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealTimeCell: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: '31%',
    alignItems: 'center',
  },
  mealTimeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#8A8D9F',
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 6,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  historyRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyBullet: {
    fontSize: 16,
    color: '#8A8D9F',
    marginRight: 6,
  },
  historyPhaseText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  historyDate: {
    fontSize: 12,
    color: '#8A8D9F',
    fontWeight: '600',
  },
  credentialCard: {
    padding: 20,
    borderWidth: 1.5,
    backgroundColor: '#00000010',
    marginBottom: 24,
  },
  credentialHeader: {
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  credSubHeader: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  credName: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    marginLeft: 4,
  },
  logoutButton: {
    marginBottom: 20,
  },
});

export default ProfileScreen;
