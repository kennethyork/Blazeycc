// UI Helpers, Notifications, Theme, Zoom, Panels, Bookmarks, History

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    elements.notifications.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
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
    setTimeout(() => notification.remove(), 10000);
}

// Onboarding
function showOnboardingIfNeeded() {
    const hasSeenOnboarding = localStorage.getItem('blazeycc_onboarding_seen');
    if (!hasSeenOnboarding) {
        elements.onboardingModal.style.display = 'flex';
    }
}

elements.closeOnboardingBtn?.addEventListener('click', () => {
    elements.onboardingModal.style.display = 'none';
    if (elements.skipOnboarding?.checked) {
        localStorage.setItem('blazeycc_onboarding_seen', 'true');
    }
});

// Zoom functions
function updateZoomDisplay() {
    const percent = Math.round(Math.pow(2, state.zoomLevel) * 100);
    if (elements.zoomLevelDisplay) {
        elements.zoomLevelDisplay.textContent = percent + '%';
    }
}

function setZoomLevel(level) {
    if (!elements.webview || elements.webview.style.display === 'none') return;
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

// Panel toggles
async function toggleHistoryPanel() {
    const isVisible = elements.historyPanel.style.display !== 'none';
    elements.historyPanel.style.display = isVisible ? 'none' : 'block';
    elements.settingsPanel.style.display = 'none';
    elements.aiAssistPanel.style.display = 'none';
}

async function toggleAiAssistPanel() {
    const isVisible = elements.aiAssistPanel.style.display !== 'none';
    elements.aiAssistPanel.style.display = isVisible ? 'none' : 'block';
    elements.historyPanel.style.display = 'none';
    elements.settingsPanel.style.display = 'none';
}

async function toggleSettingsPanel() {
    const isVisible = elements.settingsPanel.style.display !== 'none';
    elements.settingsPanel.style.display = isVisible ? 'none' : 'block';
    elements.historyPanel.style.display = 'none';
    elements.aiAssistPanel.style.display = 'none';
}

// Bookmarks
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

// History
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

async function clearHistory() {
    await window.electronAPI.clearHistory();
    await loadHistory();
    showNotification('History cleared', 'info');
}

// Settings helpers
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
    if (elements.gpuEncodingToggle) {
        elements.gpuEncodingToggle.addEventListener('change', async (e) => {
            await window.electronAPI.setGpuEncoding(e.target.checked);
            showNotification(e.target.checked ? 'GPU encoding enabled' : 'GPU encoding disabled', 'info');
        });
    }
}

function doBrowseFolder() {
    var fileInput = document.getElementById('folderPickerFallback');
    if (window.electronAPI && typeof window.electronAPI.selectSaveFolder === 'function') {
        window.electronAPI.selectSaveFolder()
            .then(function(result) {
                if (result.success) {
                    elements.savePathInput.value = result.path;
                    showNotification('Save location updated', 'success');
                } else if (result.error) {
                    showNotification('Error: ' + result.error, 'error');
                }
            })
            .catch(function(err) {
                if (fileInput) fileInput.click();
            });
    } else if (fileInput) {
        fileInput.click();
    } else {
        showNotification('Folder picker not available', 'error');
    }
}

// Export settings helper
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

function updateSettingsInfo() {
    const preset = elements.formatPreset.value;
    const format = elements.outputFormat.value;
    const enable4kCheckbox = document.getElementById('enable4k');
    if (enable4kCheckbox) enable4kCheckbox.style.display = 'none';
    const { width, height, quality, presetName } = getExportSettings();
    elements.customResolution.style.display = elements.formatPreset.value === 'custom' ? 'flex' : 'none';
    const qualityLabels = { 'low': 'Low', 'medium': 'Medium', 'high': 'High', 'ultra': 'Ultra' };
    const formatLabel = format === 'gif' ? 'GIF' : format === 'webm' ? 'WebM' : 'MP4';
    elements.settingsInfo.textContent = `Output: ${formatLabel} • ${width}×${height} • ${qualityLabels[quality]} Quality • ${presetName}`;
}

// Resize browser viewport
function resizeBrowserViewport(preset) {
    if (!elements.browserViewport) return;
    if (preset === 'custom') {
        elements.browserViewport.style.width = '100%';
        elements.browserViewport.style.height = '100%';
        return;
    }
    const presetData = FORMAT_PRESETS[preset];
    if (!presetData) return;
    const containerWidth = elements.browserContainer.clientWidth;
    const containerHeight = elements.browserContainer.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) {
        elements.browserViewport.style.width = '100%';
        elements.browserViewport.style.height = '100%';
        return;
    }
    const scale = Math.min(containerWidth / presetData.width, containerHeight / presetData.height, 1);
    const displayWidth = Math.max(Math.round(presetData.width * scale), 100);
    const displayHeight = Math.max(Math.round(presetData.height * scale), 100);
    elements.browserViewport.style.width = displayWidth + 'px';
    elements.browserViewport.style.height = displayHeight + 'px';
}

// Timer
function updateTimer() {
    if (!state.recordingStartTime) return;
    const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    elements.recordingTimer.textContent = `${minutes}:${seconds}`;
}

// License stubs (all free)
async function loadLicense() {
    unlockProFeatures();
    unlockProPlusFeatures();
}
function unlockProFeatures() {}
function unlockProPlusFeatures() {}
function lockProPlusFeatures() {}
function lockProFeatures() {}
async function activateLicense() {}
async function deactivateLicense() {}
async function redeemPromoCode() {}
async function openStripeCheckout() {}
function isProEnabled() { return true; }
