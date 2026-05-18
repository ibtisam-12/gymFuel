import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from '../../../utils/elements';
import { AuthStackScreen } from '../../../types/navigation.types';
import useTheme from '../../../styles/theme';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { authApi } from '../../../services/backend';
import { useAppDispatch } from '../../../store/store';
import { loginSuccess } from '../../../store/reducer/auth';

const SignUpSchema = Yup.object().shape({
  fullName: Yup.string().min(3, 'B_FULLNAME_ATLEAST').max(50, 'B_FULLNAME_LESS_THAN').required('B_FULLNAME_REQUIRE'),
  email: Yup.string().email('B_INVALID_EMAIL_ADDRESS').required('B_EMAIL_REQUIRED'),
  password: Yup.string().min(8, 'B_PASSWORD_MIN_LENGTH').required('B_PASSWORD_REQUIRED'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'B_PASSWORDS_DONT_MATCH')
    .required('Password confirmation is required'),
});

const SignUpScreen: React.FC<AuthStackScreen<'SignUp'>> = ({ navigation }) => {
  const { colors, globalStyles, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignUpSubmit = async (values: any) => {
    setRegError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      // 1. Post registration details to the Django backend
      const res = await authApi.register({
        full_name: values.fullName.trim(),
        email: values.email.toLowerCase().trim(),
        password: values.password,
        password2: values.password, // Django serializer compliance
      });

      if (res.success) {
        setSuccessMsg('Account created successfully! Logging you in automatically...');

        if (res.data?.access) {
          const accessToken = res.data.access;
          const resMe = await authApi.me();

          if (resMe.success && resMe.data) {
            // Since this is a newly registered user, is_onboarded is always false.
            // This immediately routes them to Gate 2 (Onboarding Form Submission Screens) in root.tsx!
            dispatch(loginSuccess({
              user: {
                ...resMe.data,
                is_onboarded: false,
              },
              token: accessToken,
            }));

            // Push registration should run only after a real FCM/APNs token is available.
          } else {
            // Fallback: Redirect to Login Screen if me endpoint fails
            await authApi.logout();
            navigation.navigate('Login');
          }
        } else {
          // Fallback: Redirect to Login Screen if login fails
          navigation.navigate('Login');
        }
      } else {
        setRegError(res.error || 'Registration failed. Email might already exist.');
      }
    } catch (error: any) {
      setRegError(error.message || 'Something went wrong during account setup.');
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
        {/* Header */}
        <View style={styles.brandHeader}>
          <Text style={[styles.brandTitle, { color: colors.DARK_TEXT }]}>Create Account</Text>
          <Text style={[styles.brandSubtitle, { color: colors.SUB_TEXT }]}>Join GymFuel AI to get custom diets</Text>
        </View>

        {/* Error Banner */}
        {regError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.PRIMARY + '12', borderColor: colors.PRIMARY }]}>
            <Text style={[styles.errorBannerText, { color: colors.PRIMARY }]}>{regError}</Text>
          </View>
        )}

        {/* Success Banner */}
        {successMsg && (
          <View style={[styles.successBanner, { backgroundColor: colors.SUCCESS + '12', borderColor: colors.SUCCESS }]}>
            <Text style={[styles.successBannerText, { color: colors.SUCCESS }]}>{successMsg}</Text>
          </View>
        )}

        {/* Input Card */}
        <View style={[globalStyles.card, styles.formCard]}>
          <Formik
            initialValues={{ fullName: '', email: '', password: '', confirmPassword: '' }}
            validationSchema={SignUpSchema}
            onSubmit={handleSignUpSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View>
                {/* Full Name */}
                <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Full Name</Text>
                <TextInput
                  placeholder="Muhammad Ibtisam"
                  placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                  style={globalStyles.input}
                  onChangeText={handleChange('fullName')}
                  onBlur={handleBlur('fullName')}
                  value={values.fullName}
                  autoCorrect={false}
                />
                {errors.fullName && touched.fullName && (
                  <Text style={globalStyles.errorText}>{errors.fullName}</Text>
                )}

                {/* Email */}
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

                {/* Password */}
                <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>B_PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    placeholder="Create a strong password"
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

                {/* Confirm Password */}
                <Text style={[styles.inputLabel, { color: colors.DARK_TEXT }]}>Confirm Password</Text>
                <TextInput
                  placeholder="Re-enter your password"
                  placeholderTextColor={isDark ? '#4A5568' : '#A0AEC0'}
                  style={globalStyles.input}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  value={values.confirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.confirmPassword && touched.confirmPassword && (
                  <Text style={globalStyles.errorText}>{errors.confirmPassword}</Text>
                )}

                {/* Register Button */}
                <TouchableOpacity
                  onPress={() => handleSubmit()}
                  disabled={submitting}
                  style={[globalStyles.button, submitting && { opacity: 0.8 }]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={globalStyles.buttonText}>Register</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Formik>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={{ color: colors.SUB_TEXT }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginLink, { color: colors.PRIMARY }]}>B_SIGN_IN</Text>
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
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginLink: {
    fontWeight: '800',
    fontSize: 14,
  },
});

export default SignUpScreen;
