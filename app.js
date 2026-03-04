// DOM Elements
const elements = {
    urlInput: document.getElementById('urlInput'),
    loadBtn: document.getElementById('loadBtn'),
    recordBtn: document.getElementById('recordBtn'),
    stopBtn: document.getElementById('stopBtn'),
    screenshotBtn: document.getElementById('screenshotBtn'),
    recordingStatus: document.getElementById('recordingStatus'),
    statusText: document.getElementById('statusText'),
    recordingTimer: document.getElementById('recordingTimer'),
    placeholder: document.getElementById('placeholder'),
    webview: document.getElementById('webview'),
    browserContainer: document.getElementById('browserContainer'),
    browserToolbar: document.getElementById('browserToolbar'),
    backBtn: document.getElementById('backBtn'),
    forwardBtn: document.getElementById('forwardBtn'),
    reloadBtn: document.getElementById('reloadBtn'),
    currentUrl: document.getElementById('currentUrl'),
    captureCanvas: document.getElementById('captureCanvas'),
    notifications: document.getElementById('notifications'),
    // Settings elements
    outputFormat: document.getElementById('outputFormat'),
    formatPreset: document.getElementById('formatPreset'),
    qualitySetting: document.getElementById('qualitySetting'),
    customResolution: document.getElementById('customResolution'),
    customWidth: document.getElementById('customWidth'),
    customHeight: document.getElementById('customHeight'),
    settingsInfo: document.getElementById('settingsInfo'),
    // Bookmarks
    bookmarksBar: document.getElementById('bookmarksBar'),
    bookmarksList: document.getElementById('bookmarksList'),
    addBookmarkBtn: document.getElementById('addBookmarkBtn'),
    // History panel
    historyBtn: document.getElementById('historyBtn'),
    historyPanel: document.getElementById('historyPanel'),
    historyList: document.getElementById('historyList'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    // Settings panel
    settingsBtn: document.getElementById('settingsBtn'),
    settingsPanel: document.getElementById('settingsPanel'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    savePathInput: document.getElementById('savePathInput'),
    changeSavePathBtn: document.getElementById('changeSavePathBtn'),
    // New elements
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    autoScrollToggle: document.getElementById('autoScrollToggle'),
    // Quick export buttons
    quickExportBtns: document.querySelectorAll('.quick-export-btn'),
    // Preview modal
    previewModal: document.getElementById('previewModal'),
    previewVideo: document.getElementById('previewVideo'),
    closePreviewBtn: document.getElementById('closePreviewBtn'),
    discardBtn: document.getElementById('discardBtn'),
    savePreviewBtn: document.getElementById('savePreviewBtn'),
    // Progress modal
    progressModal: document.getElementById('progressModal'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText')
};

// Format presets - ALL PLATFORMS
const FORMAT_PRESETS = {
    'custom': { width: 1920, height: 1080, name: 'Custom' },
    // YouTube
    'yt-1080p': { width: 1920, height: 1080, name: 'YouTube 1080p' },
    'yt-720p': { width: 1280, height: 720, name: 'YouTube 720p' },
    'yt-4k': { width: 3840, height: 2160, name: 'YouTube 4K' },
    'yt-shorts': { width: 1080, height: 1920, name: 'YouTube Shorts' },
    // Instagram
    'ig-feed': { width: 1080, height: 1080, name: 'Instagram Feed' },
    'ig-story': { width: 1080, height: 1920, name: 'Instagram Story/Reels' },
    'ig-landscape': { width: 1080, height: 566, name: 'Instagram Landscape' },
    // TikTok
    'tiktok': { width: 1080, height: 1920, name: 'TikTok' },
    'tiktok-alt': { width: 1080, height: 1350, name: 'TikTok Alt' },
    // Twitter/X
    'twitter-landscape': { width: 1280, height: 720, name: 'Twitter Landscape' },
    'twitter-square': { width: 1080, height: 1080, name: 'Twitter Square' },
    'twitter-portrait': { width: 1080, height: 1350, name: 'Twitter Portrait' },
    // Facebook
    'fb-feed': { width: 1080, height: 1080, name: 'Facebook Feed' },
    'fb-story': { width: 1080, height: 1920, name: 'Facebook Story' },
    'fb-cover': { width: 1200, height: 628, name: 'Facebook Cover' },
    // LinkedIn
    'linkedin-landscape': { width: 1920, height: 1080, name: 'LinkedIn Landscape' },
    'linkedin-square': { width: 1080, height: 1080, name: 'LinkedIn Square' },
    'linkedin-portrait': { width: 1080, height: 1350, name: 'LinkedIn Portrait' },
    // Pinterest
    'pinterest-pin': { width: 1000, height: 1500, name: 'Pinterest Pin' },
    'pinterest-square': { width: 1000, height: 1000, name: 'Pinterest Square' },
    // Snapchat
    'snapchat': { width: 1080, height: 1920, name: 'Snapchat' },
    // Twitch
    'twitch-1080p': { width: 1920, height: 1080, name: 'Twitch 1080p' },
    'twitch-720p': { width: 1280, height: 720, name: 'Twitch 720p' },
    // Vimeo
    'vimeo-1080p': { width: 1920, height: 1080, name: 'Vimeo 1080p' },
    'vimeo-4k': { width: 3840, height: 2160, name: 'Vimeo 4K' }
};

// State
const state = {
    mediaRecorder: null,
    recordedChunks: [],
    stream: null,
    isRecording: false,
    recordingStartTime: null,
    timerInterval: null,
    currentUrl: '',
    websiteLoaded: false,
    captureInterval: null,
    bookmarks: [],
    history: [],
    // New state
    theme: 'dark',
    autoScrollEnabled: false,
    autoScrollInterval: null,
    pendingRecording: null, // For preview before save
    recordingBlob: null
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Load theme first
    await loadTheme();
    
    // Event listeners
    elements.loadBtn.addEventListener('click', loadWebsite);
    elements.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadWebsite();
    });
    elements.recordBtn.addEventListener('click', startRecording);
    elements.stopBtn.addEventListener('click', stopRecording);
    elements.screenshotBtn.addEventListener('click', takeScreenshot);
    
    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Auto-scroll toggle
    elements.autoScrollToggle.addEventListener('change', (e) => {
        state.autoScrollEnabled = e.target.checked;
    });
    
    // Quick export buttons
    elements.quickExportBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            const format = btn.dataset.format;
            elements.formatPreset.value = preset;
            elements.outputFormat.value = format;
            updateSettingsInfo();
            showNotification(`Set to ${btn.textContent.trim()} preset`, 'info');
        });
    });
    
    // Preview modal
    elements.closePreviewBtn.addEventListener('click', closePreviewModal);
    elements.discardBtn.addEventListener('click', discardRecording);
    elements.savePreviewBtn.addEventListener('click', savePreviewedRecording);
    
    // FFmpeg progress listener
    window.electronAPI.onFFmpegProgress((data) => {
        updateProgress(data.percent, data.done);
    });
    
    // Browser navigation
    elements.backBtn.addEventListener('click', () => elements.webview.goBack());
    elements.forwardBtn.addEventListener('click', () => elements.webview.goForward());
    elements.reloadBtn.addEventListener('click', () => elements.webview.reload());
    
    // Webview events
    elements.webview.addEventListener('did-start-loading', () => {
        elements.statusText.textContent = 'Loading...';
    });
    
    elements.webview.addEventListener('did-finish-load', () => {
        elements.statusText.textContent = 'Ready';
        elements.currentUrl.textContent = elements.webview.getURL();
        elements.addBookmarkBtn.disabled = false;
    });
    
    elements.webview.addEventListener('did-fail-load', (e) => {
        if (e.errorCode !== -3) {
            showNotification('Failed to load page: ' + e.errorDescription, 'error');
        }
    });

    elements.webview.addEventListener('did-navigate', () => {
        elements.currentUrl.textContent = elements.webview.getURL();
        state.currentUrl = elements.webview.getURL();
    });

    elements.webview.addEventListener('did-navigate-in-page', () => {
        elements.currentUrl.textContent = elements.webview.getURL();
    });

    // Settings event listeners
    elements.outputFormat.addEventListener('change', updateSettingsInfo);
    elements.formatPreset.addEventListener('change', updateSettingsInfo);
    elements.qualitySetting.addEventListener('change', updateSettingsInfo);
    elements.customWidth.addEventListener('input', updateSettingsInfo);
    elements.customHeight.addEventListener('input', updateSettingsInfo);
    
    // Bookmarks
    elements.addBookmarkBtn.addEventListener('click', addCurrentBookmark);
    
    // History panel
    elements.historyBtn.addEventListener('click', toggleHistoryPanel);
    elements.closeHistoryBtn.addEventListener('click', () => elements.historyPanel.style.display = 'none');
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Settings panel
    elements.settingsBtn.addEventListener('click', toggleSettingsPanel);
    elements.closeSettingsBtn.addEventListener('click', () => elements.settingsPanel.style.display = 'none');
    elements.changeSavePathBtn.addEventListener('click', changeSavePath);
    
    // Initialize settings display
    updateSettingsInfo();
    
    // Load saved data
    await loadBookmarks();
    await loadHistory();
    await loadSavePath();

    showNotification('Ready! Enter a URL to get started.', 'info');
}

