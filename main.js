const { app, BrowserWindow, ipcMain, desktopCapturer, dialog, webContents, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const Store = require('electron-store').default || require('electron-store');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// GPU encoder detection cache
let detectedGpuEncoder = null;

// Detect available GPU hardware encoder by running a test encode
async function detectGpuEncoder() {
    if (detectedGpuEncoder) return detectedGpuEncoder;
    
    const ffmpegPath = getFFmpegPath();
    if (!ffmpegPath) {
        console.log('No FFmpeg path found, cannot detect GPU encoder');
        detectedGpuEncoder = { available: false, h264: null, vp9: null, name: null };
        return detectedGpuEncoder;
    }
    
    console.log('Detecting GPU encoders using FFmpeg:', ffmpegPath);
    
    // Test H.264 encoders first (most compatible)
    const h264Encoders = [
        { codec: 'h264_nvenc', name: 'NVIDIA NVENC' },
        { codec: 'h264_amf', name: 'AMD AMF' },
        { codec: 'h264_qsv', name: 'Intel Quick Sync' }
    ];
    
    let detectedH264 = null;
    let detectedName = null;
    
    for (const enc of h264Encoders) {
        try {
            const testResult = await new Promise((resolve) => {
                const { execFile } = require('child_process');
                execFile(ffmpegPath, ['-f', 'lavfi', '-i', 'nullsrc=s=320x240:d=0.1', '-c:v', enc.codec, '-f', 'null', '-'], { timeout: 5000 }, (err, stdout, stderr) => {
                    const output = (stderr || '') + (stdout || '');
                    console.log(`Testing ${enc.codec}:`, err ? 'exit code ' + err.code : 'success', output.substring(0, 200));
                    
                    // Encoder works if output contains encoding progress stats
                    const success = output.includes('frame=') || output.includes('size=') || output.includes('bitrate=');
                    const knownFailure = output.includes('Unknown encoder') || 
                                         output.includes('not found') || 
                                         output.includes('No NVENC') || 
                                         output.includes('init failed') || 
                                         output.includes('not supported') ||
                                         output.includes('Cannot load');
                    
                    resolve(success && !knownFailure);
                });
            });
            
            if (testResult) {
                detectedH264 = enc.codec;
                detectedName = enc.name;
                break;
            }
        } catch (e) {
            console.log(`Error testing ${enc.codec}:`, e.message);
        }
    }
    
    if (!detectedH264) {
        console.log('No GPU encoder detected, falling back to CPU (libx264)');
        detectedGpuEncoder = { available: false, h264: null, vp9: null, name: null };
        return detectedGpuEncoder;
    }
    
    // Also test VP9 GPU encoder for WebM support
    let detectedVp9 = null;
    if (detectedH264 === 'h264_nvenc') {
        detectedVp9 = 'vp9_nvenc';
    } else if (detectedH264 === 'h264_qsv') {
        detectedVp9 = 'vp9_qsv';
    }
    
    if (detectedVp9) {
        try {
            const vp9Test = await new Promise((resolve) => {
                const { execFile } = require('child_process');
                execFile(ffmpegPath, ['-f', 'lavfi', '-i', 'nullsrc=s=320x240:d=0.1', '-c:v', detectedVp9, '-f', 'null', '-'], { timeout: 5000 }, (err, stdout, stderr) => {
                    const output = (stderr || '') + (stdout || '');
                    const success = output.includes('frame=') || output.includes('size=');
                    const knownFailure = output.includes('Unknown encoder') || output.includes('not found') || output.includes('init failed');
                    resolve(success && !knownFailure);
                });
            });
            if (!vp9Test) detectedVp9 = null;
        } catch (e) {
            detectedVp9 = null;
        }
    }
    
    console.log('GPU encoder detected:', detectedName, '- H.264:', detectedH264, '- VP9:', detectedVp9 || 'not available');
    detectedGpuEncoder = { available: true, h264: detectedH264, vp9: detectedVp9, name: detectedName };
    return detectedGpuEncoder;
}

// Get ffmpeg path - handle both dev and packaged scenarios
function getFFmpegPath() {
    let ffmpegPath;
    
    // Check for system-installed FFmpeg first (may have GPU encoders like NVENC)
    const systemPaths = [
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
        '/opt/homebrew/bin/ffmpeg',
        'C:\\ffmpeg\\bin\\ffmpeg.exe'
    ];
    
    for (const sysPath of systemPaths) {
        if (fs.existsSync(sysPath)) {
            console.log('Using system FFmpeg:', sysPath);
            return sysPath;
        }
    }
    
    // When packaged, check extraResources first
    if (app.isPackaged) {
        const extraResourcesPath = path.join(process.resourcesPath, 'ffmpeg');
        const extraResourcesPathExe = path.join(process.resourcesPath, 'ffmpeg.exe');
        
        if (fs.existsSync(extraResourcesPath)) {
            console.log('Using extraResources ffmpeg:', extraResourcesPath);
            return extraResourcesPath;
        }
        if (fs.existsSync(extraResourcesPathExe)) {
            console.log('Using extraResources ffmpeg:', extraResourcesPathExe);
            return extraResourcesPathExe;
        }
    }
    
    try {
        ffmpegPath = require('ffmpeg-static');
    } catch (e) {
        console.error('Failed to load ffmpeg-static:', e);
        return null;
    }
    
    // When packaged, ffmpeg-static is unpacked from asar
    if (app.isPackaged) {
        // Handle various path formats
        if (ffmpegPath && ffmpegPath.includes('app.asar')) {
            ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
        }
        
        // Verify the file exists
        if (!fs.existsSync(ffmpegPath)) {
            // Try alternative paths
            const alternatives = [
                path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg'),
                path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
                path.join(__dirname, '..', 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg'),
                path.join(__dirname, '..', 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
                path.join(process.resourcesPath, 'ffmpeg'),
                path.join(process.resourcesPath, 'ffmpeg.exe')
            ];
            
            for (const alt of alternatives) {
                if (fs.existsSync(alt)) {
                    ffmpegPath = alt;
                    break;
                }
            }
        }
    }
    
    console.log('FFmpeg path:', ffmpegPath);
    console.log('FFmpeg exists:', ffmpegPath ? fs.existsSync(ffmpegPath) : false);
    
    return ffmpegPath;
}

// Disable GPU sandbox for compatibility, but keep hardware acceleration
// for UI smoothness. GPU encoding is handled separately by FFmpeg.
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');

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
        theme: 'dark',
        gpuEncoding: false,
        frameRate: 15
    }
});

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 700,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webviewTag: true // Enable webview tag
        },
        title: 'Blazeycc'
    });

    // Use app:// protocol for packaged app to avoid file path issues
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    
    // Log when page loads successfully
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Page loaded successfully');
    });
    
    // Handle certificate errors for webview
    session.defaultSession.setCertificateVerifyProc((request, callback) => {
        // Accept all certificates (for webview sites)
        callback(0);
    });
    
    // Debug: show error if page fails to load
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL) => {
        console.error('Failed to load:', errorCode, errorDesc, validatedURL);
    });
    
    // F12 to open DevTools
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') {
            mainWindow.webContents.toggleDevTools();
        }
    });
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
            s.name === 'Blazeycc' || s.name.includes('Blazeycc')
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
ipcMain.handle('save-video', async (event, { filename, data, format, quality, width, height, proSettings }) => {
    const settings = proSettings || {};
    const useFastEncode = settings.fastEncode;
    const customWatermark = settings.customWatermark;
    
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
                
                // Custom watermark (if configured)
                if (customWatermark && customWatermark.type === 'text' && customWatermark.text) {
                    const pos = { 'bottom-left': 'x=10:y=h-35', 'bottom-right': 'x=w-tw-10:y=h-35', 'top-left': 'x=10:y=10', 'top-right': 'x=w-tw-10:y=10' }[customWatermark.position || 'bottom-left'];
                    filters += `,drawtext=text='${customWatermark.text.replace(/'/g, "\\'").replace(/:/g, "\\:")}':fontsize=20:fontcolor=white@0.7:${pos}:shadowcolor=black@0.3:shadowx=1:shadowy=1`;
                }
                
                filters += ',split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5';
                
                cmd.outputOptions([`-vf ${filters}`, '-loop 0']);
            } else if (format === 'webm') {
                // WebM with resize
                const outputOptions = [
                    '-c:v libvpx-vp9',
                    `-crf ${crf}`,
                    '-b:v 0',
                    useFastEncode ? '-deadline realtime -cpu-used 8' : '-deadline good -cpu-used 4'
                ];
                
                let vfFilters = [];
                
                if (width && height) {
                    vfFilters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`);
                }
                
                // Custom watermark (if configured)
                if (customWatermark && customWatermark.type === 'text' && customWatermark.text) {
                    const pos = { 'bottom-left': 'x=10:y=h-35', 'bottom-right': 'x=w-tw-10:y=h-35', 'top-left': 'x=10:y=10', 'top-right': 'x=w-tw-10:y=10' }[customWatermark.position || 'bottom-left'];
                    vfFilters.push(`drawtext=text='${customWatermark.text.replace(/'/g, "\\'").replace(/:/g, "\\:")}':fontsize=20:fontcolor=white@0.7:${pos}:shadowcolor=black@0.3:shadowx=1:shadowy=1`);
                }
                
                if (vfFilters.length > 0) {
                    outputOptions.push(`-vf ${vfFilters.join(',')}`);
                }
                
                cmd.outputOptions(outputOptions);
            } else {
                // MP4 conversion
                const preset = useFastEncode ? 'ultrafast' : 'medium';
                const outputOptions = [
                    '-c:v libx264',
                    `-preset ${preset}`,
                    `-crf ${crf}`,
                    '-pix_fmt yuv420p',
                    '-movflags +faststart'
                ];
                
                let vfFilters = [];
                
                if (width && height) {
                    vfFilters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`);
                }
                
                // Custom watermark (if configured)
                if (customWatermark && customWatermark.type === 'text' && customWatermark.text) {
                    const pos = { 'bottom-left': 'x=10:y=h-35', 'bottom-right': 'x=w-tw-10:y=h-35', 'top-left': 'x=10:y=10', 'top-right': 'x=w-tw-10:y=10' }[customWatermark.position || 'bottom-left'];
                    vfFilters.push(`drawtext=text='${customWatermark.text.replace(/'/g, "\\'").replace(/:/g, "\\:")}':fontsize=20:fontcolor=white@0.7:${pos}:shadowcolor=black@0.3:shadowx=1:shadowy=1`);
                }
                
                if (vfFilters.length > 0) {
                    outputOptions.push(`-vf ${vfFilters.join(',')}`);
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

// Recording history management (local only)
ipcMain.handle('get-history', async () => {
    return store.get('history', []);
});

ipcMain.handle('add-history', async (event, record) => {
    const history = store.get('history', []);
    const newRecord = { ...record, recordedAt: Date.now() };
    history.unshift(newRecord);
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
    const history = store.get('history', []);
    const newHistory = history.filter(h => h.path !== filePath);
    store.set('history', newHistory);
    return newHistory;
});

// Export to YouTube - opens YouTube Studio upload page
ipcMain.handle('export-to-youtube', async (event, filePath) => {
    const { shell } = require('electron');
    shell.openExternal('https://studio.youtube.com/channel/upload');
    shell.showItemInFolder(filePath);
    return { success: true, message: 'YouTube Studio opened. Drag your video to upload.' };
});

// Export to Vimeo - opens Vimeo upload page
ipcMain.handle('export-to-vimeo', async (event, filePath) => {
    const { shell } = require('electron');
    shell.openExternal('https://vimeo.com/upload');
    shell.showItemInFolder(filePath);
    return { success: true, message: 'Vimeo opened. Drag your video to upload.' };
});
        


// Copy to clipboard
ipcMain.handle('copy-to-clipboard', async (event, text) => {
    const { clipboard } = require('electron');
    clipboard.writeText(text);
    return { success: true };
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
    console.log('IPC: select-save-folder called');
    try {
        // Use focused window or fall back to mainWindow
        const { BrowserWindow } = require('electron');
        let parentWindow = BrowserWindow.getFocusedWindow();
        if (!parentWindow && mainWindow && !mainWindow.isDestroyed()) {
            parentWindow = mainWindow;
            parentWindow.focus();
        }
        console.log('Opening dialog with parentWindow:', !!parentWindow);
        const result = await dialog.showOpenDialog(parentWindow, {
            properties: ['openDirectory', 'createDirectory'],
            defaultPath: store.get('savePath')
        });
        console.log('Dialog result:', result);

        if (!result.canceled && result.filePaths.length > 0) {
            const newPath = result.filePaths[0];
            store.set('savePath', newPath);
            return { success: true, path: newPath };
        }
        return { success: false };
    } catch (err) {
        console.error('select-save-folder error:', err);
        return { success: false, error: err.message };
    }
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

// GPU encoding settings
ipcMain.handle('get-gpu-encoding', async () => {
    return store.get('gpuEncoding', false);
});

ipcMain.handle('set-gpu-encoding', async (event, enabled) => {
    store.set('gpuEncoding', enabled);
    return enabled;
});

ipcMain.handle('detect-gpu-encoder', async () => {
    return detectGpuEncoder();
});

// Frame rate settings
ipcMain.handle('get-frame-rate', async () => {
    return store.get('frameRate', 5);
});

ipcMain.handle('set-frame-rate', async (event, fps) => {
    store.set('frameRate', fps);
    return fps;
});

// Scheduled recordings storage
ipcMain.handle('get-scheduled-recordings', async () => {
    return store.get('scheduledRecordings', []);
});

ipcMain.handle('add-scheduled-recording', async (event, schedule) => {
    const schedules = store.get('scheduledRecordings', []);
    const newSchedule = {
        id: Date.now().toString(),
        ...schedule,
        createdAt: new Date().toISOString()
    };
    schedules.push(newSchedule);
    store.set('scheduledRecordings', schedules);
    return schedules;
});

ipcMain.handle('remove-scheduled-recording', async (event, id) => {
    const schedules = store.get('scheduledRecordings', []).filter(s => s.id !== id);
    store.set('scheduledRecordings', schedules);
    return schedules;
});

// Batch URLs storage
ipcMain.handle('get-batch-urls', async () => {
    return store.get('batchUrls', []);
});

ipcMain.handle('set-batch-urls', async (event, urls) => {
    store.set('batchUrls', urls);
    return urls;
});

// Pro settings: Custom watermark
ipcMain.handle('get-custom-watermark', async () => {
    return store.get('customWatermark', { type: 'none', text: '', position: 'bottom-left', imagePath: null });
});

ipcMain.handle('set-custom-watermark', async (event, settings) => {
    store.set('customWatermark', settings);
    return settings;
});

// Pro settings: Fast encoding preference
ipcMain.handle('get-fast-encode', async () => {
    return store.get('fastEncode', false);
});

ipcMain.handle('set-fast-encode', async (event, enabled) => {
    store.set('fastEncode', enabled);
    return enabled;
});

// Ollama config
ipcMain.handle('get-ollama-config', async () => {
    return store.get('ollamaConfig', { endpoint: 'http://localhost:11434', model: 'llama3.2' });
});

ipcMain.handle('set-ollama-config', async (event, config) => {
    store.set('ollamaConfig', config);
    return config;
});

// Open external URL
ipcMain.handle('open-external', async (event, url) => {
    shell.openExternal(url);
    return true;
});

// Select watermark image
ipcMain.handle('select-watermark-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
});

// Pre-flight validation helpers
ipcMain.handle('check-ffmpeg', async () => {
    try {
        const ffmpegPath = getFfmpegPath();
        if (!ffmpegPath) return { available: false };
        // Quick check: run ffmpeg -version
        const { execSync } = require('child_process');
        execSync(`"${ffmpegPath}" -version`, { stdio: 'ignore' });
        return { available: true };
    } catch (e) {
        return { available: false };
    }
});

ipcMain.handle('get-disk-space', async (event, dirPath) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const checkPath = dirPath || app.getPath('downloads');
        const stats = fs.statSync(checkPath);
        // On POSIX systems, use df. On Windows, use wmic.
        const os = require('os');
        if (os.platform() === 'win32') {
            // Windows: get drive letter from path
            const drive = path.parse(checkPath).root;
            const { execSync } = require('child_process');
            const out = execSync(`wmic logicaldisk where "DeviceID='${drive.replace('\\', '')}'" get FreeSpace`, { encoding: 'utf8' });
            const freeBytes = parseInt(out.replace(/\D/g, ''));
            return { freeBytes };
        } else {
            const { execSync } = require('child_process');
            const out = execSync(`df -P "${checkPath}" | tail -1 | awk '{print $4}'`, { encoding: 'utf8' });
            const freeBlocks = parseInt(out.trim());
            return { freeBytes: freeBlocks * 512 };
        }
    } catch (e) {
        return { freeBytes: null };
    }
});

