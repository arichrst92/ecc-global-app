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
// Pakai unpkg sebagai primary, jsdelivr sebagai fallback.
// Comprehensive console.log bridging untuk diagnose CDN/model loading issues.
// Production: bundle face-api.js + models sebagai asset.
const HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<script>
  // Bridge console.log/warn/error ke RN postMessage early supaya bisa
  // diagnose script loading issues sebelum face-api.js loaded.
  (function() {
    var origLog = console.log, origWarn = console.warn, origErr = console.error;
    function bridge(level) {
      return function() {
        var args = Array.prototype.slice.call(arguments).map(function(a) {
          try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
          catch (e) { return String(a); }
        });
        try {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'log', level: level, message: args.join(' ')
            }));
          }
        } catch (e) {}
        if (level === 'log') origLog.apply(console, arguments);
        else if (level === 'warn') origWarn.apply(console, arguments);
        else origErr.apply(console, arguments);
      };
    }
    console.log = bridge('log');
    console.warn = bridge('warn');
    console.error = bridge('error');
    window.onerror = function(msg, src, line, col, err) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'log', level: 'error',
          message: 'window.onerror: ' + msg + ' @ ' + src + ':' + line
        }));
      } catch (e) {}
    };
  })();
  console.log('[WebView] bootstrap script start');
</script>
<script src="https://unpkg.com/@vladmandic/face-api@1.7.13/dist/face-api.min.js"
  onload="console.log('[WebView] face-api.js loaded from unpkg')"
  onerror="(function(){
    console.warn('[WebView] unpkg failed, trying jsdelivr');
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.min.js';
    s.onload = function(){ console.log('[WebView] face-api.js loaded from jsdelivr'); window.__faceapiLoaded(); };
    s.onerror = function(){ console.error('[WebView] both CDNs failed'); };
    document.head.appendChild(s);
  })()">
</script>
<script>
  const MODEL_URL_PRIMARY = 'https://unpkg.com/@vladmandic/face-api@1.7.13/model';
  const MODEL_URL_FALLBACK = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
  let modelsReady = false;
  let initCalled = false;

  function post(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  }

  async function loadModels(baseUrl) {
    console.log('[WebView] loading models from:', baseUrl);
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl),
    ]);
    console.log('[WebView] models loaded');
  }

  async function setupBackend() {
    try {
      const tf = faceapi.tf;
      console.log('[WebView] available backends:', Object.keys(tf.engine().registryFactory || {}).join(','));
      // Coba WebGL dulu — paling cepat kalau available di WebView.
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        console.log('[WebView] backend: webgl OK');
        return;
      } catch (e) {
        console.warn('[WebView] webgl failed, fallback cpu:', e && e.message);
      }
      // Fallback CPU
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('[WebView] backend: cpu OK');
    } catch (e) {
      console.warn('[WebView] backend setup error:', e && e.message);
    }
  }

  async function init() {
    if (initCalled) { return; }
    initCalled = true;
    if (typeof faceapi === 'undefined') {
      post({ type: 'init_error', message: 'faceapi not defined — CDN load failed' });
      return;
    }
    try {
      await setupBackend();
      await loadModels(MODEL_URL_PRIMARY);
      modelsReady = true;
      post({ type: 'ready' });
    } catch (e) {
      console.warn('[WebView] primary model load failed:', e && e.message);
      try {
        await loadModels(MODEL_URL_FALLBACK);
        modelsReady = true;
        post({ type: 'ready' });
      } catch (e2) {
        post({ type: 'init_error', message: 'both model URLs failed: ' + (e2 && e2.message) });
      }
    }
  }

  // Trigger init either when face-api inline-script loaded (this script
  // tag comes AFTER face-api script), or via fallback __faceapiLoaded after
  // dynamic load.
  window.__faceapiLoaded = init;

  async function compute(requestId, dataUrl) {
    console.log('[WebView] compute called requestId=' + requestId + ' dataUrl.length=' + (dataUrl && dataUrl.length));
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
      console.log('[WebView] image loaded ' + img.width + 'x' + img.height);

      var t0 = Date.now();
      console.log('[WebView] starting detection, backend=' + faceapi.tf.getBackend());

      // detectSingleFace: lebih cepat dari detectAll, return cuma 1 wajah.
      // inputSize 320: model akan resize internal ke ini. Lebih kecil = lebih cepat.
      // For typical face shot (wajah occupies 30-60% frame), 320 cukup akurat.
      var det = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      console.log('[WebView] detection done in ' + (Date.now() - t0) + 'ms, found=' + (det ? 'yes' : 'no'));

      // Fallback: kalau ga ketemu, retry dengan inputSize lebih besar
      if (!det) {
        var t1 = Date.now();
        det = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        console.log('[WebView] fallback detection done in ' + (Date.now() - t1) + 'ms, found=' + (det ? 'yes' : 'no'));
      }

      if (!det) {
        post({
          type: 'result',
          requestId,
          ok: false,
          reason: 'no_face',
          message: 'imgSize=' + img.width + 'x' + img.height + ', no face detected',
        });
        return;
      }
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
      console.log('[WebView] descriptor computed, len=' + descriptor.length + ', score=' + det.detection.score.toFixed(3));
      post({ type: 'result', requestId, ok: true, descriptor });
    } catch (e) {
      console.error('[WebView] compute error:', e && e.message);
      post({ type: 'result', requestId, ok: false, reason: 'error', message: String(e && e.message || e) });
    }
  }

  // Expose direct function untuk RN injectJavaScript.
  window.__faceCompute = compute;
  console.log('[WebView] __faceCompute defined, type=' + typeof window.__faceCompute);

  // Kick init kalau face-api sudah loaded
  if (typeof faceapi !== 'undefined') {
    init();
  }
