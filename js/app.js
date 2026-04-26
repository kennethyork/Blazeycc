// Main App Entry Point — ties all modules together

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
        elements.webview.setZoomLevel(state.zoomLevel);
    });

    elements.webview.addEventListener('did-navigate-in-page', () => {
        elements.currentUrl.textContent = elements.webview.getURL();
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

    // Ollama settings
    elements.testOllamaBtn?.addEventListener('click', testOllamaConnection);
    elements.ollamaEndpoint?.addEventListener('change', saveOllamaConfig);
    elements.ollamaModel?.addEventListener('change', saveOllamaConfig);

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
    await loadOllamaConfig();

    // Apply initial viewport size for the default preset
    resizeBrowserViewport(elements.formatPreset.value);

    // Show onboarding on first launch
    showOnboardingIfNeeded();

    // Re-calculate viewport on window resize
    window.addEventListener('resize', () => {
        resizeBrowserViewport(elements.formatPreset.value);
    });

    // Keyboard shortcuts for zoom
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

    // Auto-zoom settings
    const autoZoomToggle = document.getElementById('autoZoomToggle');
    const autoZoomLevel = document.getElementById('autoZoomLevel');
    const autoZoomLevelValue = document.getElementById('autoZoomLevelValue');
    const autoZoomDuration = document.getElementById('autoZoomDuration');
    const autoZoomDurationValue = document.getElementById('autoZoomDurationValue');

    function updateAutoZoomConfig() {
        const config = {
            zoomLevel: parseFloat(autoZoomLevel?.value) || 1.6,
            duration: parseInt(autoZoomDuration?.value) || 1500,
            easing: 0.08
        };
        setAutoZoomConfig(config);
    }

    if (autoZoomToggle) {
        autoZoomToggle.addEventListener('change', updateAutoZoomConfig);
    }
    if (autoZoomLevel) {
        autoZoomLevel.addEventListener('input', (e) => {
            if (autoZoomLevelValue) autoZoomLevelValue.textContent = e.target.value + 'x';
            updateAutoZoomConfig();
        });
    }
    if (autoZoomDuration) {
        autoZoomDuration.addEventListener('input', (e) => {
            if (autoZoomDurationValue) autoZoomDurationValue.textContent = e.target.value + 'ms';
            updateAutoZoomConfig();
        });
    }

    // AI Features buttons in preview modal
    document.getElementById('generateChaptersBtn')?.addEventListener('click', async () => {
        if (!state.lastRecordingPath) return;
        showNotification('Generating smart chapters...', 'info');
        const pageData = await extractPageDataForAI();
        const chapters = await generateSmartChapters(pageData, state.lastRecordingDuration);
        if (chapters) {
            renderChapters(chapters);
            showNotification(`Generated ${chapters.length} chapters!`, 'success');
        } else {
            showNotification('Could not generate chapters', 'warning');
        }
    });

    document.getElementById('suggestClipBtn')?.addEventListener('click', async () => {
        if (!state.lastRecordingPath) return;
        showNotification('Analyzing for social clip...', 'info');
        const pageData = await extractPageDataForAI();
        // Simple event log from state
        const events = [];
        const clip = await suggestSocialClips(pageData, state.lastRecordingDuration, events);
        if (clip) {
            renderSocialClip(clip);
            showNotification('Social clip suggestion ready!', 'success');
        } else {
            showNotification('Could not suggest a clip', 'warning');
        }
    });

    document.getElementById('suggestThumbnailBtn')?.addEventListener('click', async () => {
        if (!state.lastRecordingPath) return;
        showNotification('Finding best thumbnail frame...', 'info');
        const pageData = await extractPageDataForAI();
        const suggestion = await suggestThumbnailFrame(pageData, state.lastRecordingDuration);
        if (suggestion) {
            renderThumbnailSuggestion(suggestion);
            showNotification('Thumbnail suggestion ready!', 'success');
        } else {
            showNotification('Could not suggest thumbnail', 'warning');
        }
    });

    document.getElementById('generateCaptionsBtn')?.addEventListener('click', async () => {
        if (!state.lastRecordingPath) return;
        showNotification('Generating captions with whisper.cpp...', 'info');
        const result = await window.electronAPI.generateCaptions(state.lastRecordingPath);
        const preview = document.getElementById('captionsPreview');
        if (result.success && preview) {
            preview.textContent = result.srt.substring(0, 2000) + (result.srt.length > 2000 ? '\n...' : '');
            preview.style.display = 'block';
            showNotification('Captions generated!', 'success');
        } else {
            showNotification('Caption generation failed: ' + result.error, 'error');
        }
    });

    showNotification('Ready! Enter a URL to get started.', 'info');
}

// Initialize feature modules
document.addEventListener('DOMContentLoaded', () => {
    initBatchRecording();
    initScheduledRecording();
    initCustomWatermark();
    initFastEncoding();
    initAnnotations();
});
