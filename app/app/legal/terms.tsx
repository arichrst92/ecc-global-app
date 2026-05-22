/**
 * Terms & Conditions page — content dari BE /admin/legal/terms.
 * Per docs/backend-request-legal-pages.md.
 *
 * MVP placeholder content sampai BE endpoint ready + legal team supply
 * final wording. Saat BE ready, switch ke real fetch + markdown render.
 */
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText } from 'lucide-react-native';

export default function TermsScreen() {
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
            {t('legal.terms_title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
      >
        <View className="bg-white rounded-2xl p-5 border border-neutral-100 items-center mb-4">
          <View className="w-14 h-14 rounded-2xl bg-brand-50 items-center justify-center mb-2">
            <FileText size={28} color="#EA580C" />
          </View>
          <Text className="text-lg font-bold text-neutral-900 text-center">
            {t('legal.terms_title')}
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

        {/* Placeholder content — replace dengan markdown render dari BE saat ready */}
        <Section title="1. Penerimaan Syarat">
          <Para>
            Dengan menggunakan aplikasi ECC Global App, Anda menyetujui untuk
            terikat oleh syarat dan ketentuan ini. Jika tidak setuju, mohon
            tidak menggunakan aplikasi ini.
          </Para>
        </Section>

        <Section title="2. Akun dan Kerahasiaan">
          <Para>
            Anda bertanggung jawab atas kerahasiaan akun dan kode jemaat Anda.
            Segala aktivitas yang dilakukan dengan akun Anda menjadi tanggung
            jawab Anda. Hubungi pengurus cabang segera jika akun Anda
            disalahgunakan.
          </Para>
        </Section>

        <Section title="3. Penggunaan Aplikasi">
          <Para>
            Aplikasi ini disediakan untuk memfasilitasi kegiatan jemaat ECC —
            ibadah, event, persembahan, dan komunitas. Tidak diperkenankan
            menggunakan aplikasi untuk tujuan komersial di luar fitur Local
            Market, spam, atau aktivitas yang melanggar hukum.
          </Para>
        </Section>

        <Section title="4. Data dan Privasi">
          <Para>
            Data pribadi Anda dikelola sesuai dengan Kebijakan Privasi yang
            terpisah. Mohon baca Kebijakan Privasi untuk detail lengkap.
          </Para>
        </Section>

        <Section title="5. Perubahan Syarat">
          <Para>
            ECC berhak mengubah syarat dan ketentuan ini sewaktu-waktu.
            Perubahan akan diberitahukan melalui aplikasi. Penggunaan
            berkelanjutan dianggap sebagai penerimaan syarat yang diperbarui.
          </Para>
        </Section>

        <Section title="6. Penonaktifan Akun">
          <Para>
            Anda dapat menonaktifkan akun melalui menu Profil → Hapus Akun.
            Akses login akan dicabut, namun data historis (kehadiran, event,
            donasi) tetap disimpan untuk catatan gereja.
          </Para>
        </Section>

        <Section title="7. Kontak">
          <Para>
            Pertanyaan terkait syarat dan ketentuan dapat disampaikan ke
            pengurus cabang masing-masing atau melalui kontak resmi ECC.
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
