# ML Assets

## mobilefacenet.tflite

**Target file**: `mobilefacenet.tflite` (~4-5MB)
**Output**: 192-dim Float32 face embedding
**Input**: 112x112x3 RGB image, normalized to range -1..1

### Download

Option 1 — **sirius-ai/MobileFaceNet_TF** (recommended)
- Repo: https://github.com/sirius-ai/MobileFaceNet_TF
- TFLite file: cek `arch/` folder atau Releases section
- Download → save as `mobilefacenet.tflite` di folder ini

Option 2 — **serengil/deepface MobileFaceNet weights**
- Repo: https://github.com/serengil/deepface
- Convert TF/Keras model ke TFLite pakai tensorflow.lite.TFLiteConverter

Option 3 — **TFHub** (Google)
- https://tfhub.dev/sayakpaul/lite-model/mobilefacenet/1 (kalau ada)

### Verify

```bash
ls -lh app/assets/ml/mobilefacenet.tflite
# Expected: 4-5MB
```

### Verify shape (Python)

```python
import tensorflow as tf
interpreter = tf.lite.Interpreter('mobilefacenet.tflite')
interpreter.allocate_tensors()
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()
print('Input:', input_details[0]['shape'])   # expect [1, 112, 112, 3]
print('Output:', output_details[0]['shape']) # expect [1, 192]
```

### Metro config

Pastikan `metro.config.js` allow .tflite sebagai asset:

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('tflite');
module.exports = config;
```

### Prebuild required

react-native-fast-tflite native module — tidak jalan di Expo Go. Perlu:

```bash
npx expo prebuild --clean
npx expo run:ios   # atau run:android
```

Test di EAS dev build atau bare workflow.
