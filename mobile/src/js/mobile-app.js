// Blazeycc Mobile — Full-Featured Android App
// Uses Capacitor native screen recording + canvas annotations + AI via LocalLlm (on-device) or Ollama (remote)

import { ScreenRecorder } from '@blazeycc/screen-recorder';
import { LocalLlm } from '@blazeycc/local-llm';
import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

// =====================
// STATE & CONFIG
// =====================

const state = {
    isRecording: false,
    recordingStartTime: null,
    timerInterval: null,
    websiteLoaded: false,
    currentUrl: '',
    zoomLevel: 1,
    autoScrollInterval: null,
    autoScrollEnabled: false,
    annotationEnabled: false,
    annotationTool: 'select',
    annotationColor: '#ff0000',
    annotationSize: 4,
    annotationObjects: [],
    annotationUndone: [],
    isDragging: false,
    isResizing: false,
    selectedObj: null,
    dragStartX: 0,
    dragStartY: 0,
    lastVideoPath: null,
    lastRecordingDuration: 0,
    bookmarks: [],
    history: [],
    scheduledRecordings: [],
    theme: 'dark',
    ollamaConfig: { endpoint: 'http://localhost:11434', model: 'qwen2.5:4b' },
    aiBackend: 'local', // 'local' or 'remote'
    localModelLoaded: false,
    localModelPath: '',
    batchQueue: [],
    batchRecordingInProgress: false,
    batchCurrentIndex: 0
};

const FORMAT_PRESETS = {
    'custom': { width: 1080, height: 1920 },
    'yt-shorts': { width: 1080, height: 1920 },
    'ig-story': { width: 1080, height: 1920 },
    'tiktok': { width: 1080, height: 1920 },
    'yt-1080p': { width: 1920, height: 1080 },
    'yt-720p': { width: 1280, height: 720 },
    'ig-feed': { width: 1080, height: 1080 },
    'twitter-landscape': { width: 1280, height: 720 },
    'twitter-square': { width: 1080, height: 1080 },
    'linkedin-landscape': { width: 1920, height: 1080 },
    'fb-feed': { width: 1080, height: 1080 }
};

// =====================
// DOM ELEMENTS
// =====================

