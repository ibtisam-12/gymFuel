import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Text } from '../../../utils/elements';
import { BottomTabScreen } from '../../../types/navigation.types';
import useTheme from '../../../styles/theme';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import {
  setDashboardData,
  setLoading,
  transformDashboardResponse,
  updateTodaySteps,
  useTrackerStore,
} from '../../../store/reducer/tracker';
import { useProfileStore } from '../../../store/reducer/profile';
import { profileApi, trackersApi } from '../../../services/backend';
import StepCounterPanel from '../../../components/StepCounterPanel';
import Svg, { Circle, Defs, LinearGradient, Stop, Path, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ProgressRing = ({ progress, size, strokeWidth, color, label, subLabel, colors }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <View style={styles.ringWrapper}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor="#D9383A" />
          </LinearGradient>
        </Defs>
        <Circle
          stroke="#2D3748"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke="url(#ringGrad)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringInnerContent}>
          <Text style={[styles.ringLabel, { color: colors.DARK_TEXT }]}>{label}</Text>
          <Text style={styles.ringSubLabel}>{subLabel}</Text>
        </View>
      </View>
    </View>
  );
};

// 📈 Upgraded Custom Lightweight SVG Line/Area weight trend chart component
const WeightTrendChart = ({ colors, globalStyles }: any) => {
  const chartWidth = width - 64;
  const chartHeight = 110;
  
  // Custom checkpoints: [80.2, 79.8, 79.5, 79.6, 79.1, 78.8, 78.5] kg
  const points = [
    { x: 15, y: 25, label: 'Mon', kg: '80.2' },
    { x: 15 + (chartWidth - 30) / 6 * 1, y: 38, label: 'Tue', kg: '79.8' },
    { x: 15 + (chartWidth - 30) / 6 * 2, y: 48, label: 'Wed', kg: '79.5' },
    { x: 15 + (chartWidth - 30) / 6 * 3, y: 45, label: 'Thu', kg: '79.6' },
    { x: 15 + (chartWidth - 30) / 6 * 4, y: 62, label: 'Fri', kg: '79.1' },
    { x: 15 + (chartWidth - 30) / 6 * 5, y: 72, label: 'Sat', kg: '78.8' },
    { x: chartWidth - 15, y: 85, label: 'Sun', kg: '78.5' }
  ];

  const linePath = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <View style={[globalStyles.card, styles.trendCard]}>
      <View style={styles.trendHeader}>
        <Text style={[styles.trendTitle, { color: colors.DARK_TEXT }]}>7-Day Weight Loss Trend</Text>
        <Text style={styles.trendGoal}>Target: 75.0 kg</Text>
      </View>
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight + 25}>
          <Defs>
            <LinearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={colors.PRIMARY} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={colors.PRIMARY} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
          
          {/* Horizontal Grid lines */}
          <Path d={`M 10 30 L ${chartWidth - 10} 30`} stroke="#2D3748" strokeWidth={1} strokeDasharray="4 4" />
          <Path d={`M 10 60 L ${chartWidth - 10} 60`} stroke="#2D3748" strokeWidth={1} strokeDasharray="4 4" />
          <Path d={`M 10 90 L ${chartWidth - 10} 90`} stroke="#2D3748" strokeWidth={1} strokeDasharray="4 4" />

          {/* Area Fill */}
          <Path d={areaPath} fill="url(#chartAreaGrad)" />

          {/* Path Line */}
          <Path d={linePath} fill="none" stroke={colors.PRIMARY} strokeWidth={3.5} />
          
          {/* Active checkpoints, markers, & text coordinates */}
          {points.map((p, idx) => (
            <React.Fragment key={idx}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={4.5}
                fill={colors.PRIMARY}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
              <SvgText
                x={p.x}
                y={p.y - 12}
                fontSize="8.5"
                fill="#A0AEC0"
                fontWeight="800"
                textAnchor="middle"
              >
                {p.kg}
              </SvgText>
              <SvgText
                x={p.x}
                y={chartHeight + 16}
                fontSize="9"
                fill="#718096"
                fontWeight="700"
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </View>
  );
};

const DashboardScreen: React.FC<BottomTabScreen<'Dashboard'>> = ({ navigation }) => {
  const { colors, globalStyles } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollTopPadding = Math.max(insets.top + 16, 16);
  const dispatch = useAppDispatch();
  const { dashboard, loading } = useTrackerStore();
  const stepSensorSteps = useAppSelector((s) => s.tracker.stepSensorSteps ?? 0);
  const todaySteps = useAppSelector((s) => s.tracker.todaySteps ?? 0);
  const { data: profile } = useProfileStore();
  const [localLoading, setLocalLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLocalLoading(true);
    dispatch(setLoading(true));
    try {
      const [dashRes, mealRes, stepsRes] = await Promise.all([
        profileApi.dashboard(),
        trackersApi.mealSummary(),
        trackersApi.todaySteps(),
      ]);

      if (dashRes.success && dashRes.data) {
        const transformed = transformDashboardResponse(
          dashRes.data,
          mealRes.success ? mealRes.data : null
        );
        if (stepsRes.success && stepsRes.data) {
          transformed.steps.current = stepsRes.data.total_steps;
          transformed.steps.goal = stepsRes.data.goal || transformed.steps.goal;
          dispatch(updateTodaySteps(stepsRes.data.total_steps));
        }
        dispatch(setDashboardData(transformed));
      } else if (stepsRes.success && stepsRes.data) {
        dispatch(updateTodaySteps(stepsRes.data.total_steps));
      }
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
    } finally {
      dispatch(setLoading(false));
      setLocalLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  // Safe defaults if dashboard data is not yet resolved
  const caloriesConsumed = dashboard?.calories?.consumed || 0;
  const caloriesTarget = dashboard?.calories?.target || 2000;
  const caloriesRemaining = dashboard?.calories?.remaining || 2000;
  const calPercent = Math.min(100, Math.round((caloriesConsumed / caloriesTarget) * 100));

  const stepsFromDashboard = dashboard?.steps?.current ?? 0;
  // Use todaySteps from Redux as the primary source (updated from API and manual logs)
  // Fall back to sensor steps or dashboard cache if todaySteps is 0
  const stepsCurrent = Math.max(todaySteps, stepSensorSteps, stepsFromDashboard);
  const stepsGoal = dashboard?.steps?.goal || 10000;
  const stepPercent = Math.min(100, (stepsCurrent / stepsGoal) * 100);

  const waterCurrent = dashboard?.water?.current || 0;
  const waterGoal = dashboard?.water?.goal || 2500;
  const waterPercent = Math.min(100, (waterCurrent / waterGoal) * 100);

  const budgetSpent = dashboard?.budget?.spent || 0;
  const budgetTotal = dashboard?.budget?.total || 15000;
  const budgetRemaining = dashboard?.budget?.remaining || 15000;
  const budgetPercent = Math.min(100, (budgetSpent / budgetTotal) * 100);

  const activePhase = (dashboard?.current_phase || profile?.fitness_phase || 'maintenance').toUpperCase();

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.BACKGROUND }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: scrollTopPadding }]}
        refreshControl={
          <RefreshControl refreshing={loading || localLoading} onRefresh={fetchDashboard} tintColor={colors.PRIMARY} />
        }
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {profile?.gender === 'female' ? 'Heroine' : 'Champ'} 👋</Text>
            <Text style={[styles.title, { color: colors.DARK_TEXT }]}>GymFuel AI Dashboard</Text>
          </View>
          <View style={[styles.phaseBadge, { backgroundColor: colors.PRIMARY + '12' }]}>
            <Text style={[styles.phaseText, { color: colors.PRIMARY }]}>{activePhase}</Text>
          </View>
        </View>

        {/* Caloric Ring Summary Card */}
        <View style={[globalStyles.card, styles.ringCard]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.DARK_TEXT }]}>Calories Ledger</Text>
            <Text style={styles.cardGoal}>Goal: {caloriesTarget} kcal</Text>
          </View>
          <View style={styles.ringContainer}>
            <ProgressRing
              size={160}
              strokeWidth={14}
              progress={calPercent}
              color={colors.PRIMARY}
              label={caloriesRemaining.toString()}
              subLabel="kcal left"
              colors={colors}
            />
            <View style={styles.calBreakdown}>
              <View style={styles.calRow}>
                <View style={[styles.dot, { backgroundColor: colors.PRIMARY }]} />
                <View>
                  <Text style={styles.calLabel}>Consumed</Text>
                  <Text style={[styles.calValue, { color: colors.DARK_TEXT }]}>{caloriesConsumed} kcal</Text>
                </View>
              </View>
              <View style={styles.calRow}>
                <View style={[styles.dot, { backgroundColor: colors.BORDER }]} />
                <View>
                  <Text style={styles.calLabel}>Target</Text>
                  <Text style={[styles.calValue, { color: colors.DARK_TEXT }]}>{caloriesTarget} kcal</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 📈 Weight Trend Chart Card (Upgraded spec) */}
        <WeightTrendChart colors={colors} globalStyles={globalStyles} />

        {/* Steps & Water Grid */}
        <View style={styles.statsGrid}>
          {/* Steps Card */}
          <View style={[globalStyles.card, styles.statCard]}>
            <View style={styles.statIconRow}>
              <Text style={styles.statEmoji}>👟</Text>
              <Text style={styles.statPercent}>{Math.round(stepPercent)}%</Text>
            </View>
            <Text style={styles.statLabel}>Steps today</Text>
            <Text style={[styles.statValue, { color: colors.DARK_TEXT }]}>{stepsCurrent.toLocaleString()}</Text>
            <Text style={styles.statGoalLabel}>Goal: {stepsGoal}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${stepPercent}%`, backgroundColor: colors.INFO }]} />
            </View>
          </View>

          {/* Water Card */}
          <View style={[globalStyles.card, styles.statCard]}>
            <View style={styles.statIconRow}>
              <Text style={styles.statEmoji}>💧</Text>
              <Text style={styles.statPercent}>{Math.round(waterPercent)}%</Text>
            </View>
            <Text style={styles.statLabel}>Water Consumed</Text>
            <Text style={[styles.statValue, { color: colors.DARK_TEXT }]}>{waterCurrent} ml</Text>
            <Text style={styles.statGoalLabel}>Goal: {waterGoal} ml</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${waterPercent}%`, backgroundColor: colors.SUCCESS }]} />
            </View>
          </View>
        </View>

        <StepCounterPanel />

        {/* Nutritional Macros Breakdown */}
        {dashboard?.macros && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.DARK_TEXT }]}>
              {"Today's Nutritional Macros"}
            </Text>
            <View style={[globalStyles.card, styles.macrosCard]}>
              {/* Protein */}
              <View style={styles.macroRow}>
                <View style={styles.macroHeading}>
                  <Text style={[styles.macroName, { color: colors.DARK_TEXT }]}>Protein 🍗</Text>
                  <Text style={styles.macroNumbers}>
                    {dashboard.macros.protein.current}g / {dashboard.macros.protein.target}g
                  </Text>
                </View>
                <View style={styles.macroTrack}>
                  <View
                    style={[
                      styles.macroBar,
                      {
                        width: `${Math.min(100, (dashboard.macros.protein.current / dashboard.macros.protein.target) * 100)}%`,
                        backgroundColor: colors.PRIMARY,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Carbs */}
              <View style={styles.macroRow}>
                <View style={styles.macroHeading}>
                  <Text style={[styles.macroName, { color: colors.DARK_TEXT }]}>Carbohydrates 🌾</Text>
                  <Text style={styles.macroNumbers}>
                    {dashboard.macros.carbs.current}g / {dashboard.macros.carbs.target}g
                  </Text>
                </View>
                <View style={styles.macroTrack}>
                  <View
                    style={[
                      styles.macroBar,
                      {
                        width: `${Math.min(100, (dashboard.macros.carbs.current / dashboard.macros.carbs.target) * 100)}%`,
                        backgroundColor: '#D49C3F',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Fats */}
              <View style={styles.macroRow}>
                <View style={styles.macroHeading}>
                  <Text style={[styles.macroName, { color: colors.DARK_TEXT }]}>Healthy Fats 🥑</Text>
                  <Text style={styles.macroNumbers}>
                    {dashboard.macros.fats.current}g / {dashboard.macros.fats.target}g
                  </Text>
                </View>
                <View style={styles.macroTrack}>
                  <View
                    style={[
                      styles.macroBar,
                      {
                        width: `${Math.min(100, (dashboard.macros.fats.current / dashboard.macros.fats.target) * 100)}%`,
                        backgroundColor: '#2E6F4F',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Daily Food Budget Tracker */}
        <View style={[styles.section, { marginBottom: 80 }]}>
          <Text style={[styles.sectionTitle, { color: colors.DARK_TEXT }]}>Pakistani PKR Food Budget</Text>
          <View style={[globalStyles.card, styles.budgetCard]}>
            <View style={styles.budgetDetails}>
              <Text style={styles.budgetMainLabel}>PKR Remaining Today</Text>
              <Text style={[styles.budgetTotalVal, { color: colors.DARK_TEXT }]}>PKR {budgetRemaining}</Text>
              <Text style={styles.budgetSubtitle}>PKR {budgetSpent} spent out of PKR {budgetTotal}</Text>
            </View>
            <View style={styles.budgetGaugeWrapper}>
              <Svg width={70} height={70}>
                <Circle
                  stroke={colors.BORDER}
                  fill="none"
                  cx={35}
                  cy={35}
                  r={28}
                  strokeWidth={6}
                />
                <Circle
                  stroke={colors.PRIMARY}
                  fill="none"
                  cx={35}
                  cy={35}
                  r={28}
                  strokeWidth={6}
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - budgetPercent / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 35 35)"
                />
              </Svg>
              <View style={StyleSheet.absoluteFill}>
                <View style={styles.budgetGaugeInnerText}>
                  <Text style={styles.budgetGaugePct}>{Math.round(budgetPercent)}%</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    color: '#8A8D9F',
    fontWeight: '500',
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    marginTop: 2,
  },
  phaseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  phaseText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  ringCard: {
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardGoal: {
    fontSize: 12,
    color: '#8A8D9F',
  },
  ringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringInnerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    fontSize: 24,
    fontWeight: '800',
  },
  ringSubLabel: {
    fontSize: 10,
    color: '#8A8D9F',
    fontWeight: '500',
    marginTop: 2,
  },
  calBreakdown: {
    justifyContent: 'center',
    width: '45%',
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  calLabel: {
    fontSize: 11,
    color: '#8A8D9F',
  },
  calValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    width: '48%',
    marginBottom: 8,
  },
  statIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 22,
  },
  statPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8D9F',
  },
  statLabel: {
    fontSize: 12,
    color: '#8A8D9F',
    fontWeight: '500',
    marginTop: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  statGoalLabel: {
    fontSize: 10,
    color: '#B5B7C4',
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#2D3748',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  macrosCard: {
    padding: 16,
  },
  macroRow: {
    marginBottom: 16,
  },
  macroHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  macroName: {
    fontSize: 13,
    fontWeight: '600',
  },
  macroNumbers: {
    fontSize: 11,
    color: '#8A8D9F',
    fontWeight: '500',
  },
  macroTrack: {
    height: 6,
    backgroundColor: '#2D3748',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBar: {
    height: '100%',
  },
  budgetCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetDetails: {
    width: '65%',
  },
  budgetMainLabel: {
    fontSize: 12,
    color: '#8A8D9F',
    fontWeight: '500',
  },
  budgetTotalVal: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  budgetSubtitle: {
    fontSize: 11,
    color: '#8A8D9F',
    marginTop: 4,
  },
  budgetGaugeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  budgetGaugeInnerText: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetGaugePct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8D9F',
  },
  // 📈 Custom Weight Trend Chart Styles
  trendCard: {
    padding: 16,
    marginBottom: 24,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendGoal: {
    fontSize: 12,
    color: '#8A8D9F',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
});

export default DashboardScreen;
