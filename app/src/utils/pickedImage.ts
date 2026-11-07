/**
 * ImagePicker asset → objek file untuk FormData (2.4.7).
 *
 * - Native: { uri, name, type } — nama selalu berekstensi & MIME dari picker.
 * - Web (Expo web): browser butuh File/Blob asli; objek {uri} akan terkirim
 *   sebagai teks "[object Object]" sehingga server tidak menerima file.
 */
import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { FileObj } from '@/api/businesses';

export async function imageAssetToFile(a: ImagePickerAsset, fallback = 'foto.jpg'): Promise<FileObj> {
  const raw = a.fileName || a.uri.split('/').pop()?.split('?')[0] || fallback;
  const ext = raw.includes('.') ? raw.split('.').pop()!.toLowerCase() : '';
  const type =
    a.mimeType ||
    (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'heic' ? 'image/heic' : 'image/jpeg');
  const name = /\.[a-z0-9]{2,5}$/i.test(raw) && !raw.startsWith('data:') ? raw : `${fallback.replace(/\.\w+$/, '')}.${type.split('/')[1] ?? 'jpg'}`;
  let file: Blob | undefined;
  if (Platform.OS === 'web') {
    file = a.file ?? (await fetch(a.uri).then((r) => r.blob()).catch(() => undefined));
  }
  return { uri: a.uri, name, type, file };
}
