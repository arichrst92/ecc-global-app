import '../global.css';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { FaceDescriptorProvider } from '@/components/face/FaceDescriptorProvider';
import { MaintenanceModal } from '@/components/MaintenanceModal';
import { prefetchBranches } from '@/hooks/useBranches';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import {
  initErrorReporting,
  setReportingUser,
} from '@/services/errorReporting';
import {
  retryBackoffDelay,
  shouldRetryMutation,
  shouldRetryQuery,
} from '@/lib/retryPolicy';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// Smart retry policy: 4xx no retry (client bug), 5xx + network with exponential
// backoff + jitter. Lihat src/lib/retryPolicy.ts untuk classification rules.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
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
    // Prefetch cabang list di background — tidak block hydration
    prefetchBranches(queryClient);
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

  // Sync auth user → Sentry context. Subscribe ke store supaya update saat
  // login/logout/refresh tanpa perlu wire di setiap login site.
  const authUser = useAuthStore((s) => s.user);
  useEffect(() => {
    setReportingUser(authUser ? { noHp: authUser.noHp } : null);
  }, [authUser]);

  if (!loaded || !hydrated) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <FaceDescriptorProvider>
          {/* Default StatusBar — 'auto' adapt ke system color scheme (light mode = dark icons).
              Individual screens dengan orange header pakai <StatusBar style="light" />
              untuk override (icons putih supaya visible di atas orange). */}
          <StatusBar style="dark" translucent backgroundColor="transparent" />
          <MaintenanceGate>
            <RootLayoutNav />
          </MaintenanceGate>
          <ToastContainer />
        </FaceDescriptorProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
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

function RootLayoutNav() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const jemaatId = useAuthStore((s) => s.user?.jemaatId);
  const segments = useSegments();
  const router = useRouter();
  const rehydrateEventFlow = useEventFlowStore((s) => s.hydrate);

  // Auth-aware redirect logic
  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Not authed, not on auth screen → redirect ke welcome
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
