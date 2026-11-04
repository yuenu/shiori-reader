import { defineConfig } from '@playwright/test'

// 對著正式 build 跑，Service Worker 也一起測到
export default defineConfig({
    testDir: 'e2e',
    use: { baseURL: 'http://localhost:4173' },
    webServer: {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
    },
})