// Get current export settings
function getExportSettings() {
    const preset = elements.formatPreset.value;
    const quality = elements.qualitySetting.value;
    const format = elements.outputFormat.value;
    
    let width, height, presetName;
    
    if (preset === 'custom') {
        width = parseInt(elements.customWidth.value) || 1920;
        height = parseInt(elements.customHeight.value) || 1080;
        presetName = 'Custom';
    } else {
        const presetData = FORMAT_PRESETS[preset];
        width = presetData.width;
        height = presetData.height;
        presetName = presetData.name;
    }
    
    return { width, height, quality, format, presetName };
}

// Update settings info display
function updateSettingsInfo() {
    const preset = elements.formatPreset.value;
    const format = elements.outputFormat.value;
    const { width, height, quality, presetName } = getExportSettings();
    
    // Show/hide custom resolution inputs
    elements.customResolution.style.display = preset === 'custom' ? 'flex' : 'none';
    
    const qualityLabels = { 'low': 'Low', 'medium': 'Medium', 'high': 'High', 'ultra': 'Ultra' };
    const formatLabel = format === 'gif' ? 'GIF' : format === 'webm' ? 'WebM' : 'MP4';
    
    elements.settingsInfo.textContent = `Output: ${formatLabel} • ${width}×${height} • ${qualityLabels[quality]} Quality • ${presetName}`;
}

