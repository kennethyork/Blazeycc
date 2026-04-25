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
    browserViewport: document.getElementById('browserViewport'),
    browserToolbar: document.getElementById('browserToolbar'),
    backBtn: document.getElementById('backBtn'),
    forwardBtn: document.getElementById('forwardBtn'),
    reloadBtn: document.getElementById('reloadBtn'),
    currentUrl: document.getElementById('currentUrl'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    zoomLevelDisplay: document.getElementById('zoomLevelDisplay'),
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
    // AI Assist panel
    aiAssistBtn: document.getElementById('aiAssistBtn'),
    aiAssistPanel: document.getElementById('aiAssistPanel'),
    closeAiAssistBtn: document.getElementById('closeAiAssistBtn'),
    generateAiBtn: document.getElementById('generateAiBtn'),
    aiResults: document.getElementById('aiResults'),
    aiTitle: document.getElementById('aiTitle'),
    aiDescription: document.getElementById('aiDescription'),
    aiHashtags: document.getElementById('aiHashtags'),
    aiStatus: document.getElementById('aiStatus'),
    // Settings panel
    settingsBtn: document.getElementById('settingsBtn'),
    settingsPanel: document.getElementById('settingsPanel'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    savePathInput: document.getElementById('savePathInput'),
    changeSavePathBtn: document.getElementById('changeSavePathBtn'),
    gpuEncodingSetting: document.getElementById('gpuEncodingSetting'),
    gpuEncodingToggle: document.getElementById('gpuEncodingToggle'),
    gpuEncoderInfo: document.getElementById('gpuEncoderInfo'),
    frameRateSelect: document.getElementById('frameRateSelect'),
    // New elements
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    autoScrollToggle: document.getElementById('autoScrollToggle'),
    audioToggle: document.getElementById('audioToggle'),
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
    progressText: document.getElementById('progressText'),
    // Annotation elements (Pro+)
    annotationCanvas: document.getElementById('annotationCanvas'),
    annotationToolbar: document.getElementById('annotationToolbar'),
    annotationTools: document.getElementById('annotationTools'),
    annotateToggleBtn: document.getElementById('annotateToggleBtn'),
    annotationColor: document.getElementById('annotationColor'),
    annotationSize: document.getElementById('annotationSize'),
    clearAnnotationsBtn: document.getElementById('clearAnnotationsBtn'),
    undoAnnotationBtn: document.getElementById('undoAnnotationBtn')
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
    // Canvas-based recording
    canvasRecordingActive: false,
    frameCaptureInterval: null,
    // Audio capture state
    audioEnabled: false,
    audioMediaRecorder: null,
    audioChunks: [],
    // Pro features
    customWatermarkSettings: { type: 'none', text: '', position: 'bottom-left', imagePath: null },
    // Annotation state
    annotationEnabled: false,
    annotationTool: 'arrow',
    annotationHistory: [],
    annotationRedoStack: [],
    // Zoom state
    zoomLevel: 0
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
    const scrollSpeedControl = document.getElementById('scrollSpeedControl');
    const scrollSpeedInput = document.getElementById('scrollSpeed');
    const scrollSpeedValue = document.getElementById('scrollSpeedValue');
    
    elements.autoScrollToggle.addEventListener('change', (e) => {
        state.autoScrollEnabled = e.target.checked;
        if (scrollSpeedControl) {
            scrollSpeedControl.style.display = e.target.checked ? 'flex' : 'none';
        }
        // Start/stop auto-scroll immediately when toggled (if website is loaded)
        if (e.target.checked && state.websiteLoaded) {
            startAutoScroll();
            showNotification('Auto-scroll started', 'info');
        } else if (!e.target.checked) {
            stopAutoScroll();
            showNotification('Auto-scroll stopped', 'info');
        }
    });
    
    if (scrollSpeedInput && scrollSpeedValue) {
        scrollSpeedInput.addEventListener('input', (e) => {
            scrollSpeedValue.textContent = e.target.value;
        });
    }
    
    // Audio toggle
    if (elements.audioToggle) {
        // Load saved audio preference
        window.electronAPI.getAudioEnabled().then(enabled => {
            state.audioEnabled = enabled;
            elements.audioToggle.checked = enabled;
        });
        
        elements.audioToggle.addEventListener('change', async (e) => {
            state.audioEnabled = e.target.checked;
            await window.electronAPI.setAudioEnabled(e.target.checked);
            showNotification(e.target.checked ? 'Audio capture enabled' : 'Audio capture disabled', 'info');
        });
    }
    
    // Quick export buttons
    elements.quickExportBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            const format = btn.dataset.format;
            elements.formatPreset.value = preset;
            elements.outputFormat.value = format;
            resizeBrowserViewport(preset);
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
    
    // Zoom controls
    elements.zoomInBtn?.addEventListener('click', zoomIn);
    elements.zoomOutBtn?.addEventListener('click', zoomOut);
    elements.zoomResetBtn?.addEventListener('click', resetZoom);
    
    // Webview events
    elements.webview.addEventListener('did-start-loading', () => {
        elements.statusText.textContent = 'Loading...';
    });
    
    elements.webview.addEventListener('did-finish-load', () => {
        elements.statusText.textContent = 'Ready';
        elements.currentUrl.textContent = elements.webview.getURL();
        elements.addBookmarkBtn.disabled = false;
        // Reset zoom tracking on new page load
        state.zoomLevel = 0;
        updateZoomDisplay();
    });
    
    elements.webview.addEventListener('did-fail-load', (e) => {
        if (e.errorCode !== -3) {
            showNotification('Failed to load page: ' + e.errorDescription, 'error');
        }
    });

    elements.webview.addEventListener('did-navigate', () => {
        elements.currentUrl.textContent = elements.webview.getURL();
        state.currentUrl = elements.webview.getURL();
        // Re-apply zoom on navigation
        elements.webview.setZoomLevel(state.zoomLevel);
    });

    elements.webview.addEventListener('did-navigate-in-page', () => {
        elements.currentUrl.textContent = elements.webview.getURL();
        // Re-apply zoom on in-page navigation
        elements.webview.setZoomLevel(state.zoomLevel);
    });

    // Settings event listeners
    elements.outputFormat.addEventListener('change', updateSettingsInfo);
    elements.formatPreset.addEventListener('change', () => {
        resizeBrowserViewport(elements.formatPreset.value);
        updateSettingsInfo();
    });
    elements.qualitySetting.addEventListener('change', updateSettingsInfo);
    elements.customWidth.addEventListener('input', updateSettingsInfo);
    elements.customHeight.addEventListener('input', updateSettingsInfo);
    
    // Bookmarks
    elements.addBookmarkBtn.addEventListener('click', addCurrentBookmark);
    
    // History panel
    elements.historyBtn.addEventListener('click', toggleHistoryPanel);
    elements.closeHistoryBtn.addEventListener('click', () => elements.historyPanel.style.display = 'none');
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
    
    // AI Assist panel
    elements.aiAssistBtn?.addEventListener('click', toggleAiAssistPanel);
    elements.closeAiAssistBtn?.addEventListener('click', () => elements.aiAssistPanel.style.display = 'none');
    elements.generateAiBtn?.addEventListener('click', generateAiMetadata);
    
    // Copy buttons for AI results
    document.querySelectorAll('.btn-copy[data-target]')?.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const el = document.getElementById(targetId);
            if (el) {
                navigator.clipboard.writeText(el.value).then(() => {
                    showNotification('Copied to clipboard!', 'success');
                });
            }
        });
    });
    
    // Settings panel
    elements.settingsBtn.addEventListener('click', toggleSettingsPanel);
    elements.closeSettingsBtn.addEventListener('click', () => elements.settingsPanel.style.display = 'none');
    elements.changeSavePathBtn.addEventListener('click', doBrowseFolder);
    
    // Initialize settings display
    updateSettingsInfo();
    
    // Load saved data
    await loadBookmarks();
    await loadHistory();
    await loadSavePath();
    await loadFrameRate();
    await loadGpuEncoding();
    await loadLicense();

    // Apply initial viewport size for the default preset
    resizeBrowserViewport(elements.formatPreset.value);
    
    // Re-calculate viewport on window resize
    window.addEventListener('resize', () => {
        resizeBrowserViewport(elements.formatPreset.value);
    });
    
    // Keyboard shortcuts for zoom (Ctrl/Cmd + +/- and Ctrl/Cmd + 0)
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                zoomIn();
            } else if (e.key === '-') {
                e.preventDefault();
                zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                resetZoom();
            }
        }
    });

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
    
    // 4K is free for everyone
    const enable4kCheckbox = document.getElementById('enable4k');
    if (enable4kCheckbox) enable4kCheckbox.style.display = 'none';
    
    const { width, height, quality, presetName } = getExportSettings();
    
    // Show/hide custom resolution inputs
    elements.customResolution.style.display = elements.formatPreset.value === 'custom' ? 'flex' : 'none';
    
    const qualityLabels = { 'low': 'Low', 'medium': 'Medium', 'high': 'High', 'ultra': 'Ultra' };
    const formatLabel = format === 'gif' ? 'GIF' : format === 'webm' ? 'WebM' : 'MP4';
    
    elements.settingsInfo.textContent = `Output: ${formatLabel} • ${width}×${height} • ${qualityLabels[quality]} Quality • ${presetName}`;
}

