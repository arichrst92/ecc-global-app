/** Halaman induk untuk tombol kembali (murni, tanpa React Native). Lihat nav.ts. */

/** Pola rute yang ada di app/ (tanpa group & index). Perbarui bila menambah layar induk. */
const ROUTES = [
  '/', '/area', '/bible', '/bible/[bookId]', '/bible/bookmarks', '/branch-list', '/calendar', '/ckids',
  '/content', '/content/bookmarks', '/event', '/event/[id]', '/family', '/family/[id]', '/family/add',
  '/feedback', '/feedback/[id]', '/group', '/group/[id]', '/homecell', '/homecell/[id]', '/homecell/requests',
  '/ibadah', '/ibadah/[id]', '/market', '/market/[id]', '/ministry', '/ministry/[id]', '/my-reservasi', '/reservasi',
  '/notifications', '/profile', '/profile/businesses', '/profile/my-groups', '/scanner', '/visit',
  '/visit/[id]', '/spiritual-journey', '/doa', '/doa/[id]', '/resolusi', '/worship', '/worship/album/[id]',
];

/** Induk yang bukan rute sendiri → arahkan ke layar yang masuk akal. */
const ALIAS: Record<string, string> = {
  '/settings': '/profile',
  '/legal': '/profile',
  '/news': '/content',
  '/renungan': '/content',
  '/jemaat': '/',
  // Folder statis yang bukan layar (jangan sampai cocok ke pola [id]).
  '/homecell/view': '/homecell',
  '/scanner/event': '/scanner',
  '/scanner/ibadah': '/scanner',
  '/content/news': '/content',
  '/content/renungan': '/content',
  '/homecell/[id]/schedule': '',
  '/doa/assigned': '/doa?tab=assigned',
  '/worship/album': '/worship',
  '/worship/song': '/worship',
};

const matches = (pattern: string, segs: string[]) => {
  const p = pattern.split('/').filter(Boolean);
  return p.length === segs.length && p.every((x, i) => x.startsWith('[') || x === segs[i]);
};

/** Halaman induk terdekat yang benar-benar ada untuk `pathname`. */
export function parentRoute(pathname: string): string {
  const segs = pathname.split('?')[0]!.split('/').filter(Boolean);
  while (segs.length > 0) {
    segs.pop();
    const path = '/' + segs.join('/');
    if (ALIAS[path]) return ALIAS[path]!;
    // Alias berpola (mis. /homecell/[id]/schedule → lanjut naik satu level).
    const aliasPattern = Object.keys(ALIAS).find((k) => k.includes('[') && matches(k, segs));
    if (aliasPattern !== undefined) continue;
    if (segs.length === 0 || ROUTES.some((r) => matches(r, segs))) return segs.length ? path : '/';
  }
  return '/';
}