// Format URL
function formatUrl(input) {
    let url = input.trim();
    if (!url) {
        return { valid: false, error: 'Please enter a URL' };
    }
    if (!url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
    }
    try {
        new URL(url);
        return { valid: true, url };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

// Load website in webview
function loadWebsite() {
    const result = formatUrl(elements.urlInput.value);
    
    if (!result.valid) {
        showNotification(result.error, 'error');
        return;
    }

    state.currentUrl = result.url;
    
    // Show webview, hide placeholder
    elements.placeholder.style.display = 'none';
    elements.webview.style.display = 'flex';
    elements.browserToolbar.style.display = 'flex';
    
    // Load the URL
    elements.webview.src = result.url;
    state.websiteLoaded = true;
    
    // Enable recording buttons
    elements.recordBtn.disabled = false;
    elements.screenshotBtn.disabled = false;
    
    showNotification('Loading website...', 'info');
}

// Start recording by capturing the webview
async function startRecording() {
    if (!state.websiteLoaded) {
        showNotification('Please load a website first', 'error');
        return;
    }

    try {
        // Get the main window source for capture
        const result = await window.electronAPI.getWebviewSource();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to get source');
        }

        // Get stream from the window
        state.stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: result.sourceId
                }
            }
        });

        // Setup recorder
        state.recordedChunks = [];
        state.mediaRecorder = new MediaRecorder(state.stream, {
            mimeType: 'video/webm; codecs=vp9'
        });

        state.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                state.recordedChunks.push(event.data);
            }
        };

        state.mediaRecorder.onstop = handleRecordingStop;

        // Start recording
        state.mediaRecorder.start();
        state.isRecording = true;
        state.recordingStartTime = Date.now();

        // Update UI
        elements.recordBtn.disabled = true;
        elements.recordBtn.classList.add('recording');
        elements.stopBtn.disabled = false;
        elements.recordingStatus.classList.add('recording');
        elements.statusText.textContent = 'Recording';

        // Start timer
        state.timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
        
        // Start auto-scroll if enabled
        if (state.autoScrollEnabled) {
            startAutoScroll();
        }

        showNotification('Recording started! Interact with the website.', 'success');
    } catch (error) {
        console.error('Recording error:', error);
        showNotification('Failed to start recording: ' + error.message, 'error');
    }
}

