// Ollama Config and AI Metadata Generation

function getOllamaConfig() {
    return state.ollamaConfig;
}

async function loadOllamaConfig() {
    try {
        const saved = await window.electronAPI.getOllamaConfig();
        if (saved) {
            state.ollamaConfig = { ...state.ollamaConfig, ...saved };
        }
    } catch (e) {
        // No saved config, use defaults
    }
    if (elements.ollamaEndpoint) {
        elements.ollamaEndpoint.value = state.ollamaConfig.endpoint;
    }
    if (elements.ollamaModel) {
        elements.ollamaModel.value = state.ollamaConfig.model;
    }
    await checkOllamaStatus();
}

async function saveOllamaConfig() {
    state.ollamaConfig.endpoint = elements.ollamaEndpoint?.value?.trim() || 'http://localhost:11434';
    state.ollamaConfig.model = elements.ollamaModel?.value?.trim() || 'qwen2.5:4b';
    try {
        await window.electronAPI.setOllamaConfig(state.ollamaConfig);
    } catch (e) {}
    await checkOllamaStatus();
}

async function checkOllamaStatus() {
    const { endpoint, model } = state.ollamaConfig;
    if (!elements.ollamaStatusIcon || !elements.ollamaStatusText) return;

    elements.ollamaStatusIcon.textContent = '⏳';
    elements.ollamaStatusText.textContent = 'Checking Ollama...';

    try {
        const response = await fetch(`${endpoint}/api/tags`, { method: 'GET' });
        if (!response.ok) {
            throw new Error('Not running');
        }
        const data = await response.json();
        const models = data.models || [];
        const hasModel = models.some(m => m.name === model || m.name.startsWith(model + ':'));

        if (hasModel) {
            elements.ollamaStatusIcon.textContent = '✅';
            elements.ollamaStatusText.textContent = `Ollama ready — ${model} installed`;
        } else {
            elements.ollamaStatusIcon.textContent = '⚠️';
            elements.ollamaStatusText.textContent = `Ollama running — run: ollama pull ${model}`;
        }
    } catch (error) {
        elements.ollamaStatusIcon.textContent = '❌';
        elements.ollamaStatusText.innerHTML = `
            <span style="color: var(--text-secondary);">Ollama not running</span>
            <button id="installOllamaBtn" class="btn btn-small btn-primary" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.75rem;">Install Ollama</button>
        `;
        const installBtn = document.getElementById('installOllamaBtn');
        if (installBtn) {
            installBtn.addEventListener('click', () => {
                window.electronAPI.openExternal('https://ollama.com/download');
                showNotification('Opening Ollama download page...', 'info');
            });
        }
    }
}

async function testOllamaConnection() {
    await saveOllamaConfig();
    showNotification('Testing Ollama connection...', 'info');
    await checkOllamaStatus();
}

async function generateAiMetadata() {
    if (!state.websiteLoaded) {
        showNotification('Please load a website first', 'error');
        return;
    }

    elements.aiStatus.textContent = 'Analyzing page content...';
    elements.aiResults.style.display = 'none';

    try {
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
        const { endpoint, model } = getOllamaConfig();
        elements.aiStatus.textContent = `Generating with ${model}...`;

        const response = await fetch(`${endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                options: { temperature: 0.7, num_predict: 300 }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama not running at ${endpoint}. Install Ollama and run: ollama pull ${model}`);
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