const elements = {
    urlInput: document.getElementById('urlInput'),
    loadBtn: document.getElementById('loadBtn'),
    recordBtn: document.getElementById('recordBtn'),
    stopBtn: document.getElementById('stopBtn'),
    recordingTimer: document.getElementById('recordingTimer'),
    placeholder: document.getElementById('placeholder'),
    browserFrame: document.getElementById('browserFrame'),
    browserContainer: document.getElementById('browserContainer'),
    annotationCanvas: document.getElementById('annotationCanvas'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    zoomLevelDisplay: document.getElementById('zoomLevelDisplay'),
    autoScrollBtn: document.getElementById('autoScrollBtn'),
    settingsToggle: document.getElementById('settingsToggle'),
    settingsBackdrop: document.getElementById('settingsBackdrop'),
    settingsSheet: document.getElementById('settingsSheet'),
    previewModal: document.getElementById('previewModal'),
    previewVideo: document.getElementById('previewVideo'),
    closePreviewBtn: document.getElementById('closePreviewBtn'),
    discardBtn: document.getElementById('discardBtn'),
    shareBtn: document.getElementById('shareBtn'),
    browserWrapper: document.getElementById('browserWrapper'),
    iframeSpinner: document.getElementById('iframeSpinner'),
    formatPreset: document.getElementById('formatPreset'),
    qualitySetting: document.getElementById('qualitySetting'),
    frameRateSelect: document.getElementById('frameRateSelect'),
    autoZoomToggle: document.getElementById('autoZoomToggle'),
    autoZoomLevel: document.getElementById('autoZoomLevel'),
    autoZoomLevelValue: document.getElementById('autoZoomLevelValue'),
    autoZoomDuration: document.getElementById('autoZoomDuration'),
    autoZoomDurationValue: document.getElementById('autoZoomDurationValue'),
    autoZoomOptions: document.getElementById('autoZoomOptions'),
    annotationToolbar: document.getElementById('annotationToolbar'),
    annotateToggleBtn: document.getElementById('annotateToggleBtn'),
    annotationColor: document.getElementById('annotationColor'),
    annotationSize: document.getElementById('annotationSize'),
    clearAnnotationsBtn: document.getElementById('clearAnnotationsBtn'),
    undoAnnotationBtn: document.getElementById('undoAnnotationBtn'),
    closeAnnotationsBtn: document.getElementById('closeAnnotationsBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    historyBtn: document.getElementById('historyBtn'),
    historyPanel: document.getElementById('historyPanel'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    historyList: document.getElementById('historyList'),
    aiAssistBtn: document.getElementById('aiAssistBtn'),
    aiAssistPanel: document.getElementById('aiAssistPanel'),
    closeAiAssistBtn: document.getElementById('closeAiAssistBtn'),
    generateAiBtn: document.getElementById('generateAiBtn'),
    aiStatus: document.getElementById('aiStatus'),
    aiResults: document.getElementById('aiResults'),
    aiTitle: document.getElementById('aiTitle'),
    aiDescription: document.getElementById('aiDescription'),
    aiHashtags: document.getElementById('aiHashtags'),
    aiBackend: document.getElementById('aiBackend'),
    modelSelect: document.getElementById('modelSelect'),
    modelStatus: document.getElementById('modelStatus'),
    downloadModelBtn: document.getElementById('downloadModelBtn'),
    downloadProgress: document.getElementById('downloadProgress'),
    downloadProgressBar: document.getElementById('downloadProgressBar'),
    downloadProgressText: document.getElementById('downloadProgressText'),
    loadModelBtn: document.getElementById('loadModelBtn'),
    localModelControls: document.getElementById('localModelControls'),
    remoteModelControls: document.getElementById('remoteModelControls'),
    ollamaIp: document.getElementById('ollamaIp'),
    testOllamaBtn: document.getElementById('testOllamaBtn'),
    bookmarksBar: document.getElementById('bookmarksBar'),
    bookmarksList: document.getElementById('bookmarksList'),
    addBookmarkBtn: document.getElementById('addBookmarkBtn'),
    onboardingModal: document.getElementById('onboardingModal'),
    closeOnboardingBtn: document.getElementById('closeOnboardingBtn'),
    skipOnboarding: document.getElementById('skipOnboarding'),
    enableBatch: document.getElementById('enableBatch'),
    batchSection: document.getElementById('batchSection'),
    batchUrls: document.getElementById('batchUrls'),
    batchDuration: document.getElementById('batchDuration'),
    startBatchBtn: document.getElementById('startBatchBtn'),
    batchProgress: document.getElementById('batchProgress'),
    batchCurrentNum: document.getElementById('batchCurrentNum'),
    batchTotalNum: document.getElementById('batchTotalNum'),
    enableSchedule: document.getElementById('enableSchedule'),
    scheduleSection: document.getElementById('scheduleSection'),
    scheduleUrl: document.getElementById('scheduleUrl'),
    scheduleTime: document.getElementById('scheduleTime'),
    scheduleDuration: document.getElementById('scheduleDuration'),
    addScheduleBtn: document.getElementById('addScheduleBtn'),
    scheduleList: document.getElementById('scheduleList')
};

// Notification container
let notificationsContainer;

// =====================
// INIT
// =====================

document.addEventListener('DOMContentLoaded', init);

function init() {
    // Create notification container
    notificationsContainer = document.createElement('div');
    notificationsContainer.className = 'notifications';
    document.body.appendChild(notificationsContainer);

    // URL loading
    elements.loadBtn.addEventListener('click', loadWebsite);
    elements.urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadWebsite(); });
    elements.browserFrame.addEventListener('error', handleIframeError);
    const openInBrowserBtn = document.getElementById('openInBrowserBtn');
    if (openInBrowserBtn) openInBrowserBtn.addEventListener('click', openInSystemBrowser);

    // Recording
    elements.recordBtn.addEventListener('click', startRecording);
    elements.stopBtn.addEventListener('click', stopRecording);

    // Zoom controls
    elements.zoomInBtn.addEventListener('click', zoomIn);
    elements.zoomOutBtn.addEventListener('click', zoomOut);
    elements.zoomResetBtn.addEventListener('click', resetZoom);

    // Auto-scroll
    elements.autoScrollBtn.addEventListener('click', toggleAutoScroll);

    // Settings
    elements.settingsToggle.addEventListener('click', toggleSettings);
    elements.settingsBackdrop.addEventListener('click', closeSettings);
    elements.autoZoomToggle.addEventListener('change', (e) => {
        elements.autoZoomOptions.style.display = e.target.checked ? 'block' : 'none';
        saveSettings();
    });
    elements.autoZoomLevel.addEventListener('input', (e) => {
        elements.autoZoomLevelValue.textContent = e.target.value + 'x';
        saveSettings();
    });
    elements.autoZoomDuration.addEventListener('input', (e) => {
        elements.autoZoomDurationValue.textContent = e.target.value + 'ms';
        saveSettings();
    });
    elements.formatPreset.addEventListener('change', () => {
        if (state.websiteLoaded) applyPresetAspectRatio();
        saveSettings();
    });
    elements.qualitySetting.addEventListener('change', saveSettings);
    elements.frameRateSelect.addEventListener('change', saveSettings);
    elements.ollamaIp.addEventListener('change', saveSettings);

    // Annotation
    elements.annotateToggleBtn.addEventListener('click', toggleAnnotations);
    elements.closeAnnotationsBtn.addEventListener('click', toggleAnnotations);
    elements.clearAnnotationsBtn.addEventListener('click', clearAnnotations);
    elements.undoAnnotationBtn.addEventListener('click', undoAnnotation);
    elements.annotationColor.addEventListener('change', (e) => { state.annotationColor = e.target.value; });
    elements.annotationSize.addEventListener('change', (e) => { state.annotationSize = parseInt(e.target.value); });
    document.querySelectorAll('.annotation-tool[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.annotation-tool').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.annotationTool = btn.dataset.tool;
        });
    });
    initAnnotationCanvas();

    // Theme
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    loadTheme();
    loadSettings();

    // History
    elements.historyBtn.addEventListener('click', () => togglePanel('history'));
    elements.closeHistoryBtn.addEventListener('click', () => togglePanel('history'));
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
    loadHistory();

    // AI Assist
    elements.aiAssistBtn.addEventListener('click', () => togglePanel('ai'));
    elements.closeAiAssistBtn.addEventListener('click', () => togglePanel('ai'));
    elements.generateAiBtn.addEventListener('click', generateAiMetadata);

    // Model Manager
    elements.aiBackend.addEventListener('change', (e) => {
        state.aiBackend = e.target.value;
        elements.localModelControls.style.display = state.aiBackend === 'local' ? 'block' : 'none';
        elements.remoteModelControls.style.display = state.aiBackend === 'remote' ? 'block' : 'none';
        updateGenerateButtonState();
    });
    elements.downloadModelBtn.addEventListener('click', downloadModel);
    elements.loadModelBtn.addEventListener('click', loadLocalModel);
    elements.testOllamaBtn.addEventListener('click', testOllamaConnection);
    checkLocalModelStatus();

    // Bookmarks
    elements.addBookmarkBtn.addEventListener('click', addBookmark);
    loadBookmarks();

    // Onboarding
    elements.closeOnboardingBtn.addEventListener('click', closeOnboarding);
    showOnboardingIfNeeded();

    // Batch
    elements.enableBatch.addEventListener('change', (e) => {
        elements.batchSection.style.display = e.target.checked ? 'block' : 'none';
    });
    elements.startBatchBtn.addEventListener('click', startBatchRecording);

    // Scheduled
    elements.enableSchedule.addEventListener('change', (e) => {
        elements.scheduleSection.style.display = e.target.checked ? 'block' : 'none';
    });
    elements.addScheduleBtn.addEventListener('click', addScheduledRecording);
    loadScheduledRecordings();

    // Preview
    elements.closePreviewBtn.addEventListener('click', closePreview);
    elements.discardBtn.addEventListener('click', discardVideo);
    elements.shareBtn.addEventListener('click', shareVideo);

    // Swipe to close settings
    let touchStartY = 0;
    elements.settingsSheet.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; });
    elements.settingsSheet.addEventListener('touchmove', (e) => {
        if (e.touches[0].clientY - touchStartY > 80 && elements.settingsSheet.scrollTop === 0) {
            closeSettings();
        }
    });

    // Hardware back button
    App.addListener('backButton', ({ canGoBack }) => {
        if (elements.previewModal.style.display === 'flex') {
            closePreview();
            return;
        }
        if (elements.onboardingModal.style.display === 'flex') {
            closeOnboarding();
            return;
        }
        if (elements.settingsSheet.classList.contains('open')) {
            closeSettings();
            return;
        }
        if (elements.aiAssistPanel.style.display !== 'none') {
            togglePanel('ai');
            return;
        }
        if (elements.historyPanel.style.display !== 'none') {
            togglePanel('history');
            return;
        }
        if (state.annotationEnabled) {
            toggleAnnotations();
            return;
        }
        if (canGoBack) {
            window.history.back();
        } else {
            App.exitApp();
        }
    });

    // Keyboard visibility handling
    Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
    });
}