app.whenReady().then(() => {
    createWindow();
    
    // Check for updates after window is ready (delay to not block startup)
    setTimeout(() => {
        if (app.isPackaged) {
            autoUpdater.checkForUpdates().catch(err => {
                console.log('Update check failed:', err.message);
            });
        }
    }, 3000);
});

// =====================
// AUTO-UPDATE HANDLERS
// =====================

autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes
        });
    }
});

autoUpdater.on('update-not-available', () => {
    console.log('App is up to date');
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-not-available');
    }
});

autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${Math.round(progress.percent)}%`);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-progress', {
            percent: progress.percent,
            bytesPerSecond: progress.bytesPerSecond,
            transferred: progress.transferred,
            total: progress.total
        });
    }
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded', {
            version: info.version
        });
    }
});

autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-error', { error: err.message });
    }
});

// IPC handlers for auto-update
ipcMain.handle('check-for-updates', async () => {
    try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, updateInfo: result?.updateInfo };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('download-update', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Handle uncaught exceptions to prevent crashes
// Canvas-based recording state
let canvasRecordingSession = null;
let pendingFrameWrites = 0;

// Audio capture state
let audioRecordingSession = null;

// Audio enabled setting
ipcMain.handle('get-audio-enabled', async () => {
    return store.get('audioEnabled', false);
});

ipcMain.handle('set-audio-enabled', async (event, enabled) => {
    store.set('audioEnabled', enabled);
    return enabled;
});

// Start audio capture from webview
ipcMain.handle('start-audio-capture', async (event, webContentsId) => {
    try {
        const tempDir = path.join(os.tmpdir(), `blazeycc-audio-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
        
        audioRecordingSession = {
            tempDir,
            audioPath: path.join(tempDir, 'audio.webm'),
            chunks: [],
            startTime: Date.now()
        };
        
        console.log('Audio recording started, temp dir:', tempDir);
        return { success: true, audioPath: audioRecordingSession.audioPath };
    } catch (error) {
        console.error('Failed to start audio capture:', error);
        return { success: false, error: error.message };
    }
});

