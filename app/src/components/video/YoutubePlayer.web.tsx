/** Pemutar YouTube untuk Els App web (iframe langsung). */
import { createElement } from 'react';
import { View } from 'react-native';

export function YoutubePlayer({ youtubeId }: { youtubeId: string }) {
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}>
      {createElement('iframe', {
        src: `https://www.youtube-nocookie.com/embed/${youtubeId}?playsinline=1&rel=0&modestbranding=1&autoplay=1`,
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        allowFullScreen: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        style: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 },
      })}
    </View>
  );
}
