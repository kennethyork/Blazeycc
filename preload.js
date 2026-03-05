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
    setLicense: (email, key) => ipcRenderer.invoke('set-license', { email, key }),
    validateLicense: (email, key) => ipcRenderer.invoke('validate-license', { email, key }),
    clearLicense: () => ipcRenderer.invoke('clear-license'),
    isProLicensed: () => ipcRenderer.invoke('is-pro-licensed'),
    redeemPromo: (email, code) => ipcRenderer.invoke('redeem-promo', { email, code }),
    trackUsage: (action, metadata) => ipcRenderer.invoke('track-usage', { action, metadata }),
    
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
    
    // Cloud Storage (Pro) - R2-based storage
    cloudStorageUpload: (filePath) => ipcRenderer.invoke('cloud-storage-upload', filePath),
    cloudStorageList: () => ipcRenderer.invoke('cloud-storage-list'),
    cloudStorageDownload: (key, filename) => ipcRenderer.invoke('cloud-storage-download', key, filename),
    cloudStorageDelete: (key) => ipcRenderer.invoke('cloud-storage-delete', key),
    cloudStorageUsage: () => ipcRenderer.invoke('cloud-storage-usage'),
    
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
    }
});
