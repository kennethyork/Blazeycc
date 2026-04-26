# Blazeycc Mobile

Capacitor-based mobile app for iOS and Android. Record your screen while browsing websites.

## Architecture

- **Web layer:** Existing HTML/CSS/JS adapted for mobile (touch-friendly, responsive)
- **Native layer:** Custom Capacitor plugin using MediaProjection (Android) and ReplayKit (iOS)
- **Recording:** Native screen capture, not canvas-based (mobile browsers don't allow canvas capture of cross-origin iframes)

## Prerequisites

```bash
cd mobile
npm install
```

## iOS Setup

```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

Then build in Xcode. Requires macOS and Xcode 14+.

## Android Setup

```bash
npx cap add android
npx cap sync android
npx cap open android
```

Then build in Android Studio. Requires Android SDK 33+.

## Development (Web)

```bash
npm run dev
```

## Build for Production

```bash
npm run build
npx cap sync
```

## Screen Recorder Plugin

Located in `plugins/screen-recorder/`. This custom plugin handles native screen recording:

- **Android:** Uses `MediaProjection` API to capture the entire screen with H.264 hardware encoding
- **iOS:** Uses `ReplayKit` to capture the app view with `AVAssetWriter`

### Plugin API

```typescript
ScreenRecorder.startRecording(): Promise<{ started: boolean }>
ScreenRecorder.stopRecording(): Promise<{ path: string }>
```

## Limitations vs Desktop

| Feature | Desktop | Mobile |
|---------|---------|--------|
| URL-to-video | ✅ Direct webview capture | ✅ Screen recording (any app) |
| Annotations | ✅ Canvas overlay | ❌ Not implemented |
| Auto-zoom | ✅ CSS transform | ❌ Not implemented |
| Motion blur | ✅ FFmpeg tmix | ❌ Not implemented |
| Webcam bubble | ✅ FFmpeg overlay | ❌ Not implemented |
| AI features | ✅ Full suite | ❌ Not implemented |
| Batch recording | ✅ | ❌ Not implemented |
| Scheduled recording | ✅ | ❌ Not implemented |

## Differences from Desktop

1. **No embedded browser** — Uses system browser or in-app iframe (limited by CORS)
2. **Native screen recording** — Captures the entire screen, not just the webview
3. **Mobile-optimized presets** — Defaults to 9:16 (Shorts/Reels/TikTok)
4. **Touch UI** — Bottom sheet settings, floating action button
5. **Native share** — Uses system share sheet

## Known Issues

- iOS ReplayKit only records the app, not system-wide
- Android requires screen capture permission every session
- Audio capture uses microphone on Android (system audio requires root on most devices)
- Webview audio capture is not supported on mobile browsers
