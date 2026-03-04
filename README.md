# Blazeycc

**Record any website as video** - Capture demos, tutorials, and presentations as high-quality MP4, WebM, or GIF.

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

[![Sponsor](https://img.shields.io/badge/Sponsor-💜-purple.svg)](https://github.com/sponsors/theKennethy)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-☕-orange.svg)](https://ko-fi.com/thekennethy)

## Features

- 🌐 **Webview Capture** - Record any website directly, no screen sharing needed
- 🎬 **Multiple Formats** - Export as MP4, WebM, or animated GIF
- 📱 **23 Platform Presets** - Optimized for YouTube, Instagram, TikTok, Twitter, and more
- 📜 **Auto-Scroll** - Automatically scroll through long pages while recording
- 👁️ **Preview Before Save** - Review recordings before exporting
- 🔖 **Bookmarks & History** - Save URLs and access recording history
- 🌙 **Dark & Light Mode** - Theme support with system sync

### 🚀 Pro Features (Coming Soon)

Support the project to unlock premium features:
- 🎨 **Watermark Removal** - Clean exports without branding
- 📺 **4K Export** - Ultra-high quality 3840×2160 output
- 📋 **Batch Recording** - Record multiple URLs in sequence
- ⏰ **Scheduled Recordings** - Set up automated captures

## Download

Download the latest release for your platform:

- **Windows**: [Blazeycc.exe](https://github.com/theKennethy/Blazeycc/releases/download/latest/Blazeycc.exe) | [Portable](https://github.com/theKennethy/Blazeycc/releases/download/latest/Blazeycc-Portable.exe)
- **macOS**: [Blazeycc.dmg](https://github.com/theKennethy/Blazeycc/releases/download/latest/Blazeycc.dmg) | [ZIP](https://github.com/theKennethy/Blazeycc/releases/download/latest/Blazeycc.zip)
- **Linux**: [AppImage](https://github.com/theKennethy/Blazeycc/releases/download/latest/Blazeycc.AppImage) | [.deb](https://github.com/theKennethy/Blazeycc/releases/download/latest/Blazeycc.deb) | [.rpm](https://github.com/theKennethy/Blazeycc/releases/download/latest/Blazeycc.rpm)

> **Note:** Linux users may need to run with `--no-sandbox` flag. macOS users: right-click → Open on first launch.

## Support the Project

If you find Blazeycc useful, consider supporting its development:

- 💜 [**GitHub Sponsors**](https://github.com/sponsors/theKennethy) - $5/month gets your name in credits
- ☕ [**Ko-fi**](https://ko-fi.com/thekennethy) - One-time support

## Development

```bash
# Install dependencies
npm install

# Run in development
npm start

# Build for Linux
npm run build:linux

# Build for Windows
npm run build:win

# Build for macOS (via GitHub Actions)
# Push to trigger or run manually in Actions tab
```

## Tech Stack

- Electron 40
- FFmpeg (via ffmpeg-static)
- MediaRecorder API with webview capture

## License

GPL-3.0 License - see [LICENSE](LICENSE) for details.
