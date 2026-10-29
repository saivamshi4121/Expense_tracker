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

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validate(): string | null {
    if (!email.trim()) return 'Email is required';
    if (!validateEmail(email)) return 'Please enter a valid email';
    if (!password) return 'Password is required';
    return null;
  }

  async function handleSignIn() {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
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
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue tracking expenses</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
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
              placeholder="Enter your password"
              placeholderTextColor={AppColors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              textContentType="password"
              editable={!loading}
              onSubmitEditing={handleSignIn}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={AppColors.white} size="small" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{"Don't have an account? "}</Text>
          <TouchableOpacity
            onPress={() => router.replace('/sign-up')}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Create Account</Text>
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