// =====================
// NOTIFICATIONS
// =====================

function showNotification(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = message;
    notificationsContainer.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// =====================
// URL LOADING
// =====================

let iframeLoadTimeout = null;

function loadWebsite() {
    let url = elements.urlInput.value.trim();
    if (!url) return;
    if (!url.match(/^https?:\/\//i)) url = 'https://' + url;

    // Validate URL
    try {
        new URL(url);
    } catch (e) {
        showNotification('Invalid URL', 'error');
        return;
    }

    state.currentUrl = url;
    elements.placeholder.style.display = 'none';
    elements.browserFrame.style.display = 'block';
    elements.iframeSpinner.style.display = 'flex';
    document.getElementById('iframeError').style.display = 'none';

    // Clear previous timeout
    if (iframeLoadTimeout) clearTimeout(iframeLoadTimeout);

    // Set iframe src
    elements.browserFrame.src = url;
    state.websiteLoaded = true;
    elements.recordBtn.disabled = false;
    elements.addBookmarkBtn.disabled = false;

    // Timeout: if iframe hasn't loaded in 8s, show error overlay
    iframeLoadTimeout = setTimeout(() => {
        if (elements.iframeSpinner.style.display === 'flex') {
            elements.iframeSpinner.style.display = 'none';
            showIframeError();
        }
    }, 8000);

    applyPresetAspectRatio();
}

// Handle iframe load success
if (elements.browserFrame) {
    elements.browserFrame.addEventListener('load', () => {
        if (iframeLoadTimeout) clearTimeout(iframeLoadTimeout);
        elements.iframeSpinner.style.display = 'none';
        showNotification('Website loaded', 'success');
    });
}

function showIframeError() {
    const errorOverlay = document.getElementById('iframeError');
    if (errorOverlay) {
        errorOverlay.style.display = 'flex';
        elements.browserFrame.style.display = 'none';
    }
    showNotification('Site blocked in embedded browser. Use system browser.', 'warning');
}

function handleIframeError() {
    if (iframeLoadTimeout) clearTimeout(iframeLoadTimeout);
    elements.iframeSpinner.style.display = 'none';
    showIframeError();
}

async function openInSystemBrowser() {
    if (!state.currentUrl) return;
    try {
        await Browser.open({ url: state.currentUrl });
        showNotification('Opened in system browser. Recording still captures screen.', 'info');
    } catch (e) {
        showNotification('Failed to open browser', 'error');
    }
}

function applyPresetAspectRatio() {
    const preset = elements.formatPreset.value;
    const dims = FORMAT_PRESETS[preset];
    if (!dims) return;

    const container = elements.browserContainer;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const targetRatio = dims.width / dims.height;
    const containerRatio = containerW / containerH;

    let w, h;
    if (containerRatio > targetRatio) {
        h = containerH;
        w = h * targetRatio;
    } else {
        w = containerW;
        h = w / targetRatio;
    }

    elements.browserFrame.style.width = w + 'px';
    elements.browserFrame.style.height = h + 'px';
    elements.browserFrame.style.margin = 'auto';
}

// =====================
// RECORDING
// =====================

let wakeLock = null;

async function acquireWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (e) { /* ignore */ }
}

async function releaseWakeLock() {
    try {
        if (wakeLock) {
            await wakeLock.release();
            wakeLock = null;
        }
    } catch (e) { /* ignore */ }
}

async function startRecording() {
    if (!state.websiteLoaded) {
        showNotification('Load a website first', 'error');
        return;
    }

    try {
        const result = await ScreenRecorder.startRecording();
        if (!result.started) throw new Error('Failed to start');

        state.isRecording = true;
        state.recordingStartTime = Date.now();

        elements.recordBtn.disabled = true;
        elements.stopBtn.disabled = false;
        showRecordingIndicator();

        state.timerInterval = setInterval(updateTimer, 1000);
        updateTimer();

        await acquireWakeLock();

        if (elements.autoZoomToggle.checked) injectAutoZoom();

        showNotification('Recording started!', 'success');
    } catch (error) {
        showNotification('Failed: ' + error.message, 'error');
    }
}

async function stopRecording() {
    if (!state.isRecording) return;

    try {
        const result = await ScreenRecorder.stopRecording();
        state.isRecording = false;
        state.lastVideoPath = result.path;
        state.lastRecordingDuration = Math.floor((Date.now() - state.recordingStartTime) / 1000);

        clearInterval(state.timerInterval);
        await releaseWakeLock();
        elements.recordBtn.disabled = false;
        elements.stopBtn.disabled = true;
        elements.recordingTimer.textContent = '00:00';
        hideRecordingIndicator();

        showPreview(result.path);
        addToHistory(result.path);

        showNotification('Recording saved!', 'success');
    } catch (error) {
        state.isRecording = false;
        await releaseWakeLock();
        clearInterval(state.timerInterval);
        elements.recordBtn.disabled = false;
        elements.stopBtn.disabled = true;
        hideRecordingIndicator();
        showNotification('Failed: ' + error.message, 'error');
    }
}

function updateTimer() {
    if (!state.recordingStartTime) return;
    const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    elements.recordingTimer.textContent = `${m}:${s}`;
}

function showRecordingIndicator() {
    let ind = document.querySelector('.recording-indicator');
    if (!ind) {
        ind = document.createElement('div');
        ind.className = 'recording-indicator';
        ind.textContent = 'REC';
        document.body.appendChild(ind);
    }
    ind.classList.add('active');
}

function hideRecordingIndicator() {
    const ind = document.querySelector('.recording-indicator');
    if (ind) ind.classList.remove('active');
}

// =====================
// PREVIEW
// =====================

function showPreview(path) {
    // Use Capacitor's file path conversion for webview-safe URLs
    elements.previewVideo.src = Capacitor.convertFileSrc(path);
    elements.previewModal.style.display = 'flex';
}

function closePreview() {
    elements.previewModal.style.display = 'none';
    elements.previewVideo.src = '';
}

function discardVideo() {
    closePreview();
    state.lastVideoPath = null;
    showNotification('Discarded', 'info');
}

async function shareVideo() {
    if (!state.lastVideoPath) return;
    try {
        await Share.share({ title: 'Blazeycc Recording', files: [state.lastVideoPath], dialogTitle: 'Share' });
    } catch (e) {
        if (e.message && !e.message.includes('cancelled')) {
            showNotification('Share failed: ' + e.message, 'error');
        }
    }
}

// =====================
// ZOOM
// =====================

function zoomIn() {
    state.zoomLevel = Math.min(state.zoomLevel + 0.25, 3);
    applyZoom();
}

function zoomOut() {
    state.zoomLevel = Math.max(state.zoomLevel - 0.25, 0.5);
    applyZoom();
}

function resetZoom() {
    state.zoomLevel = 1;
    applyZoom();
}

function applyZoom() {
    elements.browserFrame.style.transform = `scale(${state.zoomLevel})`;
    elements.browserFrame.style.transformOrigin = 'top left';
    elements.zoomLevelDisplay.textContent = Math.round(state.zoomLevel * 100) + '%';
}

// =====================
// AUTO-ZOOM (injected into iframe during recording)
// =====================

function injectAutoZoom() {
    const frame = elements.browserFrame;
    if (!frame || !frame.contentWindow) return;
    const zoom = parseFloat(elements.autoZoomLevel.value) || 1.6;
    const duration = parseInt(elements.autoZoomDuration.value) || 1500;

    try {
        frame.contentWindow.postMessage({ type: 'blazeycc-autozoom', zoom, duration }, '*');
    } catch (e) {
        // Cross-origin iframe — apply zoom via CSS instead
        state.zoomLevel = zoom;
        applyZoom();
        setTimeout(() => {
            state.zoomLevel = 1;
            applyZoom();
        }, duration);
    }
}

// Listen for messages from iframe for auto-zoom
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'blazeycc-tap') {
        // Could trigger auto-zoom response here
    }
});

