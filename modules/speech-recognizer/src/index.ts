/**
 * index.ts  (modules/speech-recognizer/src/index.ts)
 *
 * TypeScript bridge to the native SpeechRecognizerModule.
 * Uses safe optional module loading so that running in Expo Go or web
 * fails gracefully without crashing the JS bundle.
 */

import { NativeModule, requireNativeModule } from 'expo';
import { DeviceEventEmitter, EmitterSubscription, Platform } from 'react-native';

const TAG = '[SR-Bridge]';
const debugLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(TAG, ...args);
  }
};
const debugError = (...args: unknown[]) => {
  if (__DEV__) {
    console.error(TAG, ...args);
  }
};

export interface SpeechResult {
  text: string;
  allMatches?: string[];
  isPartial?: boolean;
  locale?: string;
}

export interface SpeechError {
  code: number;
  message: string;
}

export interface SpeechPermissionStatus {
  granted: boolean;
}

interface SpeechRecognizerNativeModule extends NativeModule {
  isAvailable(): boolean;
  hasPermission(): boolean;
  requestPermission(): boolean;
  startListening(): string | null;
  stopListening(): boolean;
  cancel(): boolean;
}

let NativeSpeechRecognizer: SpeechRecognizerNativeModule | null = null;
let _loadAttempted = false;

function loadNativeModule(): SpeechRecognizerNativeModule | null {
  if (NativeSpeechRecognizer) return NativeSpeechRecognizer;
  if (Platform.OS !== 'android') {
    debugLog('[VOICE] Skipping native module load — platform=', Platform.OS);
    return null;
  }
  if (_loadAttempted) {
    debugLog('[VOICE] Module load already attempted, returning cached result:', NativeSpeechRecognizer != null);
    return NativeSpeechRecognizer;
  }
  _loadAttempted = true;
  try {
    NativeSpeechRecognizer = requireNativeModule<SpeechRecognizerNativeModule>('SpeechRecognizer');
    debugLog('[VOICE] Speech recognition module loaded successfully');
  } catch (e) {
    NativeSpeechRecognizer = null;
    debugError('[VOICE-ERROR] Failed to load native module:', e);
  }
  return NativeSpeechRecognizer;
}

if (__DEV__) {
  debugLog('[VOICE] Module file loaded, attempting native module load...');
}
loadNativeModule();

export function isAvailable(): boolean {
  const mod = loadNativeModule();
  if (!mod) {
    debugLog('[VOICE] isAvailable: module=null → false');
    return false;
  }
  try {
    const result = mod.isAvailable();
    debugLog('[VOICE] isAvailable:', result);
    return result;
  } catch (e) {
    debugError('[VOICE-ERROR] isAvailable threw:', e);
    return false;
  }
}

export function hasPermission(): boolean {
  const mod = loadNativeModule();
  if (!mod) {
    debugLog('[VOICE] hasPermission: module=null → false');
    return false;
  }
  try {
    const result = mod.hasPermission();
    debugLog('[VOICE] hasPermission:', result);
    return result;
  } catch (e) {
    debugError('[VOICE-ERROR] hasPermission threw:', e);
    return false;
  }
}

export function requestPermission(): boolean {
  const mod = loadNativeModule();
  if (!mod) {
    debugLog('[VOICE] requestPermission: module=null → false');
    return false;
  }
  try {
    const result = mod.requestPermission();
    debugLog('[VOICE] requestPermission result:', result);
    return result;
  } catch (e) {
    debugError('[VOICE-ERROR] requestPermission threw:', e);
    return false;
  }
}

export function startListening(): string | null {
  const mod = loadNativeModule();
  if (!mod) {
    debugError('[VOICE-ERROR] startListening: module is null — cannot start');
    return null;
  }
  try {
    debugLog('[VOICE] startListening: calling native startListening()...');
    const result = mod.startListening();
    debugLog('[VOICE] startListening native returned:', result);
    return result;
  } catch (e) {
    debugError('[VOICE-ERROR] startListening threw:', e);
    return null;
  }
}

