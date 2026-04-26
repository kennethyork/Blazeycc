const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright-core');
const path = require('path');

let electronApp;

test.beforeAll(async () => {
    electronApp = await electron.launch({
        args: [
            path.join(__dirname, '..', 'main.js'),
            '--no-sandbox',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-dev-shm-usage'
        ],
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

test('onboarding modal exists', async () => {
    const window = await electronApp.firstWindow();
    const onboarding = window.locator('#onboardingModal');
    await expect(onboarding).toHaveCount(1);
});