// =====================
// AUTO-SCROLL
// =====================

function toggleAutoScroll() {
    state.autoScrollEnabled = !state.autoScrollEnabled;
    elements.autoScrollBtn.style.background = state.autoScrollEnabled ? 'var(--accent-primary)' : '';

    if (state.autoScrollEnabled && state.websiteLoaded) {
        startAutoScroll();
        showNotification('Auto-scroll started', 'info');
    } else {
        stopAutoScroll();
        showNotification('Auto-scroll stopped', 'info');
    }
}

function startAutoScroll() {
    stopAutoScroll();
    state.autoScrollInterval = setInterval(() => {
        try {
            const frame = elements.browserFrame;
            if (frame && frame.contentWindow) {
                frame.contentWindow.scrollBy(0, 3);
            }
        } catch (e) {
            // Cross-origin iframe — can't scroll programmatically
            // Fallback: scroll the iframe element itself via CSS transform
            try {
                const currentTransform = frame.style.transform || '';
                const match = currentTransform.match(/translateY\(([-\d.]+)px\)/);
                const currentY = match ? parseFloat(match[1]) : 0;
                frame.style.transform = `scale(${state.zoomLevel}) translateY(${currentY - 3}px)`;
            } catch (e2) {}
        }
    }, 50);
}

function stopAutoScroll() {
    if (state.autoScrollInterval) {
        clearInterval(state.autoScrollInterval);
        state.autoScrollInterval = null;
    }
}

// =====================
// ANNOTATIONS (Canvas Overlay)
// =====================