// Stop recording
function stopRecording() {
    // Stop auto-scroll
    stopAutoScroll();
    
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.isRecording = false;
        
        // Stop timer
        clearInterval(state.timerInterval);
        
        // Stop stream tracks
        if (state.stream) {
            state.stream.getTracks().forEach(track => track.stop());
        }
        
        // Update UI
        elements.recordBtn.disabled = false;
        elements.recordBtn.classList.remove('recording');
        elements.stopBtn.disabled = true;
        elements.recordingStatus.classList.remove('recording');
        elements.statusText.textContent = 'Processing...';
        elements.recordingTimer.textContent = '';
    }
}

// Handle recording stop - show preview first
async function handleRecordingStop() {
    const settings = getExportSettings();
    
    // Create blob from chunks
    const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
    
    // Store for later saving
    state.recordingBlob = blob;
    state.pendingRecording = {
        settings: settings,
        timestamp: new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
        urlHost: new URL(state.currentUrl).hostname.replace(/[^a-zA-Z0-9]/g, '-'),
        duration: Math.floor((Date.now() - state.recordingStartTime) / 1000)
    };
    
    // Show preview modal
    showPreviewModal(blob);
    elements.statusText.textContent = 'Preview ready';
}

// Show preview modal
function showPreviewModal(blob) {
    const url = URL.createObjectURL(blob);
    elements.previewVideo.src = url;
    elements.previewModal.style.display = 'flex';
}

// Close preview modal
function closePreviewModal() {
    elements.previewModal.style.display = 'none';
    elements.previewVideo.pause();
    elements.previewVideo.src = '';
    if (state.recordingBlob) {
        URL.revokeObjectURL(URL.createObjectURL(state.recordingBlob));
    }
}

// Discard recording
function discardRecording() {
    closePreviewModal();
    state.recordingBlob = null;
    state.pendingRecording = null;
    elements.statusText.textContent = 'Ready';
    showNotification('Recording discarded', 'info');
}

// Save previewed recording
async function savePreviewedRecording() {
    if (!state.recordingBlob || !state.pendingRecording) {
        showNotification('No recording to save', 'error');
        return;
    }
    
    closePreviewModal();
    
    const { settings, timestamp, urlHost, duration } = state.pendingRecording;
    const presetSuffix = settings.presetName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const ext = settings.format === 'gif' ? 'gif' : settings.format === 'webm' ? 'webm' : 'mp4';
    const filename = `recording-${urlHost}-${presetSuffix}-${timestamp}.${ext}`;
    
    const formatLabel = settings.format === 'gif' ? 'GIF' : settings.format === 'webm' ? 'WebM' : 'MP4';
    elements.statusText.textContent = `Converting to ${formatLabel}...`;
    
    // Show progress modal
    showProgressModal();
    
    const arrayBuffer = await state.recordingBlob.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Save file with conversion
    try {
        const result = await window.electronAPI.saveVideo(
            filename, 
            Array.from(data), 
            settings.format,
            settings.quality,
            settings.width,
            settings.height
        );
        
        hideProgressModal();
        
        if (result.success) {
            showNotification(`Video saved: ${result.path}`, 'success');
            
            // Add to history
            await window.electronAPI.addHistory({
                filename: filename,
                path: result.path,
                url: state.currentUrl,
                format: settings.format,
                preset: settings.presetName,
                duration: duration
            });
            await loadHistory();
        } else {
            showNotification('Failed to save: ' + result.error, 'error');
        }
    } catch (error) {
        hideProgressModal();
        showNotification('Failed to save video: ' + error.message, 'error');
    }

    state.recordingBlob = null;
    state.pendingRecording = null;
    elements.statusText.textContent = 'Ready';
}