// Resize the browser viewport to match the selected preset
function resizeBrowserViewport(preset) {
    if (!elements.browserViewport) return;
    
    if (preset === 'custom') {
        elements.browserViewport.style.width = '100%';
        elements.browserViewport.style.height = '100%';
        return;
    }
    
    const presetData = FORMAT_PRESETS[preset];
    if (!presetData) return;
    
    // Calculate explicit pixel size to fit preset inside container
    const containerWidth = elements.browserContainer.clientWidth;
    const containerHeight = elements.browserContainer.clientHeight;
    
    if (containerWidth === 0 || containerHeight === 0) {
        elements.browserViewport.style.width = '100%';
        elements.browserViewport.style.height = '100%';
        return;
    }
    
    const scale = Math.min(
        containerWidth / presetData.width,
        containerHeight / presetData.height,
        1
    );
    
    const displayWidth = Math.max(Math.round(presetData.width * scale), 100);
    const displayHeight = Math.max(Math.round(presetData.height * scale), 100);
    
    elements.browserViewport.style.width = displayWidth + 'px';
    elements.browserViewport.style.height = displayHeight + 'px';
}

// Format URL
function formatUrl(input) {
    let url = input.trim();
    if (!url) {
        return { valid: false, error: 'Please enter a URL' };
    }
    if (!url.match(/^https?:\/\//i)) {
        // Use http for localhost, https for everything else
        if (url.match(/^localhost|^127\.\d+\.\d+\.\d+/)) {
            url = 'http://' + url;
        } else {
            url = 'https://' + url;
        }
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
    
    // Reset zoom for new page
    state.zoomLevel = 0;
    updateZoomDisplay();
    
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
        // Start canvas-based recording (avoids SIGILL crashes with MediaRecorder)
        const result = await window.electronAPI.startCanvasRecording();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to start recording');
        }

        state.isRecording = true;
        state.recordingStartTime = Date.now();
        state.canvasRecordingActive = true;

        // Update UI
        elements.recordBtn.disabled = true;
        elements.recordBtn.classList.add('recording');
        elements.stopBtn.disabled = false;
        elements.recordingStatus.classList.add('recording');
        elements.statusText.textContent = 'Recording';

        // Start timer
        state.timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
        
        // Get selected frame rate from settings
        const captureFps = await window.electronAPI.getFrameRate();
        const captureIntervalMs = Math.round(1000 / captureFps);
        console.log(`Recording at ${captureFps} FPS (${captureIntervalMs}ms interval)`);
        
        // Start frame capture loop
        state.frameCapturePending = false;
        state.droppedFrames = 0;
        
        // Get webview's WebContents ID for main-process capture (more reliable)
        let webviewWebContentsId = null;
        try {
            const webviewWC = await elements.webview.getWebContents();
            webviewWebContentsId = webviewWC.id;
            console.log('Webview webContents ID:', webviewWebContentsId);
        } catch (e) {
            console.warn('Could not get webview webContents:', e);
        }
        
        state.frameCaptureInterval = setInterval(() => {
            if (!state.canvasRecordingActive) return;
            if (state.frameCapturePending) {
                // Track dropped frames but don't block - just skip this interval
                state.droppedFrames++;
                return;
            }
            
            state.frameCapturePending = true;
            
            // Capture via main process using webContents ID (avoids renderer stale frames)
            window.electronAPI.captureWebviewFrame(webviewWebContentsId)
                .then(async frameResult => {
                    if (frameResult.success && state.canvasRecordingActive) {
                        // Merge annotations if any
                        let frameData = frameResult.data;
                        if (state.annotationEnabled && state.annotationHistory.length > 0) {
                            frameData = await mergeAnnotationsWithFrame(frameResult.data);
                        }
                        return window.electronAPI.captureFrame(frameData);
                    }
                })
                .catch(err => {
                    console.error('Frame capture error:', err);
                })
                .finally(() => {
                    state.frameCapturePending = false;
                });
        }, captureIntervalMs);
        
        // Start audio capture if enabled
        if (state.audioEnabled) {
            await startAudioCapture();
        }
        
        // Start auto-scroll if enabled
        if (state.autoScrollEnabled) {
            startAutoScroll();
        }

        showNotification('Recording started!' + (state.audioEnabled ? ' (with audio)' : ''), 'success');
    } catch (error) {
        console.error('Recording error:', error);
        showNotification('Failed to start recording: ' + error.message, 'error');
    }
}

