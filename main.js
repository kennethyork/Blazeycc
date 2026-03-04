const { app, BrowserWindow, ipcMain, desktopCapturer, dialog, webContents, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const Store = require('electron-store').default || require('electron-store');

// Get ffmpeg path - handle both dev and packaged scenarios
function getFFmpegPath() {
    let ffmpegPath = require('ffmpeg-static');
    
    // When packaged, ffmpeg-static is unpacked from asar
    if (app.isPackaged) {
        ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
    }
    
    return ffmpegPath;
}

// Force CPU-only rendering - completely disable GPU
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-accelerated-video-encode');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-webgl');
app.commandLine.appendSwitch('disable-webgl2');
app.commandLine.appendSwitch('use-gl', 'swiftshader');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('in-process-gpu');

// Set ffmpeg path after app is ready
app.on('ready', () => {
    ffmpeg.setFfmpegPath(getFFmpegPath());
});

// Initialize store for settings, bookmarks, and history
const store = new Store({
    defaults: {
        savePath: path.join(os.homedir(), 'Downloads'),
        bookmarks: [],
        history: [],
        theme: 'dark'
    }
});

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webviewTag: true // Enable webview tag
        },
        title: 'URL to Video Recorder'
    });

    mainWindow.loadFile('index.html');
    
    // Handle certificate errors for webview
    session.defaultSession.setCertificateVerifyProc((request, callback) => {
        // Accept all certificates (for webview sites)
        callback(0);
    });
    
    // Open DevTools in development
    // mainWindow.webContents.openDevTools();
}