// Progress modal functions
function showProgressModal() {
    elements.progressModal.style.display = 'flex';
    elements.progressBar.style.width = '0%';
    elements.progressText.textContent = '0%';
}

function hideProgressModal() {
    elements.progressModal.style.display = 'none';
}

function updateProgress(percent, done) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressText.textContent = `${percent}%`;
    if (done) {
        setTimeout(hideProgressModal, 500);
    }
}

// Take screenshot using webview's capturePage
async function takeScreenshot() {
    if (!state.websiteLoaded) {
        showNotification('Please load a website first', 'error');
        return;
    }

    try {
        // Use webview's capturePage to get a screenshot
        const image = await elements.webview.capturePage();
        const dataUrl = image.toDataURL();
        
        // Convert data URL to Uint8Array
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        const binaryString = atob(base64);
        const data = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            data[i] = binaryString.charCodeAt(i);
        }

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const urlHost = new URL(state.currentUrl).hostname.replace(/[^a-zA-Z0-9]/g, '-');
        const filename = `screenshot-${urlHost}-${timestamp}.png`;

        // Save file (no conversion needed for PNG)
        const result = await window.electronAPI.saveVideo(filename, Array.from(data), 'raw');
        
        if (result.success) {
            showNotification(`Screenshot saved: ${result.path}`, 'success');
        } else {
            showNotification('Failed to save: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('Failed to take screenshot: ' + error.message, 'error');
    }
}

// Bookmarks functions
async function loadBookmarks() {
    state.bookmarks = await window.electronAPI.getBookmarks();
    renderBookmarks();
}

function renderBookmarks() {
    elements.bookmarksList.innerHTML = '';
    
    if (state.bookmarks.length === 0) {
        elements.bookmarksList.innerHTML = '<span class="no-bookmarks">No bookmarks yet</span>';
        return;
    }
    
    state.bookmarks.forEach(bookmark => {
        const item = document.createElement('div');
        item.className = 'bookmark-item';
        item.innerHTML = `
            <span class="bookmark-title" title="${bookmark.url}">${bookmark.title || new URL(bookmark.url).hostname}</span>
            <button class="bookmark-remove" data-url="${bookmark.url}">×</button>
        `;
        
        item.querySelector('.bookmark-title').addEventListener('click', () => {
            elements.urlInput.value = bookmark.url;
            loadWebsite();
        });
        
        item.querySelector('.bookmark-remove').addEventListener('click', async (e) => {
            e.stopPropagation();
            await window.electronAPI.removeBookmark(bookmark.url);
            await loadBookmarks();
            showNotification('Bookmark removed', 'info');
        });
        
        elements.bookmarksList.appendChild(item);
    });
}

async function addCurrentBookmark() {
    if (!state.websiteLoaded) {
        showNotification('Load a website first', 'error');
        return;
    }
    
    const url = elements.webview.getURL();
    const title = await elements.webview.executeJavaScript('document.title');
    
    await window.electronAPI.addBookmark(url, title, null);
    await loadBookmarks();
    showNotification('Bookmark added!', 'success');
}

// History functions
async function loadHistory() {
    state.history = await window.electronAPI.getHistory();
    renderHistory();
}

function renderHistory() {
    if (state.history.length === 0) {
        elements.historyList.innerHTML = '<p class="empty-message">No recordings yet</p>';
        return;
    }
    
    elements.historyList.innerHTML = '';
    
    state.history.forEach(record => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const date = new Date(record.recordedAt).toLocaleString();
        const duration = record.duration ? `${Math.floor(record.duration / 60)}:${(record.duration % 60).toString().padStart(2, '0')}` : 'N/A';
        
        item.innerHTML = `
            <div class="history-info">
                <span class="history-filename">${record.filename}</span>
                <span class="history-meta">${record.preset} • ${record.format?.toUpperCase() || 'MP4'} • ${duration}</span>
                <span class="history-date">${date}</span>
            </div>
            <div class="history-actions">
                <button class="btn btn-small" data-action="open" data-path="${record.path}">📂 Show</button>
                <button class="btn btn-small btn-danger" data-action="delete" data-path="${record.path}">🗑️</button>
            </div>
        `;
        
        item.querySelector('[data-action="open"]').addEventListener('click', () => {
            window.electronAPI.openInFolder(record.path);
        });
        
        item.querySelector('[data-action="delete"]').addEventListener('click', async () => {
            await window.electronAPI.deleteHistoryItem(record.path);
            await loadHistory();
            showNotification('Removed from history', 'info');
        });
        
        elements.historyList.appendChild(item);
    });
}

