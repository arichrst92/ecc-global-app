import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Bluetooth,
  CheckCircle2,
  Info,
  Printer as PrinterIcon,
  RefreshCw,
  Trash2,
  Zap,
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { usePrinterStore } from '@/stores/printer.store';
import { printerService, PrinterError } from '@/services/printer';
import { previewLabel } from '@/services/label-builder';
import type { PaperSize, PrinterDevice } from '@/services/printer';

export default function PrinterSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const showToast = useToast((s) => s.show);

  const lastDevice = usePrinterStore((s) => s.lastDevice);
  const paperSize = usePrinterStore((s) => s.paperSize);
  const autoPrint = usePrinterStore((s) => s.autoPrint);
  const isConnected = usePrinterStore((s) => s.isConnected);
  const setLastDevice = usePrinterStore((s) => s.setLastDevice);
  const setPaperSize = usePrinterStore((s) => s.setPaperSize);
  const setAutoPrint = usePrinterStore((s) => s.setAutoPrint);
  const setConnected = usePrinterStore((s) => s.setConnected);

  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  const nativeAvailable = printerService.isNativeAvailable();

  async function handleScan() {
    setScanning(true);
    try {
      const granted = await printerService.requestPermissions();
      if (!nativeAvailable) {
        // Stub mode — tetap show mock devices supaya UI bisa di-explore
      } else if (!granted) {
        showToast(t('printer.permission_denied'), 'error');
        return;
      }
      const found = await printerService.scanDevices();
      setDevices(found);
      if (found.length === 0) {
        showToast(t('printer.no_devices_found'), 'info');
      }
    } catch {
      showToast(t('error.generic'), 'error');
    } finally {
      setScanning(false);
    }
  }

  async function handleConnect(device: PrinterDevice) {
    setConnecting(device.id);
    try {
      await printerService.connect(device.id);
      await setLastDevice(device);
      setConnected(true);
      showToast(t('printer.connected', { name: device.name }), 'success');
    } catch (err) {
      if (err instanceof PrinterError && err.code === 'UNAVAILABLE') {
        Alert.alert(t('printer.unavailable_title'), err.message);
      } else {
        showToast(t('printer.connect_failed'), 'error');
      }
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect() {
    try {
      await printerService.disconnect();
    } catch {
      // ignore
    }
    setConnected(false);
    showToast(t('printer.disconnected'), 'success');
  }

  async function handleForget() {
    await handleDisconnect();
    await setLastDevice(null);
  }

  async function handleTestPrint() {
    try {
      await printerService.printLabel(
        {
          header: 'ECC Test Print',
          namaLengkap: 'Test User',
          kode: 'TEST0000',
          detail: new Date().toLocaleString('id-ID'),
          status: 'TEST',
        },
        paperSize,
      );
      showToast(t('printer.test_print_sent'), 'success');
    } catch (err) {
      if (err instanceof PrinterError && err.code === 'UNAVAILABLE') {
        Alert.alert(t('printer.unavailable_title'), err.message);
      } else {
        showToast(t('printer.print_failed'), 'error');
      }
    }
  }

  const previewText = previewLabel(
    {
      header: 'ECC Jakarta · Ibadah',
      namaLengkap: 'Ari Christian',
      kode: 'ABC23XYZ',
      detail: 'Min, 19 Mei · 08:00',
      status: 'JOIN',
    },
    paperSize,
  );

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
            {t('printer.title')}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}
      >
        {/* Native availability notice */}
        {!nativeAvailable ? (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 flex-row items-start gap-2">
            <Info size={16} color="#D97706" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-xs font-semibold text-amber-900">
                {t('printer.expo_go_notice_title')}
              </Text>
              <Text className="text-xs text-amber-800 mt-1 leading-relaxed">
                {t('printer.expo_go_notice_msg')}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Connection status */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
          {t('printer.status_section')}
        </Text>
        {lastDevice ? (
          <View
            className={`rounded-2xl p-4 border-2 mb-3 ${
              isConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-neutral-200'
            }`}
          >
            <View className="flex-row items-center gap-3">
              <View
                className={`w-12 h-12 rounded-xl items-center justify-center ${
                  isConnected ? 'bg-emerald-500' : 'bg-neutral-200'
                }`}
              >
                <PrinterIcon size={20} color={isConnected ? '#fff' : '#525252'} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-neutral-900" numberOfLines={1}>
                  {lastDevice.name}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5 font-mono">
                  {lastDevice.id}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-1">
                  <View
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-500' : 'bg-neutral-400'
                    }`}
                  />
                  <Text className="text-xs font-semibold text-neutral-600">
                    {isConnected
                      ? t('printer.status_connected')
                      : t('printer.status_disconnected')}
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-row gap-2 mt-3">
              {isConnected ? (
                <>
                  <View className="flex-1">
                    <Button
                      label={t('printer.test_print')}
                      onPress={handleTestPrint}
                      leftIcon={<Zap size={14} color="#fff" />}
                      fullWidth
                      size="md"
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label={t('printer.disconnect')}
                      variant="secondary"
                      onPress={handleDisconnect}
                      fullWidth
                      size="md"
                    />
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-1">
                    <Button
                      label={t('printer.reconnect')}
                      onPress={() => handleConnect(lastDevice)}
                      loading={connecting === lastDevice.id}
                      leftIcon={<Bluetooth size={14} color="#fff" />}
                      fullWidth
                      size="md"
                    />
                  </View>
                  <Pressable
                    onPress={handleForget}
                    className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center"
                  >
                    <Trash2 size={16} color="#DC2626" />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ) : (
          <View className="bg-white rounded-2xl p-6 border border-dashed border-neutral-300 mb-3 items-center">
            <PrinterIcon size={32} color="#A3A3A3" />
            <Text className="text-sm text-neutral-500 text-center mt-2">
              {t('printer.no_device_picked')}
            </Text>
          </View>
        )}

        {/* Scan devices */}
        <Button
          label={scanning ? t('printer.scanning') : t('printer.scan_devices')}
          variant="secondary"
          onPress={handleScan}
          loading={scanning}
          leftIcon={<RefreshCw size={14} color="#404040" />}
          fullWidth
        />

        {devices.length > 0 ? (
          <View className="mt-3 gap-2">
            <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-2">
              {t('printer.available_devices')}
            </Text>
            {devices.map((d) => {
              const isPicked = lastDevice?.id === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => handleConnect(d)}
                  disabled={connecting !== null}
                  className={`bg-white rounded-2xl p-3 flex-row items-center gap-3 border ${
                    isPicked ? 'border-brand-400' : 'border-neutral-100'
                  }`}
                >
                  <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                    <Bluetooth size={18} color="#1d4ed8" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900" numberOfLines={1}>
                      {d.name}
                    </Text>
                    <Text className="text-xs text-neutral-500 mt-0.5 font-mono">{d.id}</Text>
                    {d.isPaired ? (
                      <Text className="text-[10px] font-bold text-emerald-600 mt-0.5">
                        {t('printer.paired')}
                      </Text>
                    ) : null}
                  </View>
                  {connecting === d.id ? (
                    <ActivityIndicator color="#F97316" />
                  ) : isPicked ? (
                    <CheckCircle2 size={18} color="#F97316" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Paper size */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 mt-6">
          {t('printer.paper_size')}
        </Text>
        <View className="flex-row gap-2">
          {(['58mm', '80mm'] as PaperSize[]).map((s) => {
            const active = paperSize === s;
            return (
              <Pressable
                key={s}
                onPress={() => setPaperSize(s)}
                className={`flex-1 py-3 rounded-xl border-2 ${
                  active ? 'bg-brand-500 border-brand-500' : 'bg-white border-neutral-200'
                }`}
              >
                <Text
                  className={`text-sm font-semibold text-center ${
                    active ? 'text-white' : 'text-neutral-700'
                  }`}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Auto-print toggle */}
        <Pressable
          onPress={() => setAutoPrint(!autoPrint)}
          className="bg-white rounded-2xl p-4 border border-neutral-100 mt-3 flex-row items-center gap-3"
        >
          <View className="flex-1">
            <Text className="text-sm font-semibold text-neutral-900">
              {t('printer.auto_print_label')}
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5">
              {t('printer.auto_print_sub')}
            </Text>
          </View>
          <View
            className={`w-12 h-7 rounded-full p-0.5 ${
              autoPrint ? 'bg-brand-500' : 'bg-neutral-300'
            }`}
          >
            <View
              className="w-6 h-6 rounded-full bg-white shadow"
              style={{
                transform: [{ translateX: autoPrint ? 20 : 0 }],
              }}
            />
          </View>
        </Pressable>

        {/* Label preview */}
        <Text className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 mt-6">
          {t('printer.preview_section')}
        </Text>
        <View className="bg-neutral-900 rounded-2xl p-4">
          <Text className="text-xs font-mono text-emerald-300 leading-relaxed">
            {previewText}
          </Text>
        </View>
        <Text className="text-xs text-neutral-500 mt-2 text-center italic">
          {t('printer.preview_note')}
        </Text>
      </ScrollView>
    </View>
  );
}
