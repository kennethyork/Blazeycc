// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    timeout: 30000,
    reporter: 'list',
    use: {
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'electron',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});