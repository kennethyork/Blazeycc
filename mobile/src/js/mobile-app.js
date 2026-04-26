// Blazeycc Mobile App
// Capacitor-based: uses native screen recording instead of canvas capture

import { ScreenRecorder } from '@blazeycc/screen-recorder';
import { Share } from '@capacitor/share';
import { Filesystem } from '@capacitor/filesystem';

// DOM Elements
const elements = {
    urlInput: document.getElementById('urlInput'),
    loadBtn: document.getElementById('loadBtn'),
    recordBtn: document.getElementById('recordBtn'),
    stopBtn: document.getElementById('stopBtn'),
    recordingTimer: document.getElementById('recordingTimer'),
    placeholder: document.getElementById('placeholder'),
    browserFrame: document.getElementById('browserFrame'),
    browserContainer: document.getElementById('browserContainer'),
    settingsToggle: document.getElementById('settingsToggle'),
    settingsSheet: document.getElementById('settingsSheet'),
    previewModal: document.getElementById('previewModal'),
    previewVideo: document.getElementById('previewVideo'),
    discardBtn: document.getElementById('discardBtn'),
    shareBtn: document.getElementById('shareBtn'),
    formatPreset: document.getElementById('formatPreset'),
    qualitySetting: document.getElementById('qualitySetting'),
    frameRateSelect: document.getElementById('frameRateSelect'),
    autoZoomToggle: document.getElementById('autoZoomToggle'),
    motionBlurToggle: document.getElementById('motionBlurToggle')
};

// State
const state = {
    isRecording: false,
    recordingStartTime: null,
    timerInterval: null,
    websiteLoaded: false,
    lastVideoPath: null
};

// Format presets (mobile-optimized subset)
const FORMAT_PRESETS = {
    'custom': { width: 1080, height: 1920 },
    'yt-shorts': { width: 1080, height: 1920 },
    'ig-story': { width: 1080, height: 1920 },
    'tiktok': { width: 1080, height: 1920 },
    'yt-1080p': { width: 1920, height: 1080 }
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
    // URL loading
    elements.loadBtn.addEventListener('click', loadWebsite);
    elements.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadWebsite();
    });

    // Recording
    elements.recordBtn.addEventListener('click', startRecording);
    elements.stopBtn.addEventListener('click', stopRecording);

    // Settings sheet
    elements.settingsToggle.addEventListener('click', toggleSettings);

    // Preview actions
    elements.discardBtn.addEventListener('click', discardVideo);
    elements.shareBtn.addEventListener('click', shareVideo);

    // Close settings on backdrop tap
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('sheet-backdrop')) {
            closeSettings();
        }
    });

    // Swipe to close settings
    let touchStartY = 0;
    elements.settingsSheet.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });
    elements.settingsSheet.addEventListener('touchmove', (e) => {
        const diff = e.touches[0].clientY - touchStartY;
        if (diff > 50 && elements.settingsSheet.scrollTop === 0) {
            closeSettings();
        }
    });
}

function loadWebsite() {
    let url = elements.urlInput.value.trim();
    if (!url) return;
    if (!url.match(/^https?:\/\//i)) url = 'https://' + url;

    elements.placeholder.style.display = 'none';
    elements.browserFrame.style.display = 'block';
    elements.browserFrame.src = url;
    state.websiteLoaded = true;

    elements.recordBtn.disabled = false;

    // Apply preset aspect ratio
    applyPresetAspectRatio();
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

async function startRecording() {
    if (!state.websiteLoaded) return;

    try {
        const result = await ScreenRecorder.startRecording();
        if (!result.started) {
            throw new Error('Recording failed to start');
        }

        state.isRecording = true;
        state.recordingStartTime = Date.now();

        elements.recordBtn.disabled = true;
        elements.recordBtn.classList.add('recording');
        elements.stopBtn.disabled = false;

        // Show recording indicator
        showRecordingIndicator();

        // Start timer
        state.timerInterval = setInterval(updateTimer, 1000);
        updateTimer();

    } catch (error) {
        console.error('Start recording error:', error);
        alert('Failed to start recording: ' + error.message);
    }
}

async function stopRecording() {
    if (!state.isRecording) return;

    try {
        const result = await ScreenRecorder.stopRecording();
        state.isRecording = false;
        state.lastVideoPath = result.path;

        clearInterval(state.timerInterval);

        elements.recordBtn.disabled = false;
        elements.recordBtn.classList.remove('recording');
        elements.stopBtn.disabled = true;
        elements.recordingTimer.textContent = '00:00';

        hideRecordingIndicator();

        // Show preview
        showPreview(result.path);

    } catch (error) {
        console.error('Stop recording error:', error);
        alert('Failed to stop recording: ' + error.message);
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
    let indicator = document.querySelector('.recording-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'recording-indicator';
        indicator.textContent = 'REC';
        document.body.appendChild(indicator);
    }
    indicator.classList.add('active');
}

function hideRecordingIndicator() {
    const indicator = document.querySelector('.recording-indicator');
    if (indicator) indicator.classList.remove('active');
}

function showPreview(videoPath) {
    elements.previewVideo.src = 'file://' + videoPath;
    elements.previewModal.style.display = 'flex';
}

function discardVideo() {
    elements.previewModal.style.display = 'none';
    elements.previewVideo.src = '';
    state.lastVideoPath = null;
}

async function shareVideo() {
    if (!state.lastVideoPath) return;

    try {
        await Share.share({
            title: 'Blazeycc Recording',
            files: [state.lastVideoPath],
            dialogTitle: 'Share your recording'
        });
    } catch (error) {
        console.error('Share failed:', error);
    }
}

// Settings Sheet
function toggleSettings() {
    const isOpen = elements.settingsSheet.classList.contains('open');
    if (isOpen) closeSettings();
    else openSettings();
}

function openSettings() {
    elements.settingsSheet.classList.add('open');
    // Add backdrop
    let backdrop = document.querySelector('.sheet-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'sheet-backdrop';
        document.body.appendChild(backdrop);
    }
    backdrop.classList.add('active');
}

function closeSettings() {
    elements.settingsSheet.classList.remove('open');
    const backdrop = document.querySelector('.sheet-backdrop');
    if (backdrop) backdrop.classList.remove('active');
}

// Handle orientation changes
window.addEventListener('orientationchange', () => {
    setTimeout(applyPresetAspectRatio, 300);
});
