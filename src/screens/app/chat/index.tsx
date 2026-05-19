import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../utils/elements';
import { BottomTabScreen } from '../../../types/navigation.types';
import useTheme from '../../../styles/theme';
import { useAppDispatch } from '../../../store/store';
import { addMessage, setLoading as setChatLoading, useChatStore, setSessionId, clearChat } from '../../../store/reducer/chat';
import { addMeal } from '../../../store/reducer/tracker';
import { useTrackerStore } from '../../../store/reducer/tracker';
import { aiApi, trackersApi } from '../../../services/backend';
import { ChatMessage } from '../../../types';

const AIChatScreen: React.FC<BottomTabScreen<'AIChat'>> = ({ route, navigation }) => {
  const { colors, globalStyles, isDark } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const bottomInset = tabBarHeight + Math.max(insets.bottom, 8);
  const headerTopPadding = Math.max(insets.top + 12, 16);
  const dispatch = useAppDispatch();
  const { messages, loading, sessionId } = useChatStore();
  const { dashboard } = useTrackerStore();
  const [inputText, setInputText] = useState('');
  const [loggingMealId, setLoggingMealId] = useState<number | string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const chatGenerationRef = useRef(0);

  const buildAiFailureMessage = (error?: string | null): string => {
    const parserFailed = error?.includes('Failed to parse MealRecommendation');
    if (parserFailed) {
      return 'I found a meal idea, but the AI returned nutrition values in the wrong format. Please ask again with a simpler request, and I will retry.';
    }
    return error || 'Sorry, I am facing an issue connecting to the AI brain. Please check your backend is running.';
  };

  // Send message helper
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const requestGeneration = chatGenerationRef.current;

    // 1. Add user message locally
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    dispatch(addMessage(userMsg));
    setInputText('');
    dispatch(setChatLoading(true));

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // 2. Fetch AI response from Django (passing active sessionId)
      const res = await aiApi.chat(text, sessionId);
      if (requestGeneration !== chatGenerationRef.current) {
        return;
      }

      if (res.success && res.data?.message && (res.data.success || res.data.message.ai_data)) {
        dispatch(addMessage(res.data.message));
        if (res.data.session_id) {
          dispatch(setSessionId(res.data.session_id));
        }
      } else if (res.success && res.data?.blocked && res.data.message) {
        dispatch(addMessage(res.data.message));
      } else if (res.success && res.data) {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: buildAiFailureMessage(res.data.error),
          created_at: new Date().toISOString(),
        };
        dispatch(addMessage(errorMsg));
        if (res.data.session_id) {
          dispatch(setSessionId(res.data.session_id));
        }
      } else {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.error || 'Sorry, I am facing an issue connecting to the AI brain. Please check your backend is running.',
          created_at: new Date().toISOString(),
        };
        dispatch(addMessage(errorMsg));
      }
    } catch (err: any) {
      if (requestGeneration !== chatGenerationRef.current) {
        return;
      }
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: err.message || 'Network exception encountered.',
        created_at: new Date().toISOString(),
      };
      dispatch(addMessage(errorMsg));
    } finally {
      if (requestGeneration === chatGenerationRef.current) {
        dispatch(setChatLoading(false));
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    }
  };

  const resetConversation = async () => {
    chatGenerationRef.current += 1;
    setInputText('');
    setLoggingMealId(null);
    dispatch(clearChat());

    try {
      const res = await aiApi.clearMemory();
      if (!res.success) {
        console.warn('Backend memory clear skipped:', res.error);
      }
    } catch (error) {
      console.warn('Backend memory clear skipped:', error);
    }
  };

  // Clear memory handler
  const handleClearMemory = () => {
    Alert.alert(
      'Reset Conversation 🧠',
      'Are you sure you want to wipe all session memory and clear context for the AI coach?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetConversation();
            Alert.alert('Cleared', 'Conversation reset. Ready for a new session.');
          },
        },
      ]
    );
  };

  // Check for dashboard deep link queries
  useEffect(() => {
    if (route.params?.initialQuery) {
      sendMessage(route.params.initialQuery);
      // Clear route params so we don't trigger it repeatedly
      navigation.setParams({ initialQuery: undefined });
    }
  }, [route.params?.initialQuery]);

  // Log AI suggested meal directly to user's daily ledger
  const handleSaveAIMeal = async (msgId: string | number, aiData: any) => {
    setLoggingMealId(msgId);
    try {
      const res = await trackersApi.saveAiMeal(aiData);

      if (res.success && res.data) {
        // Dispatches to Redux tracker so the Dashboard rings update immediately!
        dispatch(addMeal(res.data));
        Alert.alert('Success 🎉', `${aiData.meal_name || 'Meal'} logged to your today's ledger successfully!`);
      } else {
        Alert.alert('Logging Failed', res.error || 'Failed to save suggested meal.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Connection failed.');
    } finally {
      setLoggingMealId(null);
    }
  };

  // Render a single chat item
  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const hasAiData = item.ai_data && typeof item.ai_data === 'object';
    const recipe = hasAiData ? item.ai_data : null;
    const instructionsText = recipe?.instructions
      ? Array.isArray(recipe.instructions)
        ? recipe.instructions.join('\n')
        : String(recipe.instructions)
      : '';

    // Calculate budget status
    const remainingBudget = dashboard?.budget?.remaining || 0;
    const recipeCost = recipe?.total_cost_pkr || 0;
    const isOverBudget = recipeCost > remainingBudget;

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {/* Profile Avatar / Indicator */}
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.PRIMARY }]}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
        )}

        <View style={styles.bubbleContainer}>
          {/* Message Text Bubble */}
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: isUser ? colors.PRIMARY : colors.CARD,
                borderColor: isUser ? colors.PRIMARY : colors.BORDER,
              },
            ]}
          >
            <Text style={[styles.messageText, { color: isUser ? '#FFFFFF' : colors.DARK_TEXT }]}>
              {item.content}
            </Text>
          </View>

          {/* SUGGESTED RECIPE CARD VIEW */}
          {recipe && (
            <View style={[globalStyles.card, styles.recipeCard]}>
              <View style={styles.recipeHeader}>
                <Text style={[styles.recipeTitle, { color: colors.DARK_TEXT }]}>🍳 {recipe.meal_name}</Text>
                {recipe.preparation_time_minutes && (
                  <Text style={styles.prepTime}>⏱️ {recipe.preparation_time_minutes} mins</Text>
                )}
              </View>

              {/* Price Budget Alert banner */}
              {isOverBudget && (
                <View style={[styles.budgetWarning, { backgroundColor: colors.WARNING + '15' }]}>
                  <Text style={[styles.budgetText, { color: colors.WARNING }]}>
                    ⚠️ Cost (PKR {recipeCost}) exceeds remaining today's PKR {remainingBudget} budget!
                  </Text>
                </View>
              )}

              {/* Ingredients List */}
              {recipe.ingredients && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: colors.DARK_TEXT }]}>Ingredients Price Breakdown</Text>
                  {recipe.ingredients.map((ing: any, idx: number) => (
                    <View key={idx} style={styles.ingredientRow}>
                      <Text style={[styles.ingLabel, { color: colors.SUB_TEXT }]}>
                        • {ing.item} ({ing.quantity})
                      </Text>
                      {ing.estimated_cost_pkr !== undefined && (
                        <Text style={[styles.ingPrice, { color: colors.DARK_TEXT }]}>
                          PKR {ing.estimated_cost_pkr}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Macros Ledger */}
              {recipe.macros && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: colors.DARK_TEXT }]}>Nutrient Metrics</Text>
                  <View style={styles.macrosGrid}>
                    <View style={styles.macroCell}>
                      <Text style={styles.macroVal}>{recipe.macros.calories} kcal</Text>
                      <Text style={styles.macroLab}>Energy</Text>
                    </View>
                    <View style={styles.macroCell}>
                      <Text style={[styles.macroVal, { color: colors.PRIMARY }]}>{recipe.macros.protein_g}g</Text>
                      <Text style={styles.macroLab}>Protein</Text>
                    </View>
                    <View style={styles.macroCell}>
                      <Text style={styles.macroVal}>{recipe.macros.carbs_g}g</Text>
                      <Text style={styles.macroLab}>Carbs</Text>
                    </View>
                    <View style={styles.macroCell}>
                      <Text style={styles.macroVal}>{recipe.macros.fats_g}g</Text>
                      <Text style={styles.macroLab}>Fats</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Preparation Instructions */}
              {instructionsText ? (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionHeading, { color: colors.DARK_TEXT }]}>Preparation Method</Text>
                  <Text style={[styles.instructionsText, { color: colors.SUB_TEXT }]}>{instructionsText}</Text>
                </View>
              ) : null}

              {/* PKR Cost and Action Button */}
              <View style={styles.actionRow}>
                <View>
                  <Text style={styles.costLabel}>Total Cost</Text>
                  <Text style={[styles.costValue, { color: colors.DARK_TEXT }]}>PKR {recipe.total_cost_pkr || 0}</Text>
                </View>
                
                <TouchableOpacity
                  onPress={() => handleSaveAIMeal(item.id, recipe)}
                  disabled={loggingMealId !== null}
                  style={[globalStyles.button, styles.logButton, { backgroundColor: colors.SUCCESS }]}
                >
                  {loggingMealId === item.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[globalStyles.buttonText, styles.logBtnText]}>Log to Ledger</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.BACKGROUND }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.BORDER, paddingTop: headerTopPadding }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.DARK_TEXT }]}>GymFuel AI Coach</Text>
          <Text style={styles.headerSubtitle}>Personalized AI diet recommender</Text>
        </View>

        <TouchableOpacity
          onPress={handleClearMemory}
          style={[styles.resetButton, { borderColor: colors.PRIMARY }]}
        >
          <Text style={[styles.resetButtonText, { color: colors.PRIMARY }]}>🧠 Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContainer, { paddingBottom: bottomInset + 72 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={[styles.emptyTitle, { color: colors.DARK_TEXT }]}>Welcome to GymFuel AI!</Text>
            <Text style={[styles.emptyDesc, { color: colors.SUB_TEXT }]}>
              Ask me for cheap, localized Pakistani meal ideas, high protein bulking snack recipes, or budgeting strategies matching your health goals.
            </Text>
          </View>
        }
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.PRIMARY} />
          <Text style={[styles.loadingText, { color: colors.SUB_TEXT }]}>GymFuel Coach is thinking...</Text>
        </View>
      )}

      {/* Bottom Input Area */}
      <View
        style={[
          styles.inputWrapper,
          {
            borderTopColor: colors.BORDER,
            backgroundColor: colors.CARD,
            bottom: bottomInset,
          },
        ]}
      >
        <TextInput
          placeholder="Ask for high-protein breakfast under Rs. 150..."
          placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
          style={[styles.chatInput, { color: colors.DARK_TEXT }]}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          onPress={() => sendMessage(inputText)}
          disabled={loading || !inputText.trim()}
          style={[styles.sendButton, { backgroundColor: colors.PRIMARY }, (!inputText.trim() || loading) && { opacity: 0.5 }]}
        >
          <Text style={styles.sendEmoji}>➔</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
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
  resetButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 20,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  bubbleContainer: {
    maxWidth: '82%',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  recipeCard: {
    marginTop: 10,
    padding: 16,
    width: '100%',
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  prepTime: {
    fontSize: 11,
    color: '#8A8D9F',
    fontWeight: '600',
  },
  budgetWarning: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  budgetText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  ingLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  ingPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#00000010',
    borderRadius: 12,
    padding: 10,
  },
  macroCell: {
    alignItems: 'center',
    width: '23%',
  },
  macroVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  macroLab: {
    fontSize: 9,
    color: '#8A8D9F',
    marginTop: 2,
    fontWeight: '600',
  },
  instructionsText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2D374820',
    paddingTop: 12,
    marginTop: 8,
  },
  costLabel: {
    fontSize: 10,
    color: '#8A8D9F',
    fontWeight: '600',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  logButton: {
    marginTop: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  logBtnText: {
    fontSize: 13,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#00000012',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendEmoji: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default AIChatScreen;
