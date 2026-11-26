/**
 * Splash beranimasi (2.5.1) — tampil SEKALI per buka app (cold start), di atas
 * seluruh UI, setelah splash bawaan sistem disembunyikan.
 *
 * Urutan (±4 dtk, sesuai docs/design/motion-splash-els-app.html):
 *  0,00–0,85  lingkaran oranye tergambar searah jarum jam
 *  0,85–1,40  lingkaran berputar, membesar & memudar
 *  0,95–1,75  logo Els App "ditulis" (tirai putih bergeser ke kanan) + denyut kecil
 *  2,10–2,55  garis tipis + "BY"
 *  2,25–2,80  logo ECC Church + EL SHADDAI CREATIVE COMMUNITY (selebar logo)
 *  2,70–3,55  titik memuat + "Powered by" logo IDEA
 *  3,55–4,05  semua membesar sedikit & memudar → app
 *
 * Pengaman supaya tidak macet / crash:
 *  - batas waktu keras (MAX_MS): apa pun yang terjadi, splash ditutup;
 *  - ketuk di mana saja → langsung lewati;
 *  - "Kurangi gerakan" aktif → logo diam ±1,2 dtk lalu memudar;
 *  - error saat render (mis. SVG) → ditangkap ErrorBoundary, splash dilewati;
 *  - flag modul: tidak diputar ulang saat tema berganti (ThemeRoot remount).
 */
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const ELS = require('../../../assets/images/splash-els.png');
const ECC = require('../../../assets/images/splash-ecc.png');
const IDEA = require('../../../assets/images/splash-idea.png');

const MAX_MS = 5500;
const R = 110;
const CIRC = 2 * Math.PI * R;
const LOGO_W = 112;
const ELS_H = Math.round((LOGO_W * 459) / 600);
const ECC_W = 64;
const ECC_H = Math.round((ECC_W * 430) / 319);
const nd = Platform.OS !== 'web';

let playedThisLaunch = false;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

class SplashBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function AnimatedSplash() {
  const [done, setDone] = useState(playedThisLaunch);
  const finish = useRef(() => {
    playedThisLaunch = true;
    setDone(true);
  }).current;
  if (done) return null;
  return (
    <SplashBoundary onError={finish}>
      <SplashStage onFinish={finish} />
    </SplashBoundary>
  );
}

