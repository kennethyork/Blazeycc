// Batch Recording, Scheduled Recording, Custom Watermark, Fast Encoding

// ========================================
// BATCH RECORDING
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

    const batchProgress = document.getElementById('batchProgress');
    const batchTotalNum = document.getElementById('batchTotalNum');
    if (batchProgress) batchProgress.style.display = 'block';
    if (batchTotalNum) batchTotalNum.textContent = batchQueue.length;

    showNotification(`Starting batch recording of ${batchQueue.length} URLs`, 'info');
    await processBatchQueue();
}

async function processBatchQueue() {
    if (batchCurrentIndex >= batchQueue.length) {
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

    elements.urlInput.value = item.url;
    loadWebsite();

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
    await new Promise(resolve => setTimeout(resolve, item.duration));
    stopRecording();
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (state.recordingBlob) {
        await savePreviewedRecording();
    }

    batchCurrentIndex++;
    await processBatchQueue();
}

// ========================================
// SCHEDULED RECORDING
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
                item.started = true;
                showNotification(`Starting scheduled recording: ${item.url}`, 'info');

                elements.urlInput.value = item.url;
                loadWebsite();

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

                setTimeout(async () => {
                    stopRecording();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    if (state.recordingBlob) {
                        await savePreviewedRecording();
                    }

                    await window.electronAPI.removeScheduledRecording(i);
                    scheduledRecordings.splice(i, 1);
                    renderScheduleList();
                }, item.duration * 1000);
            }
        }
    }, 10000);
}

function stopScheduleChecker() {
    if (scheduleCheckInterval) {
        clearInterval(scheduleCheckInterval);
        scheduleCheckInterval = null;
    }
}

// ========================================
// CUSTOM WATERMARK
// ========================================
function initCustomWatermark() {
    const enableCustomWatermarkCheckbox = document.getElementById('enableCustomWatermark');
    const customWatermarkSection = document.getElementById('customWatermarkSection');
    const watermarkTextOptions = document.getElementById('watermarkTextOptions');
    const watermarkImageOptions = document.getElementById('watermarkImageOptions');
    const selectWatermarkImageBtn = document.getElementById('selectWatermarkImage');

    state.customWatermarkSettings = { type: 'none', text: '', position: 'bottom-left', imagePath: null };

    enableCustomWatermarkCheckbox?.addEventListener('change', async (e) => {
        if (customWatermarkSection) {
            customWatermarkSection.style.display = e.target.checked ? 'block' : 'none';
        }
        if (e.target.checked) {
            try {
                state.customWatermarkSettings = await window.electronAPI.getCustomWatermark();
            } catch (e) {}
        }
    });

    document.querySelectorAll('input[name="watermarkType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const type = e.target.value;
            state.customWatermarkSettings.type = type;
            if (watermarkTextOptions) watermarkTextOptions.style.display = type === 'text' ? 'flex' : 'none';
            if (watermarkImageOptions) watermarkImageOptions.style.display = type === 'image' ? 'flex' : 'none';
            saveCustomWatermarkSettings();
        });
    });

    document.getElementById('customWatermarkText')?.addEventListener('input', (e) => {
        state.customWatermarkSettings.text = e.target.value;
        saveCustomWatermarkSettings();
    });

    document.getElementById('watermarkPosition')?.addEventListener('change', (e) => {
        state.customWatermarkSettings.position = e.target.value;
        saveCustomWatermarkSettings();
    });

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
// FAST ENCODING
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

    (async () => {
        try {
            const enabled = await window.electronAPI.getFastEncode();
            if (enableFastEncodeCheckbox) enableFastEncodeCheckbox.checked = enabled;
        } catch (e) {}
    })();
}
