/**
 * Materi pertemuan homecell: daftar file (nama + deskripsi) yang bisa dibuka,
 * plus modal upload untuk PIC (nama, deskripsi, file via document picker).
 */
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { FileImage, FileText, Paperclip, Trash2, Upload, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { env } from '@/config/env';
import type { HomecellScheduleFile } from '@/types/homecellSchedule';
import type { PickedFile } from '@/api/homecellSchedule';

const fileHref = (u: string) => (u.startsWith('http') ? u : `${env.apiBaseUrl}${u}`);
const sizeLabel = (b: number | null) =>
  b == null ? '' : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

/** Daftar file — tap untuk membuka. `onDelete` hanya untuk PIC. */
export function MaterialList({
  files,
  onDelete,
}: {
  files: HomecellScheduleFile[];
  onDelete?: (f: HomecellScheduleFile) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      {files.map((f) => {
        const isImage = f.fileMime.startsWith('image/');
        return (
          <Pressable
            key={f.id}
            onPress={() => void WebBrowser.openBrowserAsync(fileHref(f.fileUrl))}
            className="flex-row items-start gap-3 bg-neutral-50 rounded-xl p-3 border border-neutral-100"
          >
            <View className="w-9 h-9 rounded-lg bg-brand-50 items-center justify-center">
              {isImage ? <FileImage size={18} color="#EA580C" /> : <FileText size={18} color="#EA580C" />}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-bold text-neutral-900" numberOfLines={2}>
                {f.nama}
              </Text>
              {f.deskripsi ? <Text className="text-xs text-neutral-600 mt-0.5">{f.deskripsi}</Text> : null}
              <Text className="text-[11px] text-neutral-400 mt-0.5" numberOfLines={1}>
                {[f.fileName, sizeLabel(f.fileSize)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {onDelete ? (
              <Pressable
                hitSlop={10}
                onPress={() =>
                  Alert.alert(t('common.delete'), t('hcj.materi_delete_confirm', { name: f.nama }), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(f) },
                  ])
                }
                className="p-1"
              >
                <Trash2 size={16} color="#DC2626" />
              </Pressable>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Modal upload materi (PIC). */
export function UploadMaterialModal({
  visible,
  loading,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (v: { file: PickedFile; nama: string; deskripsi?: string }) => void;
}) {
  const { t } = useTranslation();
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);

  async function pick() {
    const r = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'image/*',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.*',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
        'text/plain',
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0] as DocumentPicker.DocumentPickerAsset & { file?: File };
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType, file: a.file });
    if (!nama.trim()) setNama(a.name.replace(/\.[^.]+$/, ''));
  }

  function close() {
    setNama('');
    setDeskripsi('');
    setFile(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/50 justify-end">
        <Pressable className="flex-1" onPress={close} />
        <View className="bg-white rounded-t-3xl p-5 gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Paperclip size={18} color="#EA580C" />
              <Text className="text-lg font-bold text-neutral-900">{t('hcj.materi_upload')}</Text>
            </View>
            <Pressable onPress={close} hitSlop={10}>
              <X size={18} color="#737373" />
            </Pressable>
          </View>

          <Pressable
            onPress={pick}
            className="flex-row items-center justify-center gap-2 border-2 border-dashed border-neutral-300 rounded-xl py-4 px-3"
          >
            <Upload size={18} color="#525252" />
            <Text className="text-sm text-neutral-700 flex-shrink" numberOfLines={1}>
              {file ? file.name : t('hcj.materi_pick')}
            </Text>
          </Pressable>
          <Text className="text-[11px] text-neutral-500 -mt-1">{t('hcj.materi_types')}</Text>

          <Text className="text-sm font-semibold text-neutral-800">{t('hcj.materi_name')}</Text>
          <TextInput
            value={nama}
            onChangeText={setNama}
            placeholder={t('hcj.materi_name_placeholder')}
            placeholderTextColor="#A3A3A3"
            maxLength={200}
            className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
          />
          <Text className="text-sm font-semibold text-neutral-800">{t('hcj.materi_desc')}</Text>
          <TextInput
            value={deskripsi}
            onChangeText={setDeskripsi}
            placeholder={t('hcj.materi_desc_placeholder')}
            placeholderTextColor="#A3A3A3"
            multiline
            maxLength={2000}
            className="bg-neutral-50 rounded-xl px-3 py-3 text-sm text-neutral-900 border border-neutral-200"
            style={{ minHeight: 70, textAlignVertical: 'top' }}
          />
          <Button
            label={t('common.save')}
            loading={loading}
            disabled={!file || nama.trim().length < 2}
            onPress={() => {
              if (!file) return;
              onSubmit({ file, nama: nama.trim(), deskripsi: deskripsi.trim() || undefined });
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
