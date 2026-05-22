/**
 * Privacy Policy page — content dari BE /admin/legal/privacy.
 * Per docs/backend-request-legal-pages.md.
 *
 * MVP placeholder — legal team supply final wording, BE serve content.
 */
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield } from 'lucide-react-native';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 bg-neutral-50">
      <SafeAreaView edges={['top']} className="bg-white border-b border-neutral-100">
        <View className="px-4 py-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={20} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-base font-bold text-neutral-900">
            {t('legal.privacy_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center mb-4">
          <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-2">
            <Shield size={28} color="#2563EB" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 text-center">
            {t('legal.privacy_title')}
          </Text>
          <Text className="text-xs text-neutral-500 text-center mt-1">
            ECC Global App
          </Text>
        </View>

        <View className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-4">
          <Text className="text-xs text-amber-800 leading-relaxed">
            {t('legal.placeholder_notice')}
          </Text>
        </View>

        <Section title="1. Data yang Kami Kumpulkan">
          <Para>
            Untuk fungsi aplikasi, kami mengumpulkan: nama lengkap, nomor HP,
            email (opsional), tanggal lahir (opsional), alamat (opsional), foto
            profil, cabang gereja, dan kode jemaat. Untuk fitur Face
            Recognition, kami menyimpan kode 128 angka hasil ekstraksi wajah
            (bukan foto Anda).
          </Para>
        </Section>

        <Section title="2. Cara Kami Menggunakan Data">
          <Para>
            Data digunakan untuk: autentikasi login, kehadiran ibadah/event,
            koneksi keluarga jemaat, pelayanan dan ministry, persembahan,
            Local Market UMKM jemaat, dan komunikasi internal gereja.
          </Para>
        </Section>

        <Section title="3. Berbagi Data">
          <Para>
            Data Anda tidak dijual atau dibagikan ke pihak ketiga di luar
            kebutuhan gereja. Sesama jemaat dapat melihat informasi terbatas
            (nama, foto, cabang) — informasi sensitif (nomor HP, alamat,
            ulang tahun) hanya visible ke keluarga atau jemaat di cabang/
            homecell yang sama.
          </Para>
        </Section>

        <Section title="4. Keamanan">
          <Para>
            Data disimpan di server yang dilindungi dengan enkripsi.
            Komunikasi antara aplikasi dan server menggunakan HTTPS.
            Password tidak disimpan — autentikasi pakai OTP WhatsApp atau
            face recognition.
          </Para>
        </Section>

        <Section title="5. Hak Anda">
          <Para>
            Anda berhak: (a) mengakses dan memperbarui data pribadi via menu
            Edit Profil, (b) menonaktifkan akun via menu Hapus Akun, (c)
            menghapus data face recognition kapan saja di menu Login Wajah,
            (d) meminta informasi terkait pengelolaan data dengan menghubungi
            admin cabang.
          </Para>
        </Section>

        <Section title="6. Retention Policy">
          <Para>
            Data historis (kehadiran, event, donasi) disimpan untuk catatan
            gereja. Data akun yang dinonaktifkan tetap disimpan namun akses
            login dicabut. Untuk hard-delete permanen, hubungi admin via
            email resmi gereja.
          </Para>
        </Section>

        <Section title="7. Anak-Anak">
          <Para>
            Untuk anak di bawah umur (dependent), data dikelola oleh wali
            (primary guardian) yang terdaftar sebagai jemaat ECC. Wali
            bertanggung jawab atas data anak dan dapat mengelolanya via menu
            Keluarga.
          </Para>
        </Section>

        <Section title="8. Perubahan Kebijakan">
          <Para>
            Kebijakan Privasi ini dapat diperbarui sewaktu-waktu. Perubahan
            signifikan akan diberitahukan melalui aplikasi.
          </Para>
        </Section>

        <Section title="9. Kontak">
          <Para>
            Pertanyaan terkait privasi: hubungi admin cabang masing-masing
            atau email resmi gereja.
          </Para>
        </Section>

        <Text className="text-xs text-neutral-400 text-center mt-6">
          {t('legal.last_updated', { date: '2026-05-22' })}
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-sm font-bold text-neutral-900 mb-2">{title}</Text>
      {children}
    </View>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-sm text-neutral-700 leading-relaxed">{children}</Text>
  );
}
