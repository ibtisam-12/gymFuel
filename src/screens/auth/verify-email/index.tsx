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
import { authApi, profileApi } from '../../../services/backend';
import { useAppDispatch } from '../../../store/store';
import { loginFailure, loginStart, loginSuccess } from '../../../store/reducer/auth';
import { setProfile } from '../../../store/reducer/profile';
import { isValidEmail, isValidOtp, onlyDigits } from '../../../utils/validation';

const VerifyEmailScreen: React.FC<AuthStackScreen<'VerifyEmail'>> = ({ navigation, route }) => {
  const { colors, globalStyles, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState(route.params?.email || '');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('Enter the 6-digit OTP sent to your email.');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const completeLogin = async (accessToken: string) => {
    const resMe = await authApi.me();
    if (!resMe.success || !resMe.data) {
      throw new Error(resMe.error || 'Could not load account details.');
    }

    const resDash = await profileApi.dashboard();
    const isOnboarded = resDash.success && resDash.data ? true : false;
    if (isOnboarded) {
      const profileRes = await profileApi.get();
      if (profileRes.success && profileRes.data) {
        dispatch(setProfile(profileRes.data));
      }
    }

    dispatch(loginSuccess({
      user: {
        ...resMe.data,
        is_onboarded: isOnboarded,
      },
      token: accessToken,
    }));
  };

  const handleVerify = async () => {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOtp = otp.trim();
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!isValidOtp(normalizedOtp)) {
      setError('Enter the 6-digit OTP.');
      return;
    }

    setError(null);
    setSubmitting(true);
    dispatch(loginStart());

    try {
      const res = await authApi.verifyEmail({ email: normalizedEmail, otp: normalizedOtp });
      if (res.success && res.data?.access) {
        await completeLogin(res.data.access);
      } else {
        const err = res.error || 'Invalid or expired OTP.';
        setError(err);
        dispatch(loginFailure(err));
      }
    } catch (err: any) {
      const msg = err.message || 'Could not verify email.';
      setError(msg);
      dispatch(loginFailure(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address first.');
      return;
    }

    setError(null);
    setResending(true);
    try {
      const res = await authApi.requestEmailVerification(normalizedEmail);
      setMessage(res.data?.detail || res.error || 'OTP sent.');
    } catch (err: any) {
      setError(err.message || 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.BACKGROUND }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.brandHeader}>
          <Text style={[styles.brandTitle, { color: colors.DARK_TEXT }]}>Verify Email</Text>
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

          <TouchableOpacity
            onPress={handleVerify}
            disabled={submitting}
            style={[globalStyles.button, submitting && { opacity: 0.8 }]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={globalStyles.buttonText}>Verify and Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.textButton}>
            <Text style={[styles.textButtonLabel, { color: colors.PRIMARY }]}>
              {resending ? 'Sending...' : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
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

export default VerifyEmailScreen;
