const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Get webview source for recording
    getWebviewSource: (webviewId) => ipcRenderer.invoke('get-webview-source', webviewId),
    
    // Save video file (with MP4/GIF conversion and optional resize)
    saveVideo: (filename, data, format = 'mp4', quality = 'high', width = null, height = null, proSettings = null) => 
        ipcRenderer.invoke('save-video', { filename, data, format, quality, width, height, proSettings }),
    
    // Bookmarks
    getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
    addBookmark: (url, title, favicon) => ipcRenderer.invoke('add-bookmark', { url, title, favicon }),
    removeBookmark: (url) => ipcRenderer.invoke('remove-bookmark', url),
    
    // History
    getHistory: () => ipcRenderer.invoke('get-history'),
    addHistory: (record) => ipcRenderer.invoke('add-history', record),
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    deleteHistoryItem: (filePath) => ipcRenderer.invoke('delete-history-item', filePath),
    
    // Save path
    getSavePath: () => ipcRenderer.invoke('get-save-path'),
    setSavePath: (path) => ipcRenderer.invoke('set-save-path', path),
    selectSaveFolder: () => ipcRenderer.invoke('select-save-folder'),
    
    // File operations
    openInFolder: (filePath) => ipcRenderer.invoke('open-in-folder', filePath),
    
    // Theme
    getTheme: () => ipcRenderer.invoke('get-theme'),
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    
    // License
    getLicense: () => ipcRenderer.invoke('get-license'),
    setLicense: (email, key, tier) => ipcRenderer.invoke('set-license', { email, key, tier }),
    validateLicense: (email, key) => ipcRenderer.invoke('validate-license', { email, key }),
    clearLicense: () => ipcRenderer.invoke('clear-license'),
    isProLicensed: () => ipcRenderer.invoke('is-pro-licensed'),
    isProPlusLicensed: () => ipcRenderer.invoke('is-pro-plus-licensed'),
    getLicenseTier: () => ipcRenderer.invoke('get-license-tier'),
    redeemPromo: (email, code) => ipcRenderer.invoke('redeem-promo', { email, code }),
    trackUsage: (action, metadata) => ipcRenderer.invoke('track-usage', { action, metadata }),
    createStripeCheckout: (email, tier) => ipcRenderer.invoke('create-stripe-checkout', { email, tier }),
    openStripePortal: (email) => ipcRenderer.invoke('open-stripe-portal', { email }),
    
    // Batch recordings (Pro)
    getBatchUrls: () => ipcRenderer.invoke('get-batch-urls'),
    setBatchUrls: (urls) => ipcRenderer.invoke('set-batch-urls', urls),
    
    // Scheduled recordings (Pro)
    getScheduledRecordings: () => ipcRenderer.invoke('get-scheduled-recordings'),
    addScheduledRecording: (schedule) => ipcRenderer.invoke('add-scheduled-recording', schedule),
    removeScheduledRecording: (id) => ipcRenderer.invoke('remove-scheduled-recording', id),
    
    // Custom watermark (Pro)
    getCustomWatermark: () => ipcRenderer.invoke('get-custom-watermark'),
    setCustomWatermark: (settings) => ipcRenderer.invoke('set-custom-watermark', settings),
    selectWatermarkImage: () => ipcRenderer.invoke('select-watermark-image'),
    
    // Fast encoding (Pro)
    getFastEncode: () => ipcRenderer.invoke('get-fast-encode'),
    setFastEncode: (enabled) => ipcRenderer.invoke('set-fast-encode', enabled),
    
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Copy to clipboard
    copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
    
    // YouTube/Vimeo Export
    exportToYouTube: (filePath) => ipcRenderer.invoke('export-to-youtube', filePath),
    exportToVimeo: (filePath) => ipcRenderer.invoke('export-to-vimeo', filePath),
    
    // Canvas-based recording (alternative to MediaRecorder)
    startCanvasRecording: () => ipcRenderer.invoke('start-canvas-recording'),
    captureFrame: (frameData) => ipcRenderer.invoke('capture-frame', frameData),
    captureFrameBuffer: (buffer) => ipcRenderer.invoke('capture-frame-buffer', buffer),
    stopCanvasRecording: (format, quality, width, height, proSettings) => 
        ipcRenderer.invoke('stop-canvas-recording', { format, quality, width, height, proSettings }),
    cancelCanvasRecording: () => ipcRenderer.invoke('cancel-canvas-recording'),
    
    // Webview frame capture
    captureWebviewFrame: (webContentsId) => ipcRenderer.invoke('capture-webview-frame', webContentsId),
    
    // FFmpeg progress listener
    onFFmpegProgress: (callback) => {
        ipcRenderer.on('ffmpeg-progress', (event, data) => callback(data));
    },
    removeFFmpegProgressListener: () => {
        ipcRenderer.removeAllListeners('ffmpeg-progress');
    },
    
    // GPU encoding
    getGpuEncoding: () => ipcRenderer.invoke('get-gpu-encoding'),
    setGpuEncoding: (enabled) => ipcRenderer.invoke('set-gpu-encoding', enabled),
    detectGpuEncoder: () => ipcRenderer.invoke('detect-gpu-encoder'),
    
    // Frame rate
    getFrameRate: () => ipcRenderer.invoke('get-frame-rate'),
    setFrameRate: (fps) => ipcRenderer.invoke('set-frame-rate', fps),
    
    // Auto-update
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', (event, data) => callback(data));
    },
    onUpdateNotAvailable: (callback) => {
        ipcRenderer.on('update-not-available', () => callback());
    },
    onUpdateDownloadProgress: (callback) => {
        ipcRenderer.on('update-download-progress', (event, data) => callback(data));
    },
    onUpdateDownloaded: (callback) => {
        ipcRenderer.on('update-downloaded', (event, data) => callback(data));
    },
    onUpdateError: (callback) => {
        ipcRenderer.on('update-error', (event, data) => callback(data));
    },
    
    // Audio recording toggle (for webview audio capture)
    setAudioEnabled: (enabled) => ipcRenderer.invoke('set-audio-enabled', enabled),
    getAudioEnabled: () => ipcRenderer.invoke('get-audio-enabled'),
    startAudioCapture: () => ipcRenderer.invoke('start-audio-capture'),
    saveAudioChunk: (chunkData) => ipcRenderer.invoke('save-audio-chunk', chunkData),
    stopAudioCapture: () => ipcRenderer.invoke('stop-audio-capture'),
    cancelAudioCapture: () => ipcRenderer.invoke('cancel-audio-capture')
});
