/**
 * useSpeechRecognition.ts (src/hooks/useSpeechRecognition.ts)
 *
 * React hook for managing speech recognition state.
 * Wraps the native SpeechRecognizer module with React state management.
 */

import { AppState } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isAvailable,
  hasPermission,
  requestPermission,
  startListening as nativeStartListening,
  stopListening as nativeStopListening,
  cancelListening as nativeCancelListening,
  addSpeechPermissionListener,
  addSpeechResultListener,
  addSpeechErrorListener,
  addSpeechStartListener,
  addSpeechEndListener,
  type SpeechResult,
  type SpeechError,
} from '../../modules/speech-recognizer/src/index';

const TAG = '[VOICE-Hook]';
const PROCESSING_TIMEOUT_MS = 15000;

export type SpeechStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unavailable' | 'no_permission';

interface UseSpeechRecognitionReturn {
  status: SpeechStatus;
  transcript: string;
  partialTranscript: string;
  errorMessage: string | null;
  isSupported: boolean;
  isPermissionGranted: boolean;
  startListening: () => void;
  stopListening: () => void;
  cancel: () => void;
  reset: () => void;
  requestMicPermission: () => Promise<boolean>;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  const mountedRef = useRef(true);
  const statusRef = useRef<SpeechStatus>('idle');
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearProcessingTimeout = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  }, []);

  const syncStatus = useCallback((next: SpeechStatus) => {
    if (!mountedRef.current) return;
    statusRef.current = next;
    setStatus(next);
    if (__DEV__) {
      console.log(`${TAG} [LIFECYCLE] status changed → "${next}"`);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (__DEV__) {
      console.log(`${TAG} [LIFECYCLE] Component mounted`);
    }
    return () => {
      mountedRef.current = false;
      clearProcessingTimeout();
      if (__DEV__) {
        console.log(`${TAG} [LIFECYCLE] Component unmounted`);
      }
    };
  }, [clearProcessingTimeout]);

  const updateAvailabilityAndPermission = useCallback(() => {
    const available = isAvailable();
    const permitted = hasPermission();

    if (!mountedRef.current) return;

    setIsSupported(available);
    setIsPermissionGranted(permitted);

    if (!available) {
      syncStatus('unavailable');
      return;
    }

    if (!permitted) {
      syncStatus('no_permission');
      return;
    }

    if (statusRef.current === 'unavailable' || statusRef.current === 'no_permission' || statusRef.current === 'error') {
      syncStatus('idle');
    }
  }, [syncStatus]);

  useEffect(() => {
    updateAvailabilityAndPermission();
  }, [updateAvailabilityAndPermission]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        updateAvailabilityAndPermission();
      }
    });
    return () => sub.remove();
  }, [updateAvailabilityAndPermission]);

  useEffect(() => {
    if (__DEV__) {
      console.log(`${TAG} [VOICE] Setting up event listeners...`);
    }

    const unsubPermission = addSpeechPermissionListener(({ granted }) => {
      if (!mountedRef.current) return;
      setIsPermissionGranted(granted);
      if (granted) {
        setErrorMessage(null);
        setStatus((current) => current === 'no_permission' || current === 'error' ? 'idle' : current);
      }
    });

    const unsubResult = addSpeechResultListener((result: SpeechResult) => {
      if (!mountedRef.current) return;

      if (result.isPartial) {
        setPartialTranscript(result.text || '');
        if (statusRef.current === 'idle' || statusRef.current === 'processing') {
          syncStatus('listening');
        }
        return;
      }

      setTranscript(result.text || '');
      setPartialTranscript('');
      clearProcessingTimeout();
      syncStatus('processing');
      processingTimeoutRef.current = setTimeout(() => {
        setErrorMessage('Speech processing timed out. Please try again.');
        setStatus('error');
        setPartialTranscript('');
      }, PROCESSING_TIMEOUT_MS);
    });

    const unsubError = addSpeechErrorListener((error: SpeechError) => {
      if (!mountedRef.current) return;

      clearProcessingTimeout();
      setPartialTranscript('');

      let userMessage = error.message;
      if (error.code === 7 || error.code === 6) {
        userMessage = "Couldn't understand. Try again.";
      } else if (error.code === 8) {
        userMessage = 'Microphone permission is required for voice input.';
      }

      setErrorMessage(userMessage);
      setStatus('error');
    });

    const unsubStart = addSpeechStartListener(() => {
      if (!mountedRef.current) return;
      clearProcessingTimeout();
      setPartialTranscript('');
      setErrorMessage(null);
      syncStatus('listening');
    });

    const unsubEnd = addSpeechEndListener(() => {
      if (!mountedRef.current) return;
      if (statusRef.current === 'listening') {
        clearProcessingTimeout();
        setErrorMessage(null);
        syncStatus('processing');
        processingTimeoutRef.current = setTimeout(() => {
          setErrorMessage('Speech processing timed out. Please try again.');
          setStatus('error');
          setPartialTranscript('');
        }, PROCESSING_TIMEOUT_MS);
      }
    });

    return () => {
      if (__DEV__) {
        console.log(`${TAG} [VOICE] Cleaning up event listeners`);
      }
      unsubPermission();
      unsubResult();
      unsubError();
      unsubStart();
      unsubEnd();
      clearProcessingTimeout();
    };
  }, [clearProcessingTimeout, isSupported, syncStatus]);

  const startListening = useCallback(() => {
    if (statusRef.current === 'listening' || statusRef.current === 'processing') {
      return;
    }

    if (!isSupported) {
      setStatus('unavailable');
      setErrorMessage('Speech recognition is not available on this device.');
      return;
    }

    if (!hasPermission()) {
      setStatus('no_permission');
      setErrorMessage('Microphone permission is required for voice input.');
      return;
    }

    clearProcessingTimeout();
    setErrorMessage(null);
    setTranscript('');
    setPartialTranscript('');

    const result = nativeStartListening();
    if (result === 'no_permission') {
      setStatus('no_permission');
      setErrorMessage('Microphone permission is required for voice input.');
      return;
    }
    if (result === 'not_available') {
      setStatus('unavailable');
      setErrorMessage('Speech recognition is not available on this device.');
      return;
    }
    if (result === 'already_listening') {
      syncStatus('listening');
      return;
    }
    if (result === 'started') {
      syncStatus('listening');
      return;
    }
    if (result !== null) {
      setStatus('error');
      setErrorMessage('Failed to start speech recognition.');
    }
  }, [clearProcessingTimeout, isSupported, syncStatus]);

  const stopListening = useCallback(() => {
    clearProcessingTimeout();
    nativeStopListening();
    setPartialTranscript('');
    setStatus('idle');
  }, [clearProcessingTimeout]);

  const cancel = useCallback(() => {
    clearProcessingTimeout();
    nativeCancelListening();
    setStatus('idle');
    setTranscript('');
    setPartialTranscript('');
    setErrorMessage(null);
  }, [clearProcessingTimeout]);

  const reset = useCallback(() => {
    clearProcessingTimeout();
    setStatus(isSupported && isPermissionGranted ? 'idle' : isSupported ? 'no_permission' : 'unavailable');
    setTranscript('');
    setPartialTranscript('');
    setErrorMessage(null);
  }, [clearProcessingTimeout, isPermissionGranted, isSupported]);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (hasPermission()) {
      setIsPermissionGranted(true);
      setStatus('idle');
      setErrorMessage(null);
      return true;
    }

    const requestResult = requestPermission();
    if (requestResult) {
      setIsPermissionGranted(true);
      setStatus('idle');
      setErrorMessage(null);
      return true;
    }

    setIsPermissionGranted(false);
    return false;
  }, [isSupported]);

  return {
    status,
    transcript,
    partialTranscript,
    errorMessage,
    isSupported,
    isPermissionGranted,
    startListening,
    stopListening,
    cancel,
    reset,
    requestMicPermission,
  };
}
