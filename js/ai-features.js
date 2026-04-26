// AI Features: Smart Chapters, Social Clip Suggestions, Thumbnail Picker
// Uses Ollama (default: qwen2.5:4b) for all text-based analysis.
// For vision tasks (thumbnail frame picking), falls back to llava or qwen2-vl.

// =====================
// SMART CHAPTERS
// =====================

async function generateSmartChapters(pageData, duration) {
    const { endpoint, model } = getOllamaConfig();
    const prompt = `You are a YouTube content strategist. Based on this website and recording duration, create chapter markers.

Website URL: ${pageData.url}
Title: ${pageData.title}
H1: ${pageData.h1}
Headings: ${pageData.headings?.join(' | ') || ''}
Recording Duration: ${Math.floor(duration / 60)}m ${duration % 60}s

Create 3-5 chapters that divide the video into logical sections.
Respond ONLY in this format:
00:00 Intro
MM:SS Chapter Name
MM:SS Chapter Name

Make sure timestamps are realistic and spaced throughout the video.`;

    try {
        const response = await fetch(`${endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model, prompt: prompt, stream: false, options: { temperature: 0.5, num_predict: 200 } })
        });
        if (!response.ok) throw new Error('Ollama request failed');
        const data = await response.json();
        return parseChapters(data.response, duration);
    } catch (error) {
        console.error('Smart chapters generation failed:', error);
        return null;
    }
}

function parseChapters(response, maxDuration) {
    const lines = response.split('\n').filter(l => l.trim());
    const chapters = [];
    for (const line of lines) {
        const match = line.match(/^(\d{1,2}):(\d{2})\s+(.+)$/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const time = minutes * 60 + seconds;
            if (time <= maxDuration) {
                chapters.push({ time, title: match[3].trim() });
            }
        }
    }
    return chapters.length > 0 ? chapters : null;
}

// =====================
// SOCIAL CLIP SUGGESTIONS
// =====================

async function suggestSocialClips(pageData, duration, events) {
    const { endpoint, model } = getOllamaConfig();
    const eventsSummary = events?.map((e, i) => `${Math.floor(e.time)}s: ${e.type}`).join('\n') || 'No interaction data';

    const prompt = `You are a TikTok/Instagram Reels editor. Based on this website recording, suggest the best short clip.

Website: ${pageData.url}
Title: ${pageData.title}
Duration: ${duration}s
User Interactions:\n${eventsSummary}

Suggest ONE 15-30 second segment that would make a viral social media clip.
Respond ONLY in this format:
START: MM:SS
END: MM:SS
HOOK: One sentence describing why this clip is engaging

The segment should contain the most visually interesting or interactive moment.`;

    try {
        const response = await fetch(`${endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model, prompt: prompt, stream: false, options: { temperature: 0.7, num_predict: 150 } })
        });
        if (!response.ok) throw new Error('Ollama request failed');
        const data = await response.json();
        return parseClipSuggestion(data.response, duration);
    } catch (error) {
        console.error('Social clip suggestion failed:', error);
        return null;
    }
}

function parseClipSuggestion(response, maxDuration) {
    const startMatch = response.match(/START:\s*(\d{1,2}):(\d{2})/);
    const endMatch = response.match(/END:\s*(\d{1,2}):(\d{2})/);
    const hookMatch = response.match(/HOOK:\s*(.+)/);

    if (!startMatch || !endMatch) return null;

    const startSec = parseInt(startMatch[1]) * 60 + parseInt(startMatch[2]);
    const endSec = parseInt(endMatch[1]) * 60 + parseInt(endMatch[2]);

    if (startSec >= endSec || endSec > maxDuration) return null;

    return {
        start: startSec,
        end: endSec,
        hook: hookMatch ? hookMatch[1].trim() : 'Suggested clip'
    };
}

// =====================
// THUMBNAIL PICKER
// =====================

