const { app, BrowserWindow, ipcMain, desktopCapturer, dialog, webContents, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const Store = require('electron-store').default || require('electron-store');
const crypto = require('crypto');

// License API configuration
const LICENSE_SECRET = process.env.LICENSE_SECRET || '4f6fab93b5f0bfb47f3431ab19b230994e94cc946d479e27cf82b1b85c7aaee3';
const LICENSE_API_URL = 'https://blazeycc-license.kennethhy-me.workers.dev';

// Get watermark logo path
function getWatermarkLogoPath() {
    if (app.isPackaged) {
        const logoPath = path.join(process.resourcesPath, 'watermark.png');
        if (fs.existsSync(logoPath)) {
            return logoPath;
        }
    }
    // Dev mode - use local file
    const devPath = path.join(__dirname, 'watermark.png');
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

// Force CPU-only rendering and disable hardware video encoding
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-accelerated-video-encode');

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
                    
                    // Track video creation
                    trackUsage('video_created', { format, quality, isProLicensed });
                    
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

// Recording history management (local + cloud sync for Pro users)
async function syncHistoryToCloud(record) {
    try {
        const license = store.get('license', null);
        if (!license?.email || !license?.key) return;
        
        await fetch(`${LICENSE_API_URL}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: license.email,
                licenseKey: license.key,
                record
            })
        });
    } catch (error) {
        console.error('History cloud sync failed:', error);
    }
}

async function fetchCloudHistory() {
    try {
        const license = store.get('license', null);
        if (!license?.email || !license?.key) return null;
        
        const response = await fetch(
            `${LICENSE_API_URL}/history?email=${encodeURIComponent(license.email)}&licenseKey=${encodeURIComponent(license.key)}&limit=50`
        );
        const data = await response.json();
        return data.success ? data.history : null;
    } catch (error) {
        console.error('History cloud fetch failed:', error);
        return null;
    }
}

ipcMain.handle('get-history', async () => {
    // Get local history
    const localHistory = store.get('history', []);
    
    // Try to get cloud history for Pro users
    const cloudHistory = await fetchCloudHistory();
    
    if (cloudHistory) {
        // Merge: cloud is authoritative, but keep local items not in cloud
        const cloudPaths = new Set(cloudHistory.map(h => h.path));
        const uniqueLocal = localHistory.filter(h => !cloudPaths.has(h.path));
        const merged = [...cloudHistory, ...uniqueLocal].slice(0, 50);
        store.set('history', merged);
        return merged;
    }
    
    return localHistory;
});

ipcMain.handle('add-history', async (event, record) => {
    const history = store.get('history', []);
    const newRecord = { ...record, recordedAt: Date.now() };
    history.unshift(newRecord);
    // Keep last 50 recordings
    if (history.length > 50) history.pop();
    store.set('history', history);
    
    // Sync to cloud for Pro users (async, non-blocking)
    syncHistoryToCloud(newRecord);
    
    return history;
});

ipcMain.handle('clear-history', async () => {
    store.set('history', []);
    
    // Clear cloud history for Pro users
    try {
        const license = store.get('license', null);
        if (license?.email && license?.key) {
            await fetch(`${LICENSE_API_URL}/history/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: license.email,
                    licenseKey: license.key
                })
            });
        }
    } catch (error) {
        console.error('Cloud history clear failed:', error);
    }
    
    return [];
});

