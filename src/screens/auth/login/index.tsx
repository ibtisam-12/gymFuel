import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from '../../../utils/elements';
import { AuthStackScreen } from '../../../types/navigation.types';
import useTheme from '../../../styles/theme';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAppDispatch } from '../../../store/store';
import { loginStart, loginSuccess, loginFailure } from '../../../store/reducer/auth';
import { setProfile } from '../../../store/reducer/profile';
import { authApi, profileApi } from '../../../services/backend';

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('B_INVALID_EMAIL_ADDRESS').required('B_EMAIL_REQUIRED'),
  password: Yup.string().min(6, 'B_PASSWORD_MIN_LENGTH').required('B_PASSWORD_REQUIRED'),
});

const LoginScreen: React.FC<AuthStackScreen<'Login'>> = ({ navigation }) => {
  const { colors, globalStyles, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLoginSubmit = async (values: any) => {
    setAuthError(null);
    setSubmitting(true);
    dispatch(loginStart());

    try {
      // 1. Post credentials to SimpleJWT login endpoint
      const res = await authApi.login({
        email: values.email.toLowerCase().trim(),
        password: values.password,
      });

      if (res.success && res.data?.access) {
        const accessToken = res.data.access;

        // 3. Query the '/auth/me/' endpoint to retrieve the user's detailed account profile
        const resMe = await authApi.me();

        if (resMe.success && resMe.data) {
          // 4. Check if the user is already onboarded (has a health profile)
          // If the profile/dashboard/ endpoint returns success, it means a profile exists!
          const resDash = await profileApi.dashboard();
          const isOnboarded = resDash.success && resDash.data ? true : false;
          if (isOnboarded) {
            const profileRes = await profileApi.get();
            if (profileRes.success && profileRes.data) {
              dispatch(setProfile(profileRes.data));
            }
          }

          // 5. Dispatch the complete user credentials and access token to Redux
          dispatch(loginSuccess({
            user: {
              ...resMe.data,
              is_onboarded: isOnboarded,
            },
            token: accessToken,
          }));

          // Push registration should run only after a real FCM/APNs token is available.
        } else {
          await authApi.logout();
          const err = resMe.error || 'Failed to retrieve account details.';
          setAuthError(err);
          dispatch(loginFailure(err));
        }
      } else {
        const err = res.error || 'Invalid credentials. Please try again.';
        setAuthError(err);
        dispatch(loginFailure(err));
        if (err.toLowerCase().includes('verify')) {
          navigation.navigate('VerifyEmail', { email: values.email.toLowerCase().trim() });
        }
      }
    } catch (error: any) {
      const err = error.message || 'Something went wrong';
      setAuthError(err);
      dispatch(loginFailure(err));
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
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Text style={[styles.brandTitle, { color: colors.DARK_TEXT }]}>B_WELCOME_BACK</Text>
          <Text style={[styles.brandSubtitle, { color: colors.SUB_TEXT }]}>B_SIGN_IN_TO_MANAGE_YOUR_ORDERS</Text>
        </View>

        {/* Auth Error Banner */}
        {authError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.PRIMARY + '12', borderColor: colors.PRIMARY }]}>
            <Text style={[styles.errorText, { color: colors.PRIMARY }]}>{authError}</Text>
          </View>
        )}

        {/* Input Form Card */}
        <View style={[globalStyles.card, styles.formCard]}>
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleLoginSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View>
                {/* Email Field */}
                <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>B_EMAIL</Text>
                <TextInput
                  placeholder="your.email@example.com"
                  placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                  style={globalStyles.input}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  value={values.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.email && touched.email && (
                  <Text style={globalStyles.errorText}>{errors.email}</Text>
                )}

                {/* Password Field */}
                <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>B_PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                    style={[globalStyles.input, styles.passwordInput]}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    value={values.password}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Text style={styles.eyeEmoji}>{showPassword ? '👁️' : '🔒'}</Text>
                  </TouchableOpacity>
                </View>
                {errors.password && touched.password && (
                  <Text style={globalStyles.errorText}>{errors.password}</Text>
                )}

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword', { email: values.email.toLowerCase().trim() })}
                  style={styles.forgotButton}
                >
                  <Text style={[styles.forgotText, { color: colors.PRIMARY }]}>Forgot your password?</Text>
                </TouchableOpacity>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={() => handleSubmit()}
                  disabled={submitting}
                  style={[globalStyles.button, submitting && { opacity: 0.8 }]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={globalStyles.buttonText}>B_SIGN_IN</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Formik>
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerRow}>
          <Text style={{ color: colors.SUB_TEXT }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={[styles.signUpLink, { color: colors.PRIMARY }]}>Sign Up</Text>
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
    letterSpacing: 0.5,
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
    paddingRight: 50,
    width: '100%',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 12,
    height: 30,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeEmoji: {
    fontSize: 16,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 14,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpLink: {
    fontWeight: '800',
    fontSize: 14,
  },
});

export default LoginScreen;
