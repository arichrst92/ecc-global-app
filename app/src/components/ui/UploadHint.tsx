/**
 * Petunjuk unggah file: rasio / ukuran disarankan, format, dan batas ukuran.
 * Batas mengikuti server (core-api flexImageUpload / flexPdfUpload / flexMaterialUpload).
 */
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react-native';
import { nc } from '@/theme/ThemeRoot';

const IMG = 'JPG, PNG, WEBP, HEIC';

export const UPLOAD_SPECS = {
  /** Foto profil — POST /admin/me/foto (5 MB) */
  profile: { ratio: '1:1', size: '400 × 400 px', formats: IMG, maxMb: 5 },
  /** Logo usaha — /admin/me/business/:id/logo (5 MB) */
  businessLogo: { ratio: '1:1', size: '400 × 400 px', formats: IMG, maxMb: 5 },
  /** Gambar sampul usaha — /hero (5 MB) */
  businessHero: { ratio: '16:9', size: '1280 × 720 px', formats: IMG, maxMb: 5 },
  /** Foto produk katalog — /items/:id/foto (5 MB) */
  katalogItem: { ratio: '3:2', size: '1200 × 800 px', formats: IMG, maxMb: 5 },
  /** Gambar sampul grup — /admin/group-content/hero (8 MB) */
  groupHero: { ratio: '16:9', size: '1280 × 720 px', formats: IMG, maxMb: 8 },
  /** Bukti transfer — bebas rasio (foto / screenshot) (5 MB) */
  buktiTransfer: { ratio: null, size: null, formats: IMG, maxMb: 5 },
  /** Company profile usaha — PDF (5 MB) */
  companyPdf: { ratio: null, size: null, formats: 'PDF', maxMb: 5 },
  /** Materi homecell — /schedule/:id/files (20 MB) */
  homecellMaterial: { ratio: null, size: null, formats: 'PDF, JPG, PNG, Word, Excel, PowerPoint, TXT', maxMb: 20 },
} as const;

export type UploadSpecKey = keyof typeof UPLOAD_SPECS;

export function UploadHint({
  spec,
  className,
  center = false,
  label,
}: {
  spec: UploadSpecKey;
  className?: string;
  center?: boolean;
  /** Awalan, mis. "Sampul" / "Logo" bila satu tempat punya beberapa jenis unggahan. */
  label?: string;
}) {
  const { t } = useTranslation();
  const s = UPLOAD_SPECS[spec];
  const parts = [
    s.ratio ? t('upload.ratio', { ratio: s.ratio }) : spec === 'buktiTransfer' ? t('upload.any_ratio') : null,
    s.size ? t('upload.min_size', { size: s.size }) : null,
    s.formats,
    t('upload.max', { mb: s.maxMb }),
  ].filter(Boolean);
  return (
    <View className={`flex-row items-start gap-1.5 ${center ? 'justify-center' : ''} ${className ?? ''}`}>
      <Info size={12} color={nc('#A3A3A3')} style={{ marginTop: 2 }} />
      <Text className={`text-[11px] leading-4 text-neutral-500 flex-shrink ${center ? 'text-center' : ''}`}>
        {label ? <Text className="font-semibold text-neutral-600">{label}: </Text> : null}
        {parts.join(' · ')}
      </Text>
    </View>
  );
}
