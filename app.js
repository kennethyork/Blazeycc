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
    recordingBlob: null,
    // Pro features
    customWatermarkSettings: { type: 'none', text: '', position: 'bottom-left', imagePath: null }
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
    await loadLicense();
    
    // License event listeners
    document.getElementById('activateLicenseBtn')?.addEventListener('click', activateLicense);
    document.getElementById('deactivateLicenseBtn')?.addEventListener('click', deactivateLicense);

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
    
    // Check if 4K preset selected and user is not Pro
    const is4kPreset = ['yt-4k', 'vimeo-4k'].includes(preset);
    const enable4kCheckbox = document.getElementById('enable4k');
    if (is4kPreset && (!isProLicensed || (isProLicensed && !enable4kCheckbox?.checked))) {
        showNotification('4K export requires Pro license', 'warning');
        elements.formatPreset.value = 'yt-1080p'; // Reset to 1080p
    }
    
    const { width, height, quality, presetName } = getExportSettings();
    
    // Show/hide custom resolution inputs
    elements.customResolution.style.display = elements.formatPreset.value === 'custom' ? 'flex' : 'none';
    
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

    // Build Pro settings
    const removeWatermarkCheckbox = document.getElementById('removeWatermark');
    const enableFastEncodeCheckbox = document.getElementById('enableFastEncode');
    const enableCustomWatermarkCheckbox = document.getElementById('enableCustomWatermark');
    
    const proSettings = {
        removeWatermark: isProLicensed && removeWatermarkCheckbox?.checked,
        fastEncode: isProLicensed && enableFastEncodeCheckbox?.checked,
        customWatermark: (isProLicensed && enableCustomWatermarkCheckbox?.checked) ? state.customWatermarkSettings : null
    };

    // Save file with conversion
    try {
        const result = await window.electronAPI.saveVideo(
            filename, 
            Array.from(data), 
            settings.format,
            settings.quality,
            settings.width,
            settings.height,
            proSettings
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

// License management
let isProLicensed = false;

async function loadLicense() {
    try {
        const license = await window.electronAPI.getLicense();
        if (license && license.isValid) {
            isProLicensed = true;
            showLicenseActive(license.email);
            unlockProFeatures();
        } else {
            isProLicensed = false;
            showLicenseInactive();
        }
    } catch (error) {
        console.error('Error loading license:', error);
    }
}

function showLicenseActive(email) {
    const inactiveSection = document.getElementById('licenseInactive');
    const activeSection = document.getElementById('licenseActive');
    const emailDisplay = document.getElementById('licenseEmailDisplay');
    
    if (inactiveSection) inactiveSection.style.display = 'none';
    if (activeSection) activeSection.style.display = 'block';
    if (emailDisplay) emailDisplay.textContent = email;
}

function showLicenseInactive() {
    const inactiveSection = document.getElementById('licenseInactive');
    const activeSection = document.getElementById('licenseActive');
    
    if (inactiveSection) inactiveSection.style.display = 'block';
    if (activeSection) activeSection.style.display = 'none';
}

function unlockProFeatures() {
    const proSection = document.querySelector('.pro-section');
    if (proSection) {
        proSection.classList.add('pro-unlocked');
    }
    
    // Enable Pro checkboxes
    const proCheckboxes = document.querySelectorAll('.pro-feature input');
    proCheckboxes.forEach(cb => {
        cb.disabled = false;
    });
}

function lockProFeatures() {
    const proSection = document.querySelector('.pro-section');
    if (proSection) {
        proSection.classList.remove('pro-unlocked');
    }
    
    // Disable Pro checkboxes
    const proCheckboxes = document.querySelectorAll('.pro-feature input');
    proCheckboxes.forEach(cb => {
        cb.disabled = true;
        cb.checked = false;
    });
}

async function activateLicense() {
    const emailInput = document.getElementById('licenseEmail');
    const keyInput = document.getElementById('licenseKey');
    
    const email = emailInput?.value?.trim() || '';  // Email is optional for Gumroad
    const key = keyInput?.value?.trim();
    
    if (!key) {
        showNotification('Please enter your license key', 'error');
        return;
    }
    
    try {
        showNotification('Verifying license...', 'info');
        const result = await window.electronAPI.setLicense(email, key);
        if (result.success) {
            isProLicensed = true;
            // Get the actual email from the license (may come from Gumroad API)
            const license = await window.electronAPI.getLicense();
            showLicenseActive(license.email || email || 'Pro User');
            unlockProFeatures();
            showNotification('🎉 ' + result.message, 'success');
        } else {
            showNotification(result.message || 'Invalid license key', 'error');
        }
    } catch (error) {
        showNotification('Error activating license: ' + error.message, 'error');
    }
}

async function deactivateLicense() {
    try {
        await window.electronAPI.clearLicense();
        isProLicensed = false;
        showLicenseInactive();
        lockProFeatures();
        showNotification('License deactivated', 'info');
        
        // Clear inputs
        const emailInput = document.getElementById('licenseEmail');
        const keyInput = document.getElementById('licenseKey');
        if (emailInput) emailInput.value = '';
        if (keyInput) keyInput.value = '';
    } catch (error) {
        showNotification('Error deactivating license', 'error');
    }
}

// Helper to check if Pro features are enabled
function isProEnabled() {
    return isProLicensed;
}
// ========================================
// BATCH RECORDING (Pro Feature)
// ========================================
let batchQueue = [];
let batchRecordingInProgress = false;
let batchCurrentIndex = 0;

function initBatchRecording() {
    const enableBatchCheckbox = document.getElementById('enableBatch');
    const batchSection = document.getElementById('batchSection');
    const startBatchBtn = document.getElementById('startBatchBtn');
    
    enableBatchCheckbox?.addEventListener('change', (e) => {
        if (batchSection) {
            batchSection.style.display = e.target.checked ? 'block' : 'none';
        }
    });
    
    startBatchBtn?.addEventListener('click', startBatchRecording);
}

async function startBatchRecording() {
    if (batchRecordingInProgress) {
        showNotification('Batch recording already in progress', 'warning');
        return;
    }
    
    const batchUrlsTextarea = document.getElementById('batchUrls');
    const batchDuration = document.getElementById('batchDuration');
    const urls = batchUrlsTextarea?.value.trim().split('\n').filter(url => url.trim());
    
    if (!urls || urls.length === 0) {
        showNotification('Please enter at least one URL', 'error');
        return;
    }
    
    const duration = parseInt(batchDuration?.value || '30') * 1000;
    batchQueue = urls.map(url => ({ url: url.trim(), duration }));
    batchCurrentIndex = 0;
    batchRecordingInProgress = true;
    
    // Show progress
    const batchProgress = document.getElementById('batchProgress');
    const batchTotalNum = document.getElementById('batchTotalNum');
    if (batchProgress) batchProgress.style.display = 'block';
    if (batchTotalNum) batchTotalNum.textContent = batchQueue.length;
    
    showNotification(`Starting batch recording of ${batchQueue.length} URLs`, 'info');
    await processBatchQueue();
}

async function processBatchQueue() {
    if (batchCurrentIndex >= batchQueue.length) {
        // Done
        batchRecordingInProgress = false;
        const batchProgress = document.getElementById('batchProgress');
        if (batchProgress) batchProgress.style.display = 'none';
        showNotification('Batch recording complete!', 'success');
        return;
    }
    
    const item = batchQueue[batchCurrentIndex];
    const batchCurrentNum = document.getElementById('batchCurrentNum');
    const batchCurrentUrl = document.getElementById('batchCurrentUrl');
    
    if (batchCurrentNum) batchCurrentNum.textContent = batchCurrentIndex + 1;
    if (batchCurrentUrl) batchCurrentUrl.textContent = item.url;
    
    // Load website
    elements.urlInput.value = item.url;
    loadWebsite();
    
    // Wait for page to load
    await new Promise(resolve => {
        const loadHandler = () => {
            elements.webview.removeEventListener('did-finish-load', loadHandler);
            resolve();
        };
        elements.webview.addEventListener('did-finish-load', loadHandler);
        // Timeout after 30 seconds
        setTimeout(resolve, 30000);
    });
    
    // Wait a bit for page to settle
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start recording
    startRecording();
    
    // Wait for duration
    await new Promise(resolve => setTimeout(resolve, item.duration));
    
    // Stop recording
    stopRecording();
    
    // Wait for recording to save (wait for preview modal to open and auto-save)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Auto-save the recording
    if (state.recordingBlob) {
        await savePreviewedRecording();
    }
    
    // Move to next
    batchCurrentIndex++;
    await processBatchQueue();
}

// ========================================
// SCHEDULED RECORDING (Pro Feature)
// ========================================
let scheduledRecordings = [];
let scheduleCheckInterval = null;

function initScheduledRecording() {
    const enableScheduleCheckbox = document.getElementById('enableSchedule');
    const scheduleSection = document.getElementById('scheduleSection');
    const addScheduleBtn = document.getElementById('addScheduleBtn');
    
    enableScheduleCheckbox?.addEventListener('change', (e) => {
        if (scheduleSection) {
            scheduleSection.style.display = e.target.checked ? 'block' : 'none';
        }
        
        if (e.target.checked) {
            loadScheduledRecordings();
            startScheduleChecker();
        } else {
            stopScheduleChecker();
        }
    });
    
    addScheduleBtn?.addEventListener('click', addScheduledRecording);
}

async function loadScheduledRecordings() {
    try {
        scheduledRecordings = await window.electronAPI.getScheduledRecordings() || [];
        renderScheduleList();
    } catch (error) {
        console.error('Error loading scheduled recordings:', error);
    }
}

function renderScheduleList() {
    const scheduleList = document.getElementById('scheduleList');
    if (!scheduleList) return;
    
    if (scheduledRecordings.length === 0) {
        scheduleList.innerHTML = '<p class="empty-message">No scheduled recordings</p>';
        return;
    }
    
    scheduleList.innerHTML = scheduledRecordings.map((item, index) => `
        <div class="schedule-item">
            <div class="schedule-item-info">
                <span class="schedule-item-url" title="${item.url}">${item.url}</span>
                <span class="schedule-item-time">${new Date(item.time).toLocaleString()} - ${item.duration}s</span>
            </div>
            <button class="btn btn-small btn-danger" onclick="removeScheduledRecording(${index})">✕</button>
        </div>
    `).join('');
}

async function addScheduledRecording() {
    const scheduleUrl = document.getElementById('scheduleUrl');
    const scheduleTime = document.getElementById('scheduleTime');
    const scheduleDuration = document.getElementById('scheduleDuration');
    
    const url = scheduleUrl?.value.trim();
    const time = scheduleTime?.value;
    const duration = parseInt(scheduleDuration?.value || '60');
    
    if (!url) {
        showNotification('Please enter a URL', 'error');
        return;
    }
    
    if (!time) {
        showNotification('Please select a time', 'error');
        return;
    }
    
    const scheduleTimeMs = new Date(time).getTime();
    if (scheduleTimeMs <= Date.now()) {
        showNotification('Please select a future time', 'error');
        return;
    }
    
    const newSchedule = { url, time: scheduleTimeMs, duration };
    
    try {
        await window.electronAPI.addScheduledRecording(newSchedule);
        scheduledRecordings.push(newSchedule);
        renderScheduleList();
        
        // Clear form
        if (scheduleUrl) scheduleUrl.value = '';
        if (scheduleTime) scheduleTime.value = '';
        
        showNotification('Recording scheduled!', 'success');
    } catch (error) {
        showNotification('Error scheduling recording', 'error');
    }
}

window.removeScheduledRecording = async function(index) {
    try {
        await window.electronAPI.removeScheduledRecording(index);
        scheduledRecordings.splice(index, 1);
        renderScheduleList();
        showNotification('Schedule removed', 'info');
    } catch (error) {
        showNotification('Error removing schedule', 'error');
    }
};

function startScheduleChecker() {
    if (scheduleCheckInterval) return;
    
    scheduleCheckInterval = setInterval(async () => {
        const now = Date.now();
        
        for (let i = scheduledRecordings.length - 1; i >= 0; i--) {
            const item = scheduledRecordings[i];
            if (item.time <= now && !item.started) {
                // Mark as started and execute
                item.started = true;
                showNotification(`Starting scheduled recording: ${item.url}`, 'info');
                
                // Load and record
                elements.urlInput.value = item.url;
                loadWebsite();
                
                // Wait for load
                await new Promise(resolve => {
                    const loadHandler = () => {
                        elements.webview.removeEventListener('did-finish-load', loadHandler);
                        resolve();
                    };
                    elements.webview.addEventListener('did-finish-load', loadHandler);
                    setTimeout(resolve, 30000);
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                startRecording();
                
                // Stop after duration
                setTimeout(async () => {
                    stopRecording();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    if (state.recordingBlob) {
                        await savePreviewedRecording();
                    }
                    
                    // Remove from list
                    await window.electronAPI.removeScheduledRecording(i);
                    scheduledRecordings.splice(i, 1);
                    renderScheduleList();
                }, item.duration * 1000);
            }
        }
    }, 10000); // Check every 10 seconds
}

function stopScheduleChecker() {
    if (scheduleCheckInterval) {
        clearInterval(scheduleCheckInterval);
        scheduleCheckInterval = null;
    }
}

// ========================================
// CUSTOM WATERMARK (Pro Feature)
// ========================================
function initCustomWatermark() {
    const enableCustomWatermarkCheckbox = document.getElementById('enableCustomWatermark');
    const customWatermarkSection = document.getElementById('customWatermarkSection');
    const watermarkTextOptions = document.getElementById('watermarkTextOptions');
    const watermarkImageOptions = document.getElementById('watermarkImageOptions');
    const selectWatermarkImageBtn = document.getElementById('selectWatermarkImage');
    
    // Store watermark settings in state
    state.customWatermarkSettings = { type: 'none', text: '', position: 'bottom-left', imagePath: null };
    
    enableCustomWatermarkCheckbox?.addEventListener('change', async (e) => {
        if (customWatermarkSection) {
            customWatermarkSection.style.display = e.target.checked ? 'block' : 'none';
        }
        if (e.target.checked) {
            // Load saved settings
            try {
                state.customWatermarkSettings = await window.electronAPI.getCustomWatermark();
            } catch (e) {}
        }
    });
    
    // Radio buttons for watermark type
    document.querySelectorAll('input[name="watermarkType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const type = e.target.value;
            state.customWatermarkSettings.type = type;
            
            if (watermarkTextOptions) watermarkTextOptions.style.display = type === 'text' ? 'flex' : 'none';
            if (watermarkImageOptions) watermarkImageOptions.style.display = type === 'image' ? 'flex' : 'none';
            
            saveCustomWatermarkSettings();
        });
    });
    
    // Custom text input
    document.getElementById('customWatermarkText')?.addEventListener('input', (e) => {
        state.customWatermarkSettings.text = e.target.value;
        saveCustomWatermarkSettings();
    });
    
    // Position selector
    document.getElementById('watermarkPosition')?.addEventListener('change', (e) => {
        state.customWatermarkSettings.position = e.target.value;
        saveCustomWatermarkSettings();
    });
    
    // Select image button
    selectWatermarkImageBtn?.addEventListener('click', async () => {
        try {
            const result = await window.electronAPI.selectWatermarkImage();
            if (result.success) {
                state.customWatermarkSettings.imagePath = result.path;
                document.getElementById('watermarkImageName').textContent = result.path.split('/').pop();
                saveCustomWatermarkSettings();
            }
        } catch (error) {
            showNotification('Error selecting image', 'error');
        }
    });
}

async function saveCustomWatermarkSettings() {
    try {
        await window.electronAPI.setCustomWatermark(state.customWatermarkSettings);
    } catch (e) {}
}

// ========================================
// FAST ENCODING (Pro Feature)
// ========================================
function initFastEncoding() {
    const enableFastEncodeCheckbox = document.getElementById('enableFastEncode');
    
    enableFastEncodeCheckbox?.addEventListener('change', async (e) => {
        try {
            await window.electronAPI.setFastEncode(e.target.checked);
            if (e.target.checked) {
                showNotification('Fast encoding enabled - 2x faster exports!', 'success');
            }
        } catch (e) {}
    });
    
    // Load saved setting
    (async () => {
        try {
            const enabled = await window.electronAPI.getFastEncode();
            if (enableFastEncodeCheckbox) enableFastEncodeCheckbox.checked = enabled;
        } catch (e) {}
    })();
}

// ========================================
// CLOUD SYNC (Pro Feature) 
// ========================================
function initCloudSync() {
    const enableCloudSyncCheckbox = document.getElementById('enableCloudSync');
    const cloudSyncSection = document.getElementById('cloudSyncSection');
    const connectGoogleDriveBtn = document.getElementById('connectGoogleDrive');
    const connectDropboxBtn = document.getElementById('connectDropbox');
    
    enableCloudSyncCheckbox?.addEventListener('change', async (e) => {
        if (cloudSyncSection) {
            cloudSyncSection.style.display = e.target.checked ? 'block' : 'none';
        }
        if (e.target.checked) {
            loadCloudStatus();
        }
    });
    
    connectGoogleDriveBtn?.addEventListener('click', () => {
        // In a real implementation, this would open OAuth flow
        showNotification('Google Drive integration coming soon! For now, set save path to your Google Drive sync folder.', 'info');
    });
    
    connectDropboxBtn?.addEventListener('click', () => {
        // In a real implementation, this would open OAuth flow
        showNotification('Dropbox integration coming soon! For now, set save path to your Dropbox sync folder.', 'info');
    });
}

async function loadCloudStatus() {
    try {
        const config = await window.electronAPI.getCloudConfig();
        const cloudStatus = document.getElementById('cloudStatus');
        
        if (config.googleDrive || config.dropbox) {
            cloudStatus.innerHTML = `
                <div class="cloud-connected">
                    ${config.googleDrive ? '✅ Google Drive connected' : ''}
                    ${config.dropbox ? '✅ Dropbox connected' : ''}
                </div>
            `;
        } else {
            // Suggest using sync folder
            const savePath = await window.electronAPI.getSavePath();
            cloudStatus.innerHTML = `
                <p class="help-text">💡 Tip: Set your save location to a cloud-synced folder (e.g., ~/Google Drive/Recordings or ~/Dropbox/Recordings)</p>
                <p class="help-text">Current: ${savePath}</p>
            `;
        }
    } catch (e) {}
}

// Initialize Pro features
document.addEventListener('DOMContentLoaded', () => {
    initBatchRecording();
    initScheduledRecording();
    initCustomWatermark();
    initFastEncoding();
    initCloudSync();
});