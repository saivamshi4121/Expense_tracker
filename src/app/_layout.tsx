import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect } from 'react';
import { View } from 'react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { runMigrations } from '@/db/database';
import NotificationAccessDialog, { useNotificationOnboarding } from '@/components/NotificationAccessDialog';

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <AuthenticatedStack /> : <UnauthenticatedStack />;
}

function AuthenticatedStack() {
  const { visible, dismiss, allow } = useNotificationOnboarding();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F0F14' },
          animation: 'slide_from_bottom',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="add-expense"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="edit-expense"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="cash-wallet"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="daily-closing"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="digital-transactions"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="detected-payments"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="reconciliation"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="quick-cash"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
      <NotificationAccessDialog visible={visible} onAllow={allow} onNotNow={dismiss} />
    </>
  );
}

function UnauthenticatedStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F0F14' },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      {/**
       * SQLiteProvider opens the database and runs runMigrations (onInit)
       * BEFORE rendering any children. useSQLiteContext() in useExpenses.ts
       * then receives this guaranteed-ready db instance — no race conditions.
       *
       * useSuspense={true} holds rendering until the DB is ready.
       */}
      <SQLiteProvider
        databaseName="expense-tracker.db"
        onInit={runMigrations}
        useSuspense
      >
        <Suspense fallback={<View style={{ flex: 1, backgroundColor: '#0F0F14' }} />}>
          <AuthProvider>
            <AuthGuard />
          </AuthProvider>
        </Suspense>
      </SQLiteProvider>
    </>
  );
}