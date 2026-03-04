const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Get webview source for recording
    getWebviewSource: (webviewId) => ipcRenderer.invoke('get-webview-source', webviewId),
    
    // Save video file (with MP4/GIF conversion and optional resize)
    saveVideo: (filename, data, format = 'mp4', quality = 'high', width = null, height = null) => 
        ipcRenderer.invoke('save-video', { filename, data, format, quality, width, height }),
    
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
    
    // FFmpeg progress listener
    onFFmpegProgress: (callback) => {
        ipcRenderer.on('ffmpeg-progress', (event, data) => callback(data));
    },
    removeFFmpegProgressListener: () => {
        ipcRenderer.removeAllListeners('ffmpeg-progress');
    }
});
