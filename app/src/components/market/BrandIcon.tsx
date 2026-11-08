/**
 * Tombol ikon sosial media / marketplace (2.4.7). Lingkaran = sosial media,
 * kotak membulat = toko/marketplace. Data glyph di ./brandIcons.ts.
 */
import { Linking, Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { BrandGlyph } from './brandIcons';

export function BrandIcon({ glyph, size = 38, shape = 'circle' }: { glyph: BrandGlyph; size?: number; shape?: 'circle' | 'square' }) {
  const inner = Math.round(size * (glyph.mode === 'stroke' ? 0.62 : 0.5));
  const sw = glyph.mode === 'stroke' ? 3 : 0;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'circle' ? size / 2 : size * 0.28,
        backgroundColor: glyph.color,
        alignItems: 'center',
        justifyContent: 'center',
        // Latar hitam (TikTok, X, Threads) tetap terlihat di mode gelap.
        borderWidth: glyph.color === '#000000' ? 1 : 0,
        borderColor: 'rgba(255,255,255,0.18)',
      }}
    >
      <Svg width={inner} height={inner} viewBox={`0 0 ${glyph.viewBox} ${glyph.viewBox}`}>
        {glyph.paths.map((d, i) =>
          glyph.mode === 'fill' ? (
            <Path key={i} d={d} fill="#fff" />
          ) : (
            <Path key={i} d={d} fill="none" stroke="#fff" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          ),
        )}
        {(glyph.circles ?? []).map((c, i) => (
          <Circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="none" stroke="#fff" strokeWidth={sw} />
        ))}
      </Svg>
    </View>
  );
}

export function BrandIconLink({
  glyph,
  url,
  label,
  size,
  shape,
}: {
  glyph: BrandGlyph;
  url: string;
  label: string;
  size?: number;
  shape?: 'circle' | 'square';
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={4}
      className="active:opacity-70"
    >
      <BrandIcon glyph={glyph} size={size} shape={shape} />
    </Pressable>
  );
}
