import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '../../../utils/elements';
import { AuthStackScreen } from '../../../types/navigation.types';
import useTheme from '../../../styles/theme';
import { authApi } from '../../../services/backend';
import { isStrongPassword, isValidEmail, isValidOtp, onlyDigits } from '../../../utils/validation';

const ForgotPasswordScreen: React.FC<AuthStackScreen<'ForgotPassword'>> = ({ navigation, route }) => {
  const { colors, globalStyles, isDark } = useTheme();
  const [email, setEmail] = useState(route.params?.email || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('Enter your email and we will send a password reset OTP.');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequestOtp = async () => {
    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.requestPasswordReset(normalizedEmail);
      if (res.success) {
        setOtpSent(true);
        setMessage(res.data?.detail || 'OTP sent. Check your inbox.');
      } else {
        setError(res.error || 'Could not send reset OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not send reset OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!isValidOtp(otp)) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    if (!isStrongPassword(password)) {
      setError('Use at least 8 characters with letters and numbers.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.resetPassword({
        email: normalizedEmail,
        otp: otp.trim(),
        password,
        password2: confirmPassword,
      });
      if (res.success) {
        setMessage(res.data?.detail || 'Password updated. You can sign in now.');
        navigation.navigate('Login');
      } else {
        setError(res.error || 'Could not reset password.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.BACKGROUND }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.brandHeader}>
          <Text style={[styles.brandTitle, { color: colors.DARK_TEXT }]}>Reset Password</Text>
          <Text style={[styles.brandSubtitle, { color: colors.SUB_TEXT }]}>{message}</Text>
        </View>

        {error && (
          <View style={[styles.banner, { backgroundColor: colors.PRIMARY + '12', borderColor: colors.PRIMARY }]}>
            <Text style={[styles.bannerText, { color: colors.PRIMARY }]}>{error}</Text>
          </View>
        )}

        <View style={[globalStyles.card, styles.formCard]}>
          <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Email</Text>
          <TextInput
            placeholder="your.email@example.com"
            placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
            style={globalStyles.input}
            value={email}
            onChangeText={(value) => setEmail(value.trim())}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {otpSent && (
            <>
              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>OTP Code</Text>
              <TextInput
                placeholder="123456"
                placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                style={globalStyles.input}
                value={otp}
                onChangeText={(value) => setOtp(onlyDigits(value).slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Create a strong password"
                  placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                  style={[globalStyles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Confirm Password</Text>
              <TextInput
                placeholder="Re-enter your password"
                placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                style={globalStyles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          <TouchableOpacity
            onPress={otpSent ? handleResetPassword : handleRequestOtp}
            disabled={submitting}
            style={[globalStyles.button, submitting && { opacity: 0.8 }]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={globalStyles.buttonText}>{otpSent ? 'Reset Password' : 'Send OTP'}</Text>
            )}
          </TouchableOpacity>

          {otpSent && (
            <TouchableOpacity onPress={handleRequestOtp} disabled={submitting} style={styles.textButton}>
              <Text style={[styles.textButtonLabel, { color: colors.PRIMARY }]}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footerRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.textButtonLabel, { color: colors.SUB_TEXT }]}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  formCard: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 64,
    width: '100%',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    height: 30,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A8D9F',
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  textButton: {
    alignItems: 'center',
    paddingTop: 16,
  },
  textButtonLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  footerRow: {
    alignItems: 'center',
    marginTop: 24,
  },
});

export default ForgotPasswordScreen;