// Save audio chunk
ipcMain.handle('save-audio-chunk', async (event, chunkData) => {
    if (!audioRecordingSession) {
        return { success: false, error: 'No active audio session' };
    }
    
    try {
        const buffer = Buffer.from(chunkData, 'base64');
        audioRecordingSession.chunks.push(buffer);
        return { success: true };
    } catch (error) {
        console.error('Failed to save audio chunk:', error);
        return { success: false, error: error.message };
    }
});

// Stop audio capture and save file
ipcMain.handle('stop-audio-capture', async () => {
    if (!audioRecordingSession) {
        return { success: false, error: 'No active audio session' };
    }
    
    try {
        // Combine all chunks and write to file
        const audioBuffer = Buffer.concat(audioRecordingSession.chunks);
        fs.writeFileSync(audioRecordingSession.audioPath, audioBuffer);
        
        console.log('Audio saved to:', audioRecordingSession.audioPath, 'size:', audioBuffer.length);
        return { success: true, audioPath: audioRecordingSession.audioPath };
    } catch (error) {
        console.error('Failed to stop audio capture:', error);
        return { success: false, error: error.message };
    }
});

// Clear audio session
ipcMain.handle('cancel-audio-capture', async () => {
    if (audioRecordingSession?.tempDir) {
        try {
            fs.rmSync(audioRecordingSession.tempDir, { recursive: true, force: true });
        } catch (e) {}
    }
    audioRecordingSession = null;
    return { success: true };
});

