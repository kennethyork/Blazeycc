// Shared DOM Elements
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
    // Ollama settings
    ollamaStatusIcon: document.getElementById('ollamaStatusIcon'),
    ollamaStatusText: document.getElementById('ollamaStatusText'),
    ollamaEndpoint: document.getElementById('ollamaEndpoint'),
    ollamaModel: document.getElementById('ollamaModel'),
    testOllamaBtn: document.getElementById('testOllamaBtn'),
    // Theme and toggles
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
    // Onboarding
    onboardingModal: document.getElementById('onboardingModal'),
    closeOnboardingBtn: document.getElementById('closeOnboardingBtn'),
    skipOnboarding: document.getElementById('skipOnboarding'),
    // Timeline trim
    timelineTrack: document.getElementById('timelineTrack'),
    timelineProgress: document.getElementById('timelineProgress'),
    timelineHandleStart: document.getElementById('timelineHandleStart'),
    timelineHandleEnd: document.getElementById('timelineHandleEnd'),
    timelineStartLabel: document.getElementById('timelineStartLabel'),
    timelineEndLabel: document.getElementById('timelineEndLabel'),
    timelineDurationLabel: document.getElementById('timelineDurationLabel'),
    // Annotation elements
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

// Global State
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
    theme: 'dark',
    autoScrollEnabled: false,
    autoScrollInterval: null,
    pendingRecording: null,
    recordingBlob: null,
    canvasRecordingActive: false,
    frameCaptureInterval: null,
    frameCapturePending: false,
    droppedFrames: 0,
    audioEnabled: false,
    audioMediaRecorder: null,
    audioChunks: [],
    customWatermarkSettings: { type: 'none', text: '', position: 'bottom-left', imagePath: null },
    annotationEnabled: false,
    annotationTool: 'select',
    zoomLevel: 0,
    ollamaConfig: { endpoint: 'http://localhost:11434', model: 'qwen2.5:4b' },
    // Webcam capture
    webcamRecorder: null,
    webcamStream: null,
    webcamChunks: [],
    lastRecordingPath: null,
    lastRecordingDuration: 0
};


