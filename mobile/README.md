# Blazeycc Mobile

Capacitor-based mobile app for Android. Record your screen while browsing websites.

## Quick Start (No NDK needed!)

If prebuilt `.so` files are already committed in this repo:

```bash
cd mobile
npm install
npm run build
npx cap sync android
npx cap open android
# Click ▶️ Run in Android Studio
```

**Requirements:** Android Studio + SDK 33+. No NDK, no CMake, no C++ needed.

---

## First-Time Setup (for maintainers)

If native libraries are missing, build them once with the Android NDK:

### 1. Install Android NDK
Via Android Studio: **Tools → SDK Manager → SDK Tools → NDK (Side by side)**

### 2. Set environment variable
```bash
export ANDROID_NDK_HOME="$HOME/Android/Sdk/ndk/25.2.9519653"
```

### 3. Build native libraries
```bash
cd mobile/plugins/local-llm
./build-native.sh
```

This runs for ~3 minutes and outputs `.so` files to `android/src/main/jniLibs/`. After this, commit them:

```bash
git add android/src/main/jniLibs/
git commit -m "Add prebuilt native libraries"
```

From then on, **anyone can build the Android app without NDK**.

---

## Architecture

- **Web layer:** HTML/CSS/JS adapted for mobile (touch-friendly, responsive)
- **Native layer:** Custom Capacitor plugins
  - `screen-recorder` — MediaProjection API for screen capture
  - `local-llm` — llama.cpp via JNI for on-device AI

---

## Plugins

### Screen Recorder
Located in `plugins/screen-recorder/`. Uses `MediaProjection` API for native screen recording with H.264 hardware encoding.

```typescript
ScreenRecorder.startRecording(): Promise<{ started: boolean }>
ScreenRecorder.stopRecording(): Promise<{ path: string }>
```

### Local LLM
Located in `plugins/local-llm/`. Uses llama.cpp via JNI for on-device AI inference.

```typescript
LocalLlm.downloadModel({ url, filename }): Promise<{ success: boolean }>
LocalLlm.loadModel({ path }): Promise<{ success: boolean }>
LocalLlm.generate({ prompt, maxTokens, temperature }): Promise<{ text: string }>
```

---

## AI Backends

The mobile app supports **two AI backends**:

### 1. On-Device (Local) — Default
Runs qwen2.5 directly on your phone using llama.cpp.
- **Pros:** Works offline, no WiFi needed, private
- **Cons:** First download ~1.1GB, slower (2-5 tokens/sec)
- **Setup:** Download model in app → Load → Generate

### 2. Ollama on Desktop (Remote)
Connects to Ollama running on your laptop via WiFi.
- **Pros:** Faster, same model as desktop
- **Cons:** Requires laptop on same network
- **Setup:** On laptop run `OLLAMA_HOST=0.0.0.0:11434 ollama serve`, then enter laptop IP in app

---

## Feature Comparison

| Feature | Desktop | Mobile |
|---------|---------|--------|
| URL-to-video | ✅ Direct webview | ✅ Screen recording |
| Annotations | ✅ Canvas overlay | ✅ Canvas overlay |
| Auto-zoom | ✅ CSS transform | ✅ CSS transform |
| Auto-scroll | ✅ | ✅ |
| Zoom controls | ✅ | ✅ |
| Motion blur | ✅ FFmpeg tmix | ❌ No FFmpeg |
| Webcam bubble | ✅ FFmpeg overlay | ❌ Not possible |
| AI (local) | ❌ | ✅ llama.cpp JNI |
| AI (remote) | ✅ Ollama | ✅ Ollama WiFi |
| Batch recording | ✅ | ✅ |
| Scheduled recording | ✅ | ✅ |
| Bookmarks | ✅ | ✅ |
| History | ✅ | ✅ |
| Theme toggle | ✅ | ✅ |

---

## Known Issues

- Android requires screen capture permission every session
- Audio capture uses microphone (system audio requires root)
- iframe CORS may block some websites
- On-device AI is slow (~2-5 tokens/sec) but usable for metadata