ipcMain.handle('start-canvas-recording', async () => {
    try {
        // Create temp directory for frames
        const tempDir = path.join(os.tmpdir(), `blazeycc-recording-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
        
        pendingFrameWrites = 0;
        canvasRecordingSession = {
            tempDir,
            frameCount: 0,
            startTime: Date.now(),
            fps: 5
        };
        
        console.log('Canvas recording started, temp dir:', tempDir);
        return { success: true, sessionId: tempDir };
    } catch (error) {
        console.error('Failed to start canvas recording:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('capture-frame', async (event, frameData) => {
    if (!canvasRecordingSession) {
        return { success: false, error: 'No active recording session' };
    }
    
    try {
        const frameNumber = canvasRecordingSession.frameCount++;
        const framePath = path.join(canvasRecordingSession.tempDir, `frame_${String(frameNumber).padStart(6, '0')}.png`);
        
        // frameData is base64 PNG data - use async write to avoid blocking
        const base64Data = frameData.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Track pending writes
        pendingFrameWrites++;
        fs.promises.writeFile(framePath, buffer)
            .then(() => pendingFrameWrites--)
            .catch(err => {
                pendingFrameWrites--;
                console.error('Frame write error:', err);
            });
        
        return { success: true, frameNumber };
    } catch (error) {
        console.error('Failed to capture frame:', error);
        return { success: false, error: error.message };
    }
});

// Capture frame from raw buffer (avoids base64 corruption)
ipcMain.handle('capture-frame-buffer', async (event, buffer) => {
    if (!canvasRecordingSession) {
        return { success: false, error: 'No active recording session' };
    }
    
    try {
        const frameNumber = canvasRecordingSession.frameCount++;
        const framePath = path.join(canvasRecordingSession.tempDir, `frame_${String(frameNumber).padStart(6, '0')}.png`);
        
        // buffer is a Uint8Array/Buffer sent directly over IPC
        const nodeBuffer = Buffer.from(buffer);
        
        // Track pending writes
        pendingFrameWrites++;
        fs.promises.writeFile(framePath, nodeBuffer)
            .then(() => pendingFrameWrites--)
            .catch(err => {
                pendingFrameWrites--;
                console.error('Frame write error:', err);
            });
        
        return { success: true, frameNumber };
    } catch (error) {
        console.error('Failed to capture frame buffer:', error);
        return { success: false, error: error.message };
    }
});

// Capture the current webview/window frame
ipcMain.handle('capture-webview-frame', async (event, webContentsId) => {
    try {
        let targetWebContents;
        
        // If webContentsId provided, capture that specific webContents (the webview)
        if (webContentsId) {
            const { webContents } = require('electron');
            targetWebContents = webContents.fromId(webContentsId);
        }
        
        // Fallback to main window
        if (!targetWebContents && mainWindow) {
            targetWebContents = mainWindow.webContents;
        }
        
        if (!targetWebContents) {
            return { success: false, error: 'No target to capture' };
        }
        
        const image = await targetWebContents.capturePage();
        const pngBuffer = image.toPNG();
        const base64Data = 'data:image/png;base64,' + pngBuffer.toString('base64');
        
        return { success: true, data: base64Data };
    } catch (error) {
        console.error('Failed to capture webview frame:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-canvas-recording', async (event, { format, quality, width, height, proSettings }) => {
    if (!canvasRecordingSession || canvasRecordingSession.frameCount === 0) {
        return { success: false, error: 'No frames captured' };
    }
    
    try {
        const { tempDir, frameCount, startTime, fps } = canvasRecordingSession;
        const duration = (Date.now() - startTime) / 1000;
        const actualFps = Math.round(frameCount / duration) || fps;
        
        console.log(`Canvas recording stopped: ${frameCount} frames in ${duration}s (${actualFps} fps)`);
        
        // Wait for all pending frame writes to complete (max 10 seconds)
        let waitTime = 0;
        while (pendingFrameWrites > 0 && waitTime < 10000) {
            console.log(`Waiting for ${pendingFrameWrites} pending frame writes...`);
            await new Promise(resolve => setTimeout(resolve, 200));
            waitTime += 200;
        }
        console.log('All frame writes completed');
        
        // Generate output filename
        const savePath = store.get('savePath', path.join(os.homedir(), 'Downloads'));
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outputFormat = format || 'mp4';
        const outputPath = path.join(savePath, `blazeycc_${timestamp}.${outputFormat}`);
        
        const settings = proSettings || {};
        const useFastEncode = settings.fastEncode;
        
        // Build FFmpeg command
        const inputPattern = path.join(tempDir, 'frame_%06d.png');
        
        // Check for audio file to merge
        const audioPath = settings.audioPath;
        const hasAudio = audioPath && fs.existsSync(audioPath);
        
        console.log('Audio merge check:', { hasAudio, audioPath });
        
        // Check GPU encoding preference
        const gpuEncodingEnabled = store.get('gpuEncoding', false);
        const gpuEncoder = gpuEncodingEnabled ? await detectGpuEncoder() : { available: false };
        const useGpu = gpuEncoder.available;
        const gpuH264 = useGpu ? gpuEncoder.h264 : null;
        const gpuVp9 = useGpu ? gpuEncoder.vp9 : null;
        
        console.log('GPU encoding:', { enabled: gpuEncodingEnabled, available: gpuEncoder.available, h264: gpuH264, vp9: gpuVp9, name: gpuEncoder.name });
        
        return new Promise((resolve, reject) => {
            let command = ffmpeg()
                .input(inputPattern)
                .inputFPS(actualFps)
                .fps(30);
            
            // Apply trim if specified
            const trimStart = settings.trimStart || 0;
            const trimEnd = settings.trimEnd || 0;
            if (trimStart > 0) {
                command = command.seekInput(trimStart);
            }
            
            // Add audio input if available
            if (hasAudio) {
                command = command.input(audioPath);
                if (trimStart > 0) {
                    command = command.inputOptions(`-ss ${trimStart}`);
                }
            }
            
            // Add webcam input if needed
            const webcamPath = settings.webcamPath;
            const hasWebcam = webcamPath && fs.existsSync(webcamPath);
            if (hasWebcam) {
                command = command.input(webcamPath);
            }

            // Build complex filter for resize + motion blur + webcam
            // Input indices: 0=frames, 1=audio?, 2=webcam?
            let nextInputIdx = 1;
            if (hasAudio) nextInputIdx++;
            const webcamInputIdx = hasWebcam ? nextInputIdx++ : null;

            const useMotionBlur = settings.motionBlur;
            const motionBlurFilter = useMotionBlur ? 'tmix=frames=3:weights=\'1 2 1\'' : '';

            if (hasWebcam || (width && height) || motionBlurFilter) {
                let mainFilter = '';
                if (width && height) {
                    mainFilter += `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
                }
                if (motionBlurFilter) {
                    mainFilter += (mainFilter ? ',' : '') + motionBlurFilter;
                }

                let overlays = [];
                if (mainFilter) {
                    overlays.push(`[0:v]${mainFilter}[base]`);
                }

                let current = mainFilter ? '[base]' : '[0:v]';

                if (hasWebcam) {
                    const wcScale = width && height ? Math.min(Math.round(width / 6), 200) : 200;
                    overlays.push(`${current}[${webcamInputIdx}:v]scale=${wcScale}:-2[wc];${current}[wc]overlay=W-w-10:H-h-10[final]`);
                    current = '[final]';
                }

                if (overlays.length > 0) {
                    command = command.complexFilter(overlays, current.replace(/[\[\]]/g, ''));
                }
            }
            
            // Output format settings
            if (outputFormat === 'mp4') {
                let outputOpts;
                
                if (useGpu && gpuH264) {
                    // GPU hardware encoding (H.264)
                    const encoder = gpuH264;
                    
                    if (encoder === 'h264_nvenc') {
                        // NVIDIA NVENC
                        const preset = quality === 'high' ? 'p7' : quality === 'medium' ? 'p4' : 'p2';
                        const cq = quality === 'high' ? '18' : quality === 'medium' ? '23' : '28';
                        outputOpts = [
                            '-pix_fmt', 'yuv420p',
                            '-preset', preset,
                            '-cq', cq,
                            '-rc', 'vbr'
                        ];
                    } else if (encoder === 'h264_amf') {
                        // AMD AMF
                        const qualityPreset = quality === 'high' ? 'quality' : quality === 'medium' ? 'balanced' : 'speed';
                        outputOpts = [
                            '-pix_fmt', 'yuv420p',
                            '-quality', qualityPreset,
                            '-qp_p', quality === 'high' ? '18' : '28',
                            '-qp_i', quality === 'high' ? '18' : '28'
                        ];
                    } else if (encoder === 'h264_qsv') {
                        // Intel Quick Sync
                        const preset = quality === 'high' ? 'slower' : quality === 'medium' ? 'medium' : 'fast';
                        const globalQuality = quality === 'high' ? '18' : quality === 'medium' ? '23' : '28';
                        outputOpts = [
                            '-pix_fmt', 'yuv420p',
                            '-preset', preset,
                            '-global_quality', globalQuality
                        ];
                    }
                    
                    // Add audio codec if we have audio
                    if (hasAudio) {
                        outputOpts.push('-c:a', 'aac', '-b:a', '128k');
                        outputOpts.push('-map', '0:v', '-map', '1:a');
                        outputOpts.push('-shortest');
                    }
                    
                    command = command
                        .videoCodec(encoder)
                        .outputOptions(outputOpts);
                } else {
                    // Software (CPU) encoding
                    outputOpts = [
                        '-pix_fmt', 'yuv420p',
                        '-preset', useFastEncode ? 'fast' : 'medium',
                        '-crf', quality === 'high' ? '18' : quality === 'medium' ? '23' : '28'
                    ];
                    
                    // Add audio codec if we have audio
                    if (hasAudio) {
                        outputOpts.push('-c:a', 'aac', '-b:a', '128k');
                        outputOpts.push('-map', '0:v', '-map', '1:a');
                        outputOpts.push('-shortest'); // End when shortest stream ends
                    }
                    
                    command = command
                        .videoCodec('libx264')
                        .outputOptions(outputOpts);
                }
            } else if (outputFormat === 'webm') {
                let outputOpts;
                
                if (useGpu && gpuVp9) {
                    // GPU hardware encoding (VP9)
                    const encoder = gpuVp9;
                    
                    if (encoder === 'vp9_nvenc') {
                        // NVIDIA NVENC VP9
                        const preset = quality === 'high' ? 'p7' : quality === 'medium' ? 'p4' : 'p2';
                        const cq = quality === 'high' ? '18' : quality === 'medium' ? '23' : '28';
                        outputOpts = [
                            '-pix_fmt', 'yuv420p',
                            '-preset', preset,
                            '-cq', cq,
                            '-rc', 'vbr'
                        ];
                    } else if (encoder === 'vp9_qsv') {
                        // Intel Quick Sync VP9
                        outputOpts = [
                            '-pix_fmt', 'yuv420p',
                            '-global_quality', quality === 'high' ? '18' : quality === 'medium' ? '23' : '28'
                        ];
                    }
                    
                    if (hasAudio) {
                        outputOpts.push('-c:a', 'libopus', '-b:a', '128k');
                        outputOpts.push('-map', '0:v', '-map', '1:a');
                        outputOpts.push('-shortest');
                    }
                    
                    command = command
                        .videoCodec(encoder)
                        .outputOptions(outputOpts);
                } else {
                    // Software (CPU) encoding
                    outputOpts = [
                        '-crf', quality === 'high' ? '20' : quality === 'medium' ? '30' : '40',
                        '-b:v', '0'
                    ];
                    
                    if (hasAudio) {
                        outputOpts.push('-c:a', 'libopus', '-b:a', '128k');
                        outputOpts.push('-map', '0:v', '-map', '1:a');
                        outputOpts.push('-shortest');
                    }
                    
                    command = command
                        .videoCodec('libvpx-vp9')
                        .outputOptions(outputOpts);
                }
            } else if (outputFormat === 'gif') {
                command = command
                    .fps(15)
                    .outputOptions(['-loop', '0']);
                // GIF doesn't support audio or GPU encoding
            }
            
            // Apply trim end/duration
            if (trimEnd > 0) {
                const totalDuration = duration - trimStart - trimEnd;
                if (totalDuration > 0) {
                    command = command.duration(totalDuration);
                }
            }
            
            command
                .output(outputPath)
                .on('progress', (progress) => {
                    if (mainWindow) {
                        mainWindow.webContents.send('ffmpeg-progress', {
                            percent: progress.percent || 0
                        });
                    }
                })
                .on('end', () => {
                    // Cleanup temp directories
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    if (audioRecordingSession?.tempDir) {
                        fs.rmSync(audioRecordingSession.tempDir, { recursive: true, force: true });
                        audioRecordingSession = null;
                    }
                    canvasRecordingSession = null;
                    
                    console.log('Canvas recording saved to:', outputPath, hasAudio ? '(with audio)' : '');
                    resolve({ success: true, filePath: outputPath });
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    // Cleanup temp directories
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    if (audioRecordingSession?.tempDir) {
                        fs.rmSync(audioRecordingSession.tempDir, { recursive: true, force: true });
                        audioRecordingSession = null;
                    }
                    canvasRecordingSession = null;
                    
                    reject(new Error(err.message));
                })
                .run();
        });
    } catch (error) {
        console.error('Failed to stop canvas recording:', error);
        if (canvasRecordingSession?.tempDir) {
            fs.rmSync(canvasRecordingSession.tempDir, { recursive: true, force: true });
        }
        canvasRecordingSession = null;
        return { success: false, error: error.message };
    }
});