// Stop recording
async function stopRecording() {
    // Stop auto-scroll
    stopAutoScroll();
    
    // Stop audio capture if active
    let audioPath = null;
    if (state.audioEnabled && state.audioMediaRecorder) {
        audioPath = await stopAudioCapture();
    }
    
    // Log dropped frames if any
    if (state.droppedFrames > 0) {
        console.log(`Recording had ${state.droppedFrames} dropped frames due to processing lag`);
    }
    
    // Stop frame capture
    if (state.frameCaptureInterval) {
        clearInterval(state.frameCaptureInterval);
        state.frameCaptureInterval = null;
    }
    
    if (state.canvasRecordingActive && state.isRecording) {
        state.canvasRecordingActive = false;
        state.isRecording = false;
        
        // Stop timer
        clearInterval(state.timerInterval);
        
        // Update UI
        elements.recordBtn.disabled = false;
        elements.recordBtn.classList.remove('recording');
        elements.stopBtn.disabled = true;
        elements.recordingStatus.classList.remove('recording');
        elements.statusText.textContent = 'Processing...';
        elements.recordingTimer.textContent = '';
        
        // Process the recording with FFmpeg (pass audio path if available)
        try {
            const settings = getExportSettings();
            settings.proSettings = settings.proSettings || {};
            settings.proSettings.audioPath = audioPath;
            
            const result = await window.electronAPI.stopCanvasRecording(
                settings.format,
                settings.quality,
                settings.width,
                settings.height,
                settings.proSettings
            );
            
            if (result.success) {
                showNotification('Video saved: ' + result.filePath, 'success');
                elements.statusText.textContent = 'Ready';
                
                // Add to history
                const url = state.currentUrl || 'unknown';
                const urlHost = url !== 'unknown' ? new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '-') : 'unknown';
                const duration = Math.floor((Date.now() - state.recordingStartTime) / 1000);
                
                await window.electronAPI.addHistory({
                    url: url,
                    title: urlHost,
                    path: result.filePath,
                    filename: result.filePath.split('/').pop().split('\\').pop(),
                    preset: settings.presetName || 'Custom',
                    thumbnail: '',
                    duration: duration,
                    format: settings.format,
                    timestamp: new Date().toISOString()
                });
                
                loadHistory();
            } else {
                throw new Error(result.error || 'Failed to save video');
            }
        } catch (error) {
            console.error('Failed to save recording:', error);
            showNotification('Failed to save recording: ' + error.message, 'error');
            elements.statusText.textContent = 'Ready';
        }
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
        const filename = record.filename || (record.path ? record.path.split('/').pop().split('\\').pop() : 'Unknown');
        const preset = record.preset || 'Custom';
        
        item.innerHTML = `
            <div class="history-info">
                <span class="history-filename">${filename}</span>
                <span class="history-meta">${preset} • ${record.format?.toUpperCase() || 'MP4'} • ${duration}</span>
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
    elements.aiAssistPanel.style.display = 'none';
}

async function clearHistory() {
    await window.electronAPI.clearHistory();
    await loadHistory();
    showNotification('History cleared', 'info');
}

// =====================
// AI Assist Functions
// =====================

async function toggleAiAssistPanel() {
    const isVisible = elements.aiAssistPanel.style.display !== 'none';
    elements.aiAssistPanel.style.display = isVisible ? 'none' : 'block';
    elements.historyPanel.style.display = 'none';
    elements.settingsPanel.style.display = 'none';
}

async function generateAiMetadata() {
    if (!state.websiteLoaded) {
        showNotification('Please load a website first', 'error');
        return;
    }

    elements.aiStatus.textContent = 'Analyzing page content...';
    elements.aiResults.style.display = 'none';

    try {
        // Extract page content from the webview
        const pageData = await elements.webview.executeJavaScript(`
            (function() {
                const title = document.title || '';
                const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
                const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
                const ogDesc = document.querySelector('meta[property="og:description"]')?.content || '';
                const h1 = document.querySelector('h1')?.innerText?.substring(0, 500) || '';
                const visibleText = Array.from(document.querySelectorAll('p, h2, h3, h4, li'))
                    .map(el => el.innerText)
                    .join(' ')
                    .substring(0, 3000);
                return { title, metaDesc, ogTitle, ogDesc, h1, visibleText, url: window.location.href };
            })()
        `, true);

        const prompt = buildAiPrompt(pageData);
        elements.aiStatus.textContent = 'Generating with Ollama...';

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2',
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 300
                }
            })
        });

        if (!response.ok) {
            throw new Error('Ollama not running. Install Ollama and run: ollama run llama3.2');
        }

        const data = await response.json();
        const result = parseAiResponse(data.response);

        elements.aiTitle.value = result.title || '';
        elements.aiDescription.value = result.description || '';
        elements.aiHashtags.value = result.hashtags || '';
        elements.aiResults.style.display = 'block';
        elements.aiStatus.textContent = 'Done! Copy the results above.';
        showNotification('AI metadata generated!', 'success');
    } catch (error) {
        console.error('AI generation error:', error);
        elements.aiStatus.textContent = '';
        showNotification('AI failed: ' + error.message, 'error');
    }
}

function buildAiPrompt(pageData) {
    return `You are a social media expert. Based on this website, create:
1. A catchy YouTube title (max 60 chars)
2. A 2-sentence description for YouTube/LinkedIn
3. 5 relevant hashtags for Twitter/X, Instagram, and TikTok

Website URL: ${pageData.url}
Title: ${pageData.title}
Meta Description: ${pageData.metaDesc}
OG Title: ${pageData.ogTitle}
OG Description: ${pageData.ogDesc}
H1: ${pageData.h1}
Page Content: ${pageData.visibleText.substring(0, 2000)}

Respond in this exact format:
TITLE: <title here>
DESCRIPTION: <description here>
HASHTAGS: <hashtag1> <hashtag2> <hashtag3> <hashtag4> <hashtag5>`;
}

function parseAiResponse(response) {
    const lines = response.split('\n');
    let title = '';
    let description = '';
    let hashtags = '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('TITLE:')) {
            title = trimmed.substring(6).trim();
        } else if (trimmed.startsWith('DESCRIPTION:')) {
            description = trimmed.substring(12).trim();
        } else if (trimmed.startsWith('HASHTAGS:')) {
            hashtags = trimmed.substring(9).trim();
        }
    }

    // Fallback: if parsing failed, use simple heuristics
    if (!title && response.length > 0) {
        const firstLine = response.split('\n')[0];
        title = firstLine.substring(0, 60);
    }
    if (!description && response.length > 0) {
        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 20);
        description = sentences.slice(0, 2).join('. ') + '.';
    }

    return { title, description, hashtags };
}

// Settings functions
async function toggleSettingsPanel() {
    const isVisible = elements.settingsPanel.style.display !== 'none';
    elements.settingsPanel.style.display = isVisible ? 'none' : 'block';
    elements.historyPanel.style.display = 'none';
    elements.aiAssistPanel.style.display = 'none';
}

async function loadSavePath() {
    const savePath = await window.electronAPI.getSavePath();
    elements.savePathInput.value = savePath;
}

async function loadFrameRate() {
    try {
        const fps = await window.electronAPI.getFrameRate();
        if (elements.frameRateSelect) {
            elements.frameRateSelect.value = String(fps);
            
            elements.frameRateSelect.addEventListener('change', async (e) => {
                const selectedFps = parseInt(e.target.value);
                await window.electronAPI.setFrameRate(selectedFps);
                showNotification(`Frame rate set to ${selectedFps} FPS`, 'info');
            });
        }
    } catch (e) {
        console.log('Frame rate load failed:', e);
    }
}

async function loadGpuEncoding() {
    try {
        const gpuInfo = await window.electronAPI.detectGpuEncoder();
        if (gpuInfo.available) {
            elements.gpuEncodingToggle.disabled = false;
            elements.gpuEncoderInfo.textContent = `Detected: ${gpuInfo.name}`;
            const enabled = await window.electronAPI.getGpuEncoding();
            elements.gpuEncodingToggle.checked = enabled;
            document.getElementById('gpuHelp').style.display = 'none';
        } else {
            elements.gpuEncodingToggle.disabled = true;
            elements.gpuEncodingToggle.checked = false;
            elements.gpuEncoderInfo.textContent = 'Install system FFmpeg for GPU encoding (bundled FFmpeg has no GPU support)';
            document.getElementById('gpuHelp').style.display = 'block';
        }
    } catch (e) {
        console.log('GPU detection failed:', e);
        elements.gpuEncodingToggle.disabled = true;
        elements.gpuEncodingToggle.checked = false;
        elements.gpuEncoderInfo.textContent = 'GPU detection failed (CPU encoding only)';
        document.getElementById('gpuHelp').style.display = 'block';
    }
    
    // Add event listener
    if (elements.gpuEncodingToggle) {
        elements.gpuEncodingToggle.addEventListener('change', async (e) => {
            await window.electronAPI.setGpuEncoding(e.target.checked);
            showNotification(e.target.checked ? 'GPU encoding enabled' : 'GPU encoding disabled', 'info');
        });
    }
}

// Click handler for browse folder
function doBrowseFolder() {
    console.log('doBrowseFolder clicked');
    var fileInput = document.getElementById('folderPickerFallback');

    if (window.electronAPI && typeof window.electronAPI.selectSaveFolder === 'function') {
        console.log('electronAPI available, calling selectSaveFolder...');
        window.electronAPI.selectSaveFolder()
            .then(function(result) {
                console.log('selectSaveFolder result:', result);
                if (result.success) {
                    elements.savePathInput.value = result.path;
                    showNotification('Save location updated', 'success');
                } else if (result.error) {
                    showNotification('Error: ' + result.error, 'error');
                }
            })
            .catch(function(err) {
                console.error('Browse folder error, trying fallback:', err);
                if (fileInput) fileInput.click();
            });
    } else if (fileInput) {
        console.log('No IPC, using file input fallback');
        fileInput.click();
    } else {
        console.error('electronAPI and file input fallback not available');
        showNotification('Folder picker not available', 'error');
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

// Zoom functions
function updateZoomDisplay() {
    // Convert zoom level to percentage: zoomLevel 0 = 100%, each 1 = 2x
    const percent = Math.round(Math.pow(2, state.zoomLevel) * 100);
    if (elements.zoomLevelDisplay) {
        elements.zoomLevelDisplay.textContent = percent + '%';
    }
}

function setZoomLevel(level) {
    if (!elements.webview || elements.webview.style.display === 'none') return;
    
    // Clamp zoom level between -3 (12.5%) and 3 (800%)
    state.zoomLevel = Math.max(-3, Math.min(3, level));
    
    elements.webview.setZoomLevel(state.zoomLevel);
    updateZoomDisplay();
}

function zoomIn() {
    setZoomLevel(state.zoomLevel + 0.25);
    showNotification('Zoom: ' + elements.zoomLevelDisplay.textContent, 'info');
}

function zoomOut() {
    setZoomLevel(state.zoomLevel - 0.25);
    showNotification('Zoom: ' + elements.zoomLevelDisplay.textContent, 'info');
}

function resetZoom() {
    setZoomLevel(0);
    showNotification('Zoom reset to 100%', 'info');
}

// Theme functions
async function loadTheme() {
    const theme = await window.electronAPI.getTheme();
    state.theme = theme;
    applyTheme(theme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.background = '';
    document.body.style.color = '';
    if (theme === 'light') {
        document.body.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)';
        document.body.style.color = '#333333';
    }
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
    
    // Clear any existing interval first
    stopAutoScroll();
    
    console.log('Auto-scroll started');
    
    // Get scroll speed from settings (default: 2)
    const scrollSpeed = parseInt(document.getElementById('scrollSpeed')?.value) || 2;
    
    state.autoScrollInterval = setInterval(() => {
        if (!state.autoScrollEnabled) {
            stopAutoScroll();
            return;
        }
        elements.webview.executeJavaScript(`
            (function() {
                const scrollStep = ${scrollSpeed};
                // Try multiple scroll containers
                const scrollEl = document.scrollingElement || document.documentElement || document.body;
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
                const maxScroll = Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.offsetHeight
                ) - window.innerHeight;
                
                if (currentScroll < maxScroll - 5) {
                    window.scrollBy({ top: scrollStep, behavior: 'auto' });
                    return false;
                }
                return true;
            })()
        `).then(isAtBottom => {
            if (isAtBottom) {
                console.log('Auto-scroll reached bottom');
                stopAutoScroll();
                // Uncheck toggle and update state
                state.autoScrollEnabled = false;
                if (elements.autoScrollToggle) {
                    elements.autoScrollToggle.checked = false;
                }
                showNotification('Auto-scroll finished', 'info');
            }
        }).catch(err => {
            console.error('Auto-scroll error:', err);
            stopAutoScroll();
        });
    }, 50);
}

function stopAutoScroll() {
    if (state.autoScrollInterval) {
        clearInterval(state.autoScrollInterval);
        state.autoScrollInterval = null;
        console.log('Auto-scroll stopped');
    }
    // Also stop any momentum scrolling in the webview
    if (elements.webview) {
        elements.webview.executeJavaScript(`
            window.scrollTo(window.pageXOffset, window.pageYOffset);
        `).catch(() => {});
    }
}

// License management - ALL FEATURES ARE FREE
const isProLicensed = true;
const isProPlusLicensed = true;
const licenseTier = 'pro+';

async function loadLicense() {
    // All features are free, no license needed
    unlockProFeatures();
    unlockProPlusFeatures();
}

function unlockProFeatures() {}
function unlockProPlusFeatures() {}
function lockProPlusFeatures() {}
function lockProFeatures() {}

// License functions - no longer needed, all features are free
async function activateLicense() {}
async function deactivateLicense() {}
async function redeemPromoCode() {}
async function openStripeCheckout() {}
function isProEnabled() { return true; }
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



// Initialize features
document.addEventListener('DOMContentLoaded', () => {
    initBatchRecording();
    initScheduledRecording();
    initCustomWatermark();
    initFastEncoding();
    initAnnotations();
});

// =====================
// ANNOTATION FUNCTIONS (Pro+)
// =====================

let annotationCtx = null;
let isDrawing = false;
let startX = 0, startY = 0;

function initAnnotations() {
    const canvas = elements.annotationCanvas;
    const toolbar = elements.annotationToolbar;
    
    if (!canvas || !toolbar) return;
    
    annotationCtx = canvas.getContext('2d');
    
    // Check if Pro+ license
    checkAnnotationAccess();
    
    // Setup canvas size when webview loads
    elements.webview?.addEventListener('dom-ready', () => {
        resizeAnnotationCanvas();
        // Show annotation toolbar for Pro+ users
        checkAnnotationAccess();
    });
    
    // Toggle annotation mode
    elements.annotateToggleBtn?.addEventListener('click', toggleAnnotationMode);
    
    // Tool selection
    document.querySelectorAll('.annotation-tool[data-tool]').forEach(btn => {
        if (btn.dataset.tool !== 'toggle') {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.annotation-tool').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.annotationTool = btn.dataset.tool;
            });
        }
    });
    
    // Clear annotations
    elements.clearAnnotationsBtn?.addEventListener('click', clearAnnotations);
    
    // Undo
    elements.undoAnnotationBtn?.addEventListener('click', undoAnnotation);
    
    // Canvas drawing events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    // Window resize
    window.addEventListener('resize', resizeAnnotationCanvas);
}

async function checkAnnotationAccess() {
    // All features are free - show annotation toolbar for everyone
    if (elements.annotationToolbar) {
        elements.annotationToolbar.style.display = 'flex';
    }
}

function resizeAnnotationCanvas() {
    const container = document.getElementById('browserContainer');
    const canvas = elements.annotationCanvas;
    
    if (!container || !canvas) return;
    
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    
    // Redraw existing annotations
    redrawAnnotations();
}

function toggleAnnotationMode() {
    state.annotationEnabled = !state.annotationEnabled;
    const canvas = elements.annotationCanvas;
    const tools = elements.annotationTools;
    
    if (state.annotationEnabled) {
        canvas.style.display = 'block';
        canvas.classList.add('active');
        tools.style.display = 'flex';
        elements.annotateToggleBtn?.classList.add('active');
        showNotification('Annotation mode enabled - draw on the screen', 'info');
    } else {
        canvas.classList.remove('active');
        tools.style.display = 'none';
        elements.annotateToggleBtn?.classList.remove('active');
    }
}

function startDrawing(e) {
    if (!state.annotationEnabled) return;
    
    isDrawing = true;
    const rect = elements.annotationCanvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    if (state.annotationTool === 'text') {
        isDrawing = false;
        showTextInput(startX, startY);
    }
}

function draw(e) {
    if (!isDrawing || !state.annotationEnabled) return;
    
    const canvas = elements.annotationCanvas;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // For highlight, draw continuously
    if (state.annotationTool === 'highlight') {
        const color = elements.annotationColor?.value || '#ff0000';
        const size = parseInt(elements.annotationSize?.value || '4');
        
        annotationCtx.globalAlpha = 0.3;
        annotationCtx.strokeStyle = color;
        annotationCtx.lineWidth = size * 3;
        annotationCtx.lineCap = 'round';
        annotationCtx.beginPath();
        annotationCtx.moveTo(startX, startY);
        annotationCtx.lineTo(x, y);
        annotationCtx.stroke();
        annotationCtx.globalAlpha = 1;
        
        startX = x;
        startY = y;
    }
}

function stopDrawing(e) {
    if (!isDrawing || !state.annotationEnabled) return;
    isDrawing = false;
    
    const canvas = elements.annotationCanvas;
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    const color = elements.annotationColor?.value || '#ff0000';
    const size = parseInt(elements.annotationSize?.value || '4');
    
    // Save annotation to history
    const annotation = {
        tool: state.annotationTool,
        startX, startY, endX, endY,
        color, size
    };
    
    state.annotationHistory.push(annotation);
    state.annotationRedoStack = [];
    
    // Draw the shape
    drawShape(annotation);
}

function drawShape(ann) {
    annotationCtx.strokeStyle = ann.color;
    annotationCtx.fillStyle = ann.color;
    annotationCtx.lineWidth = ann.size;
    annotationCtx.lineCap = 'round';
    annotationCtx.lineJoin = 'round';
    
    switch (ann.tool) {
        case 'arrow':
            drawArrow(ann.startX, ann.startY, ann.endX, ann.endY, ann.size);
            break;
        case 'rectangle':
            annotationCtx.strokeRect(
                ann.startX, ann.startY,
                ann.endX - ann.startX, ann.endY - ann.startY
            );
            break;
        case 'circle':
            const radiusX = Math.abs(ann.endX - ann.startX) / 2;
            const radiusY = Math.abs(ann.endY - ann.startY) / 2;
            const centerX = ann.startX + (ann.endX - ann.startX) / 2;
            const centerY = ann.startY + (ann.endY - ann.startY) / 2;
            annotationCtx.beginPath();
            annotationCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            annotationCtx.stroke();
            break;
        case 'text':
            if (ann.text) {
                annotationCtx.font = `${ann.size * 4}px sans-serif`;
                annotationCtx.fillText(ann.text, ann.startX, ann.startY);
            }
            break;
    }
}

function drawArrow(fromX, fromY, toX, toY, size) {
    const headLength = size * 4;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    // Line
    annotationCtx.beginPath();
    annotationCtx.moveTo(fromX, fromY);
    annotationCtx.lineTo(toX, toY);
    annotationCtx.stroke();
    
    // Arrowhead
    annotationCtx.beginPath();
    annotationCtx.moveTo(toX, toY);
    annotationCtx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    annotationCtx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    annotationCtx.closePath();
    annotationCtx.fill();
}

function showTextInput(x, y) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'annotation-text-input';
    input.style.left = x + 'px';
    input.style.top = y + 'px';
    
    const container = document.getElementById('browserContainer');
    container.appendChild(input);
    input.focus();
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value) {
            const annotation = {
                tool: 'text',
                startX: x, startY: y + 20,
                endX: x, endY: y,
                color: elements.annotationColor?.value || '#ff0000',
                size: parseInt(elements.annotationSize?.value || '4'),
                text: input.value
            };
            state.annotationHistory.push(annotation);
            drawShape(annotation);
            input.remove();
        } else if (e.key === 'Escape') {
            input.remove();
        }
    });
    
    input.addEventListener('blur', () => input.remove());
}

function clearAnnotations() {
    const canvas = elements.annotationCanvas;
    annotationCtx.clearRect(0, 0, canvas.width, canvas.height);
    state.annotationHistory = [];
    state.annotationRedoStack = [];
}

function undoAnnotation() {
    if (state.annotationHistory.length === 0) return;
    
    const last = state.annotationHistory.pop();
    state.annotationRedoStack.push(last);
    redrawAnnotations();
}

function redrawAnnotations() {
    const canvas = elements.annotationCanvas;
    annotationCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    state.annotationHistory.forEach(ann => {
        if (ann.tool === 'highlight') {
            annotationCtx.globalAlpha = 0.3;
        }
        drawShape(ann);
        annotationCtx.globalAlpha = 1;
    });
}

// Get annotation canvas data for merging with recording
function getAnnotationImageData() {
    if (!elements.annotationCanvas) return null;
    return elements.annotationCanvas.toDataURL('image/png');
}

// Merge annotations with a video frame
async function mergeAnnotationsWithFrame(frameData) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const frameImg = new Image();
        frameImg.onload = () => {
            canvas.width = frameImg.width;
            canvas.height = frameImg.height;
            
            // Draw the original frame
            ctx.drawImage(frameImg, 0, 0);
            
            // Draw annotations on top
            const annotationCanvas = elements.annotationCanvas;
            if (annotationCanvas) {
                // Scale annotations to match frame size
                ctx.drawImage(
                    annotationCanvas, 
                    0, 0, annotationCanvas.width, annotationCanvas.height,
                    0, 0, canvas.width, canvas.height
                );
            }
            
            resolve(canvas.toDataURL('image/png'));
        };
        frameImg.onerror = () => resolve(frameData); // Fall back to original
        frameImg.src = frameData;
    });
}

// =====================
// AUDIO CAPTURE FUNCTIONS
// =====================

// Start capturing audio from the webview (website audio, not system audio)
async function startAudioCapture() {
    const webview = elements.webview;
    if (!webview || webview.style.display === 'none') {
        console.log('No webview available for audio capture');
        return;
    }

    try {
        // Inject audio capture into the webview using Web Audio API
        const result = await webview.executeJavaScript(`
            (function() {
                if (window.__blazeyccAudioRecorder) return { status: 'already_started' };

                try {
                    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    audioCtx.resume().catch(function(){});
                    var dest = audioCtx.createMediaStreamDestination();
                    window.__blazeyccAudioCtx = audioCtx;
                    window.__blazeyccAudioDest = dest;
                    window.__blazeyccAudioChunks = [];
                    var connectedCount = 0;

                    // Connect a media element to the capture graph
                    var connectEl = function(el) {
                        if (el.__blazeyccConnected) return;
                        try {
                            // Try setting crossOrigin to help with CORS media
                            if (!el.crossOrigin && el.src) {
                                el.crossOrigin = 'anonymous';
                            }
                            var src = audioCtx.createMediaElementSource(el);
                            src.connect(dest);
                            src.connect(audioCtx.destination); // keep audible
                            el.__blazeyccConnected = true;
                            connectedCount++;
                        } catch(e) {}
                    };

                    // Recursively find media elements including inside iframes
                    var findAndConnect = function(doc) {
                        if (!doc) return;
                        doc.querySelectorAll('audio, video').forEach(connectEl);
                        doc.querySelectorAll('iframe').forEach(function(iframe) {
                            try {
                                if (iframe.contentDocument) {
                                    findAndConnect(iframe.contentDocument);
                                }
                            } catch(e) {}
                        });
                    };
                    findAndConnect(document);

                    // Watch for dynamically added elements
                    var observer = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            mutation.addedNodes.forEach(function(node) {
                                if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
                                    connectEl(node);
                                }
                                if (node.querySelectorAll) {
                                    node.querySelectorAll('audio, video').forEach(connectEl);
                                    node.querySelectorAll('iframe').forEach(function(iframe) {
                                        try {
                                            if (iframe.contentDocument) {
                                                findAndConnect(iframe.contentDocument);
                                            }
                                        } catch(e) {}
                                    });
                                }
                            });
                        });
                    });
                    if (document.body) {
                        observer.observe(document.body, { childList: true, subtree: true });
                    }
                    window.__blazeyccAudioObserver = observer;

                    // Also hook window.Audio constructor for programmatic audio
                    var OriginalAudio = window.Audio;
                    window.Audio = function() {
                        var audio = new (Function.prototype.bind.apply(OriginalAudio, [null].concat(Array.prototype.slice.call(arguments))));
                        setTimeout(function() { connectEl(audio); }, 0);
                        return audio;
                    };
                    window.Audio.prototype = OriginalAudio.prototype;

                    // Determine supported mimeType
                    var mimeType = 'audio/webm;codecs=opus';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'audio/webm';
                    }
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'audio/mp4';
                    }
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = '';
                    }

                    // Start recording the captured stream
                    var recorder = mimeType 
                        ? new MediaRecorder(dest.stream, { mimeType: mimeType })
                        : new MediaRecorder(dest.stream);
                    window.__blazeyccAudioRecorder = recorder;
                    window.__blazeyccAudioMimeType = mimeType || recorder.mimeType;
                    recorder.ondataavailable = function(e) {
                        if (e.data && e.data.size > 0) window.__blazeyccAudioChunks.push(e.data);
                    };
                    recorder.start(1000);
                    return { status: 'started', connected: connectedCount, mimeType: window.__blazeyccAudioMimeType };
                } catch(e) {
                    return { status: 'error', message: e.message };
                }
            })()
        `, true);

        if (result && result.status === 'started') {
            state.audioMediaRecorder = true;
            console.log('Webview audio capture started, connected elements:', result.connected, 'mimeType:', result.mimeType);
            if (result.connected === 0) {
                console.warn('No audio/video elements were connected - audio may be silent');
            }
        } else if (result && result.status === 'already_started') {
            console.log('Webview audio capture already running');
        } else {
            console.log('Webview audio capture failed:', result);
            showNotification('Audio capture failed: ' + (result && result.message ? result.message : 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Failed to start webview audio capture:', error);
        showNotification('Audio capture failed: ' + error.message, 'error');
    }
}

// Stop audio capture and return the audio file path
async function stopAudioCapture() {
    const webview = elements.webview;
    if (!webview || !state.audioMediaRecorder) {
        return null;
    }

    try {
        // Stop recorder in webview and get base64 data back
        const result = await webview.executeJavaScript(`
            new Promise(function(resolve) {
                var recorder = window.__blazeyccAudioRecorder;
                if (!recorder) {
                    resolve({ base64: null, size: 0 });
                    return;
                }

                recorder.onstop = function() {
                    var mimeType = window.__blazeyccAudioMimeType || 'audio/webm';
                    var blob = new Blob(window.__blazeyccAudioChunks, { type: mimeType });

                    // Clean up
                    if (window.__blazeyccAudioObserver) {
                        window.__blazeyccAudioObserver.disconnect();
                        window.__blazeyccAudioObserver = null;
                    }
                    if (window.__blazeyccAudioCtx) {
                        window.__blazeyccAudioCtx.close();
                        window.__blazeyccAudioCtx = null;
                    }
                    window.__blazeyccAudioRecorder = null;
                    window.__blazeyccAudioDest = null;

                    if (blob.size === 0) {
                        resolve({ base64: null, size: 0 });
                        return;
                    }

                    var reader = new FileReader();
                    reader.onloadend = function() {
                        resolve({ base64: reader.result.split(',')[1], size: blob.size });
                    };
                    reader.readAsDataURL(blob);
                };

                recorder.stop();
            })
        `, true);

        if (result && result.base64) {
            console.log('Audio blob size from webview:', result.size);
            const startResult = await window.electronAPI.startAudioCapture();
            if (startResult.success) {
                await window.electronAPI.saveAudioChunk(result.base64);
                const stopResult = await window.electronAPI.stopAudioCapture();
                if (stopResult.success) {
                    console.log('Audio saved to:', stopResult.audioPath);
                    return stopResult.audioPath;
                }
            }
        } else {
            console.warn('No audio data captured from webview');
            showNotification('No audio captured - the page may not have playable media', 'warning');
        }
    } catch (error) {
        console.error('Failed to stop webview audio capture:', error);
        showNotification('Audio save failed: ' + error.message, 'error');
    }

    return null;
}