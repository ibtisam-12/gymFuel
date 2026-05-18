import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../../utils/elements';
import { AuthStackScreen } from '../../types/navigation.types';
import useTheme from '../../styles/theme';

const LanguageScreen: React.FC<AuthStackScreen<'LanguageScreen'>> = ({ navigation }) => {
  const { colors, globalStyles } = useTheme();

  const handleSelectLanguage = () => {
    // Simply navigate to the Login screen
    navigation.navigate('Login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
      {/* Decorative Brand Header */}
      <View style={styles.brandSection}>
        <View style={[styles.logoIconCircle, { backgroundColor: colors.PRIMARY }]}>
          <Text style={styles.logoIconEmoji}>💪</Text>
        </View>
        <Text style={[styles.brandTitle, { color: colors.DARK_TEXT }]}>GymFuel AI</Text>
        <Text style={[styles.brandSubtitle, { color: colors.SUB_TEXT }]}>AI-Powered personalized diet engine</Text>
      </View>

      {/* Language Selection Card Panel */}
      <View style={[globalStyles.card, styles.selectionCard]}>
        <Text style={[styles.cardTitle, { color: colors.DARK_TEXT }]}>B_SELECT_YOUR_LANGUAGE</Text>
        <Text style={[styles.cardSubtitle, { color: colors.SUB_TEXT }]}>
          B_YOU_CAN_CHANGE_THIS_LATER_IN_SETTINGS
        </Text>

        {/* English Option */}
        <TouchableOpacity
          onPress={handleSelectLanguage}
          style={[styles.languageButton, { borderColor: colors.PRIMARY }]}
        >
          <Text style={styles.flagEmoji}>🇬🇧</Text>
          <View style={styles.languageTextContainer}>
            <Text style={[styles.languageLabel, { color: colors.DARK_TEXT }]}>B_ENGLISH</Text>
            <Text style={styles.languageHelper}>B_CONTINUE_IN_ENGLISH</Text>
          </View>
        </TouchableOpacity>

        {/* Arabic/Urdu Option */}
        <TouchableOpacity
          onPress={handleSelectLanguage}
          style={[styles.languageButton, { borderColor: colors.BORDER }]}
        >
          <Text style={styles.flagEmoji}>🇵🇰</Text>
          <View style={styles.languageTextContainer}>
            <Text style={[styles.languageLabel, { color: colors.DARK_TEXT }]}>B_ARABIC</Text>
            <Text style={styles.languageHelper}>B_CONTINUE_IN_ARABIC</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoIconEmoji: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  selectionCard: {
    padding: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
    fontWeight: '500',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  flagEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  languageHelper: {
    fontSize: 11,
    color: '#8A8D9F',
    marginTop: 2,
    fontWeight: '500',
  },
});

export default LanguageScreen;
