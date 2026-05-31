import '../global.css';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@/i18n';
import { useAuthStore } from '@/stores/auth.store';
import { usePreferencesStore } from '@/stores/preferences.store';
import { useBranchStore } from '@/stores/branch.store';
import { useEventFlowStore } from '@/stores/event-flow.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import { usePrinterStore } from '@/stores/printer.store';
import { useBibleStore } from '@/stores/bible.store';
import { ToastContainer } from '@/components/ui/Toast';
import { ForceUpdateModal } from '@/components/ForceUpdateModal';
import { MaintenanceModal } from '@/components/MaintenanceModal';
import { prefetchBranches } from '@/hooks/useBranches';
import { prefetchMaintenance, useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { prefetchAppVersion, useAppVersion } from '@/hooks/useAppVersion';
import { prefetchAppConfig, useAppConfig } from '@/hooks/useAppConfig';
import {
  initErrorReporting,
  setReportingUser,
} from '@/services/errorReporting';
import {
  retryBackoffDelay,
  shouldRetryMutation,
  shouldRetryQuery,
} from '@/lib/retryPolicy';
import { createQueryPersister, persistOptions } from '@/lib/queryPersistence';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// Smart retry policy: 4xx no retry (client bug), 5xx + network with exponential
// backoff + jitter. Lihat src/lib/retryPolicy.ts untuk classification rules.
//
// gcTime 25 jam — perlu lebih lama dari maxAge persist (24 jam) supaya React
// Query tidak garbage-collect query yang sedang di-persist. Otherwise pas
// restore, query yang baru di-write akan langsung di-evict.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 25 * 60 * 60 * 1000,
      retry: shouldRetryQuery,
      retryDelay: retryBackoffDelay,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: shouldRetryMutation,
      retryDelay: retryBackoffDelay,
    },
  },
});

// Persister singleton — survive cache to AsyncStorage. Lihat
// src/lib/queryPersistence.ts untuk exclusion logic + maxAge config.
const queryPersister = createQueryPersister();

// Initialize Sentry (no-op kalau EXPO_PUBLIC_SENTRY_DSN tidak set).
// Async tapi kita fire-and-forget — tidak block app boot.
void initErrorReporting();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [hydrated, setHydrated] = useState(false);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydratePrefs = usePreferencesStore((s) => s.hydrate);
  const hydrateBranch = useBranchStore((s) => s.hydrate);
  const hydrateEventFlow = useEventFlowStore((s) => s.hydrate);
  const hydrateNotifications = useNotificationsStore((s) => s.hydrate);
  const hydratePrinter = usePrinterStore((s) => s.hydrate);
  const hydrateBible = useBibleStore((s) => s.hydrate);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    Promise.all([
      hydrateAuth(),
      hydratePrefs(),
      hydrateBranch(),
      hydrateEventFlow(),
      hydrateNotifications(),
      hydratePrinter(),
      hydrateBible(),
    ]).then(() => setHydrated(true));
    // Splash pre-warm — parallel dengan hydration. Gate decisions
    // (maintenance, force-update) ready by time splash hides supaya tidak
    // ada flash app → modal pops jarring UX. All silent fail kalau gateway
    // down — hook setelah mount akan retry sendiri.
    prefetchBranches(queryClient);
    prefetchMaintenance(queryClient);
    prefetchAppVersion(queryClient);
    prefetchAppConfig(queryClient);
  }, [
    hydrateAuth,
    hydratePrefs,
    hydrateBranch,
    hydrateEventFlow,
    hydrateNotifications,
    hydratePrinter,
    hydrateBible,
  ]);

  useEffect(() => {
    if (loaded && hydrated) {
      SplashScreen.hideAsync();
    }
  }, [loaded, hydrated]);

  if (!loaded || !hydrated) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryPersister, ...persistOptions }}
      >
        {/* AppEffects: hooks yang butuh QueryClient context (mis. useAppConfig)
            harus di-render INSIDE PersistQueryClientProvider — jangan di RootLayout
            karena provider belum mounted saat hook ke-call. */}
        <AppEffects />
        {/* Default StatusBar — 'auto' adapt ke system color scheme (light mode = dark icons).
            Individual screens dengan orange header pakai <StatusBar style="light" />
            untuk override (icons putih supaya visible di atas orange). */}
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <MaintenanceGate>
          <ForceUpdateGate>
            <RootLayoutNav />
          </ForceUpdateGate>
        </MaintenanceGate>
        <ToastContainer />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * AppEffects — pure side-effect component, no render. Tempat untuk hooks yang
 * butuh QueryClient context (mis. useAppConfig). Tidak bisa di RootLayout
 * karena PersistQueryClientProvider mount di JSX return RootLayout itu
 * sendiri — hook akan crash "No QueryClient set".
 */
