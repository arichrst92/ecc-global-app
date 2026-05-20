import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { logout as apiLogout } from '@/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { useBranchStore } from '@/stores/branch.store';
import { useToast } from '@/components/ui/Toast';

/**
 * Logout flow lengkap dan robust:
 * 1. Best-effort POST /auth/logout (invalidate refresh token di server)
 * 2. Clear seluruh React Query cache (cegah stale data persists)
 * 3. Clear local auth store + secure storage (token, user)
 * 4. Explicit router.replace ke (auth)/welcome (jangan andalkan useEffect)
 * 5. Toast feedback
 *
 * Pakai useMutation supaya bisa track loading state untuk UI button.
 */
export function useLogout() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearAuth = useAuthStore((s) => s.logout);
  const resetBranch = useBranchStore((s) => s.resetToHome);
  const showToast = useToast((s) => s.show);

  return useMutation({
    mutationFn: async () => {
      // 1) Best-effort server logout (idempotent — server tolerant terhadap refresh
      //    token yang sudah expired / tidak match)
      if (refreshToken) {
        try {
          await apiLogout({ refreshToken });
        } catch {
          // Network down, server 5xx, dll — tetap lanjut clear local
        }
      }

      // 2) Clear seluruh React Query cache untuk prevent stale data
      queryClient.clear();

      // 3) Reset branch viewing context (kalau user re-login dengan akun beda,
      //    jangan inherit viewing branch dari user lama)
      await resetBranch();

      // 4) Clear local auth state + persistent secure storage
      await clearAuth();
    },
    onSettled: () => {
      // 4) Explicit redirect (jangan andalkan useEffect di RootLayoutNav saja —
      //    di web Expo Router kadang slow detect state change)
      router.replace('/(auth)/welcome');
    },
    onSuccess: () => {
      // 5) Feedback toast (muncul di welcome screen)
      showToast(t('auth.logout_success'), 'success');
    },
  });
}
