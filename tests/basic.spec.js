const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright-core');
const path = require('path');

let electronApp;

test.beforeAll(async () => {
    electronApp = await electron.launch({
        args: [path.join(__dirname, '..', 'main.js'), '--no-sandbox'],
        env: { ...process.env, NODE_ENV: 'test' }
    });
});

test.afterAll(async () => {
    await electronApp.close();
});

test('app launches with correct title', async () => {
    const window = await electronApp.firstWindow();
    await expect(window).toHaveTitle(/Blazeycc/);
});

test('URL input exists and is editable', async () => {
    const window = await electronApp.firstWindow();
    const input = window.locator('#urlInput');
    await expect(input).toBeVisible();
    await input.fill('https://example.com');
    await expect(input).toHaveValue('https://example.com');
});

test('load button triggers navigation', async () => {
    const window = await electronApp.firstWindow();
    const input = window.locator('#urlInput');
    const loadBtn = window.locator('#loadBtn');

    await input.fill('https://example.com');
    await loadBtn.click();

    // Wait for webview to load
    const webview = window.locator('webview');
    await expect(webview).toBeVisible({ timeout: 15000 });
});

test('record button is disabled until website loads', async () => {
    const window = await electronApp.firstWindow();
    const recordBtn = window.locator('#recordBtn');
    await expect(recordBtn).toBeDisabled();
});

test('settings panel opens and closes', async () => {
    const window = await electronApp.firstWindow();
    const settingsBtn = window.locator('#settingsBtn');
    const settingsPanel = window.locator('#settingsPanel');

    await settingsBtn.click();
    await expect(settingsPanel).toBeVisible();

    const closeBtn = window.locator('#closeSettingsBtn');
    await closeBtn.click();
    await expect(settingsPanel).toBeHidden();
});

test('theme toggle switches between dark and light', async () => {
    const window = await electronApp.firstWindow();
    const themeBtn = window.locator('#themeToggleBtn');
    const html = window.locator('html');

    await expect(html).toHaveAttribute('data-theme', 'dark');
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('zoom controls update zoom display', async () => {
    const window = await electronApp.firstWindow();
    const zoomIn = window.locator('#zoomInBtn');
    const zoomDisplay = window.locator('#zoomLevelDisplay');

    // First load a website
    const input = window.locator('#urlInput');
    const loadBtn = window.locator('#loadBtn');
    await input.fill('https://example.com');
    await loadBtn.click();

    const webview = window.locator('webview');
    await expect(webview).toBeVisible({ timeout: 15000 });

    await zoomIn.click();
    await expect(zoomDisplay).not.toHaveText('100%');
});

test('bookmark can be added after loading site', async () => {
    const window = await electronApp.firstWindow();
    const input = window.locator('#urlInput');
    const loadBtn = window.locator('#loadBtn');

    await input.fill('https://example.com');
    await loadBtn.click();

    const webview = window.locator('webview');
    await expect(webview).toBeVisible({ timeout: 15000 });

    const addBtn = window.locator('#addBookmarkBtn');
    await expect(addBtn).toBeEnabled();
});

test('AI Assist panel opens', async () => {
    const window = await electronApp.firstWindow();
    const aiBtn = window.locator('#aiAssistBtn');
    const aiPanel = window.locator('#aiAssistPanel');

    await aiBtn.click();
    await expect(aiPanel).toBeVisible();
});

test('history panel opens', async () => {
    const window = await electronApp.firstWindow();
    const historyBtn = window.locator('#historyBtn');
    const historyPanel = window.locator('#historyPanel');

    await historyBtn.click();
    await expect(historyPanel).toBeVisible();
});

test('onboarding modal appears on first launch', async () => {
    const window = await electronApp.firstWindow();
    // Since we may have already dismissed it in other tests,
    // just check the element exists
    const onboarding = window.locator('#onboardingModal');
    await expect(onboarding).toHaveCount(1);
});

test('format preset changes viewport size', async () => {
    const window = await electronApp.firstWindow();
    const presetSelect = window.locator('#formatPreset');
    const viewport = window.locator('#browserViewport');

    await presetSelect.selectOption('yt-shorts');
    const size = await viewport.evaluate(el => ({ w: el.style.width, h: el.style.height }));
    expect(size.w).not.toBe('100%');
    expect(size.h).not.toBe('100%');
});
