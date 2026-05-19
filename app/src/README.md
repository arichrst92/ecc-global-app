# `src/` — Application code

Semua source code app (selain Expo Router `app/`) ada di sini. Import via `@/...` alias (configured di tsconfig).

## Structure

```
src/
├── api/           # API client, endpoints, error handling
│   └── client.ts  # fetch wrapper with auth refresh interceptor
│
├── auth/          # Auth helpers (login flow logic — di luar UI)
│
├── components/    # Reusable UI components (Button, Card, Avatar, etc)
│
├── config/        # App config — env, feature flags
│   └── env.ts
│
├── constants/     # Static constants
│   └── colors.ts  # Brand palette (mirror tailwind.config.js)
│
├── hooks/         # Custom React hooks (useAuth, useScanner, etc)
│
├── i18n/          # Localization
│   ├── index.ts   # i18next init, exports `setLanguage`, `getCurrentLanguage`
│   └── locales/
│       ├── id.json
│       └── en.json
│
├── services/      # Business logic services (e.g., ScannerQueue, PrinterService)
│
├── stores/        # Zustand stores (global state)
│   ├── auth.store.ts          # accessToken, refreshToken, user, isAuthenticated
│   └── preferences.store.ts   # language, darkMode, notif prefs
│
├── types/         # TypeScript types
│   └── api.ts     # ApiResponse, ApiError, Jemaat, User, AuthTokens
│
└── utils/         # Pure utilities
    └── phone.ts   # E.164 normalize, display format
```

## Conventions

- **One concern per file**. Don't mix UI + API + store in one file.
- **Path aliases**: Use `@/api/client`, `@/stores/auth.store`, etc — not relative `../../../`.
- **Types**: prefer `type` over `interface` (unless extending).
- **Async**: prefer `async/await` over `.then` chains.
- **Stores**: use Zustand actions for state mutations, never `set()` directly from components.

## Adding a new API endpoint

```ts
// src/api/jemaat.ts
import { api } from './client';
import type { Jemaat } from '@/types/api';

export async function getJemaatByKode(kode: string): Promise<Jemaat> {
  return api.get<Jemaat>(`/admin/jemaat/by-kode/${kode}`);
}
```

Then use in a React Query hook:

```ts
// src/hooks/useJemaat.ts
import { useQuery } from '@tanstack/react-query';
import { getJemaatByKode } from '@/api/jemaat';

export function useJemaatByKode(kode: string) {
  return useQuery({
    queryKey: ['jemaat', 'by-kode', kode],
    queryFn: () => getJemaatByKode(kode),
    enabled: !!kode,
  });
}
```