function initAnnotationCanvas() {
    const canvas = elements.annotationCanvas;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let startX, startY;

    function resizeCanvas() {
        const container = elements.browserContainer;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        redrawAnnotations();
    }

    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function handleStart(e) {
        if (!state.annotationEnabled) return;
        e.preventDefault();
        const pos = getPos(e);
        startX = pos.x;
        startY = pos.y;
        isDrawing = true;

        if (state.annotationTool === 'select') {
            // Hit test
            for (let i = state.annotationObjects.length - 1; i >= 0; i--) {
                const obj = state.annotationObjects[i];
                if (hitTest(obj, startX, startY)) {
                    state.selectedObj = obj;
                    state.isDragging = true;
                    state.dragStartX = startX;
                    state.dragStartY = startY;
                    redrawAnnotations();
                    return;
                }
            }
            state.selectedObj = null;
            redrawAnnotations();
        }
    }

    function handleMove(e) {
        if (!isDrawing || !state.annotationEnabled) return;
        e.preventDefault();
        const pos = getPos(e);

        if (state.isDragging && state.selectedObj) {
            const dx = pos.x - state.dragStartX;
            const dy = pos.y - state.dragStartY;
            moveObject(state.selectedObj, dx, dy);
            state.dragStartX = pos.x;
            state.dragStartY = pos.y;
            redrawAnnotations();
            return;
        }

        redrawAnnotations();
        ctx.strokeStyle = state.annotationColor;
        ctx.fillStyle = state.annotationColor;
        ctx.lineWidth = state.annotationSize;
        ctx.lineCap = 'round';

        if (state.annotationTool === 'arrow') {
            drawArrow(ctx, startX, startY, pos.x, pos.y, false);
        } else if (state.annotationTool === 'rectangle') {
            ctx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
        } else if (state.annotationTool === 'circle') {
            const rx = Math.abs(pos.x - startX) / 2;
            const ry = Math.abs(pos.y - startY) / 2;
            const cx = startX + (pos.x - startX) / 2;
            const cy = startY + (pos.y - startY) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (state.annotationTool === 'highlight') {
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = state.annotationSize * 3;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
            startX = pos.x;
            startY = pos.y;
        }
    }

    function handleEnd(e) {
        if (!isDrawing) return;
        isDrawing = false;
        state.isDragging = false;
        if (state.annotationTool === 'select') return;

        const pos = getPos(e.changedTouches ? e.changedTouches[0] : e);
        const obj = createAnnotationObject(state.annotationTool, startX, startY, pos.x, pos.y);
        if (obj) {
            state.annotationObjects.push(obj);
            state.annotationUndone = [];
        }
        redrawAnnotations();
    }

    window.addEventListener('resize', resizeCanvas);
}

function hitTest(obj, x, y) {
    const pad = 15;
    if (obj.type === 'rectangle') {
        return x >= Math.min(obj.x, obj.x + obj.w) - pad && x <= Math.max(obj.x, obj.x + obj.w) + pad &&
               y >= Math.min(obj.y, obj.y + obj.h) - pad && y <= Math.max(obj.y, obj.y + obj.h) + pad;
    } else if (obj.type === 'arrow') {
        // Simple bounding box
        return x >= Math.min(obj.x1, obj.x2) - pad && x <= Math.max(obj.x1, obj.x2) + pad &&
               y >= Math.min(obj.y1, obj.y2) - pad && y <= Math.max(obj.y1, obj.y2) + pad;
    } else if (obj.type === 'circle') {
        const dx = (x - obj.cx) / Math.max(obj.rx, 1);
        const dy = (y - obj.cy) / Math.max(obj.ry, 1);
        return dx * dx + dy * dy <= 1.5;
    } else if (obj.type === 'text') {
        return x >= obj.x - pad && x <= obj.x + 100 + pad && y >= obj.y - 25 && y <= obj.y + pad;
    }
    return false;
}

function moveObject(obj, dx, dy) {
    if (obj.type === 'arrow') {
        obj.x1 += dx; obj.y1 += dy;
        obj.x2 += dx; obj.y2 += dy;
    } else if (obj.type === 'rectangle') {
        obj.x += dx; obj.y += dy;
    } else if (obj.type === 'circle') {
        obj.cx += dx; obj.cy += dy;
    } else if (obj.type === 'text') {
        obj.x += dx; obj.y += dy;
    }
}

function createAnnotationObject(tool, x1, y1, x2, y2) {
    if (tool === 'arrow') {
        return { type: 'arrow', x1, y1, x2, y2, color: state.annotationColor, size: state.annotationSize };
    } else if (tool === 'rectangle') {
        return { type: 'rectangle', x: x1, y: y1, w: x2 - x1, h: y2 - y1, color: state.annotationColor, size: state.annotationSize };
    } else if (tool === 'circle') {
        return { type: 'circle', cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, rx: Math.abs(x2 - x1) / 2, ry: Math.abs(y2 - y1) / 2, color: state.annotationColor, size: state.annotationSize };
    } else if (tool === 'text') {
        const text = prompt('Text:');
        if (text) return { type: 'text', x: x1, y: y1, text, color: state.annotationColor, size: state.annotationSize };
    }
    return null;
}

function drawArrow(ctx, x1, y1, x2, y2, isFinal) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = (isFinal ? 4 : 3) * state.annotationSize;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

function redrawAnnotations() {
    const canvas = elements.annotationCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const obj of state.annotationObjects) {
        ctx.strokeStyle = obj.color;
        ctx.fillStyle = obj.color;
        ctx.lineWidth = obj.size;
        ctx.lineCap = 'round';

        if (obj.type === 'arrow') drawArrow(ctx, obj.x1, obj.y1, obj.x2, obj.y2, true);
        else if (obj.type === 'rectangle') ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        else if (obj.type === 'circle') {
            ctx.beginPath();
            ctx.ellipse(obj.cx, obj.cy, obj.rx, obj.ry, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (obj.type === 'text') {
            ctx.font = `bold ${obj.size * 5}px sans-serif`;
            ctx.fillText(obj.text, obj.x, obj.y);
        }
    }

    if (state.selectedObj) {
        ctx.strokeStyle = '#00aaff';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(0, 0, 10, 10); // simplified selection indicator
        ctx.setLineDash([]);
    }
}

function toggleAnnotations() {
    state.annotationEnabled = !state.annotationEnabled;
    elements.annotationToolbar.style.display = state.annotationEnabled ? 'flex' : 'none';
    elements.annotationCanvas.style.display = state.annotationEnabled ? 'block' : 'none';
    elements.annotateToggleBtn.style.background = state.annotationEnabled ? 'var(--accent-primary)' : '';

    if (state.annotationEnabled) {
        const canvas = elements.annotationCanvas;
        canvas.width = elements.browserContainer.clientWidth;
        canvas.height = elements.browserContainer.clientHeight;
        redrawAnnotations();
        showNotification('Annotations enabled', 'info');
    } else {
        showNotification('Annotations disabled', 'info');
    }
}

function clearAnnotations() {
    state.annotationObjects = [];
    state.annotationUndone = [];
    redrawAnnotations();
    showNotification('Annotations cleared', 'info');
}

function undoAnnotation() {
    if (state.annotationObjects.length > 0) {
        state.annotationUndone.push(state.annotationObjects.pop());
        redrawAnnotations();
    }
}

// =====================
// THEME
// =====================

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    elements.themeToggleBtn.textContent = state.theme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('blazeycc_theme', state.theme);
}

function loadTheme() {
    const saved = localStorage.getItem('blazeycc_theme') || 'dark';
    state.theme = saved;
    document.documentElement.setAttribute('data-theme', saved);
    elements.themeToggleBtn.textContent = saved === 'dark' ? '🌙' : '☀️';
}

function saveSettings() {
    const settings = {
        formatPreset: elements.formatPreset.value,
        qualitySetting: elements.qualitySetting.value,
        frameRateSelect: elements.frameRateSelect.value,
        autoZoomToggle: elements.autoZoomToggle.checked,
        autoZoomLevel: elements.autoZoomLevel.value,
        autoZoomDuration: elements.autoZoomDuration.value,
        ollamaIp: elements.ollamaIp.value
    };
    localStorage.setItem('blazeycc_settings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('blazeycc_settings');
    if (!saved) return;
    try {
        const s = JSON.parse(saved);
        if (s.formatPreset) elements.formatPreset.value = s.formatPreset;
        if (s.qualitySetting) elements.qualitySetting.value = s.qualitySetting;
        if (s.frameRateSelect) elements.frameRateSelect.value = s.frameRateSelect;
        if (typeof s.autoZoomToggle === 'boolean') {
            elements.autoZoomToggle.checked = s.autoZoomToggle;
            elements.autoZoomOptions.style.display = s.autoZoomToggle ? 'block' : 'none';
        }
        if (s.autoZoomLevel) {
            elements.autoZoomLevel.value = s.autoZoomLevel;
            elements.autoZoomLevelValue.textContent = s.autoZoomLevel + 'x';
        }
        if (s.autoZoomDuration) {
            elements.autoZoomDuration.value = s.autoZoomDuration;
            elements.autoZoomDurationValue.textContent = s.autoZoomDuration + 'ms';
        }
        if (s.ollamaIp) elements.ollamaIp.value = s.ollamaIp;
    } catch (e) {
        console.error('Failed to load settings', e);
    }
}

// =====================
// BOOKMARKS
// =====================

function loadBookmarks() {
    const saved = localStorage.getItem('blazeycc_bookmarks');
    state.bookmarks = saved ? JSON.parse(saved) : [];
    renderBookmarks();
}

function renderBookmarks() {
    elements.bookmarksList.innerHTML = '';
    if (state.bookmarks.length === 0) {
        elements.bookmarksBar.style.display = 'none';
        return;
    }
    elements.bookmarksBar.style.display = 'flex';
    state.bookmarks.forEach(bm => {
        const chip = document.createElement('div');
        chip.className = 'bookmark-chip';
        let label = bm.title || 'Bookmark';
        try { label = bm.title || new URL(bm.url).hostname; } catch (e) {}
        chip.textContent = label;
        chip.addEventListener('click', () => {
            elements.urlInput.value = bm.url;
            loadWebsite();
        });
        elements.bookmarksList.appendChild(chip);
    });
}

function addBookmark() {
    if (!state.currentUrl) return;
    let title = state.currentUrl;
    try { title = new URL(state.currentUrl).hostname; } catch (e) {}
    state.bookmarks.push({ url: state.currentUrl, title });
    localStorage.setItem('blazeycc_bookmarks', JSON.stringify(state.bookmarks));
    renderBookmarks();
    showNotification('Bookmark added!', 'success');
}

// =====================
// HISTORY
// =====================

function loadHistory() {
    const saved = localStorage.getItem('blazeycc_history');
    state.history = saved ? JSON.parse(saved) : [];
    renderHistory();
}

function renderHistory() {
    if (state.history.length === 0) {
        elements.historyList.innerHTML = '<p class="empty-message">No recordings yet</p>';
        return;
    }
    elements.historyList.innerHTML = '';
    state.history.slice().reverse().forEach((rec, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <span class="history-filename">${rec.filename || 'Recording'}</span>
            <span class="history-meta">${rec.preset || 'Custom'} • ${rec.duration || 0}s</span>
        `;
        item.addEventListener('click', () => {
            state.lastVideoPath = rec.path;
            state.lastRecordingDuration = rec.duration;
            showPreview(rec.path);
        });
        elements.historyList.appendChild(item);
    });
}

function addToHistory(path) {
    const filename = path.split('/').pop();
    const preset = elements.formatPreset.value;
    const duration = state.lastRecordingDuration;
    state.history.push({ path, filename, preset, duration, date: new Date().toISOString() });
    localStorage.setItem('blazeycc_history', JSON.stringify(state.history));
    renderHistory();
}

function clearHistory() {
    state.history = [];
    localStorage.removeItem('blazeycc_history');
    renderHistory();
    showNotification('History cleared', 'info');
}

// =====================
// AI ASSIST (OLLAMA)
// =====================

async function generateAiMetadata() {
    if (!state.websiteLoaded) {
        showNotification('Load a website first', 'error');
        return;
    }

    elements.aiResults.style.display = 'none';

    try {
        const pageData = await extractPageData();
        const prompt = `You are a social media expert. Based on this website, create:
1. A catchy YouTube title (max 60 chars)
2. A 2-sentence description
3. 5 relevant hashtags

Title: ${pageData.title}
URL: ${pageData.url}
H1: ${pageData.h1}

Respond exactly:
TITLE: <title>
DESCRIPTION: <description>
HASHTAGS: <hashtag1> <hashtag2> <hashtag3> <hashtag4> <hashtag5>`;

        let result;

        if (state.aiBackend === 'local') {
            if (!state.localModelLoaded) {
                showNotification('Load a model first', 'error');
                return;
            }
            elements.aiStatus.textContent = 'Generating on-device...';
            const genResult = await LocalLlm.generate({
                prompt: prompt,
                maxTokens: 200,
                temperature: 0.7
            });
            result = parseAiResponse(genResult.text);
        } else {
            const endpoint = `http://${elements.ollamaIp.value}`;
            elements.aiStatus.textContent = 'Generating via Ollama...';
            const response = await fetch(`${endpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen2.5:4b',
                    prompt: prompt,
                    stream: false,
                    options: { temperature: 0.7, num_predict: 200 }
                })
            });
            if (!response.ok) throw new Error('Ollama not running');
            const data = await response.json();
            result = parseAiResponse(data.response);
        }

        elements.aiTitle.value = result.title;
        elements.aiDescription.value = result.description;
        elements.aiHashtags.value = result.hashtags;
        elements.aiResults.style.display = 'block';
        elements.aiStatus.textContent = 'Done!';
        showNotification('AI metadata generated!', 'success');
    } catch (error) {
        elements.aiStatus.textContent = '';
        showNotification('AI failed: ' + error.message, 'error');
    }
}

function extractPageData() {
    return new Promise((resolve) => {
        const frame = elements.browserFrame;
        let title = state.currentUrl;
        let h1 = '';
        try {
            if (frame.contentDocument && frame.contentWindow) {
                title = frame.contentDocument.title || state.currentUrl;
                const h1El = frame.contentDocument.querySelector('h1');
                h1 = h1El ? h1El.innerText.substring(0, 200) : '';
            }
        } catch (e) {
            // Cross-origin iframe — expected
        }
        resolve({ title, url: state.currentUrl, h1 });
    });
}

function parseAiResponse(text) {
    const lines = text.split('\n');
    let title = '', description = '', hashtags = '';
    for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('TITLE:')) title = t.substring(6).trim();
        else if (t.startsWith('DESCRIPTION:')) description = t.substring(12).trim();
        else if (t.startsWith('HASHTAGS:')) hashtags = t.substring(9).trim();
    }
    if (!title) title = text.substring(0, 60);
    return { title, description, hashtags };
}

// =====================
// BATCH RECORDING
// =====================

async function startBatchRecording() {
    if (state.batchRecordingInProgress) {
        // Cancel running batch
        state.batchRecordingInProgress = false;
        state.batchQueue = [];
        if (state.isRecording) await stopRecording();
        elements.batchProgress.style.display = 'none';
        elements.startBatchBtn.textContent = '▶ Start';
        showNotification('Batch cancelled', 'info');
        return;
    }

    const urls = elements.batchUrls.value.trim().split('\n').filter(u => u.trim());
    if (urls.length === 0) {
        showNotification('Enter at least one URL', 'error');
        return;
    }

    const duration = parseInt(elements.batchDuration.value || '30') * 1000;
    state.batchQueue = urls.map(url => ({ url: url.trim(), duration }));
    state.batchCurrentIndex = 0;
    state.batchRecordingInProgress = true;
    elements.batchProgress.style.display = 'block';
    elements.startBatchBtn.textContent = '⏹ Cancel';

    showNotification(`Starting batch: ${urls.length} URLs`, 'info');
    await processBatchQueue();
}

async function processBatchQueue() {
    if (!state.batchRecordingInProgress) return;

    if (state.batchCurrentIndex >= state.batchQueue.length) {
        state.batchRecordingInProgress = false;
        elements.batchProgress.style.display = 'none';
        elements.startBatchBtn.textContent = '▶ Start';
        showNotification('Batch complete!', 'success');
        return;
    }

    const item = state.batchQueue[state.batchCurrentIndex];
    elements.batchCurrentNum.textContent = state.batchCurrentIndex + 1;
    elements.batchTotalNum.textContent = state.batchQueue.length;

    elements.urlInput.value = item.url;
    loadWebsite();

    await new Promise(r => setTimeout(r, 3000));
    if (!state.batchRecordingInProgress) return;
    await startRecording();
    await new Promise(r => setTimeout(r, item.duration));
    if (!state.batchRecordingInProgress) {
        if (state.isRecording) await stopRecording();
        return;
    }
    await stopRecording();
    await new Promise(r => setTimeout(r, 2000));

    state.batchCurrentIndex++;
    await processBatchQueue();
}

// =====================
// SCHEDULED RECORDING
// =====================

function addScheduledRecording() {
    const url = elements.scheduleUrl.value.trim();
    const time = elements.scheduleTime.value;
    const duration = parseInt(elements.scheduleDuration.value || '60');

    if (!url || !time) {
        showNotification('Enter URL and time', 'error');
        return;
    }

    const timeMs = new Date(time).getTime();
    if (timeMs <= Date.now()) {
        showNotification('Select a future time', 'error');
        return;
    }

    state.scheduledRecordings.push({ url, time: timeMs, duration, started: false });
    renderScheduleList();
    elements.scheduleUrl.value = '';
    elements.scheduleTime.value = '';
    showNotification('Recording scheduled!', 'success');

    // Start checker if not already running
    if (!window.scheduleCheckInterval) {
        window.scheduleCheckInterval = setInterval(checkScheduledRecordings, 10000);
    }
    // Save to localStorage for persistence across app restarts
    localStorage.setItem('blazeycc_scheduled', JSON.stringify(state.scheduledRecordings));
}

function renderScheduleList() {
    if (state.scheduledRecordings.length === 0) {
        elements.scheduleList.innerHTML = '<p class="empty-message">No schedules</p>';
        return;
    }
    elements.scheduleList.innerHTML = state.scheduledRecordings.map((s, i) => {
        let hostname = s.url;
        try { hostname = new URL(s.url).hostname; } catch (e) {}
        return `
        <div class="schedule-item">
            <span>${hostname} — ${new Date(s.time).toLocaleString()}</span>
            <button class="btn btn-small btn-danger" onclick="window.removeSchedule(${i})">✕</button>
        </div>
    `}).join('');
}

window.removeSchedule = function(index) {
    state.scheduledRecordings.splice(index, 1);
    renderScheduleList();
};

function loadScheduledRecordings() {
    const saved = localStorage.getItem('blazeycc_scheduled');
    if (saved) {
        try {
            state.scheduledRecordings = JSON.parse(saved);
            renderScheduleList();
            if (state.scheduledRecordings.length > 0 && !window.scheduleCheckInterval) {
                window.scheduleCheckInterval = setInterval(checkScheduledRecordings, 10000);
            }
        } catch (e) {}
    }
}

async function checkScheduledRecordings() {
    const now = Date.now();
    let changed = false;
    for (let i = state.scheduledRecordings.length - 1; i >= 0; i--) {
        const s = state.scheduledRecordings[i];
        if (s.time <= now && !s.started) {
            s.started = true;
            changed = true;
            showNotification(`Starting scheduled: ${s.url}`, 'info');
            elements.urlInput.value = s.url;
            loadWebsite();
            await new Promise(r => setTimeout(r, 3000));
            if (state.isRecording) continue;
            await startRecording();
            setTimeout(async () => {
                if (state.isRecording) await stopRecording();
            }, s.duration * 1000);
            // Remove after duration + buffer
            setTimeout(() => {
                const idx = state.scheduledRecordings.indexOf(s);
                if (idx >= 0) {
                    state.scheduledRecordings.splice(idx, 1);
                    renderScheduleList();
                    localStorage.setItem('blazeycc_scheduled', JSON.stringify(state.scheduledRecordings));
                }
            }, s.duration * 1000 + 5000);
        }
    }
    if (changed) {
        localStorage.setItem('blazeycc_scheduled', JSON.stringify(state.scheduledRecordings));
    }
}

// =====================
// SETTINGS PANEL
// =====================

function toggleSettings() {
    const isOpen = elements.settingsSheet.classList.contains('open');
    if (isOpen) closeSettings();
    else {
        elements.settingsSheet.classList.add('open');
        elements.settingsBackdrop.classList.add('active');
    }
}

function closeSettings() {
    elements.settingsSheet.classList.remove('open');
    elements.settingsBackdrop.classList.remove('active');
}

function togglePanel(name) {
    if (name === 'history') {
        const visible = elements.historyPanel.style.display !== 'none';
        elements.historyPanel.style.display = visible ? 'none' : 'block';
        elements.aiAssistPanel.style.display = 'none';
    } else if (name === 'ai') {
        const visible = elements.aiAssistPanel.style.display !== 'none';
        elements.aiAssistPanel.style.display = visible ? 'none' : 'block';
        elements.historyPanel.style.display = 'none';
    }
}

// =====================
// MODEL MANAGER
// =====================

async function checkLocalModelStatus() {
    try {
        // First check if native library is even available
        const libCheck = await LocalLlm.isNativeLibAvailable();
        if (!libCheck.available) {
            elements.modelStatus.textContent = '❌ Native libs missing';
            elements.modelStatus.style.color = 'var(--danger)';
            elements.downloadModelBtn.style.display = 'none';
            elements.loadModelBtn.style.display = 'none';
            elements.modelSelect.disabled = true;
            return;
        }

        elements.modelStatus.style.color = '';
        const result = await LocalLlm.getModelPath();
        const modelsDir = result.path;
        const filename = elements.modelSelect.value;

        // Check if file exists
        const { Filesystem } = await import('@capacitor/filesystem');
        try {
            await Filesystem.stat({ path: `models/${filename}`, directory: 'DATA' });
            elements.modelStatus.textContent = 'Downloaded ✅';
            elements.downloadModelBtn.style.display = 'none';
            elements.loadModelBtn.style.display = 'block';
        } catch (e) {
            elements.modelStatus.textContent = 'Not downloaded';
            elements.downloadModelBtn.style.display = 'block';
            elements.loadModelBtn.style.display = 'none';
        }
    } catch (e) {
        console.error('Check model status failed', e);
        elements.modelStatus.textContent = 'Status unknown';
    }
}

async function downloadModel() {
    const filename = elements.modelSelect.value;
    // HuggingFace URL for qwen2.5 GGUF files
    const baseUrl = 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/';
    const url = baseUrl + filename;

    elements.downloadModelBtn.disabled = true;
    elements.downloadProgress.style.display = 'block';
    elements.modelStatus.textContent = 'Downloading...';

    try {
        const result = await LocalLlm.downloadModel({ url, filename });
        if (result.success) {
            state.localModelPath = result.path;
            elements.modelStatus.textContent = 'Downloaded';
            elements.downloadModelBtn.style.display = 'none';
            elements.loadModelBtn.style.display = 'block';
            showNotification('Model downloaded!', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        elements.modelStatus.textContent = 'Download failed';
        showNotification('Download failed: ' + error.message, 'error');
    } finally {
        elements.downloadModelBtn.disabled = false;
        elements.downloadProgress.style.display = 'none';
    }
}

async function loadLocalModel() {
    const filename = elements.modelSelect.value;
    try {
        const pathResult = await LocalLlm.getModelPath();
        const modelPath = `${pathResult.path}/${filename}`;

        elements.modelStatus.textContent = 'Loading...';
        elements.loadModelBtn.disabled = true;

        const result = await LocalLlm.loadModel({ path: modelPath });
        if (result.success) {
            state.localModelLoaded = true;
            state.localModelPath = modelPath;
            elements.modelStatus.textContent = 'Loaded ✅';
            showNotification('Model loaded! AI ready.', 'success');
            updateGenerateButtonState();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        elements.modelStatus.textContent = 'Load failed';
        showNotification('Load failed: ' + error.message, 'error');
    } finally {
        elements.loadModelBtn.disabled = false;
    }
}

async function testOllamaConnection() {
    const ip = elements.ollamaIp.value;
    elements.testOllamaBtn.textContent = 'Testing...';
    try {
        const response = await fetch(`http://${ip}/api/tags`, { method: 'GET' });
        if (response.ok) {
            showNotification('Ollama connected!', 'success');
        } else {
            throw new Error('Not responding');
        }
    } catch (error) {
        showNotification('Ollama not found at ' + ip, 'error');
    } finally {
        elements.testOllamaBtn.textContent = '🔄 Test Connection';
    }
}

function updateGenerateButtonState() {
    if (state.aiBackend === 'local') {
        elements.generateAiBtn.disabled = !state.localModelLoaded;
    } else {
        elements.generateAiBtn.disabled = false;
    }
}

// =====================
// ONBOARDING
// =====================

function showOnboardingIfNeeded() {
    if (!localStorage.getItem('blazeycc_onboarding_seen')) {
        elements.onboardingModal.style.display = 'flex';
    }
}

function closeOnboarding() {
    elements.onboardingModal.style.display = 'none';
    if (elements.skipOnboarding.checked) {
        localStorage.setItem('blazeycc_onboarding_seen', 'true');
    }
}

// =====================
// ORIENTATION
// =====================

window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        applyPresetAspectRatio();
        if (state.annotationEnabled) {
            elements.annotationCanvas.width = elements.browserContainer.clientWidth;
            elements.annotationCanvas.height = elements.browserContainer.clientHeight;
            redrawAnnotations();
        }
    }, 300);
});
