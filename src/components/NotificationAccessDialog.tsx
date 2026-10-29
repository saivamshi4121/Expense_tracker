import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppColors, AppRadius, AppSpacing, AppTypography, MIN_TOUCH_TARGET } from '@/constants/theme';
import {
  isPermissionGranted as nativeIsPermissionGranted,
  openPermissionSettings,
} from '../../modules/notification-listener/src/index';

const DISMISSED_KEY = 'nl_onboarding_dismissed';

export function useNotificationOnboarding() {
  const [visible, setVisible] = useState(false);
  const appState = useRef(AppState.currentState);

  const evaluate = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (nativeIsPermissionGranted()) return;
    try {
      const dismissed = await AsyncStorage.getItem(DISMISSED_KEY);
      if (dismissed !== 'true') setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', async (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        if (nativeIsPermissionGranted()) {
          setVisible(false);
          try { await AsyncStorage.setItem(DISMISSED_KEY, 'true'); } catch {}
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  const dismiss = useCallback(async () => {
    setVisible(false);
    try { await AsyncStorage.setItem(DISMISSED_KEY, 'true'); } catch {}
  }, []);

  const allow = useCallback(() => {
    setVisible(false);
    openPermissionSettings();
  }, []);

  return { visible, dismiss, allow };
}

export default function NotificationAccessDialog({
  visible,
  onAllow,
  onNotNow,
}: {
  visible: boolean;
  onAllow: () => void;
  onNotNow: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Automatically find digital payments</Text>

          <Text style={styles.message}>
            Expense Tracker can detect digital payments from payment notifications and help you track them automatically.
          </Text>

          <View style={styles.benefits}>
            <View style={styles.benefitRow}>
              <Ionicons name="phone-portrait-outline" size={18} color={AppColors.textSecondary} />
              <Text style={styles.benefitText}>Processed locally on your device</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="close-circle-outline" size={18} color={AppColors.textSecondary} />
              <Text style={styles.benefitText}>No SMS or bank login access</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={AppColors.success} />
              <Text style={styles.benefitText}>You review payments before adding</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.allowBtn} onPress={onAllow} accessibilityRole="button" accessibilityLabel="Allow Notification Access">
              <Text style={styles.allowBtnText}>Allow Notification Access</Text>
            </Pressable>
            <Pressable style={styles.notNowBtn} onPress={onNotNow} accessibilityRole="button" accessibilityLabel="Not Now">
              <Text style={styles.notNowBtnText}>Not Now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xxl,
    gap: AppSpacing.lg,
  },
  title: {
    ...AppTypography.title,
    color: AppColors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...AppTypography.body,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefits: {
    gap: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  benefitText: {
    ...AppTypography.body,
    color: AppColors.textPrimary,
    flex: 1,
  },
  actions: {
    gap: AppSpacing.sm,
    marginTop: AppSpacing.sm,
  },
  allowBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: AppRadius.md,
    height: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allowBtnText: {
    ...AppTypography.button,
    color: AppColors.white,
  },
  notNowBtn: {
    height: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notNowBtnText: {
    ...AppTypography.button,
    color: AppColors.textSecondary,
  },
});
