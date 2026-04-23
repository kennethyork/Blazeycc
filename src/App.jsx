import { useState, useEffect, useCallback, useRef } from 'react';
import { initDB, getSetting, setSetting, getBookmarks, addBookmark, removeBookmark, getHistory, addHistory, deleteHistoryItem, clearHistory } from './db/database';

const FORMAT_PRESETS = {
  'custom': { width: 1920, height: 1080, name: 'Custom' },
  'yt-1080p': { width: 1920, height: 1080, name: 'YouTube 1080p' },
  'yt-720p': { width: 1280, height: 720, name: 'YouTube 720p' },
  'yt-4k': { width: 3840, height: 2160, name: 'YouTube 4K' },
  'yt-shorts': { width: 1080, height: 1920, name: 'YouTube Shorts' },
  'ig-feed': { width: 1080, height: 1080, name: 'Instagram Feed' },
  'ig-story': { width: 1080, height: 1920, name: 'Instagram Story/Reels' },
  'tiktok': { width: 1080, height: 1920, name: 'TikTok' },
  'twitter-landscape': { width: 1280, height: 720, name: 'Twitter Landscape' },
  'linkedin-landscape': { width: 1920, height: 1080, name: 'LinkedIn Landscape' },
};

export default function App() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [websiteLoaded, setWebsiteLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [timer, setTimer] = useState('00:00');
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('high');
  const [preset, setPreset] = useState('yt-1080p');
  const [autoScroll, setAutoScroll] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [autoScrollInterval, setAutoScrollInterval] = useState(null);
  
  const webviewRef = useRef(null);
  const canvasRecordingActive = useRef(false);
  const frameCaptureInterval = useRef(null);
  const timerInterval = useRef(null);

  useEffect(() => {
    initDB();
    loadTheme();
    loadBookmarks();
    loadHistory();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const loadTheme = async () => {
    const saved = await getSetting('theme');
    if (saved) setTheme(saved);
  };

  const loadBookmarks = async () => {
    const data = await getBookmarks();
    setBookmarks(data);
  };

  const loadHistory = async () => {
    const data = await getHistory();
    setHistory(data);
  };

  const formatUrl = (input) => {
    let url = input.trim();
    if (!url) return { valid: false };
    if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
    try {
      new URL(url);
      return { valid: true, url };
    } catch {
      return { valid: false };
    }
  };

  const handleLoad = () => {
    const result = formatUrl(currentUrl);
    if (!result.valid) {
      showNotification('Invalid URL', 'error');
      return;
    }
    if (webviewRef.current) {
      webviewRef.current.src = result.url;
      setWebsiteLoaded(true);
      setStatus('Loading...');
    }
  };

  const handleWebviewLoad = () => {
    setStatus('Ready');
    if (webviewRef.current) {
      setCurrentUrl(webviewRef.current.getURL());
    }
  };

  const showNotification = (message, type = 'info') => {
    const div = document.createElement('div');
    div.className = `notification ${type}`;
    div.textContent = message;
    document.getElementById('notifications')?.appendChild(div);
    setTimeout(() => div.remove(), 4000);
  };

  const startRecording = async () => {
    if (!websiteLoaded) {
      showNotification('Load a website first', 'error');
      return;
    }
    try {
      const result = await window.electronAPI.startCanvasRecording();
      if (!result.success) throw new Error(result.error);
      
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      canvasRecordingActive.current = true;
      setStatus('Recording');
      
      timerInterval.current = setInterval(() => {
        if (recordingStartTime) {
          const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
          const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
          const secs = (elapsed % 60).toString().padStart(2, '0');
          setTimer(`${mins}:${secs}`);
        }
      }, 1000);
      
      frameCaptureInterval.current = setInterval(async () => {
        if (canvasRecordingActive.current && webviewRef.current) {
          const webContentsId = webviewRef.current.getWebContentsId?.();
          if (webContentsId) {
            const frameResult = await window.electronAPI.captureWebviewFrame(webContentsId);
            if (frameResult.success) {
              await window.electronAPI.captureFrame(frameResult.data);
            }
          }
        }
      }, 66);
    } catch (error) {
      showNotification('Failed to start: ' + error.message, 'error');
    }
  };

  const stopRecording = async () => {
    clearInterval(timerInterval.current);
    clearInterval(frameCaptureInterval.current);
    canvasRecordingActive.current = false;
    setIsRecording(false);
    setStatus('Processing...');
    
    const presetData = FORMAT_PRESETS[preset] || FORMAT_PRESETS['yt-1080p'];
    const fileUrl = currentUrl;
    const urlHost = fileUrl ? new URL(fileUrl).hostname.replace(/[^a-zA-Z0-9]/g, '-') : 'unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ext = format === 'gif' ? 'gif' : format === 'webm' ? 'webm' : 'mp4';
    const filename = `recording-${urlHost}-${preset}-${timestamp}.${ext}`;
    
    try {
      const result = await window.electronAPI.stopCanvasRecording(format, quality, presetData.width, presetData.height, null);
      
      if (result.success) {
        showNotification('Saved: ' + result.filePath, 'success');
        await addHistory({
          url: fileUrl,
          title: urlHost,
          path: result.filePath,
          filename,
          preset: presetData.name,
          format,
          duration: Math.floor((Date.now() - recordingStartTime) / 1000),
          timestamp: new Date().toISOString()
        });
        await loadHistory();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      showNotification('Save failed: ' + error.message, 'error');
    }
    
    setTimer('00:00');
    setStatus('Ready');
  };

  const takeScreenshot = async () => {
    if (!websiteLoaded) {
      showNotification('Load a website first', 'error');
      return;
    }
    try {
      const image = await webviewRef.current?.capturePage();
      const dataUrl = image.toDataURL();
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const binaryString = atob(base64);
      const data = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        data[i] = binaryString.charCodeAt(i);
      }
      
      const urlHost = new URL(currentUrl).hostname.replace(/[^a-zA-Z0-9]/g, '-');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `screenshot-${urlHost}-${timestamp}.png`;
      
      const result = await window.electronAPI.saveVideo(filename, Array.from(data), 'raw');
      
      if (result.success) {
        showNotification('Screenshot saved', 'success');
      }
    } catch (error) {
      showNotification('Screenshot failed: ' + error.message, 'error');
    }
  };

  const toggleAutoScroll = () => {
    if (autoScroll) {
      if (autoScrollInterval) clearInterval(autoScrollInterval);
      setAutoScroll(false);
    } else {
      setAutoScroll(true);
      setAutoScrollInterval(setInterval(() => {
        if (webviewRef.current) {
          webviewRef.current.executeJavaScript(`
            const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
            if (window.pageYOffset < maxScroll - 5) window.scrollBy(0, 2);
            else true;
          `).then(atBottom => {
            if (atBottom) {
              clearInterval(autoScrollInterval);
              setAutoScroll(false);
            }
          });
        }
      }, 50));
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await setSetting('theme', newTheme);
  };

  const addCurrentBookmark = async () => {
    if (!websiteLoaded) return;
    const url = webviewRef.current?.getURL();
    const title = await webviewRef.current?.executeJavaScript('document.title');
    await addBookmark(url, title, null);
    await loadBookmarks();
    showNotification('Bookmark added!', 'success');
  };

  const deleteHistoryItem = async (path) => {
    await deleteHistoryItem(path);
    await loadHistory();
    showNotification('Removed', 'info');
  };

  const clearAllHistory = async () => {
    await clearHistory();
    await loadHistory();
    showNotification('History cleared', 'info');
  };

  return (
    <div className="app">
      <div id="notifications"></div>
      
      {/* URL Bar */}
      <div className="url-bar">
        <input
          type="text"
          id="urlInput"
          placeholder="Enter URL to record..."
          value={currentUrl}
          onChange={(e) => setCurrentUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
        />
        <button id="loadBtn" onClick={handleLoad}>Load</button>
      </div>
      
      {/* Browser Toolbar */}
      <div className="browser-toolbar" style={{ display: websiteLoaded ? 'flex' : 'none' }}>
        <button onClick={() => webviewRef.current?.goBack()}>←</button>
        <button onClick={() => webviewRef.current?.goForward()}>→</button>
        <button onClick={() => webviewRef.current?.reload()}>↻</button>
        <span className="current-url">{currentUrl}</span>
      </div>
      
      {/* Main Content */}
      <div className="main-content">
        {!websiteLoaded ? (
          <div className="placeholder" id="placeholder">
            <div className="placeholder-content">
              <span className="logo-icon">◉</span>
              <h2>Record Any Website as Video</h2>
              <p>Enter a URL above to get started</p>
            </div>
          </div>
        ) : (
          <webview
            ref={webviewRef}
            id="webview"
            style={{ flex: 1 }}
            onLoad={handleWebviewLoad}
          />
        )}
      </div>
      
      {/* Recording Controls */}
      <div className="recording-controls">
        <div className="recording-status">
          <span className={`status-dot ${isRecording ? 'recording' : ''}`}></span>
          <span className="status-text" id="statusText">{status}</span>
          {isRecording && <span className="recording-timer">{timer}</span>}
        </div>
        
        <div className="control-buttons">
          <button id="recordBtn" onClick={startRecording} disabled={isRecording || !websiteLoaded}>
            ⏺ Record
          </button>
          <button id="stopBtn" onClick={stopRecording} disabled={!isRecording} style={{ display: isRecording ? 'block' : 'none' }}>
            ⏹ Stop
          </button>
          <button id="screenshotBtn" onClick={takeScreenshot} disabled={!websiteLoaded}>
            📷 Screenshot
          </button>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <h2>Settings</h2>
            <button onClick={() => setShowSettings(false)}>×</button>
          </div>
          
          <div className="setting-item">
            <label>Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
              <option value="gif">GIF</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label>Quality</label>
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label>Platform Preset</label>
            <select value={preset} onChange={(e) => setPreset(e.target.value)}>
              {Object.entries(FORMAT_PRESETS).map(([key, val]) => (
                <option key={key} value={key}>{val.name}</option>
              ))}
            </select>
          </div>
          
          <div className="setting-item">
            <label>Auto-Scroll</label>
            <input type="checkbox" checked={autoScroll} onChange={toggleAutoScroll} />
          </div>
          
          <div className="setting-item">
            <button onClick={toggleTheme}>Toggle Theme</button>
          </div>
        </div>
      )}
      
      {/* History Panel */}
      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <h2>History</h2>
            <button onClick={() => setShowHistory(false)}>×</button>
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <p>No recordings yet</p>
            ) : (
              history.map((item) => (
                <div key={item.path} className="history-item">
                  <span>{item.filename}</span>
                  <button onClick={() => window.electronAPI.openInFolder(item.path)}>Open</button>
                  <button onClick={() => deleteHistoryItem(item.path)}>Delete</button>
                </div>
              ))
            )}
          </div>
          {history.length > 0 && (
            <button onClick={clearAllHistory}>Clear All</button>
          )}
        </div>
      )}
      
      {/* Toolbar */}
      <div className="toolbar">
        <button id="settingsBtn" onClick={() => setShowSettings(true)}>Settings</button>
        <button id="historyBtn" onClick={() => setShowHistory(true)}>History</button>
        <button id="bookmarksBtn" onClick={addCurrentBookmark} disabled={!websiteLoaded}>Bookmark</button>
      </div>
    </div>
  );
}