</script>
</body>
</html>`;

type LogMessage = { type: 'log'; level: 'log' | 'warn' | 'error'; message: string };

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
          const timeoutId = setTimeout(() => {
            pendingRef.current.delete(requestId);
            resolve({
              ok: false,
              reason: 'timeout',
              message: 'No response from face engine within 60s — TFJS backend mungkin terlalu lambat di device ini',
            });
          }, 60_000);
          pendingRef.current.set(requestId, { resolve, timeoutId });

          const dataUrl = imageBase64.startsWith('data:')
            ? imageBase64
            : `data:image/jpeg;base64,${imageBase64}`;

          if (__DEV__) {
            console.log('[FaceDescriptor] inject compute requestId=' + requestId + ' size=' + Math.round(dataUrl.length / 1024) + 'KB');
          }

          // Wrap dengan try-catch + acknowledge supaya kita tau script jalan.
          const script =
            'try { if (typeof window.__faceCompute !== "function") {' +
            '  window.ReactNativeWebView.postMessage(JSON.stringify({type:"log",level:"error",message:"__faceCompute not defined when called req="+' +
            JSON.stringify(requestId) +
            '}));' +
            '  window.ReactNativeWebView.postMessage(JSON.stringify({type:"result",requestId:' +
            JSON.stringify(requestId) +
            ',ok:false,reason:"error",message:"Face engine not initialized"}));' +
            '} else {' +
            '  window.ReactNativeWebView.postMessage(JSON.stringify({type:"log",level:"log",message:"compute call accepted req="+' +
            JSON.stringify(requestId) +
            '}));' +
            '  window.__faceCompute(' +
            JSON.stringify(requestId) +
            ', ' +
            JSON.stringify(dataUrl) +
            ');' +
            '}} catch(e) {' +
            '  window.ReactNativeWebView.postMessage(JSON.stringify({type:"log",level:"error",message:"inject script error: "+String(e)}));' +
            '} true;';
          webRef.current?.injectJavaScript(script);
        });
      },
    };
    setFaceDescriptorBridge(bridge);

    return () => {
      setFaceDescriptorBridge(null);
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
        | LogMessage
        | ({ type: 'result'; requestId: string } & ComputeResult);
      if (msg.type === 'log') {
        if (__DEV__) {
          const prefix = '[FaceWebView/' + msg.level + ']';
          if (msg.level === 'error') console.error(prefix, msg.message);
          else if (msg.level === 'warn') console.warn(prefix, msg.message);
          else console.log(prefix, msg.message);
        }
        return;
      }
      if (msg.type === 'ready') {
        if (__DEV__) console.log('[FaceDescriptor] models READY');
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
        } else if (__DEV__) {
          console.warn('[FaceDescriptor] result for unknown requestId:', msg.requestId);
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
          onError={(e) => console.warn('[FaceWebView] error:', e.nativeEvent)}
          onHttpError={(e) => console.warn('[FaceWebView] http error:', e.nativeEvent.statusCode, e.nativeEvent.url)}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          allowFileAccess
          allowsInlineMediaPlayback
          cacheEnabled
        />
      </View>
    </>
  );
}
