# Glimpse

**Record any website as video** - Capture demos, tutorials, and presentations as high-quality MP4, WebM, or GIF.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey.svg)

## Features

- 🌐 **Webview Capture** - Record any website directly, no screen sharing needed
- 🎬 **Multiple Formats** - Export as MP4, WebM, or animated GIF
- 📱 **23 Platform Presets** - Optimized for YouTube, Instagram, TikTok, Twitter, and more
- 📜 **Auto-Scroll** - Automatically scroll through long pages while recording
- 👁️ **Preview Before Save** - Review recordings before exporting
- 🔖 **Bookmarks & History** - Save URLs and access recording history
- 🌙 **Dark & Light Mode** - Theme support with system sync

## Download

Download the latest release for your platform:

- **Windows**: [glimpse-setup-1.0.0.exe](https://github.com/theKennethy/glimpse/releases/latest)
- **Linux AppImage**: [glimpse-1.0.0.AppImage](https://github.com/theKennethy/glimpse/releases/latest)
- **Linux .deb**: [glimpse_1.0.0_amd64.deb](https://github.com/theKennethy/glimpse/releases/latest)
- **Linux .rpm**: [glimpse-1.0.0.x86_64.rpm](https://github.com/theKennethy/glimpse/releases/latest)

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
```

## Tech Stack

- Electron 40
- FFmpeg (via ffmpeg-static)
- MediaRecorder API with webview capture

## License

MIT License - see [LICENSE](LICENSE) for details.