function SplashStage({ onFinish }: { onFinish: () => void }) {
  const v = useRef({
    ring: new Animated.Value(0), // 0→1 gambar lingkaran
    ringOut: new Animated.Value(0), // 0→1 putar, besar, pudar
    write: new Animated.Value(0), // tirai tulisan Els
    pulse: new Animated.Value(0),
    mid: new Animated.Value(0),
    ecc: new Animated.Value(0),
    foot: new Animated.Value(0),
    dot: new Animated.Value(0),
    exit: new Animated.Value(0),
  }).current;
  const ended = useRef(false);

  const end = () => {
    if (ended.current) return;
    ended.current = true;
    onFinish();
  };

  const skip = () => {
    if (ended.current) return;
    Animated.timing(v.exit, { toValue: 1, duration: 220, useNativeDriver: nd }).start(() => end());
  };

  useEffect(() => {
    const hard = setTimeout(end, MAX_MS);
    let loop: Animated.CompositeAnimation | null = null;
    let main: Animated.CompositeAnimation | null = null;
    let cancelled = false;

    const t = (val: Animated.Value, toValue: number, duration: number, delay = 0, easing = Easing.out(Easing.cubic), native = nd) =>
      Animated.timing(val, { toValue, duration, delay, easing, useNativeDriver: native });

    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          // Tanpa gerak: langsung tampil, tahan sebentar, pudar.
          [v.write, v.mid, v.ecc, v.foot].forEach((x) => x.setValue(1));
          v.ringOut.setValue(1);
          main = Animated.sequence([Animated.delay(1200), t(v.exit, 1, 300)]);
          main.start(() => end());
          return;
        }
        loop = Animated.loop(
          Animated.sequence([t(v.dot, 1, 450, 0, Easing.inOut(Easing.quad)), t(v.dot, 0, 450, 0, Easing.inOut(Easing.quad))]),
        );
        main = Animated.parallel([
          // strokeDashoffset tidak didukung native driver → JS.
          t(v.ring, 1, 850, 0, Easing.inOut(Easing.cubic), false),
          t(v.ringOut, 1, 550, 850, Easing.inOut(Easing.cubic)),
          t(v.write, 1, 800, 950, Easing.bezier(0.6, 0.05, 0.3, 1)),
          Animated.sequence([Animated.delay(1800), t(v.pulse, 1, 150), t(v.pulse, 0, 150)]),
          t(v.mid, 1, 450, 2100),
          t(v.ecc, 1, 550, 2250, Easing.bezier(0.2, 0.8, 0.2, 1.15)),
          t(v.foot, 1, 400, 2700),
          t(v.exit, 1, 500, 3550, Easing.in(Easing.cubic)),
        ]);
        setTimeout(() => !cancelled && loop?.start(), 2700);
        main.start(() => end());
      });

    return () => {
      cancelled = true;
      clearTimeout(hard);
      main?.stop();
      loop?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageOpacity = v.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const stageScale = v.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const ringRotate = v.ringOut.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '270deg'] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: stageOpacity }]} accessibilityLabel="Els App by ECC Church">
      <Pressable style={StyleSheet.absoluteFill} onPress={skip}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, { transform: [{ scale: stageScale }] }]}>
          {/* Lingkaran oranye searah jarum jam */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                opacity: v.ringOut.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0] }),
                transform: [{ rotate: ringRotate }, { scale: v.ringOut.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
              },
            ]}
          >
            <Svg width={240} height={240} viewBox="0 0 240 240">
              <Defs>
                <LinearGradient id="splashRing" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FDBA74" />
                  <Stop offset="0.5" stopColor="#F97316" />
                  <Stop offset="1" stopColor="#C2410C" />
                </LinearGradient>
              </Defs>
              <AnimatedCircle
                cx={120}
                cy={120}
                r={R}
                fill="none"
                stroke="url(#splashRing)"
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={v.ring.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] })}
              />
            </Svg>
          </Animated.View>

          {/* Logo Els App — ditulis dari kiri ke kanan */}
          <Animated.View
            style={{
              width: LOGO_W,
              height: ELS_H,
              overflow: 'hidden',
              transform: [
                { translateY: v.write.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                { scale: v.pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
              ],
            }}
          >
            <Image source={ELS} style={{ width: LOGO_W, height: ELS_H }} resizeMode="contain" />
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: '#FFFFFF', transform: [{ translateX: v.write.interpolate({ inputRange: [0, 1], outputRange: [0, LOGO_W + 2] }) }] },
              ]}
            />
          </Animated.View>

          {/* Garis + BY */}
          <Animated.View style={[styles.mid, { opacity: v.mid }]}>
            <Animated.View style={[styles.line, { transform: [{ scaleX: v.mid }] }]} />
            <Text style={styles.by}>BY</Text>
            <Animated.View style={[styles.line, { transform: [{ scaleX: v.mid }] }]} />
          </Animated.View>

          {/* Logo ECC Church + tagline selebar logo */}
          <Animated.View
            style={{
              alignItems: 'center',
              width: LOGO_W,
              opacity: v.ecc,
              transform: [
                { translateY: v.ecc.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                { scale: v.ecc.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              ],
            }}
          >
            <Image source={ECC} style={{ width: ECC_W, height: ECC_H }} resizeMode="contain" />
            <Text
              style={styles.tag}
              numberOfLines={1}
              adjustsFontSizeToFit={Platform.OS !== 'web'}
              minimumFontScale={0.5}
              allowFontScaling={false}
            >
              EL SHADDAI CREATIVE COMMUNITY
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Titik memuat */}
        <Animated.View style={[styles.dots, { opacity: v.foot }]} pointerEvents="none">
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: v.dot.interpolate({ inputRange: [0, 1], outputRange: i === 1 ? [1, 0.35] : [0.35, 1] }),
                  transform: [{ translateY: v.dot.interpolate({ inputRange: [0, 1], outputRange: i === 1 ? [-4, 0] : [0, -4] }) }],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Powered by IDEA */}
        <Animated.View style={[styles.foot, { opacity: v.foot }]} pointerEvents="none">
          <Text style={styles.pb} allowFontScaling={false}>
            Powered by
          </Text>
          <Image source={IDEA} style={{ width: 30, height: 10 }} resizeMode="contain" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#FFFFFF', zIndex: 9999, elevation: 9999 },
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 240, height: 240, top: '50%', left: '50%', marginTop: -150, marginLeft: -120 },
  mid: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 14 },
  line: { width: 46, height: 1, backgroundColor: '#FDBA74' },
  by: { fontSize: 10, letterSpacing: 3, color: '#A3A3A3', fontWeight: '700' },
  tag: {
    width: LOGO_W,
    marginTop: 8,
    textAlign: 'center',
    color: '#737373',
    fontWeight: '700',
    fontSize: Platform.OS === 'web' ? 6.2 : 8,
    letterSpacing: Platform.OS === 'web' ? 0.2 : 0.4,
  },
  dots: { position: 'absolute', bottom: 92, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F97316' },
  foot: { position: 'absolute', bottom: 44, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  pb: { fontSize: 8.5, color: '#A3A3A3', fontWeight: '600' },
});