ipcMain.handle('delete-history-item', async (event, filePath) => {
    const history = store.get('history', []);
    const itemToDelete = history.find(h => h.path === filePath);
    const newHistory = history.filter(h => h.path !== filePath);
    store.set('history', newHistory);
    
    // Delete from cloud for Pro users
    if (itemToDelete?.id) {
        try {
            const license = store.get('license', null);
            if (license?.email && license?.key) {
                await fetch(`${LICENSE_API_URL}/history/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: license.email,
                        licenseKey: license.key,
                        id: itemToDelete.id
                    })
                });
            }
        } catch (error) {
            console.error('Cloud history delete failed:', error);
        }
    }
    
    return newHistory;
});

// ====================
// Cloud Storage (R2) handlers for Pro users
// ====================

ipcMain.handle('cloud-storage-upload', async (event, filePath) => {
    const license = store.get('license', null);
    if (!license?.email || !license?.key) {
        return { success: false, error: 'Pro license required' };
    }
    
    try {
        const fs = require('fs');
        const path = require('path');
        
        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'File not found' };
        }
        
        const filename = path.basename(filePath);
        const fileBuffer = fs.readFileSync(filePath);
        const stats = fs.statSync(filePath);
        
        // Determine content type
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.gif': 'image/gif'
        };
        const contentType = contentTypes[ext] || 'application/octet-stream';
        
        const url = `${LICENSE_API_URL}/storage/upload?email=${encodeURIComponent(license.email)}&licenseKey=${encodeURIComponent(license.key)}&filename=${encodeURIComponent(filename)}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'Content-Length': stats.size.toString()
            },
            body: fileBuffer
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Cloud upload failed:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('cloud-storage-list', async () => {
    const license = store.get('license', null);
    if (!license?.email || !license?.key) {
        return { success: false, error: 'Pro license required' };
    }
    
    try {
        const response = await fetch(
            `${LICENSE_API_URL}/storage/list?email=${encodeURIComponent(license.email)}&licenseKey=${encodeURIComponent(license.key)}`
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Cloud list failed:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('cloud-storage-download', async (event, key, filename) => {
    const license = store.get('license', null);
    if (!license?.email || !license?.key) {
        return { success: false, error: 'Pro license required' };
    }
    
    try {
        const savePath = store.get('savePath');
        const downloadPath = require('path').join(savePath, filename);
        
        const url = `${LICENSE_API_URL}/storage/download?email=${encodeURIComponent(license.email)}&licenseKey=${encodeURIComponent(license.key)}&key=${encodeURIComponent(key)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, error: errorData.error || 'Download failed' };
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        require('fs').writeFileSync(downloadPath, buffer);
        
        return { success: true, path: downloadPath };
    } catch (error) {
        console.error('Cloud download failed:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('cloud-storage-delete', async (event, key) => {
    const license = store.get('license', null);
    if (!license?.email || !license?.key) {
        return { success: false, error: 'Pro license required' };
    }
    
    try {
        const response = await fetch(`${LICENSE_API_URL}/storage/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: license.email,
                licenseKey: license.key,
                key
            })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Cloud delete failed:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('cloud-storage-usage', async () => {
    const license = store.get('license', null);
    if (!license?.email || !license?.key) {
        return { success: false, error: 'Pro license required' };
    }
    
    try {
        const response = await fetch(
            `${LICENSE_API_URL}/storage/usage?email=${encodeURIComponent(license.email)}&licenseKey=${encodeURIComponent(license.key)}`
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Cloud usage check failed:', error);
        return { success: false, error: error.message };
    }
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

// Online license validation (checks revocation)
async function validateLicenseOnline(email, licenseKey) {
    try {
        const response = await fetch(`${LICENSE_API_URL}/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, licenseKey })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Online validation failed:', error);
        // Fallback to local validation if offline
        return { valid: validateLicenseKey(email, licenseKey), offline: true };
    }
}

// Track usage (video created, export, etc.)
async function trackUsage(action, metadata = {}) {
    try {
        const license = store.get('license', null);
        await fetch(`${LICENSE_API_URL}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: license?.email || null,
                licenseKey: license?.key || null,
                action,
                metadata: {
                    ...metadata,
                    platform: process.platform,
                    appVersion: app.getVersion()
                }
            })
        });
    } catch (error) {
        // Silent fail - don't interrupt user experience
        console.error('Usage tracking failed:', error);
    }
}

// Redeem promo code
async function redeemPromoCode(email, code) {
    try {
        const response = await fetch(`${LICENSE_API_URL}/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        return await response.json();
    } catch (error) {
        return { error: 'Network error', message: error.message };
    }
}

ipcMain.handle('get-license', async () => {
    const license = store.get('license', null);
    if (license && license.email && license.key) {
        // Local validation first (fast)
        const localValid = validateLicenseKey(license.email, license.key);
        if (!localValid) {
            return { email: license.email, key: license.key, isValid: false };
        }
        
        // Online validation (check revocation) - async, don't block
        validateLicenseOnline(license.email, license.key).then(result => {
            if (result.valid === false && !result.offline) {
                // License was revoked - clear it
                store.delete('license');
            }
        }).catch(() => {});
        
        return { ...license, isValid: true };
    }
    return { email: null, key: null, isValid: false };
});

ipcMain.handle('set-license', async (event, { email, key }) => {
    if (!email || !key) {
        return { success: false, message: 'Email and license key are required' };
    }
    
    // Local validation first
    const isValid = validateLicenseKey(email, key);
    if (!isValid) {
        return { success: false, message: 'Invalid license key. Make sure email matches your sponsor email.' };
    }
    
    // Online validation to check revocation
    const onlineResult = await validateLicenseOnline(email, key);
    if (onlineResult.valid === false && !onlineResult.offline) {
        return { success: false, message: onlineResult.reason || 'License has been revoked' };
    }
    
    store.set('license', {
        email,
        key,
        activatedAt: new Date().toISOString()
    });
    
    // Track license activation
    trackUsage('license_activated');
    
    return { success: true, message: 'Pro license activated!' };
});

ipcMain.handle('validate-license', async (event, { email, key }) => {
    const localValid = validateLicenseKey(email, key);
    if (!localValid) return false;
    
    // Check online if local passes
    const onlineResult = await validateLicenseOnline(email, key);
    return onlineResult.valid !== false;
});

ipcMain.handle('clear-license', async () => {
    trackUsage('license_deactivated');
    store.delete('license');
    return { success: true };
});

// Promo code redemption
ipcMain.handle('redeem-promo', async (event, { email, code }) => {
    if (!email || !code) {
        return { success: false, message: 'Email and promo code are required' };
    }
    
    const result = await redeemPromoCode(email, code);
    
    if (result.success && result.licenseKey) {
        // Auto-activate the license
        store.set('license', {
            email: result.email,
            key: result.licenseKey,
            activatedAt: new Date().toISOString(),
            promoCode: code
        });
        return { success: true, message: 'Promo code redeemed! Pro license activated.', licenseKey: result.licenseKey };
    }
    
    return { success: false, message: result.error || result.message || 'Invalid promo code' };
});

// Track usage from renderer
ipcMain.handle('track-usage', async (event, { action, metadata }) => {
    await trackUsage(action, metadata);
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
// Canvas-based recording state
let canvasRecordingSession = null;

ipcMain.handle('start-canvas-recording', async () => {
    try {
        // Create temp directory for frames
        const tempDir = path.join(os.tmpdir(), `blazeycc-recording-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
        
        canvasRecordingSession = {
            tempDir,
            frameCount: 0,
            startTime: Date.now(),
            fps: 30
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
        
        // Non-blocking async write
        fs.promises.writeFile(framePath, buffer).catch(err => {
            console.error('Frame write error:', err);
        });
        
        return { success: true, frameNumber };
    } catch (error) {
        console.error('Failed to capture frame:', error);
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
        
        // Wait a bit for any pending async frame writes to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate output filename
        const savePath = store.get('savePath', path.join(os.homedir(), 'Downloads'));
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const outputFormat = format || 'mp4';
        const outputPath = path.join(savePath, `blazeycc_${timestamp}.${outputFormat}`);
        
        // Check Pro license
        const license = store.get('license', null);
        const isProLicensed = license && license.email && license.key && validateLicenseKey(license.email, license.key);
        const settings = proSettings || {};
        const useFastEncode = isProLicensed && settings.fastEncode;
        const shouldAddWatermark = !isProLicensed; // Free users get watermark
        
        // Get watermark image path
        const watermarkPath = getWatermarkLogoPath();
        const hasWatermark = shouldAddWatermark && watermarkPath && fs.existsSync(watermarkPath);
        
        console.log('Watermark check:', { isProLicensed, shouldAddWatermark, hasWatermark, watermarkPath });
        
        // Build FFmpeg command
        const inputPattern = path.join(tempDir, 'frame_%06d.png');
        
        return new Promise((resolve, reject) => {
            let command = ffmpeg()
                .input(inputPattern)
                .inputFPS(actualFps)
                .fps(30);
            
            // Add watermark input if needed
            if (hasWatermark) {
                command = command.input(watermarkPath);
            }
            
            // Build complex filter for resize + watermark
            if (hasWatermark && width && height) {
                // Both resize and watermark
                command = command.complexFilter([
                    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[scaled]`,
                    '[scaled][1:v]overlay=10:H-h-10[out]'
                ], 'out');
            } else if (hasWatermark) {
                // Watermark only (bottom-left corner)
                command = command.complexFilter([
                    '[0:v][1:v]overlay=10:H-h-10[out]'
                ], 'out');
            } else if (width && height) {
                // Resize only
                command = command.videoFilters([
                    `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
                ]);
            }
            
            // Output format settings
            if (outputFormat === 'mp4') {
                command = command
                    .videoCodec('libx264')
                    .outputOptions([
                        '-pix_fmt', 'yuv420p',
                        '-preset', useFastEncode ? 'fast' : 'medium',
                        '-crf', quality === 'high' ? '18' : quality === 'medium' ? '23' : '28'
                    ]);
            } else if (outputFormat === 'webm') {
                command = command
                    .videoCodec('libvpx-vp9')
                    .outputOptions([
                        '-crf', quality === 'high' ? '20' : quality === 'medium' ? '30' : '40',
                        '-b:v', '0'
                    ]);
            } else if (outputFormat === 'gif') {
                command = command
                    .fps(15)
                    .outputOptions(['-loop', '0']);
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
                    // Cleanup temp directory
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    canvasRecordingSession = null;
                    
                    console.log('Canvas recording saved to:', outputPath);
                    resolve({ success: true, filePath: outputPath });
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    // Cleanup temp directory
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    canvasRecordingSession = null;
                    
                    reject({ success: false, error: err.message });
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