// Get the webview's webContents ID for capture
ipcMain.handle('get-webview-source', async (event, webviewId) => {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['window'],
            thumbnailSize: { width: 1, height: 1 }
        });
        
        // Find the main window source
        const mainWindowSource = sources.find(s => 
            s.name === 'URL to Video Recorder' || s.name.includes('URL to Video')
        );
        
        if (mainWindowSource) {
            return { success: true, sourceId: mainWindowSource.id };
        }
        
        // Fallback to first window
        if (sources.length > 0) {
            return { success: true, sourceId: sources[0].id };
        }
        
        return { success: false, error: 'No source found' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Save video file (with MP4/GIF conversion and resize)
ipcMain.handle('save-video', async (event, { filename, data, format, quality, width, height }) => {
    try {
        const savePath = store.get('savePath');
        
        // Ensure save directory exists
        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath, { recursive: true });
        }

        // Sanitize filename
        const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const buffer = Buffer.from(data);
        
        // If no format conversion (e.g., screenshots), save directly
        if (!format || format === 'raw') {
            let finalPath = path.join(savePath, safeFilename);
            
            // Handle duplicate filenames
            if (fs.existsSync(finalPath)) {
                const timestamp = Date.now();
                const ext = path.extname(safeFilename);
                const name = path.basename(safeFilename, ext);
                finalPath = path.join(savePath, `${name}-${timestamp}${ext}`);
            }
            
            fs.writeFileSync(finalPath, buffer);
            return { success: true, path: finalPath };
        }

        // Write WebM first for conversion (use temp suffix to avoid conflict)
        const tempWebmPath = path.join(savePath, safeFilename.replace(/\.(mp4|gif|webm)$/, '_temp.webm'));
        fs.writeFileSync(tempWebmPath, buffer);

        // Quality presets (CRF: lower = better quality, larger file)
        const crfValues = { 'low': 28, 'medium': 23, 'high': 18, 'ultra': 15 };
        const crf = crfValues[quality] || 23;

        // Build output path
        const outputExt = format === 'gif' ? '.gif' : format === 'webm' ? '.webm' : '.mp4';
        const outputFilename = safeFilename.replace(/\.(webm|mp4|gif)$/, outputExt);
        let outputPath = path.join(savePath, outputFilename);
        
        // WebM: if no resize needed, just rename the temp file
        if (format === 'webm' && !width && !height) {
            if (fs.existsSync(outputPath)) {
                const timestamp = Date.now();
                const name = path.basename(outputFilename, outputExt);
                outputPath = path.join(savePath, `${name}-${timestamp}${outputExt}`);
            }
            fs.renameSync(tempWebmPath, outputPath);
            return { success: true, path: outputPath };
        }
        
        // Handle duplicate filenames
        if (fs.existsSync(outputPath)) {
            const timestamp = Date.now();
            const name = path.basename(outputFilename, outputExt);
            outputPath = path.join(savePath, `${name}-${timestamp}${outputExt}`);
        }

        return new Promise((resolve) => {
            let cmd = ffmpeg(tempWebmPath);
            let duration = 0;
            
            // Get duration first for progress calculation
            cmd.ffprobe(tempWebmPath, (err, metadata) => {
                if (metadata && metadata.format) {
                    duration = metadata.format.duration || 0;
                }
            });
            
            if (format === 'gif') {
                // GIF conversion with palette generation for better quality
                const fps = quality === 'ultra' ? 15 : quality === 'high' ? 12 : quality === 'medium' ? 10 : 8;
                let filters = `fps=${fps}`;
                
                if (width && height) {
                    filters += `,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
                }
                
                filters += ',split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5';
                
                cmd.outputOptions([`-vf ${filters}`, '-loop 0']);
            } else if (format === 'webm') {
                // WebM with resize
                const outputOptions = [
                    '-c:v libvpx-vp9',
                    `-crf ${crf}`,
                    '-b:v 0'
                ];
                
                if (width && height) {
                    outputOptions.push(`-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`);
                }
                
                cmd.outputOptions(outputOptions);
            } else {
                // MP4 conversion
                const outputOptions = [
                    '-c:v libx264',
                    '-preset medium',
                    `-crf ${crf}`,
                    '-pix_fmt yuv420p',
                    '-movflags +faststart'
                ];
                
                if (width && height) {
                    outputOptions.push(`-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`);
                }
                
                cmd.outputOptions(outputOptions);
            }
            
            cmd.output(outputPath)
                .on('progress', (progress) => {
                    // Send progress to renderer
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        const percent = progress.percent || 0;
                        mainWindow.webContents.send('ffmpeg-progress', { percent: Math.round(percent) });
                    }
                })
                .on('end', () => {
                    // Remove temporary WebM file
                    try { fs.unlinkSync(tempWebmPath); } catch (e) {}
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('ffmpeg-progress', { percent: 100, done: true });
                    }
                    resolve({ success: true, path: outputPath });
                })
                .on('error', (err) => {
                    resolve({ success: false, error: err.message });
                })
                .run();
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Bookmarks management
ipcMain.handle('get-bookmarks', async () => {
    return store.get('bookmarks', []);
});

ipcMain.handle('add-bookmark', async (event, { url, title, favicon }) => {
    const bookmarks = store.get('bookmarks', []);
    const exists = bookmarks.find(b => b.url === url);
    if (!exists) {
        bookmarks.push({ url, title, favicon, addedAt: Date.now() });
        store.set('bookmarks', bookmarks);
    }
    return bookmarks;
});

ipcMain.handle('remove-bookmark', async (event, url) => {
    const bookmarks = store.get('bookmarks', []).filter(b => b.url !== url);
    store.set('bookmarks', bookmarks);
    return bookmarks;
});

// Recording history management
ipcMain.handle('get-history', async () => {
    return store.get('history', []);
});

ipcMain.handle('add-history', async (event, record) => {
    const history = store.get('history', []);
    history.unshift({ ...record, recordedAt: Date.now() });
    // Keep last 50 recordings
    if (history.length > 50) history.pop();
    store.set('history', history);
    return history;
});

ipcMain.handle('clear-history', async () => {
    store.set('history', []);
    return [];
});

ipcMain.handle('delete-history-item', async (event, filePath) => {
    const history = store.get('history', []).filter(h => h.path !== filePath);
    store.set('history', history);
    return history;
});

// Save path management
ipcMain.handle('get-save-path', async () => {
    return store.get('savePath');
});

ipcMain.handle('set-save-path', async (event, newPath) => {
    store.set('savePath', newPath);
    return newPath;
});

ipcMain.handle('select-save-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: store.get('savePath')
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        const newPath = result.filePaths[0];
        store.set('savePath', newPath);
        return { success: true, path: newPath };
    }
    return { success: false };
});

// Open file in system file manager
ipcMain.handle('open-in-folder', async (event, filePath) => {
    const { shell } = require('electron');
    shell.showItemInFolder(filePath);
    return { success: true };
});

// Theme management
ipcMain.handle('get-theme', async () => {
    return store.get('theme', 'dark');
});

ipcMain.handle('set-theme', async (event, theme) => {
    store.set('theme', theme);
    return theme;
});

app.whenReady().then(createWindow);

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
