const { app, BrowserWindow, ipcMain, desktopCapturer, dialog, webContents, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const Store = require('electron-store').default || require('electron-store');

// Get watermark logo path
function getWatermarkLogoPath() {
    if (app.isPackaged) {
        const logoPath = path.join(process.resourcesPath, 'watermark.png');
        if (fs.existsSync(logoPath)) {
            return logoPath;
        }
    }
    // Dev mode - use local file
    const devPath = path.join(__dirname, 'blazeycc-logo.png');
    if (fs.existsSync(devPath)) {
        return devPath;
    }
    return null;
}

// Get watermark position coordinates
function getWatermarkPosition(position) {
    const positions = {
        'bottom-left': { x: '10', y: 'h-35' },
        'bottom-right': { x: 'w-tw-10', y: 'h-35' },
        'top-left': { x: '10', y: '10' },
        'top-right': { x: 'w-tw-10', y: '10' }
    };
    return positions[position] || positions['bottom-left'];
}

// Get ffmpeg path - handle both dev and packaged scenarios
function getFFmpegPath() {
    let ffmpegPath;
    
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

// Force CPU-only rendering
app.disableHardwareAcceleration();

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
    // Check if Pro licensed
    const license = store.get('license', null);
    const isProLicensed = license && license.email && license.key && validateLicenseKey(license.email, license.key);
    
    // Pro settings defaults
    const settings = proSettings || {};
    const useFastEncode = isProLicensed && settings.fastEncode;
    const customWatermark = isProLicensed && settings.customWatermark;
    const shouldAddWatermark = !isProLicensed; // Free users get default watermark
    
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
                
                // Add watermark for free users (before palette generation)
                if (shouldAddWatermark) {
                    // Text watermark - semi-transparent in bottom-left corner
                    filters += `,drawtext=text='Blazeycc':fontsize=24:fontcolor=white@0.5:x=10:y=h-35:shadowcolor=black@0.3:shadowx=1:shadowy=1`;
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
                
                // Add watermark
                if (shouldAddWatermark) {
                    vfFilters.push(`drawtext=text='Blazeycc':fontsize=24:fontcolor=white@0.5:x=10:y=h-35:shadowcolor=black@0.3:shadowx=1:shadowy=1`);
                } else if (customWatermark && customWatermark.type === 'text' && customWatermark.text) {
                    const pos = getWatermarkPosition(customWatermark.position || 'bottom-left');
                    vfFilters.push(`drawtext=text='${customWatermark.text.replace(/'/g, "\\'").replace(/:/g, "\\:")}':fontsize=20:fontcolor=white@0.7:x=${pos.x}:y=${pos.y}:shadowcolor=black@0.3:shadowx=1:shadowy=1`);
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
                
                // Add watermark
                if (shouldAddWatermark) {
                    vfFilters.push(`drawtext=text='Blazeycc':fontsize=24:fontcolor=white@0.5:x=10:y=h-35:shadowcolor=black@0.3:shadowx=1:shadowy=1`);
                } else if (customWatermark && customWatermark.type === 'text' && customWatermark.text) {
                    const pos = getWatermarkPosition(customWatermark.position || 'bottom-left');
                    vfFilters.push(`drawtext=text='${customWatermark.text.replace(/'/g, "\\'").replace(/:/g, "\\:")}':fontsize=20:fontcolor=white@0.7:x=${pos.x}:y=${pos.y}:shadowcolor=black@0.3:shadowx=1:shadowy=1`);
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

// License management
const crypto = require('crypto');
const LICENSE_SECRET = 'blazeycc-pro-2026-change-this-secret';

function generateExpectedKey(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const hash = crypto.createHmac('sha256', LICENSE_SECRET)
        .update(normalizedEmail)
        .digest('hex')
        .substring(0, 32)
        .toUpperCase();
    return hash.match(/.{1,8}/g).join('-');
}

// Validate license key using HMAC (GitHub Sponsors)
function validateLicenseKey(email, key) {
    if (!email || !key) return false;
    const expectedKey = generateExpectedKey(email);
    const normalizedKey = key.toUpperCase().replace(/\s/g, '').replace(/-/g, '');
    const normalizedExpected = expectedKey.toUpperCase().replace(/-/g, '');
    // Check both full key and first 16 chars (XXXX-XXXX-XXXX-XXXX format)
    return normalizedKey === normalizedExpected || 
           normalizedKey === normalizedExpected.slice(0, 16) ||
           normalizedKey.slice(0, 16) === normalizedExpected.slice(0, 16);
}

ipcMain.handle('get-license', async () => {
    const license = store.get('license', null);
    if (license && license.email && license.key) {
        const isValid = validateLicenseKey(license.email, license.key);
        return { ...license, isValid };
    }
    return { email: null, key: null, isValid: false };
});

ipcMain.handle('set-license', async (event, { email, key }) => {
    if (!email || !key) {
        return { success: false, message: 'Email and license key are required' };
    }
    
    const isValid = validateLicenseKey(email, key);
    if (isValid) {
        store.set('license', {
            email,
            key,
            activatedAt: new Date().toISOString()
        });
        return { success: true, message: 'Pro license activated!' };
    }
    return { success: false, message: 'Invalid license key. Make sure email matches your sponsor email.' };
});

ipcMain.handle('validate-license', async (event, { email, key }) => {
    return validateLicenseKey(email, key);
});

ipcMain.handle('clear-license', async () => {
    store.delete('license');
    return { success: true };
});

// Check if Pro licensed
ipcMain.handle('is-pro-licensed', async () => {
    const license = store.get('license', null);
    if (license && license.email && license.key) {
        return validateLicenseKey(license.email, license.key);
    }
    return false;
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

// Pro settings: Cloud sync configuration
ipcMain.handle('get-cloud-config', async () => {
    return store.get('cloudConfig', { googleDrive: null, dropbox: null });
});

ipcMain.handle('set-cloud-config', async (event, config) => {
    store.set('cloudConfig', config);
    return config;
});

// Open external URL (for OAuth)
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
