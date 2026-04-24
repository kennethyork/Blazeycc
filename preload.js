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
    
    // Cloud sync (Pro)
    getCloudConfig: () => ipcRenderer.invoke('get-cloud-config'),
    setCloudConfig: (config) => ipcRenderer.invoke('set-cloud-config', config),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Cloud Storage (Pro+) - R2-based storage
    cloudStorageUpload: (filePath) => ipcRenderer.invoke('cloud-storage-upload', filePath),
    cloudStorageList: () => ipcRenderer.invoke('cloud-storage-list'),
    cloudStorageDownload: (key, filename) => ipcRenderer.invoke('cloud-storage-download', key, filename),
    cloudStorageDelete: (key) => ipcRenderer.invoke('cloud-storage-delete', key),
    cloudStorageUsage: () => ipcRenderer.invoke('cloud-storage-usage'),
    // Shareable links
    cloudStorageShare: (key, expiresIn) => ipcRenderer.invoke('cloud-storage-share', { key, expiresIn }),
    cloudStorageUnshare: (key) => ipcRenderer.invoke('cloud-storage-unshare', key),
    // Preview URL
    cloudStoragePreviewUrl: (key) => ipcRenderer.invoke('cloud-storage-preview-url', key),
    // Copy to clipboard
    copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
    
    // Pro+ Features
    cloudUploadThumbnail: (videoKey, thumbnailPath) => ipcRenderer.invoke('cloud-upload-thumbnail', { videoKey, thumbnailPath }),
    cloudSetDownloadEnabled: (videoKey, enabled) => ipcRenderer.invoke('cloud-set-download-enabled', { videoKey, enabled }),
    
    // Pro Max Features
    cloudGetEmbedCode: (videoKey) => ipcRenderer.invoke('cloud-get-embed-code', videoKey),
    cloudGetVideoAnalytics: (videoKey) => ipcRenderer.invoke('cloud-get-video-analytics', videoKey),
    
    // YouTube/Vimeo Export (Pro+)
    exportToYouTube: (filePath) => ipcRenderer.invoke('export-to-youtube', filePath),
    exportToVimeo: (filePath) => ipcRenderer.invoke('export-to-vimeo', filePath),
    
    // Canvas-based recording (alternative to MediaRecorder)
    startCanvasRecording: () => ipcRenderer.invoke('start-canvas-recording'),
    captureFrame: (frameData) => ipcRenderer.invoke('capture-frame', frameData),
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
