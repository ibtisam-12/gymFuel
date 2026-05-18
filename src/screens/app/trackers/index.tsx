import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../utils/elements';
import { BottomTabScreen } from '../../../types/navigation.types';
import useTheme from '../../../styles/theme';
import { useAppDispatch } from '../../../store/store';
import {
  addMeal,
  addWaterLog,
  removeMeal,
  removeWaterLog,
  setMeals,
  setStepLogs,
  setWaterLogs,
  updateTodaySteps,
} from '../../../store/reducer/tracker';
import { trackersApi, todayISODate } from '../../../services/backend';
import {
  BackendDailySummary,
  MealLog,
  StepTodaySummary,
  StepLog,
  WaterLog,
  WaterSummary,
} from '../../../types';

const normalizeList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
    return (payload as any).results;
  }

  return [];
};

const TrackersScreen: React.FC<BottomTabScreen<'Trackers'>> = () => {
  const { colors, globalStyles, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top + 12, 16);
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [waterAmount, setWaterAmount] = useState('500');
  const [stepCount, setStepCount] = useState('');
  const [mealName, setMealName] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [calories, setCalories] = useState('');
  const [cost, setCost] = useState('');
  const [waterSummary, setWaterSummary] = useState<WaterSummary | null>(null);
  const [stepsSummary, setStepsSummary] = useState<StepTodaySummary | null>(null);
  const [mealSummary, setMealSummary] = useState<BackendDailySummary | null>(null);
  const [waterLogs, setLocalWaterLogs] = useState<WaterLog[]>([]);
  const [meals, setLocalMeals] = useState<MealLog[]>([]);

  const today = todayISODate();

  const refreshTrackers = async () => {
    setRefreshing(true);
    try {
      const [waterRes, waterSummaryRes, stepsRes, todayStepsRes, mealsRes, mealSummaryRes] = await Promise.all([
        trackersApi.waterLogs(today),
        trackersApi.waterSummary(today),
        trackersApi.stepLogs(today),
        trackersApi.todaySteps(),
        trackersApi.mealLogs(today),
        trackersApi.mealSummary(today),
      ]);

      if (waterRes.success && waterRes.data) {
        const normalizedWaterLogs = normalizeList<WaterLog>(waterRes.data);
        setLocalWaterLogs(normalizedWaterLogs);
        dispatch(setWaterLogs(normalizedWaterLogs));
      } else {
        setLocalWaterLogs([]);
        dispatch(setWaterLogs([]));
      }
      if (waterSummaryRes.success && waterSummaryRes.data) {
        setWaterSummary(waterSummaryRes.data);
      }
      if (stepsRes.success && stepsRes.data) {
        dispatch(setStepLogs(normalizeList<StepLog>(stepsRes.data)));
      } else {
        dispatch(setStepLogs([]));
      }
      if (todayStepsRes.success && todayStepsRes.data) {
        setStepsSummary(todayStepsRes.data);
        dispatch(updateTodaySteps(todayStepsRes.data.total_steps));
      }
      if (mealsRes.success && mealsRes.data) {
        const normalizedMeals = normalizeList<MealLog>(mealsRes.data);
        setLocalMeals(normalizedMeals);
        dispatch(setMeals(normalizedMeals));
      } else {
        setLocalMeals([]);
        dispatch(setMeals([]));
      }
      if (mealSummaryRes.success && mealSummaryRes.data) {
        setMealSummary(mealSummaryRes.data);
      }
    } catch (err: any) {
      Alert.alert('Sync Failed', err.message || 'Could not refresh tracker data.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshTrackers();
  }, []);

  const handleLogWater = async () => {
    const amount = parseInt(waterAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Enter water in milliliters.');
      return;
    }
    const res = await trackersApi.logWater(amount);
    if (res.success && res.data) {
      dispatch(addWaterLog(res.data));
      setWaterAmount('500');
      refreshTrackers();
    } else {
      Alert.alert('Water Log Failed', res.error || 'Could not save water log.');
    }
  };

  const handleDeleteWater = async (id: number) => {
    const res = await trackersApi.deleteWater(id);
    if (res.success) {
      dispatch(removeWaterLog(id));
      refreshTrackers();
    } else {
      Alert.alert('Delete Failed', res.error || 'Could not delete water log.');
    }
  };

  const handleLogSteps = async () => {
    const steps = parseInt(stepCount, 10);
    if (!steps || steps <= 0) {
      Alert.alert('Invalid Steps', 'Enter a positive step count.');
      return;
    }
    const res = await trackersApi.logSteps({ step_count: steps, source: 'manual' });
    if (res.success) {
      setStepCount('');
      refreshTrackers();
    } else {
      Alert.alert('Steps Sync Failed', res.error || 'Could not save steps.');
    }
  };

  const handleLogMeal = async () => {
    if (!mealName.trim()) {
      Alert.alert('Meal Required', 'Enter a meal name.');
      return;
    }
    const res = await trackersApi.logMeal({
      meal_name: mealName.trim(),
      protein_g: parseFloat(protein) || 0,
      carbs_g: parseFloat(carbs) || 0,
      fats_g: parseFloat(fats) || 0,
      calories: parseFloat(calories) || 0,
      cost_pkr: parseFloat(cost) || 0,
      is_ai_suggested: false,
    });
    if (res.success && res.data) {
      dispatch(addMeal(res.data));
      setMealName('');
      setProtein('');
      setCarbs('');
      setFats('');
      setCalories('');
      setCost('');
      refreshTrackers();
    } else {
      Alert.alert('Meal Log Failed', res.error || 'Could not save meal.');
    }
  };

  const handleDeleteMeal = async (id: number) => {
    const res = await trackersApi.deleteMeal(id);
    if (res.success) {
      dispatch(removeMeal(id));
      refreshTrackers();
    } else {
      Alert.alert('Delete Failed', res.error || 'Could not delete meal.');
    }
  };

  const inputStyle = [
    globalStyles.input,
    { color: colors.DARK_TEXT },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.BACKGROUND }]}>
      <View style={[styles.header, { borderBottomColor: colors.BORDER, paddingTop: headerTopPadding }]}>
        <Text style={[styles.headerTitle, { color: colors.DARK_TEXT }]}>Daily Trackers</Text>
        <Text style={styles.headerSubtitle}>Hydration, steps, meals, and summaries from Django</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshTrackers} tintColor={colors.PRIMARY} />
        }
      >
        <View style={styles.summaryGrid}>
          <View style={[globalStyles.card, styles.summaryCard]}>
            <Text style={styles.summaryLabel}>Water</Text>
            <Text style={[styles.summaryValue, { color: colors.DARK_TEXT }]}>
              {waterSummary?.total_ml || 0} / {waterSummary?.goal_ml || 2000} ml
            </Text>
            <Text style={styles.summaryFoot}>{waterSummary?.percentage || 0}% complete</Text>
          </View>

          <View style={[globalStyles.card, styles.summaryCard]}>
            <Text style={styles.summaryLabel}>Steps</Text>
            <Text style={[styles.summaryValue, { color: colors.DARK_TEXT }]}>
              {stepsSummary?.total_steps || 0} / {stepsSummary?.goal || 10000}
            </Text>
            <Text style={styles.summaryFoot}>{stepsSummary?.percentage || 0}% complete</Text>
          </View>
        </View>

        <View style={[globalStyles.card, styles.sectionCard]}>
          <Text style={[styles.cardTitle, { color: colors.DARK_TEXT }]}>Log Water</Text>
          <View style={styles.inlineRow}>
            <TextInput
              placeholder="500"
              placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
              keyboardType="numeric"
              style={[inputStyle, styles.inlineInput]}
              value={waterAmount}
              onChangeText={setWaterAmount}
            />
            <TouchableOpacity onPress={handleLogWater} style={[styles.actionButton, { backgroundColor: colors.SUCCESS }]}>
              <Text style={styles.actionText}>Add ml</Text>
            </TouchableOpacity>
          </View>
          {(waterSummary?.logs_count || 0) > 0 && (
            <TouchableOpacity
              onPress={() => refreshTrackers()}
              style={[styles.secondaryButton, { borderColor: colors.BORDER }]}
            >
              <Text style={[styles.secondaryText, { color: colors.SUB_TEXT }]}>
                {waterSummary?.logs_count} water logs today
              </Text>
            </TouchableOpacity>
          )}
          {waterLogs.slice(0, 3).map((log) => (
            <View key={log.id} style={[styles.compactLogRow, { borderTopColor: colors.BORDER }]}>
              <Text style={[styles.compactLogText, { color: colors.SUB_TEXT }]}>
                {log.amount_ml} ml
              </Text>
              <TouchableOpacity onPress={() => handleDeleteWater(log.id)}>
                <Text style={[styles.deleteText, { color: colors.PRIMARY }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={[globalStyles.card, styles.sectionCard]}>
          <Text style={[styles.cardTitle, { color: colors.DARK_TEXT }]}>Sync Steps</Text>
          <View style={styles.inlineRow}>
            <TextInput
              placeholder="1200"
              placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
              keyboardType="numeric"
              style={[inputStyle, styles.inlineInput]}
              value={stepCount}
              onChangeText={setStepCount}
            />
            <TouchableOpacity onPress={handleLogSteps} style={[styles.actionButton, { backgroundColor: colors.INFO }]}>
              <Text style={styles.actionText}>Sync</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[globalStyles.card, styles.sectionCard]}>
          <Text style={[styles.cardTitle, { color: colors.DARK_TEXT }]}>Log Meal</Text>
          <TextInput
            placeholder="Chicken oats bowl"
            placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
            style={inputStyle}
            value={mealName}
            onChangeText={setMealName}
          />
          <View style={styles.metricGrid}>
            <TextInput placeholder="Protein g" placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'} keyboardType="numeric" style={[inputStyle, styles.metricInput]} value={protein} onChangeText={setProtein} />
            <TextInput placeholder="Carbs g" placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'} keyboardType="numeric" style={[inputStyle, styles.metricInput]} value={carbs} onChangeText={setCarbs} />
            <TextInput placeholder="Fats g" placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'} keyboardType="numeric" style={[inputStyle, styles.metricInput]} value={fats} onChangeText={setFats} />
            <TextInput placeholder="Kcal" placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'} keyboardType="numeric" style={[inputStyle, styles.metricInput]} value={calories} onChangeText={setCalories} />
            <TextInput placeholder="PKR" placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'} keyboardType="numeric" style={[inputStyle, styles.metricInput]} value={cost} onChangeText={setCost} />
          </View>
          <TouchableOpacity onPress={handleLogMeal} style={[styles.fullButton, { backgroundColor: colors.PRIMARY }]}>
            <Text style={styles.actionText}>Save Meal</Text>
          </TouchableOpacity>
        </View>

        <View style={[globalStyles.card, styles.sectionCard, styles.lastCard]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.DARK_TEXT }]}>Today's Meals</Text>
            {refreshing && <ActivityIndicator size="small" color={colors.PRIMARY} />}
          </View>
          <Text style={styles.summaryFoot}>
            {mealSummary?.total_calories || 0} kcal, {mealSummary?.total_protein_g || 0}g protein, PKR {mealSummary?.total_cost_pkr || 0}
          </Text>
          {meals.length === 0 ? (
            <Text style={styles.emptyText}>No meals logged today.</Text>
          ) : (
            meals.map((meal) => (
              <View key={meal.id} style={[styles.mealRow, { borderBottomColor: colors.BORDER }]}>
                <View style={styles.mealInfo}>
                  <Text style={[styles.mealName, { color: colors.DARK_TEXT }]}>{meal.meal_name}</Text>
                  <Text style={styles.mealMeta}>{meal.calories} kcal • PKR {meal.cost_pkr}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteMeal(meal.id)} style={styles.deleteButton}>
                  <Text style={[styles.deleteText, { color: colors.PRIMARY }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
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
    paddingBottom: 110,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    width: '48%',
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8A8D9F',
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  summaryFoot: {
    fontSize: 11,
    color: '#8A8D9F',
    fontWeight: '600',
    marginTop: 4,
  },
  sectionCard: {
    padding: 18,
    marginBottom: 16,
  },
  lastCard: {
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineInput: {
    flex: 1,
    marginRight: 10,
  },
  actionButton: {
    height: 48,
    minWidth: 88,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  fullButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metricInput: {
    width: '48%',
  },
  mealRow: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealInfo: {
    flex: 1,
    marginRight: 12,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '800',
  },
  mealMeta: {
    fontSize: 12,
    color: '#8A8D9F',
    fontWeight: '600',
    marginTop: 3,
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '800',
  },
  compactLogRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLogText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
    color: '#8A8D9F',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
});

export default TrackersScreen;
