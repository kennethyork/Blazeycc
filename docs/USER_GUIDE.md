# Blazeycc User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Recording a Website](#recording-a-website)
3. [Output Settings](#output-settings)
4. [Annotations](#annotations)
5. [Auto-Zoom](#auto-zoom)
6. [Motion Blur](#motion-blur)
7. [Webcam Bubble](#webcam-bubble)
8. [AI Assist (Ollama)](#ai-assist)
9. [Batch Recording](#batch-recording)
10. [Scheduled Recording](#scheduled-recording)
11. [Trimming Videos](#trimming-videos)
12. [Keyboard Shortcuts](#keyboard-shortcuts)
13. [Troubleshooting](#troubleshooting)

---

## Getting Started

Blazeycc turns any website into a video. No screen recording needed — just enter a URL and hit Record.

### Installation
- Download the latest release for your OS from the [releases page](https://github.com/kennethyork/Blazeycc/releases)
- Linux: AppImage, deb, or rpm
- Windows: Installer or portable
- macOS: DMG or zip

### First Launch
On first launch, you'll see an onboarding modal with quick tips. You can dismiss it and check "Don't show again".

---

## Recording a Website

1. **Enter a URL** in the address bar (e.g., `https://example.com`)
2. Click **🌐 Load Website** — the site loads in the embedded browser
3. Click **🔴 Record** to start capturing
4. Click **⏹ Stop** when done
5. The video is saved to your Downloads folder (or your chosen save location)

**Pro tip:** Use the zoom controls (🔍+ / 🔍- / 🔍⟲) to zoom the page before recording.

---

## Output Settings

Click **⚙️ Settings** to configure:

| Setting | Options |
|---------|---------|
| **Format** | MP4, WebM, GIF |
| **Preset** | YouTube, Instagram, TikTok, Twitter, LinkedIn, etc. (23 presets) |
| **Quality** | Low, Medium, High, Ultra |
| **Frame Rate** | 5–30 FPS (15 FPS recommended) |
| **GPU Encoding** | Enable if you have NVIDIA/AMD GPU + system FFmpeg |
| **Motion Blur** | Cinematic frame blending |
| **Webcam Bubble** | Picture-in-picture overlay |

### Platform Presets
- **YouTube:** 1080p, 720p, 4K, Shorts (9:16)
- **Instagram:** Feed (1:1), Story/Reels (9:16), Landscape (1.91:1)
- **TikTok:** 9:16
- **Twitter/X:** Landscape, Square, Portrait
- **LinkedIn:** Landscape, Square, Portrait
- **Pinterest:** Pin (2:3), Square
- **Twitch:** 1080p, 720p
- **Vimeo:** 1080p, 4K

---

## Annotations

Draw directly on the webpage during recording or preparation.

### Tools
- **↖ Select** — Select, move, resize, or delete objects
- **➤ Arrow** — Draw arrows
- **▢ Rectangle** — Draw rectangles
- **○ Circle** — Draw ellipses
- **🖌️ Highlight** — Freehand highlighter
- **T Text** — Double-click to place text

### Interactive Editing
- **Click** an object to select it
- **Drag** to move
- **Drag corner handles** to resize
- **Press Delete/Backspace** to remove selected object
- **Undo** with the undo button

### How to Enable
1. Click **🎨 Annotate** in the toolbar
2. Select a tool
3. Choose color and size
4. Draw on the page

---

## Auto-Zoom

Blazeycc can automatically zoom to your cursor on every click during recording — just like Screen Studio.

### Settings
- **Enable auto-zoom** — toggle on/off
- **Zoom level** — 1.1x to 3.0x (default 1.6x)
- **Duration** — how long to stay zoomed (500ms–5000ms)

The zoom is smooth and animated with easing. It zooms back out automatically after the set duration.

---

## Motion Blur

Enable **Motion Blur** in Settings for a cinematic look. It blends consecutive frames, creating a natural motion trail effect similar to high-end screen recorders.

- Slightly slower export
- Best paired with 15+ FPS
- Great for product demos and tutorials

---

## Webcam Bubble

Enable **Webcam Bubble** in Settings to overlay your webcam in the bottom-right corner of recordings.

- 120×90px overlay (scaled proportionally)
- Perfect for tutorials and reaction videos
- Recorded separately and composited in post

---

## AI Assist (Ollama)

Generate YouTube titles, descriptions, and hashtags automatically from any website.

### Setup
1. Install [Ollama](https://ollama.com/download)
2. Run: `ollama pull llama3.2`
3. Blazeycc will auto-detect Ollama

### Usage
1. Load a website
2. Click **✨ AI Assist**
3. Click **Generate**
4. Copy the results to your video platform

---

## Batch Recording

Record multiple URLs back-to-back automatically.

1. Go to **⚙️ Settings** → enable **Batch Recording**
2. Enter URLs (one per line)
3. Set duration per URL
4. Click **Start Batch**

Blazeycc will load each URL, record for the set duration, and save automatically.

---

## Scheduled Recording

Set up recordings to happen automatically at a future time.

1. Go to **⚙️ Settings** → enable **Scheduled Recording**
2. Enter URL, time, and duration
3. Blazeycc will start recording automatically

Great for:
- Monitoring websites
- Capturing live events
- Automated documentation

---

## Trimming Videos

After recording, the **Preview Modal** appears with a visual timeline.

### How to Trim
1. Drag the **left handle** to set start time
2. Drag the **right handle** to set end time
3. Click **✂️ Apply Trim & Re-encode**

The trimmed video is saved as a new file.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Load URL |
| `Ctrl/Cmd + =` | Zoom in |
| `Ctrl/Cmd + -` | Zoom out |
| `Ctrl/Cmd + 0` | Reset zoom |
| `Delete` | Remove selected annotation |

---

## Troubleshooting

### "FFmpeg not found"
- Install FFmpeg via your package manager (see GPU help in Settings for commands)
- Or use the bundled FFmpeg (GPU encoding won't work)

### "Ollama not running"
- Install Ollama from [ollama.com](https://ollama.com/download)
- Run `ollama pull llama3.2`
- Click **Test Connection** in Settings

### Recording is choppy
- Increase frame rate to 15 or 30 FPS in Settings
- Enable GPU encoding if available
- Close other apps to free up CPU

### Dropped frames warning
- Lower the frame rate
- Disable motion blur
- Use a simpler preset (lower resolution)

### Audio not captured
- Ensure the website has playable audio/video
- Audio capture only works with `<audio>` and `<video>` elements
- Some sites block audio capture due to CORS

### Webcam not working
- Ensure your browser/OS allows camera access
- Check that no other app is using the camera
- Restart Blazeycc

---

## Tips for Best Results

1. **Use presets** — They guarantee the right aspect ratio for your platform
2. **Zoom before recording** — Set up the perfect view first
3. **Use annotations** — Highlight key areas with arrows and rectangles
4. **Enable auto-zoom** — Makes tutorials feel professional
5. **Use 15 FPS** — Best balance of smoothness and file size
6. **Enable GPU encoding** — 2-5x faster exports
7. **Test trim before long recordings** — Verify your settings with a short clip

---

## Support

- GitHub Issues: [github.com/kennethyork/Blazeycc/issues](https://github.com/kennethyork/Blazeycc/issues)
- License: GPL-3.0
