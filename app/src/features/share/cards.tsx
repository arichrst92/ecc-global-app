/**
 * Kartu share persegi (diekspor 1080×1080) — satu bingkai untuk semua titik
 * share: ikon Els App di kiri atas, isi di tengah, ajakan di kiri bawah,
 * "Powered by IDEA" kecil di kanan bawah.
 *
 * Semua ukuran ditulis untuk kartu 360pt lalu dikali `k` (= size/360), jadi
 * kartu bisa ditampilkan lebih kecil di layar sempit tanpa mengubah tata letak.
 * Warna SOLID (tanpa gradient native) supaya aman di semua platform.
 */
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { Calendar, Church, Clock, Flame, BookOpen, MapPin, Play, Ticket } from 'lucide-react-native';

export type ShareTheme = 'orange' | 'dark' | 'worship';

const APP_ICON = require('../../../assets/images/ecc-icon-ios.png');
const IDEA_LOGO = require('../../../assets/images/logo-idea.webp');

const BG: Record<ShareTheme, string> = { orange: '#EA580C', dark: '#1C1C1E', worship: '#3B1609' };

/** Ukuran kartu (pt) + jumlah gambar jarak-jauh yang masih dimuat. */
export const CardCtx = createContext<{ size: number; onImgStart: () => void; onImgEnd: () => void }>({
  size: 360,
  onImgStart: () => {},
  onImgEnd: () => {},
});
const useK = () => useContext(CardCtx).size / 360;

/** Gambar jarak-jauh — melapor ke modal supaya tombol share baru aktif setelah termuat. */
function NetImage({ uri, style }: { uri: string; style: object }) {
  const ctx = useContext(CardCtx);
  const done = useRef(false);
  useEffect(() => {
    done.current = false;
    ctx.onImgStart();
    const t = setTimeout(() => finish(), 8000); // jangan menahan tombol selamanya
    return () => {
      clearTimeout(t);
      finish();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);
  function finish() {
    if (done.current) return;
    done.current = true;
    ctx.onImgEnd();
  }
  return <Image source={{ uri }} style={style} resizeMode="cover" onLoadEnd={finish} />;
}

function Frame({ theme, label, cta, children }: { theme: ShareTheme; label: string; cta?: string; children: ReactNode }) {
  const k = useK();
  const size = 360 * k;
  return (
    <View style={{ width: size, height: size, backgroundColor: BG[theme], overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -90 * k, top: -110 * k, width: 260 * k, height: 260 * k, borderRadius: 130 * k, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      <View style={{ position: 'absolute', left: -70 * k, bottom: -90 * k, width: 200 * k, height: 200 * k, borderRadius: 100 * k, backgroundColor: 'rgba(0,0,0,0.10)' }} />
      <View style={{ position: 'absolute', left: 20 * k, top: 18 * k, flexDirection: 'row', alignItems: 'center' }}>
        <Image source={APP_ICON} style={{ width: 26 * k, height: 26 * k, borderRadius: 6 * k }} />
        <View style={{ marginLeft: 7 * k }}>
          <Text style={{ color: '#fff', fontSize: 11 * k, fontWeight: '700' }}>Els App</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 7.5 * k, fontWeight: '500' }}>{label}</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', left: 20 * k, right: 20 * k, top: 56 * k, bottom: 40 * k }}>{children}</View>
      {cta ? (
        <Text style={{ position: 'absolute', left: 20 * k, bottom: 16 * k, color: 'rgba(255,255,255,0.9)', fontSize: 8 * k, fontWeight: '600' }}>
          {cta}
        </Text>
      ) : null}
      <View
        style={{
          position: 'absolute',
          right: 20 * k,
          bottom: 13 * k,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 10 * k,
          paddingHorizontal: 6 * k,
          height: 13 * k,
        }}
      >
        <Text style={{ color: '#737373', fontSize: 5 * k, marginRight: 3 * k }}>Powered by</Text>
        <Image source={IDEA_LOGO} style={{ width: 20 * k, height: (20 * 43) / 128 * k }} resizeMode="contain" />
      </View>
    </View>
  );
}

const Placeholder = ({ theme, style }: { theme: ShareTheme; style: object }) => (
  <View style={[style, { backgroundColor: theme === 'dark' ? '#2A2A2D' : 'rgba(255,255,255,0.18)' }]} />
);

// ------------------------------------------------------------------ ayat

export function VerseShareCard({ theme, text, reference, label, cta }: { theme: ShareTheme; text: string; reference: string; label: string; cta: string }) {
  const k = useK();
  const long = text.length > 160;
  return (
    <Frame theme={theme} label={label} cta={cta}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 64 * k, fontWeight: '700', lineHeight: 64 * k, marginBottom: -18 * k }}>“</Text>
        <Text
          style={{ color: '#fff', fontSize: (long ? 14 : 18) * k, fontWeight: '700', lineHeight: (long ? 20 : 25) * k }}
          numberOfLines={long ? 10 : 7}
          adjustsFontSizeToFit
        >
          {text}
        </Text>
        <View style={{ width: 26 * k, height: 2 * k, borderRadius: 1, backgroundColor: '#FDBA74', marginTop: 12 * k }} />
        <Text style={{ color: '#fff', fontSize: 11 * k, fontWeight: '700', marginTop: 8 * k }}>{reference}</Text>
      </View>
    </Frame>
  );
}

