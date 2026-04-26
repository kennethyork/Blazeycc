// Recording, Canvas Capture, Audio, Preview, Trim

function formatUrl(input) {
    let url = input.trim();
    if (!url) {
        return { valid: false, error: 'Please enter a URL' };
    }
    if (!url.match(/^https?:\/\//i)) {
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

function loadWebsite() {
    const result = formatUrl(elements.urlInput.value);
    if (!result.valid) {
        showNotification(result.error, 'error');
        return;
    }
    state.currentUrl = result.url;
    elements.placeholder.style.display = 'none';
    elements.webview.style.display = 'flex';
    elements.browserToolbar.style.display = 'flex';
    elements.webview.src = result.url;
    state.websiteLoaded = true;
    state.zoomLevel = 0;
    updateZoomDisplay();
    elements.recordBtn.disabled = false;
    elements.screenshotBtn.disabled = false;
    showNotification('Loading website...', 'info');
}

// Pre-flight validation before recording
async function validateBeforeRecording() {
    const errors = [];
    const warnings = [];

    // Check FFmpeg availability
    try {
        const ffmpegCheck = await window.electronAPI.checkFFmpeg();
        if (!ffmpegCheck.available) {
            errors.push('FFmpeg not found. Please install FFmpeg or check your installation.');
        }
    } catch (e) {
        warnings.push('Could not verify FFmpeg installation');
    }

    // Check disk space (rough estimate: 100MB/min for high quality)
    try {
        const savePath = await window.electronAPI.getSavePath();
        const freeSpace = await window.electronAPI.getDiskSpace(savePath);
        if (freeSpace && freeSpace.freeBytes < 500 * 1024 * 1024) {
            warnings.push('Low disk space (< 500MB). Recording may fail for long videos.');
        }
    } catch (e) {
        // Disk space check not available
    }

    // Check if URL is valid
    if (!state.currentUrl || !state.websiteLoaded) {
        errors.push('Please load a website first');
    }

    // Check if webview is accessible
    try {
        const wcId = elements.webview.getWebContentsId();
        if (!wcId) {
            errors.push('Webview not ready. Try reloading the page.');
        }
    } catch (e) {
        warnings.push('Could not verify webview state');
    }

    return { errors, warnings, ok: errors.length === 0 };
}

async function startRecording() {
    if (!state.websiteLoaded) {
        showNotification('Please load a website first', 'error');
        return;
    }

    // Pre-flight validation
    const validation = await validateBeforeRecording();
    if (!validation.ok) {
        validation.errors.forEach(err => showNotification(err, 'error'));
        return;
    }
    validation.warnings.forEach(warn => showNotification(warn, 'warning'));

    try {
        const result = await window.electronAPI.startCanvasRecording();
        if (!result.success) {
            throw new Error(result.error || 'Failed to start recording');
        }

        state.isRecording = true;
        state.recordingStartTime = Date.now();
        state.canvasRecordingActive = true;

        elements.recordBtn.disabled = true;
        elements.recordBtn.classList.add('recording');
        elements.stopBtn.disabled = false;
        elements.recordingStatus.classList.add('recording');
        elements.statusText.textContent = 'Recording';

        state.timerInterval = setInterval(updateTimer, 1000);
        updateTimer();

        const captureFps = await window.electronAPI.getFrameRate();
        const captureIntervalMs = Math.round(1000 / captureFps);
        console.log(`Recording at ${captureFps} FPS (${captureIntervalMs}ms interval)`);

        state.frameCapturePending = false;
        state.droppedFrames = 0;

        let webviewWebContentsId = null;
        try {
            webviewWebContentsId = elements.webview.getWebContentsId();
            console.log('Webview webContents ID:', webviewWebContentsId);
        } catch (e) {
            console.warn('Could not get webview webContentsId:', e);
        }

        state.frameCaptureInterval = setInterval(() => {
            if (!state.canvasRecordingActive) return;
            if (state.frameCapturePending) {
                state.droppedFrames++;
                return;
            }
            state.frameCapturePending = true;
            window.electronAPI.captureWebviewFrame(webviewWebContentsId)
                .then(async frameResult => {
                    if (frameResult.success && state.canvasRecordingActive) {
                        return window.electronAPI.captureFrame(frameResult.data);
                    }
                })
                .catch(err => {
                    console.error('Frame capture error:', err);
                })
                .finally(() => {
                    state.frameCapturePending = false;
                });
        }, captureIntervalMs);

        if (state.audioEnabled) {
            await startAudioCapture();
        }

        if (state.autoScrollEnabled) {
            startAutoScroll();
        }

        // Start webcam bubble if enabled
        const webcamToggle = document.getElementById('webcamToggle');
        if (webcamToggle?.checked) {
            await startWebcamCapture();
        }

        injectCursorHighlight();
        injectAutoZoom();
        setWebviewRecordingState(true);

        showNotification('Recording started!' + (state.audioEnabled ? ' (with audio)' : ''), 'success');
    } catch (error) {
        console.error('Recording error:', error);
        showNotification('Failed to start recording: ' + error.message, 'error');
        elements.statusText.textContent = 'Ready';
    }
}

async function stopRecording() {
    stopAutoScroll();
    removeCursorHighlight();
    setWebviewRecordingState(false);

    let audioPath = null;
    if (state.audioEnabled && state.audioMediaRecorder) {
        audioPath = await stopAudioCapture();
    }

    if (state.droppedFrames > 0) {
        console.log(`Recording had ${state.droppedFrames} dropped frames due to processing lag`);
        if (state.droppedFrames > 10) {
            showNotification(`${state.droppedFrames} frames dropped. Try lowering the frame rate or closing other apps.`, 'warning');
        }
    }

    if (state.frameCaptureInterval) {
        clearInterval(state.frameCaptureInterval);
        state.frameCaptureInterval = null;
    }

    if (state.canvasRecordingActive && state.isRecording) {
        state.canvasRecordingActive = false;
        state.isRecording = false;
        clearInterval(state.timerInterval);

        elements.recordBtn.disabled = false;
        elements.recordBtn.classList.remove('recording');
        elements.stopBtn.disabled = true;
        elements.recordingStatus.classList.remove('recording');
        elements.statusText.textContent = 'Processing...';
        elements.recordingTimer.textContent = '';

        try {
            const settings = getExportSettings();
            settings.proSettings = settings.proSettings || {};
            settings.proSettings.audioPath = audioPath;

            const trimStart = parseFloat(document.getElementById('trimStart')?.value) || 0;
            const trimEnd = parseFloat(document.getElementById('trimEnd')?.value) || 0;
            if (trimStart > 0) settings.proSettings.trimStart = trimStart;
            if (trimEnd > 0) settings.proSettings.trimEnd = trimEnd;

            const motionBlurToggle = document.getElementById('motionBlurToggle');
            if (motionBlurToggle?.checked) settings.proSettings.motionBlur = true;

            // Stop webcam and save blob
            if (state.webcamRecorder) {
                const webcamPath = await stopWebcamCapture();
                if (webcamPath) settings.proSettings.webcamPath = webcamPath;
            }

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

                // Show preview modal with trimmer
                state.lastRecordingPath = result.filePath;
                state.lastRecordingDuration = duration;
                showPreviewModalWithTrimmer(result.filePath, duration);
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

async function takeScreenshot() {
    if (!state.websiteLoaded) {
        showNotification('Please load a website first', 'error');
        return;
    }
    try {
        const image = await elements.webview.capturePage();
        const dataUrl = image.toDataURL();
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        const binaryString = atob(base64);
        const data = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            data[i] = binaryString.charCodeAt(i);
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const urlHost = new URL(state.currentUrl).hostname.replace(/[^a-zA-Z0-9]/g, '-');
        const filename = `screenshot-${urlHost}-${timestamp}.png`;
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

// Progress modal
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

// Auto-scroll functions
function startAutoScroll() {
    if (!state.autoScrollEnabled || !state.websiteLoaded) return;
    stopAutoScroll();
    console.log('Auto-scroll started');
    const scrollSpeed = parseInt(document.getElementById('scrollSpeed')?.value) || 2;
    state.autoScrollInterval = setInterval(() => {
        if (!state.autoScrollEnabled) {
            stopAutoScroll();
            return;
        }
        elements.webview.executeJavaScript(`
            (function() {
                const scrollStep = ${scrollSpeed};
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
    if (elements.webview) {
        elements.webview.executeJavaScript(`
            window.scrollTo(window.pageXOffset, window.pageYOffset);
        `).catch(() => {});
    }
}

// Cursor highlight injected into webview
function injectCursorHighlight() {
    const webview = elements.webview;
    if (!webview) return;
    webview.executeJavaScript(`
        (function() {
            if (document.getElementById('__blazeyccCursorHighlight')) return;
            var style = document.createElement('style');
            style.id = '__blazeyccCursorHighlight';
            style.textContent = '* { cursor: none !important; } \n' +
                '#__blazeyccCursorRing { position: fixed; pointer-events: none; z-index: 2147483647; width: 32px; height: 32px; border: 3px solid rgba(255, 50, 50, 0.85); border-radius: 50%; transform: translate(-50%, -50%); transition: transform 0.05s ease; box-shadow: 0 0 10px rgba(255, 50, 50, 0.4); } \n' +
                '#__blazeyccCursorDot { position: fixed; pointer-events: none; z-index: 2147483647; width: 8px; height: 8px; background: rgba(255, 50, 50, 0.95); border-radius: 50%; transform: translate(-50%, -50%); }';
            document.head.appendChild(style);
            var ring = document.createElement('div');
            ring.id = '__blazeyccCursorRing';
            var dot = document.createElement('div');
            dot.id = '__blazeyccCursorDot';
            document.body.appendChild(ring);
            document.body.appendChild(dot);
            document.addEventListener('mousemove', function(e) {
                ring.style.left = e.clientX + 'px';
                ring.style.top = e.clientY + 'px';
                dot.style.left = e.clientX + 'px';
                dot.style.top = e.clientY + 'px';
            });
            document.addEventListener('mousedown', function() {
                ring.style.transform = 'translate(-50%, -50%) scale(0.8)';
            });
            document.addEventListener('mouseup', function() {
                ring.style.transform = 'translate(-50%, -50%) scale(1)';
            });
        })()
    `, true);
}

function removeCursorHighlight() {
    const webview = elements.webview;
    if (!webview) return;
    webview.executeJavaScript(`
        (function() {
            var style = document.getElementById('__blazeyccCursorHighlight');
            if (style) style.remove();
            var ring = document.getElementById('__blazeyccCursorRing');
            if (ring) ring.remove();
            var dot = document.getElementById('__blazeyccCursorDot');
            if (dot) dot.remove();
        })()
    `, true);
}

// Auto-zoom injected into webview with configurable settings
function injectAutoZoom() {
    const webview = elements.webview;
    if (!webview) return;
    webview.executeJavaScript(`
        (function() {
            if (window.__blazeyccAutoZoom) return;
            window.__blazeyccAutoZoom = true;
            
            var config = { zoomLevel: 1.6, duration: 1500, easing: 0.08 };
            try {
                var saved = localStorage.getItem('blazeycc_autozoom');
                if (saved) config = JSON.parse(saved);
            } catch(e) {}
            
            var zoomLevel = 1;
            var targetZoom = 1;
            var zoomX = 0, zoomY = 0;
            var targetX = 0, targetY = 0;
            var animating = false;
            
            function lerp(start, end, t) {
                return start + (end - start) * t;
            }
            
            function animateZoom() {
                if (!animating) return;
                zoomLevel = lerp(zoomLevel, targetZoom, config.easing);
                zoomX = lerp(zoomX, targetX, config.easing);
                zoomY = lerp(zoomY, targetY, config.easing);
                
                var scale = zoomLevel;
                var transX = -zoomX * (scale - 1);
                var transY = -zoomY * (scale - 1);
                
                document.documentElement.style.transformOrigin = zoomX + 'px ' + zoomY + 'px';
                document.documentElement.style.transform = 'scale(' + scale + ') translate(' + (transX / scale) + 'px, ' + (transY / scale) + 'px)';
                document.documentElement.style.transition = 'none';
                
                if (Math.abs(zoomLevel - targetZoom) < 0.005 && Math.abs(zoomX - targetX) < 1 && Math.abs(zoomY - targetY) < 1) {
                    zoomLevel = targetZoom;
                    zoomX = targetX;
                    zoomY = targetY;
                    if (targetZoom === 1) {
                        animating = false;
                        document.documentElement.style.transform = '';
                        document.documentElement.style.transformOrigin = '';
                    }
                } else {
                    requestAnimationFrame(animateZoom);
                }
            }
            
            document.addEventListener('click', function(e) {
                if (!window.__blazeyccRecording) return;
                targetZoom = config.zoomLevel;
                targetX = e.clientX + window.scrollX;
                targetY = e.clientY + window.scrollY;
                if (!animating) {
                    animating = true;
                    animateZoom();
                }
                setTimeout(function() {
                    targetZoom = 1;
                    targetX = 0;
                    targetY = 0;
                    if (!animating) {
                        animating = true;
                        animateZoom();
                    }
                }, config.duration);
            });
            
            window.__blazeyccSetRecording = function(recording) {
                window.__blazeyccRecording = recording;
            };
            window.__blazeyccSetAutoZoomConfig = function(c) {
                config = c;
                localStorage.setItem('blazeycc_autozoom', JSON.stringify(c));
            };
        })()
    `, true);
}

function setWebviewRecordingState(recording) {
    const webview = elements.webview;
    if (!webview) return;
    webview.executeJavaScript(`
        (function() {
            if (window.__blazeyccSetRecording) window.__blazeyccSetRecording(${recording});
        })()
    `, true);
}

function setAutoZoomConfig(config) {
    const webview = elements.webview;
    if (!webview) return;
    webview.executeJavaScript(`
        (function() {
            if (window.__blazeyccSetAutoZoomConfig) window.__blazeyccSetAutoZoomConfig(${JSON.stringify(config)});
        })()
    `, true);
    localStorage.setItem('blazeycc_autozoom_config', JSON.stringify(config));
}

// Audio capture
async function startAudioCapture() {
    const webview = elements.webview;
    if (!webview || webview.style.display === 'none') {
        console.log('No webview available for audio capture');
        return;
    }
    try {
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
                    var connectEl = function(el) {
                        if (el.__blazeyccConnected) return;
                        try {
                            if (!el.crossOrigin && el.src) el.crossOrigin = 'anonymous';
                            var src = audioCtx.createMediaElementSource(el);
                            src.connect(dest);
                            src.connect(audioCtx.destination);
                            el.__blazeyccConnected = true;
                            connectedCount++;
                        } catch(e) {}
                    };
                    var findAndConnect = function(doc) {
                        if (!doc) return;
                        doc.querySelectorAll('audio, video').forEach(connectEl);
                        doc.querySelectorAll('iframe').forEach(function(iframe) {
                            try { if (iframe.contentDocument) findAndConnect(iframe.contentDocument); } catch(e) {}
                        });
                    };
                    findAndConnect(document);
                    var observer = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            mutation.addedNodes.forEach(function(node) {
                                if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') connectEl(node);
                                if (node.querySelectorAll) {
                                    node.querySelectorAll('audio, video').forEach(connectEl);
                                    node.querySelectorAll('iframe').forEach(function(iframe) {
                                        try { if (iframe.contentDocument) findAndConnect(iframe.contentDocument); } catch(e) {}
                                    });
                                }
                            });
                        });
                    });
                    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
                    window.__blazeyccAudioObserver = observer;
                    var OriginalAudio = window.Audio;
                    window.Audio = function() {
                        var audio = new (Function.prototype.bind.apply(OriginalAudio, [null].concat(Array.prototype.slice.call(arguments))));
                        setTimeout(function() { connectEl(audio); }, 0);
                        return audio;
                    };
                    window.Audio.prototype = OriginalAudio.prototype;
                    var mimeType = 'audio/webm;codecs=opus';
                    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
                    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
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

async function stopAudioCapture() {
    const webview = elements.webview;
    if (!webview || !state.audioMediaRecorder) {
        return null;
    }
    try {
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

// =====================
// PREVIEW MODAL & TRIMMER
// =====================

function showPreviewModalWithTrimmer(filePath, duration) {
    const video = elements.previewVideo;
    video.src = 'file://' + filePath;
    elements.previewModal.style.display = 'flex';

    // Reset trim values
    document.getElementById('trimStart').value = 0;
    document.getElementById('trimEnd').value = 0;

    video.onloadedmetadata = () => {
        const dur = video.duration || duration;
        initTimelineTrimmer(dur);
    };

    // Show apply-trim button if not already there
    let applyTrimBtn = document.getElementById('applyTrimBtn');
    if (!applyTrimBtn) {
        applyTrimBtn = document.createElement('button');
        applyTrimBtn.id = 'applyTrimBtn';
        applyTrimBtn.className = 'btn btn-primary';
        applyTrimBtn.textContent = '✂️ Apply Trim & Re-encode';
        applyTrimBtn.style.display = 'none';
        applyTrimBtn.addEventListener('click', applyTrimToLastRecording);
        elements.savePreviewBtn.parentNode.insertBefore(applyTrimBtn, elements.savePreviewBtn);
    }
    applyTrimBtn.style.display = 'none';
}

elements.closePreviewBtn?.addEventListener('click', closePreviewModal);
elements.discardBtn?.addEventListener('click', discardRecording);
elements.savePreviewBtn?.addEventListener('click', closePreviewModal);

function closePreviewModal() {
    elements.previewModal.style.display = 'none';
    elements.previewVideo.pause();
    elements.previewVideo.src = '';
}

function discardRecording() {
    closePreviewModal();
    if (state.lastRecordingPath) {
        window.electronAPI.deleteHistoryItem(state.lastRecordingPath).catch(() => {});
    }
    state.lastRecordingPath = null;
    showNotification('Recording discarded', 'info');
}

async function applyTrimToLastRecording() {
    if (!state.lastRecordingPath) return;
    const trimStart = parseFloat(document.getElementById('trimStart')?.value) || 0;
    const trimEnd = parseFloat(document.getElementById('trimEnd')?.value) || 0;
    if (trimStart <= 0 && trimEnd <= 0) {
        showNotification('No trim values set', 'info');
        return;
    }
    elements.statusText.textContent = 'Applying trim...';
    showProgressModal();
    try {
        const result = await window.electronAPI.trimVideo(state.lastRecordingPath, trimStart, trimEnd);
        if (result.success) {
            showNotification('Trim applied: ' + result.path, 'success');
            state.lastRecordingPath = result.path;
            elements.previewVideo.src = 'file://' + result.path;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showNotification('Trim failed: ' + error.message, 'error');
    } finally {
        hideProgressModal();
        elements.statusText.textContent = 'Ready';
    }
}

// Timeline trimmer with draggable handles
let timelineState = { duration: 0, start: 0, end: 0, dragging: null };

function initTimelineTrimmer(duration) {
    timelineState.duration = duration;
    timelineState.start = 0;
    timelineState.end = duration;

    const track = elements.timelineTrack;
    const handleStart = elements.timelineHandleStart;
    const handleEnd = elements.timelineHandleEnd;
    const progress = elements.timelineProgress;

    if (!track || !handleStart || !handleEnd) return;

    updateTimelineUI();

    function getPctFromEvent(e) {
        const rect = track.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        return Math.max(0, Math.min(1, x / rect.width));
    }

    function onMove(e) {
        e.preventDefault();
        const pct = getPctFromEvent(e);
        const time = pct * timelineState.duration;

        if (timelineState.dragging === 'start') {
            timelineState.start = Math.min(time, timelineState.end - 1);
        } else if (timelineState.dragging === 'end') {
            timelineState.end = Math.max(time, timelineState.start + 1);
        }
        updateTimelineUI();
    }

    function onUp() {
        timelineState.dragging = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
    }

    handleStart.addEventListener('mousedown', (e) => { timelineState.dragging = 'start'; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); });
    handleStart.addEventListener('touchstart', (e) => { timelineState.dragging = 'start'; document.addEventListener('touchmove', onMove); document.addEventListener('touchend', onUp); });
    handleEnd.addEventListener('mousedown', (e) => { timelineState.dragging = 'end'; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); });
    handleEnd.addEventListener('touchstart', (e) => { timelineState.dragging = 'end'; document.addEventListener('touchmove', onMove); document.addEventListener('touchend', onUp); });

    // Click on track to seek video
    track.addEventListener('click', (e) => {
        if (timelineState.dragging) return;
        const rect = track.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        elements.previewVideo.currentTime = pct * timelineState.duration;
    });
}

function updateTimelineUI() {
    const handleStart = elements.timelineHandleStart;
    const handleEnd = elements.timelineHandleEnd;
    const progress = elements.timelineProgress;
    const startPct = (timelineState.start / timelineState.duration) * 100;
    const endPct = (timelineState.end / timelineState.duration) * 100;

    if (handleStart) handleStart.style.left = startPct + '%';
    if (handleEnd) handleEnd.style.left = endPct + '%';
    if (progress) {
        progress.style.left = startPct + '%';
        progress.style.width = (endPct - startPct) + '%';
    }

    if (elements.timelineStartLabel) elements.timelineStartLabel.textContent = formatTime(timelineState.start);
    if (elements.timelineEndLabel) elements.timelineEndLabel.textContent = formatTime(timelineState.end);
    if (elements.timelineDurationLabel) elements.timelineDurationLabel.textContent = formatTime(timelineState.end - timelineState.start);

    // Sync hidden inputs
    document.getElementById('trimStart').value = timelineState.start;
    document.getElementById('trimEnd').value = Math.max(0, timelineState.duration - timelineState.end);

    // Show apply-trim button if trim is set
    const applyTrimBtn = document.getElementById('applyTrimBtn');
    if (applyTrimBtn) {
        const hasTrim = timelineState.start > 0.5 || (timelineState.duration - timelineState.end) > 0.5;
        applyTrimBtn.style.display = hasTrim ? 'inline-block' : 'none';
    }
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

// =====================
// WEBCAM BUBBLE CAPTURE
// =====================

async function startWebcamCapture() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
        const videoEl = document.getElementById('webcamVideo');
        const previewEl = document.getElementById('webcamPreview');
        if (videoEl) videoEl.srcObject = stream;
        if (previewEl) previewEl.style.display = 'block';

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
                ? 'video/webm;codecs=vp8'
                : 'video/webm';

        const recorder = new MediaRecorder(stream, { mimeType });
        state.webcamChunks = [];
        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) state.webcamChunks.push(e.data);
        };
        recorder.start(1000);
        state.webcamRecorder = recorder;
        state.webcamStream = stream;
        console.log('Webcam recording started');
    } catch (error) {
        console.error('Webcam capture failed:', error);
        showNotification('Webcam failed: ' + error.message, 'error');
    }
}

async function stopWebcamCapture() {
    if (!state.webcamRecorder) return null;
    try {
        return new Promise((resolve) => {
            state.webcamRecorder.onstop = async () => {
                const blob = new Blob(state.webcamChunks, { type: 'video/webm' });
                state.webcamStream?.getTracks().forEach(t => t.stop());
                state.webcamRecorder = null;
                state.webcamStream = null;
                const previewEl = document.getElementById('webcamPreview');
                if (previewEl) previewEl.style.display = 'none';

                if (blob.size === 0) {
                    resolve(null);
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64 = reader.result.split(',')[1];
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    const result = await window.electronAPI.saveWebcamBlob(base64, `webcam-${timestamp}.webm`);
                    if (result.success) {
                        resolve(result.path);
                    } else {
                        resolve(null);
                    }
                };
                reader.readAsDataURL(blob);
            };
            state.webcamRecorder.stop();
        });
    } catch (error) {
        console.error('Failed to stop webcam capture:', error);
        return null;
    }
}
