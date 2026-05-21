import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
// react-native-webview tidak tersedia di web — Metro resolver akan replace
// dengan empty stub di web build. Tetap import normally untuk native.
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import {
  setFaceDescriptorBridge,
  type ComputeResult,
} from '@/services/faceDescriptor';

/**
 * Mount hidden WebView yang load face-api.js untuk compute 128-dim descriptor.
 * Pasang di root layout sekali — service `faceDescriptor.ts` bridge ke ini
 * via setBridge().
 *
 * WebView display: 1x1 transparent. Tidak interactive (pointerEvents none).
 *
 * Web platform: skip mount (face-api.js belum di-wire untuk web target).
 */

// HTML yang di-load: face-api.js dari CDN + handler postMessage RN ↔ WebView.
// Production: bundle face-api.js + models sebagai asset, ganti CDN URL ke
// file://localhost/... atau base64 inline.
const HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js"></script>
<script>
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
  let modelsReady = false;

  function post(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  }

  async function init() {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsReady = true;
      post({ type: 'ready' });
    } catch (e) {
      post({ type: 'init_error', message: String(e && e.message || e) });
    }
  }

  async function compute(requestId, dataUrl) {
    if (!modelsReady) {
      post({ type: 'result', requestId, ok: false, reason: 'error', message: 'Models not ready' });
      return;
    }
    try {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('Image load failed'));
      });

      // Detection tuning:
      // - inputSize 512: better recall untuk wajah closeup HP camera (vs 320 yang
      //   sering miss wajah besar). Trade-off speed (~50ms slower) ok untuk one-shot.
      // - scoreThreshold 0.3: lower, biarkan downstream check yang strict. TinyFaceDetector
      //   sering kasih score 0.4-0.6 untuk wajah valid di kondisi pencahayaan biasa.
      // - Retry dengan inputSize lebih besar kalau first pass gagal.
      let detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      // Fallback: kalau ga ketemu, retry dengan input size lebih besar (lebih akurat tapi slower)
      if (detections.length === 0) {
        detections = await faceapi
          .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.2 }))
          .withFaceLandmarks()
          .withFaceDescriptors();
      }

      if (detections.length === 0) {
        post({
          type: 'result',
          requestId,
          ok: false,
          reason: 'no_face',
          message: 'imgSize=' + img.width + 'x' + img.height + ', no faces detected',
        });
        return;
      }
      if (detections.length > 1) {
        post({ type: 'result', requestId, ok: false, reason: 'multiple_faces' });
        return;
      }
      const det = detections[0];
      // Lower quality threshold ke 0.4 — TinyFaceDetector score range biasanya
      // 0.3-0.9. 0.7 terlalu strict.
      if (det.detection.score < 0.4) {
        post({
          type: 'result',
          requestId,
          ok: false,
          reason: 'low_quality',
          message: 'detection.score=' + det.detection.score.toFixed(3),
        });
        return;
      }
      const descriptor = Array.from(det.descriptor);
      post({ type: 'result', requestId, ok: true, descriptor });
    } catch (e) {
      post({ type: 'result', requestId, ok: false, reason: 'error', message: String(e && e.message || e) });
    }
  }

  // Expose direct function untuk RN injectJavaScript. Lebih reliable
  // dibanding MessageEvent dispatch yang sering miss saat payload besar.
  window.__faceCompute = compute;

  // Tetap support MessageEvent path sebagai fallback (kalau ada usage lain)
  document.addEventListener('message', handleMessage);
  window.addEventListener('message', handleMessage);

  function handleMessage(ev) {
    try {
      const data = JSON.parse(ev.data);
      if (data.type === 'compute') {
        compute(data.requestId, data.dataUrl);
      }
    } catch (e) {
      post({ type: 'parse_error', message: String(e) });
    }
  }

  init();
</script>
</body>
</html>`;

type PendingRequest = {
  resolve: (r: ComputeResult) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export function FaceDescriptorProvider({ children }: { children: React.ReactNode }) {
  const webRef = useRef<WebView | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const bridge = {
      isReady: () => isReady,
      request: (imageBase64: string): Promise<ComputeResult> => {
        return new Promise<ComputeResult>((resolve) => {
          const requestId = String(++reqIdRef.current);
          // 30s timeout — face detection bisa lambat di model first run +
          // sumber compute + base64 transfer. Better fail late than spurious.
          const timeoutId = setTimeout(() => {
            pendingRef.current.delete(requestId);
            resolve({
              ok: false,
              reason: 'timeout',
              message: 'No response from face engine within 30s',
            });
          }, 30_000);
          pendingRef.current.set(requestId, { resolve, timeoutId });

          const dataUrl = imageBase64.startsWith('data:')
            ? imageBase64
            : `data:image/jpeg;base64,${imageBase64}`;

          // Direct function call via global. Pakai JSON.stringify untuk
          // properly escape image base64 string yang besar.
          const script =
            'window.__faceCompute(' +
            JSON.stringify(requestId) +
            ', ' +
            JSON.stringify(dataUrl) +
            '); true;';
          webRef.current?.injectJavaScript(script);
        });
      },
    };
    setFaceDescriptorBridge(bridge);

    return () => {
      setFaceDescriptorBridge(null);
      // Clear pending timeouts
      pendingRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
      pendingRef.current.clear();
    };
  }, [isReady]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as
        | { type: 'ready' }
        | { type: 'init_error'; message?: string }
        | { type: 'parse_error'; message?: string }
        | ({ type: 'result'; requestId: string } & ComputeResult);
      if (msg.type === 'ready') {
        setIsReady(true);
        return;
      }
      if (msg.type === 'init_error') {
        console.warn('[FaceDescriptor] init error:', msg.message);
        return;
      }
      if (msg.type === 'result') {
        const pending = pendingRef.current.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timeoutId);
          pendingRef.current.delete(msg.requestId);
          const { type: _t, requestId: _r, ...rest } = msg;
          pending.resolve(rest as ComputeResult);
        }
      }
    } catch (e) {
      console.warn('[FaceDescriptor] message parse error:', e);
    }
  }

  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
        }}
      >
        <WebView
          ref={webRef}
          source={{ html: HTML, baseUrl: 'https://localhost/' }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          allowFileAccess
          allowsInlineMediaPlayback
        />
      </View>
    </>
  );
}