// ------------------------------------------------------------------ renungan / berita

export function ArticleShareCard({
  theme,
  label,
  cta,
  imageUrl,
  badge,
  title,
  excerpt,
}: {
  theme: ShareTheme;
  label: string;
  cta: string;
  imageUrl?: string | null;
  badge?: string | null;
  title: string;
  excerpt?: string | null;
}) {
  const k = useK();
  const imgStyle = { width: '100%', height: 128 * k, borderRadius: 10 * k };
  return (
    <Frame theme={theme} label={label} cta={cta}>
      {imageUrl ? <NetImage uri={imageUrl} style={imgStyle} /> : <Placeholder theme={theme} style={imgStyle} />}
      {badge ? (
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 8 * k, paddingHorizontal: 6 * k, paddingVertical: 2 * k, marginTop: 9 * k }}>
          <Text style={{ color: '#C2410C', fontSize: 7 * k, fontWeight: '700' }}>{badge}</Text>
        </View>
      ) : null}
      <Text style={{ color: '#fff', fontSize: 16 * k, fontWeight: '700', lineHeight: 20 * k, marginTop: 7 * k }} numberOfLines={3}>
        {title}
      </Text>
      {excerpt ? (
        <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 8.5 * k, lineHeight: 12 * k, marginTop: 5 * k }} numberOfLines={3}>
          {excerpt}
        </Text>
      ) : null}
    </Frame>
  );
}

// ------------------------------------------------------------------ event