export function stopListening(): boolean {
  const mod = loadNativeModule();
  if (!mod) {
    debugError('[VOICE-ERROR] stopListening: module is null');
    return false;
  }
  try {
    const result = mod.stopListening();
    debugLog('[VOICE] stopListening:', result);
    return result;
  } catch (e) {
    debugError('[VOICE-ERROR] stopListening threw:', e);
    return false;
  }
}

export function cancelListening(): boolean {
  const mod = loadNativeModule();
  if (!mod) {
    debugError('[VOICE-ERROR] cancelListening: module is null');
    return false;
  }
  try {
    const result = mod.cancel();
    debugLog('[VOICE] cancelListening:', result);
    return result;
  } catch (e) {
    debugError('[VOICE-ERROR] cancelListening threw:', e);
    return false;
  }
}

export function addSpeechPermissionListener(
  callback: (payload: SpeechPermissionStatus) => void
): () => void {
  debugLog('[VOICE] Registering onSpeechPermissionResult listener');
  const subscription: EmitterSubscription = DeviceEventEmitter.addListener(
    'onSpeechPermissionResult',
    (payload: SpeechPermissionStatus) => {
      try {
        callback({ granted: Boolean(payload?.granted) });
      } catch (e) {
        debugError('[VOICE-ERROR] Permission callback error:', e);
      }
    }
  );
  return () => {
    debugLog('[VOICE] Removing onSpeechPermissionResult listener');
    subscription.remove();
  };
}

export function addSpeechResultListener(
  callback: (result: SpeechResult) => void
): () => void {
  debugLog('[VOICE] Registering onSpeechResult listener');
  const subscription: EmitterSubscription = DeviceEventEmitter.addListener(
    'onSpeechResult',
    (payload: SpeechResult) => {
      try {
        callback(payload);
      } catch (e) {
        debugError('[VOICE-ERROR] Result callback error:', e);
      }
    }
  );
  return () => {
    debugLog('[VOICE] Removing onSpeechResult listener');
    subscription.remove();
  };
}

export function addSpeechErrorListener(
  callback: (error: SpeechError) => void
): () => void {
  debugLog('[VOICE] Registering onSpeechError listener');
  const subscription: EmitterSubscription = DeviceEventEmitter.addListener(
    'onSpeechError',
    (payload: SpeechError) => {
      debugError('[VOICE-ERROR] speech error code:', payload?.code, payload?.message);
      try {
        callback(payload);
      } catch (e) {
        debugError('[VOICE-ERROR] Error callback error:', e);
      }
    }
  );
  return () => {
    debugLog('[VOICE] Removing onSpeechError listener');
    subscription.remove();
  };
}

export function addSpeechStartListener(
  callback: (data?: any) => void
): () => void {
  debugLog('[VOICE] Registering onSpeechStart listener');
  const subscription: EmitterSubscription = DeviceEventEmitter.addListener(
    'onSpeechStart',
    (payload: any) => {
      debugLog('[VOICE] onSpeechStart received');
      try {
        callback(payload);
      } catch (e) {
        debugError('[VOICE-ERROR] Start callback error:', e);
      }
    }
  );
  return () => {
    debugLog('[VOICE] Removing onSpeechStart listener');
    subscription.remove();
  };
}

export function addSpeechEndListener(
  callback: () => void
): () => void {
  debugLog('[VOICE] Registering onSpeechEnd listener');
  const subscription: EmitterSubscription = DeviceEventEmitter.addListener(
    'onSpeechEnd',
    () => {
      debugLog('[VOICE] onSpeechEnd received');
      try {
        callback();
      } catch (e) {
        debugError('[VOICE-ERROR] End callback error:', e);
      }
    }
  );
  return () => {
    debugLog('[VOICE] Removing onSpeechEnd listener');
    subscription.remove();
  };
}