function toggleHistoryPanel() {
    const isVisible = elements.historyPanel.style.display !== 'none';
    elements.historyPanel.style.display = isVisible ? 'none' : 'block';
    elements.settingsPanel.style.display = 'none';
}

async function clearHistory() {
    await window.electronAPI.clearHistory();
    await loadHistory();
    showNotification('History cleared', 'info');
}

// Settings functions
function toggleSettingsPanel() {
    const isVisible = elements.settingsPanel.style.display !== 'none';
    elements.settingsPanel.style.display = isVisible ? 'none' : 'block';
    elements.historyPanel.style.display = 'none';
}

async function loadSavePath() {
    const savePath = await window.electronAPI.getSavePath();
    elements.savePathInput.value = savePath;
}

async function changeSavePath() {
    const result = await window.electronAPI.selectSaveFolder();
    if (result.success) {
        elements.savePathInput.value = result.path;
        showNotification('Save location updated', 'success');
    }
}

// Update timer
function updateTimer() {
    if (!state.recordingStartTime) return;
    
    const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    elements.recordingTimer.textContent = `${minutes}:${seconds}`;
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    elements.notifications.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function showNotificationWithAction(message, type, actionBtn) {
    const notification = document.createElement('div');
    notification.className = `notification ${type} with-action`;
    
    const text = document.createElement('span');
    text.textContent = message;
    notification.appendChild(text);
    
    actionBtn.classList.add('notification-btn');
    actionBtn.addEventListener('click', () => notification.remove());
    notification.appendChild(actionBtn);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => notification.remove();
    notification.appendChild(closeBtn);
    
    elements.notifications.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 10000);
}

// Theme functions
async function loadTheme() {
    const theme = await window.electronAPI.getTheme();
    state.theme = theme;
    applyTheme(theme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    elements.themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

async function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    await window.electronAPI.setTheme(state.theme);
    applyTheme(state.theme);
    showNotification(`Switched to ${state.theme} theme`, 'info');
}

// Auto-scroll functions
function startAutoScroll() {
    if (!state.autoScrollEnabled || !state.websiteLoaded) return;
    
    state.autoScrollInterval = setInterval(() => {
        elements.webview.executeJavaScript(`
            (function() {
                const scrollStep = 2;
                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                if (window.scrollY < maxScroll) {
                    window.scrollBy(0, scrollStep);
                    return false;
                }
                return true;
            })()
        `).then(isAtBottom => {
            if (isAtBottom) {
                stopAutoScroll();
            }
        }).catch(() => {});
    }, 50);
}

function stopAutoScroll() {
    if (state.autoScrollInterval) {
        clearInterval(state.autoScrollInterval);
        state.autoScrollInterval = null;
    }
}
