const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// TFLite model files (.tflite) — bundle sebagai asset, di-load via require()
// di FaceDescriptorProvider untuk MobileFaceNet (M13.v2 patch 21r).
config.resolver.assetExts.push('tflite');

module.exports = withNativeWind(config, { input: './global.css' });