async function suggestThumbnailFrame(pageData, duration) {
    // Text-based approach using qwen2.5:4b (no vision needed)
    const { endpoint, model } = getOllamaConfig();
    const prompt = `You are a YouTube thumbnail expert. Based on this website's content, suggest the best timestamp for a thumbnail.

Website URL: ${pageData.url}
Title: ${pageData.title}
Meta Description: ${pageData.metaDesc || ''}
H1: ${pageData.h1 || ''}
Visible Headings: ${pageData.headings?.slice(0, 10).join(' | ') || ''}
Recording Duration: ${Math.floor(duration / 60)}m ${duration % 60}s

Which part of the video would make the most compelling thumbnail?
Respond ONLY in this format:
TIMESTAMP: MM:SS
REASON: Brief explanation
TEXT_OVERLAY: Suggested short text for the thumbnail (max 5 words)

Pick a moment that shows the most interesting visual element.`;

    try {
        const response = await fetch(`${endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model, prompt: prompt, stream: false, options: { temperature: 0.6, num_predict: 150 } })
        });
        if (!response.ok) throw new Error('Ollama request failed');
        const data = await response.json();
        return parseThumbnailSuggestion(data.response, duration);
    } catch (error) {
        console.error('Thumbnail suggestion failed:', error);
        return null;
    }
}

function parseThumbnailSuggestion(response, maxDuration) {
    const timeMatch = response.match(/TIMESTAMP:\s*(\d{1,2}):(\d{2})/);
    const reasonMatch = response.match(/REASON:\s*(.+)/);
    const textMatch = response.match(/TEXT_OVERLAY:\s*(.+)/);

    if (!timeMatch) return null;

    const seconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    if (seconds > maxDuration) return null;

    return {
        time: seconds,
        reason: reasonMatch ? reasonMatch[1].trim() : '',
        text: textMatch ? textMatch[1].trim().substring(0, 30) : ''
    };
}

// Vision-based thumbnail picker (requires llava or vision model)
async function pickBestFrameWithVision(framePaths) {
    // This requires a vision-capable Ollama model like llava or qwen2-vl
    // For now, return a random frame as fallback
    if (!framePaths || framePaths.length === 0) return null;
    return framePaths[Math.floor(framePaths.length / 2)];
}

// =====================
// PAGE DATA EXTRACTION
// =====================

async function extractPageDataForAI() {
    if (!state.websiteLoaded || !elements.webview) return null;
    try {
        return await elements.webview.executeJavaScript(`
            (function() {
                const title = document.title || '';
                const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
                const h1 = document.querySelector('h1')?.innerText?.substring(0, 200) || '';
                const headings = Array.from(document.querySelectorAll('h2, h3'))
                    .map(el => el.innerText.trim())
                    .filter(t => t.length > 0 && t.length < 100)
                    .slice(0, 15);
                return { title, metaDesc, h1, headings, url: window.location.href };
            })()
        `, true);
    } catch (e) {
        return null;
    }
}

// =====================
// UI INTEGRATION
// =====================

function renderChapters(chapters) {
    if (!chapters || chapters.length === 0) return;
    const container = document.getElementById('chaptersList');
    if (!container) return;
    container.innerHTML = chapters.map(c => `
        <div class="chapter-item" data-time="${c.time}">
            <span class="chapter-time">${formatTime(c.time)}</span>
            <span class="chapter-title">${c.title}</span>
        </div>
    `).join('');
    container.querySelectorAll('.chapter-item').forEach(item => {
        item.addEventListener('click', () => {
            const time = parseFloat(item.dataset.time);
            if (elements.previewVideo) elements.previewVideo.currentTime = time;
        });
    });
}

function renderSocialClip(clip) {
    if (!clip) return;
    const container = document.getElementById('socialClipSuggestion');
    if (!container) return;
    container.innerHTML = `
        <div class="clip-suggestion">
            <strong>🎯 Suggested Social Clip</strong>
            <p>${clip.hook}</p>
            <span class="clip-range">${formatTime(clip.start)} — ${formatTime(clip.end)}</span>
            <button id="applyClipSuggestion" class="btn btn-small btn-primary">Apply to Trimmer</button>
        </div>
    `;
    document.getElementById('applyClipSuggestion')?.addEventListener('click', () => {
        timelineState.start = clip.start;
        timelineState.end = clip.end;
        updateTimelineUI();
        if (elements.previewVideo) elements.previewVideo.currentTime = clip.start;
    });
}

function renderThumbnailSuggestion(suggestion) {
    if (!suggestion) return;
    const container = document.getElementById('thumbnailSuggestion');
    if (!container) return;
    container.innerHTML = `
        <div class="thumbnail-suggestion">
            <strong>🖼️ Thumbnail Suggestion</strong>
            <p>${suggestion.reason}</p>
            <span class="thumb-time">Best frame at ${formatTime(suggestion.time)}</span>
            ${suggestion.text ? `<span class="thumb-text">Text: "${suggestion.text}"</span>` : ''}
            <button id="jumpToThumbnailTime" class="btn btn-small btn-primary">Jump to Frame</button>
        </div>
    `;
    document.getElementById('jumpToThumbnailTime')?.addEventListener('click', () => {
        if (elements.previewVideo) elements.previewVideo.currentTime = suggestion.time;
    });
}
