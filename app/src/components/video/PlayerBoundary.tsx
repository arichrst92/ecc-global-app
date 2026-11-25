/**
 * Pengaman pemutar video: bila WebView gagal (mis. modul native belum ada di
 * build lama / dev client), tampilkan kotak "Buka di YouTube" — bukan layar error.
 */
import { Component, type ReactNode } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { reportError } from '@/services/errorReporting';

type Props = { youtubeId: string; label: string; children: ReactNode };

export class PlayerBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    try {
      reportError(error, { source: 'YoutubePlayer' });
    } catch {
      /* abaikan */
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          onPress={() => void Linking.openURL(`https://www.youtube.com/watch?v=${this.props.youtubeId}`).catch(() => {})}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <ExternalLink size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{this.props.label}</Text>
        </Pressable>
      </View>
    );
  }
}
