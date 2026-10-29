import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validate(): string | null {
    if (!name.trim()) return 'Name is required';
    if (!email.trim()) return 'Email is required';
    if (!validateEmail(email)) return 'Please enter a valid email';
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  }

  async function handleSignUp() {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email.trim(), password, name.trim());
      if (error) {
        setError(error.message);
      } else {
        router.replace('/');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to start tracking expenses</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError(null);
              }}
              placeholder="Enter your name"
              placeholderTextColor={AppColors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              textContentType="name"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              placeholder="Enter your email"
              placeholderTextColor={AppColors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              textContentType="emailAddress"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              placeholder="Enter password (min 8 chars)"
              placeholderTextColor={AppColors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              textContentType="newPassword"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (error) setError(null);
              }}
              placeholder="Confirm your password"
              placeholderTextColor={AppColors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              textContentType="newPassword"
              editable={!loading}
              onSubmitEditing={handleSignUp}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={AppColors.white} size="small" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.replace('/sign-in')}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: AppSpacing.xxl,
    justifyContent: 'center',
    gap: AppSpacing.xxl,
  },
  title: {
    ...AppTypography.heading,
    color: AppColors.textPrimary,
  },
  subtitle: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
  },
  errorContainer: {
    backgroundColor: AppColors.errorLight,
    borderWidth: 1,
    borderColor: AppColors.error,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  errorText: {
    ...AppTypography.caption,
    color: AppColors.error,
    textAlign: 'center',
  },
  form: {
    gap: AppSpacing.lg,
  },
  field: {
    gap: AppSpacing.sm,
  },
  label: {
    ...AppTypography.label,
    color: AppColors.textPrimary,
  },
  input: {
    backgroundColor: AppColors.inputBg,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.lg,
    fontSize: 16,
    color: AppColors.textPrimary,
    minHeight: MIN_TOUCH_TARGET + 4,
  },
  button: {
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    height: MIN_TOUCH_TARGET + 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: AppSpacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    marginTop: AppSpacing.lg,
  },
  footerText: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
  },
  footerLink: {
    ...AppTypography.bodyBold,
    color: AppColors.accent,
  },
});
