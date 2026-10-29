/**
 * index.ts  (modules/notification-listener/src/index.ts)
 *
 * TypeScript bridge to the native NotificationListenerModule.
 * Uses safe optional module loading so that running in Expo Go or web
 * fails gracefully without crashing the JS bundle.
 */

import { NativeModule, requireNativeModule } from 'expo';
import { DeviceEventEmitter, EmitterSubscription, Platform } from 'react-native';

const TAG = '[NL-Bridge]';

export interface RawNotificationPayload {
  packageName: string;
  postTime: number;       // Unix ms
  notificationId: number;
  title: string;
  text: string;
}

// Typed interface matching the Kotlin module definition.
interface NotificationListenerNativeModule extends NativeModule {
  isPermissionGranted(): boolean;
  openPermissionSettings(): void;
  sendTestNotification(): void;
}

let NativeNotificationListener: NotificationListenerNativeModule | null = null;
let _loadAttempted = false;

function loadNativeModule(): NotificationListenerNativeModule | null {
  if (NativeNotificationListener) return NativeNotificationListener;
  if (Platform.OS !== 'android') return null;
  if (_loadAttempted) return NativeNotificationListener;
  _loadAttempted = true;
  try {
    NativeNotificationListener = requireNativeModule<NotificationListenerNativeModule>('NotificationListener');
    console.log(`${TAG} Native module loaded`);
  } catch {
    NativeNotificationListener = null;
  }
  return NativeNotificationListener;
}

// Try on first import
loadNativeModule();

export function isPermissionGranted(): boolean {
  const mod = loadNativeModule();
  if (!mod) return false;
  try {
    return mod.isPermissionGranted();
  } catch {
    return false;
  }
}

export function openPermissionSettings(): void {
  const mod = loadNativeModule();
  if (!mod) return;
  try {
    mod.openPermissionSettings();
  } catch {
    // silent
  }
}

export function sendTestNotification(): void {
  const mod = loadNativeModule();
  if (mod) {
    try { mod.sendTestNotification(); } catch {}
  }

  const testPayload: RawNotificationPayload = {
    packageName: 'com.google.android.apps.nbu.paisa.user',
    postTime: Date.now(),
    notificationId: 9999,
    title: 'Google Pay',
    text: '\u20B9850 paid to Swiggy using UPI. Transaction successful. UPI Ref No: TEST123456. A/c XX1234 debited on 06-09-26.',
  };
  DeviceEventEmitter.emit('onNotification', testPayload);
}

/**
 * Subscribe to all incoming notifications.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function addNotificationListener(
  callback: (payload: RawNotificationPayload) => void
): () => void {
  const subscription: EmitterSubscription = DeviceEventEmitter.addListener(
    'onNotification',
    (payload: RawNotificationPayload) => {
      try {
        callback(payload);
      } catch {
        // Silently ignore listener errors
      }
    }
  );
  return () => subscription.remove();
}