ipcMain.handle('cancel-canvas-recording', async () => {
    if (canvasRecordingSession?.tempDir) {
        fs.rmSync(canvasRecordingSession.tempDir, { recursive: true, force: true });
    }
    canvasRecordingSession = null;
    return { success: true };
});

// Trim an existing video file with FFmpeg
ipcMain.handle('trim-video', async (event, { filePath, trimStart, trimEnd }) => {
    try {
        const ffmpegPath = getFfmpegPath();
        const path = require('path');
        const ext = path.extname(filePath);
        const base = path.basename(filePath, ext);
        const dir = path.dirname(filePath);
        const outputPath = path.join(dir, `${base}-trimmed${ext}`);

        return new Promise((resolve, reject) => {
            let command = ffmpeg(filePath)
                .setFfmpegPath(ffmpegPath);

            if (trimStart > 0) {
                command = command.seekInput(trimStart);
            }
            if (trimEnd > 0) {
                command = command.duration(trimEnd);
            }

            command
                .output(outputPath)
                .outputOptions(['-c:v libx264', '-preset fast', '-crf 22', '-c:a aac', '-b:a 128k', '-movflags +faststart'])
                .on('start', (cmd) => console.log('Trim command:', cmd))
                .on('progress', (progress) => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('ffmpeg-progress', { percent: Math.round(progress.percent || 0), done: false });
                    }
                })
                .on('end', () => {
                    resolve({ success: true, path: outputPath });
                })
                .on('error', (err) => {
                    reject(new Error(err.message));
                })
                .run();
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Save webcam blob to file for FFmpeg overlay
ipcMain.handle('save-webcam-blob', async (event, { base64, filename }) => {
    try {
        const savePath = store.get('savePath', path.join(os.homedir(), 'Downloads'));
        const filePath = path.join(savePath, filename);
        const buffer = Buffer.from(base64, 'base64');
        fs.writeFileSync(filePath, buffer);
        return { success: true, path: filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// =====================
// WHISPER.CPP AUTO-CAPTIONING
// =====================

const https = require('https');
const { pipeline } = require('stream/promises');

const WHISPER_MODEL_NAME = 'ggml-base.en.bin';
const WHISPER_MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin';
const WHISPER_BINARIES = {
    win32: 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.7.4/whisper-blas-bin-x64.zip',
    linux: 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.7.4/whisper-linux-x64.zip',
    darwin: 'https://github.com/ggerganov/whisper.cpp/releases/download/v1.7.4/whisper-macos-x64.zip'
};

function getWhisperDir() {
    return path.join(app.getPath('userData'), 'whisper');
}

function getWhisperModelPath() {
    return path.join(getWhisperDir(), WHISPER_MODEL_NAME);
}

function getWhisperBinPath() {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(getWhisperDir(), 'whisper-cli' + ext);
}

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, { timeout: 30000 }, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
    });
}

async function ensureWhisperModel() {
    const modelPath = getWhisperModelPath();
    if (fs.existsSync(modelPath)) return modelPath;
    const whisperDir = getWhisperDir();
    if (!fs.existsSync(whisperDir)) fs.mkdirSync(whisperDir, { recursive: true });
    console.log('Downloading Whisper model (~50MB)...');
    await downloadFile(WHISPER_MODEL_URL, modelPath);
    console.log('Whisper model downloaded');
    return modelPath;
}

async function ensureWhisperBinary() {
    const binPath = getWhisperBinPath();
    if (fs.existsSync(binPath)) return binPath;
    // For now, require manual installation or use a bundled binary
    // Downloading and extracting binaries is complex across platforms
    // We'll try to use a system-installed whisper-cli first
    try {
        const { execSync } = require('child_process');
        execSync('whisper-cli --help', { stdio: 'ignore' });
        return 'whisper-cli';
    } catch (e) {
        console.warn('whisper-cli not found. Please install whisper.cpp or download from https://github.com/ggerganov/whisper.cpp/releases');
        return null;
    }
}

ipcMain.handle('generate-captions', async (event, videoPath) => {
    try {
        const ffmpegPath = getFfmpegPath();
        const modelPath = await ensureWhisperModel();
        const whisperBin = await ensureWhisperBinary();
        if (!whisperBin) {
            return { success: false, error: 'whisper-cli not found. Install whisper.cpp or download from GitHub releases.' };
        }
        if (!modelPath || !fs.existsSync(modelPath)) {
            return { success: false, error: 'Whisper model not available' };
        }

        const whisperDir = getWhisperDir();
        const audioPath = path.join(whisperDir, 'temp_audio.wav');
        const srtPath = path.join(whisperDir, 'temp_captions.srt');

        // Step 1: Extract audio with FFmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .setFfmpegPath(ffmpegPath)
                .outputOptions(['-vn', '-acodec pcm_s16le', '-ar 16000', '-ac 1'])
                .output(audioPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Step 2: Transcribe with whisper.cpp
        await new Promise((resolve, reject) => {
            const args = ['-m', modelPath, '-f', audioPath, '-osrt', '-of', path.join(whisperDir, 'temp_captions'), '-l', 'en'];
            const { spawn } = require('child_process');
            const child = spawn(whisperBin, args, { cwd: whisperDir });
            let stderr = '';
            child.stderr.on('data', (d) => { stderr += d; });
            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(stderr || `whisper-cli exited with code ${code}`));
            });
        });

        // Step 3: Read SRT
        const srtContent = fs.readFileSync(srtPath, 'utf8');

        // Cleanup
        try { fs.unlinkSync(audioPath); } catch (e) {}
        try { fs.unlinkSync(srtPath); } catch (e) {}

        return { success: true, srt: srtContent };
    } catch (error) {
        console.error('Caption generation failed:', error);
        return { success: false, error: error.message };
    }
});

// Extract frames from video for thumbnail/vision analysis
ipcMain.handle('extract-frames', async (event, videoPath, count = 10) => {
    try {
        const ffmpegPath = getFfmpegPath();
        const framesDir = path.join(app.getPath('temp'), 'blazeycc-frames-' + Date.now());
        fs.mkdirSync(framesDir, { recursive: true });

        // Get duration first
        const duration = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata.format.duration || 10);
            });
        });

        const interval = Math.max(1, Math.floor(duration / count));

        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .setFfmpegPath(ffmpegPath)
                .outputOptions(['-vf', `fps=1/${interval},scale=320:-1`])
                .output(path.join(framesDir, 'frame_%03d.jpg'))
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        const frames = fs.readdirSync(framesDir)
            .filter(f => f.endsWith('.jpg'))
            .map(f => path.join(framesDir, f));
        return { success: true, frames };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

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
