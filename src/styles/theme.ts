import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

export const darkPalette = {
  PRIMARY: '#E53E3E', // GymFuel Crimson
  PRIMARY_LIGHT: '#FEB2B2',
  BACKGROUND: '#0F1015', // Premium dark background
  CARD: '#181A22',       // Dark Charcoal surface
  BORDER: '#2D3748',     // Sleek slate border
  DARK_TEXT: '#F7FAFC',  // Crisp white for headings
  SUB_TEXT: '#A0AEC0',   // Cool gray for subheadings
  WHITE: '#FFFFFF',
  SUCCESS: '#38A169',    // Green for water / macros success
  WARNING: '#DD6B20',    // Amber for budget warning
  INFO: '#3182CE',       // Blue for steps / info
  ERROR: '#E53E3E',
};

export const lightPalette = {
  PRIMARY: '#D9383A',
  PRIMARY_LIGHT: '#FFF5F5',
  BACKGROUND: '#F7FAFC',
  CARD: '#FFFFFF',
  BORDER: '#E2E8F0',
  DARK_TEXT: '#1A202C',
  SUB_TEXT: '#718096',
  WHITE: '#FFFFFF',
  SUCCESS: '#38A169',
  WARNING: '#DD6B20',
  INFO: '#3182CE',
  ERROR: '#E53E3E',
};

const useTheme = () => {
  // Read theme setting from store (defaulting to dark mode for the premium fit aesthetic)
  const isDark = useSelector((state: RootState) => state.settings?.darkMode ?? true);
  const colors = isDark ? darkPalette : lightPalette;

  const globalStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.BACKGROUND,
    },
    container: {
      flex: 1,
      padding: 20,
    },
    card: {
      backgroundColor: colors.CARD,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.BORDER,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
      marginBottom: 16,
    },
    button: {
      backgroundColor: colors.PRIMARY,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: isDark ? '#1F222B' : '#EDF2F7',
      borderWidth: 1,
      borderColor: colors.BORDER,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.DARK_TEXT,
      fontSize: 15,
      marginBottom: 14,
    },
    errorText: {
      color: colors.ERROR,
      fontSize: 12,
      marginTop: -8,
      marginBottom: 12,
      marginLeft: 4,
      fontWeight: '500',
    },
  });

  return { colors, globalStyles, isDark };
};

export default useTheme;
export type ThemeColors = typeof darkPalette;
export type GlobalStyles = ReturnType<typeof useTheme>['globalStyles'];