function AppEffects() {
  // Sync auth user → error reporting context. Subscribe ke store supaya
  // update saat login/logout/refresh tanpa wire di setiap login site.
  const authUser = useAuthStore((s) => s.user);
  useEffect(() => {
    setReportingUser(authUser ? { noHp: authUser.noHp } : null);
  }, [authUser]);

  // Pre-warm /public/app-config — meskipun field-nya (faceMatchThreshold,
  // lowConfidenceWarnThreshold) sudah dormant pasca face login removal,
  // endpoint masih dipakai untuk telemetrySamplingRate + errorReportingEnabled
  // (general telemetry config). Hook call cukup untuk trigger cache prime.
  useAppConfig();

  return null;
}

/**
 * MaintenanceGate — wrapper yang poll /public/maintenance.
 * Kalau isEnabled=true → full-screen blocking modal (no dismiss).
 * Kalau false/error/loading → render children normal app.
 *
 * Sengaja tidak blocking saat loading/error supaya app tidak stuck — kalau
 * gateway down, user lihat normal app UI (yang akan tampil network error
 * di per-query level). Hanya BLOCK kalau BE explicitly say maintenance ON.
 */
function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { data, refetch } = useMaintenanceMode();
  if (data?.isEnabled) {
    return <MaintenanceModal data={data} onRetry={refetch} />;
  }
  return <>{children}</>;
}

/**
 * ForceUpdateGate — block app kalau current version < minSupportedVersion.
 * BE return `forceUpdate: true` di `/public/app-version` kalau admin set
 * minVersion lebih tinggi dari current build.
 *
 * Tidak blocking saat loading/error (sama prinsip dengan MaintenanceGate) —
 * supaya app tidak stuck kalau network issue. Hanya BLOCK kalau BE explicit
 * forceUpdate=true.
 *
 * Data sudah pre-warmed di splash via prefetchAppVersion — kalau jaringan
 * sehat, decision instant available saat splash hide. Kalau jaringan flaky,
 * hook akan retry sendiri.
 */
function ForceUpdateGate({ children }: { children: React.ReactNode }) {
  const { data } = useAppVersion();
  if (data?.forceUpdate) {
    return <ForceUpdateModal data={data} />;
  }
  return <>{children}</>;
}

function RootLayoutNav() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const jemaatId = useAuthStore((s) => s.user?.jemaatId);
  const segments = useSegments();
  const router = useRouter();
  const rehydrateEventFlow = useEventFlowStore((s) => s.hydrate);

  // Auth-aware redirect logic.
  // Public routes yang allowed tanpa auth (T&C, Privacy linked dari welcome
  // screen) di-whitelist di sini supaya tidak kena redirect loop ke welcome.
  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inPublicLegal = segments[0] === 'legal';
    const publicAllowed = inAuthGroup || inPublicLegal;

    if (!isAuthenticated && !publicAllowed) {
      // Not authed, not on auth/legal screen → redirect ke welcome
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      // Authed but on auth screen → redirect ke tabs
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, router]);

  // Re-hydrate event-flow + notifications stores saat jemaatId berubah
  // (login/logout/switch user) supaya data milik user yang benar di-load
  const rehydrateNotifications = useNotificationsStore((s) => s.hydrate);
  useEffect(() => {
    rehydrateEventFlow();
    rehydrateNotifications();
  }, [jemaatId, rehydrateEventFlow, rehydrateNotifications]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