export function EventShareCard({
  theme,
  label,
  imageUrl,
  title,
  date,
  time,
  location,
  cabang,
  cta,
}: {
  theme: ShareTheme;
  label: string;
  imageUrl?: string | null;
  title: string;
  date: string;
  time?: string | null;
  location?: string | null;
  cabang?: string | null;
  cta: string;
}) {
  const k = useK();
  const w = 200 * k;
  const imgStyle = { width: w, height: (w * 2) / 3, borderRadius: 10 * k };
  const rows = [
    [Calendar, date],
    [Clock, time],
    [MapPin, location],
    [Church, cabang],
  ].filter((r) => !!r[1]) as [typeof Calendar, string][];
  return (
    <Frame theme={theme} label={label}>
      <View style={{ flexDirection: 'row' }}>
        {imageUrl ? <NetImage uri={imageUrl} style={imgStyle} /> : <Placeholder theme={theme} style={imgStyle} />}
        <View style={{ flex: 1, marginLeft: 12 * k, gap: 7 * k }}>
          {rows.map(([Icon, txt], i) => (
            <View key={i}>
              <Icon size={10 * k} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 8 * k, fontWeight: '600', marginTop: 2 * k }} numberOfLines={2}>
                {txt}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={{ color: '#fff', fontSize: 17 * k, fontWeight: '700', lineHeight: 21 * k, marginTop: 12 * k }} numberOfLines={2}>
        {title}
      </Text>
      <View
        style={{
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#fff',
          borderRadius: 14 * k,
          paddingHorizontal: 12 * k,
          height: 26 * k,
          marginTop: 10 * k,
        }}
      >
        <Ticket size={11 * k} color="#EA580C" />
        <Text style={{ color: '#C2410C', fontSize: 9 * k, fontWeight: '700', marginLeft: 5 * k }}>{cta}</Text>
      </View>
    </Frame>
  );
}

// ------------------------------------------------------------------ worship

export function SongShareCard({
  label,
  coverUrl,
  title,
  subtitle,
  tracks,
  cta,
}: {
  label: string;
  coverUrl?: string | null;
  title: string;
  subtitle: string;
  /** Album: daftar lagu (maks 4 tampil). Lagu: kosongkan. */
  tracks?: string[];
  cta: string;
}) {
  const k = useK();
  const c = 158 * k;
  const coverStyle = { width: c, height: c, borderRadius: 12 * k };
  return (
    <Frame theme="worship" label={label} cta={tracks ? cta : undefined}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {coverUrl ? <NetImage uri={coverUrl} style={coverStyle} /> : <Placeholder theme="orange" style={coverStyle} />}
        <View style={{ flex: 1, marginLeft: 14 * k }}>
          <Text style={{ color: '#fff', fontSize: 16 * k, fontWeight: '700', lineHeight: 20 * k }} numberOfLines={3}>
            {title}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 8.5 * k, marginTop: 4 * k }} numberOfLines={2}>
            {subtitle}
          </Text>
          {tracks ? (
            <View style={{ marginTop: 10 * k, gap: 4 * k }}>
              {tracks.slice(0, 4).map((tr, i) => (
                <Text key={i} style={{ color: '#fff', opacity: 0.95 - i * 0.18, fontSize: 8.5 * k, fontWeight: '500' }} numberOfLines={1}>
                  {i + 1}  {tr}
                </Text>
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 * k }}>
              <View style={{ width: 30 * k, height: 30 * k, borderRadius: 15 * k, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={13 * k} color="#C2410C" fill="#C2410C" />
              </View>
              <Text style={{ color: '#fff', fontSize: 8.5 * k, fontWeight: '600', marginLeft: 7 * k }}>{cta}</Text>
            </View>
          )}
        </View>
      </View>
    </Frame>
  );
}

// ------------------------------------------------------------------ bagikan app

export function AppShareCard({ url, caption, stores }: { url: string; caption: string; stores: string }) {
  const k = useK();
  const size = 360 * k;
  return (
    <View style={{ width: size, height: size, backgroundColor: BG.orange, overflow: 'hidden', alignItems: 'center' }}>
      <View style={{ position: 'absolute', right: -90 * k, top: -110 * k, width: 260 * k, height: 260 * k, borderRadius: 130 * k, backgroundColor: 'rgba(255,255,255,0.07)' }} />
      <Image source={APP_ICON} style={{ width: 72 * k, height: 72 * k, borderRadius: 17 * k, marginTop: 36 * k }} />
      <Text style={{ color: '#fff', fontSize: 26 * k, fontWeight: '700', marginTop: 8 * k }}>Els App</Text>
      <View style={{ backgroundColor: '#fff', borderRadius: 10 * k, padding: 9 * k, marginTop: 14 * k }}>
        <QRCode value={url} size={92 * k} backgroundColor="#FFFFFF" color="#171717" />
      </View>
      <Text style={{ color: '#fff', fontSize: 10 * k, fontWeight: '600', marginTop: 9 * k }}>{caption}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 8 * k, marginTop: 2 * k }}>{stores}</Text>
      <View
        style={{
          position: 'absolute',
          right: 20 * k,
          bottom: 13 * k,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 10 * k,
          paddingHorizontal: 6 * k,
          height: 13 * k,
        }}
      >
        <Text style={{ color: '#737373', fontSize: 5 * k, marginRight: 3 * k }}>Powered by</Text>
        <Image source={IDEA_LOGO} style={{ width: 20 * k, height: (20 * 43) / 128 * k }} resizeMode="contain" />
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ bible 365

export function Bible365ShareCard({
  theme,
  percent,
  day,
  streak,
  chapters,
  name,
}: {
  theme: ShareTheme;
  percent: number;
  day: number;
  streak: number;
  chapters: number;
  name: string;
}) {
  const k = useK();
  const r = 56 * k;
  const sw = 12 * k;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <Frame theme={theme} label="Bible 365">
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: (r + sw) * 2, height: (r + sw) * 2, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={(r + sw) * 2} height={(r + sw) * 2} style={{ position: 'absolute' }}>
            <Circle cx={r + sw} cy={r + sw} r={r} stroke={theme === 'dark' ? '#3A3A3D' : '#FDBA74'} strokeWidth={sw} fill="none" />
            <Circle
              cx={r + sw}
              cy={r + sw}
              r={r}
              stroke={theme === 'dark' ? '#F97316' : '#FFFFFF'}
              strokeWidth={sw}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(circ * pct) / 100} ${circ}`}
              transform={`rotate(-90 ${r + sw} ${r + sw})`}
            />
          </Svg>
          <Text style={{ color: '#fff', fontSize: 28 * k, fontWeight: '700' }}>{Math.round(pct)}%</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 18 * k }}>
          <Text style={{ color: '#fff', fontSize: 24 * k, fontWeight: '700' }}>Hari {day}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11 * k, fontWeight: '500' }}>dari 365</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 * k }}>
            <Flame size={11 * k} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 9 * k, fontWeight: '600', marginLeft: 5 * k }}>{streak} hari beruntun</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 * k }}>
            <BookOpen size={11 * k} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 9 * k, fontWeight: '600', marginLeft: 5 * k }}>{chapters} / 1.189 pasal</Text>
          </View>
          {name ? (
            <Text style={{ color: '#fff', fontSize: 9 * k, fontWeight: '700', marginTop: 12 * k }} numberOfLines={1}>
              {name}
            </Text>
          ) : null}
        </View>
      </View>
    </Frame>
  );
}

