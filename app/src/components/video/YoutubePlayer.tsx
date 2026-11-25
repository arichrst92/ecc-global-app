/**
 * Pemutar YouTube resmi (iframe) di dalam WebView — 2.5.1 (react-native-webview).
 * Dimuat sebagai HTML dengan baseUrl https supaya YouTube menerima asal (origin)
 * pemutar; tanpa ini sebagian video menolak diputar di WebView.
 * Web memakai YoutubePlayer.web.tsx (iframe langsung).
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';

const ORIGIN = 'https://eccchurch.global';

export function YoutubePlayer({ youtubeId }: { youtubeId: string }) {
  const [loading, setLoading] = useState(true);
  const html = useMemo(
    () => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style></head>
<body><iframe src="https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1&rel=0&modestbranding=1&autoplay=1&origin=${encodeURIComponent(ORIGIN)}"
allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`,
    [youtubeId],
  );
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}>
      <WebView
        source={{ html, baseUrl: ORIGIN }}
        originWhitelist={['*']}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        style={{ backgroundColor: '#000' }}
        onLoadEnd={() => setLoading(false)}
        // Tautan keluar dari pemutar (logo YouTube, "Tonton di YouTube") → app/browser.
        onShouldStartLoadWithRequest={(r: { url: string; isTopFrame?: boolean }) => {
          const u = r.url;
          if (u === 'about:blank' || u.startsWith(ORIGIN) || /youtube(-nocookie)?\.com\/embed\//.test(u) || r.isTopFrame === false) return true;
          if (/^https?:/.test(u)) void Linking.openURL(u).catch(() => {});
          return false;
        }}
      />
      {loading ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </View>
  );
}
