import { test, expect } from '@playwright/test'

// 每個 test 都是新的瀏覽器環境，IndexedDB 和 localStorage 都是空的
const books = page => page.locator('#books .book-cover')

const addSamples = async page => {
    await page.goto('/')
    await page.click('#samples-btn')
    await expect(books(page)).toHaveCount(2)
}

test('加入範例書；預設不保存，在閱讀頁重新整理會回到清空的書架並說明原因，加回同一本會回到剛才那頁', async ({ page }) => {
    await addSamples(page)
    await books(page).first().click()
    await expect(page.locator('.viewer-loading')).toHaveCount(0)
    await page.locator('#progress').fill('0.5')
    await expect(page.locator('#percent')).toHaveText(/^[45]\d%$/)
    await expect(page).toHaveURL(/#book=.*&cfi=/)
    const percent = await page.locator('#percent').textContent()
    const title = await page.locator('#book-title').textContent()

    await page.reload()
    await expect(page.locator('#empty')).toBeVisible()
    await expect(page).not.toHaveURL(/#book=/)
    await expect(page.locator('#toast')).toHaveClass(/show/)

    // 範例書就是同一個檔案
    await page.click('#samples-btn')
    await expect(page.locator('#book-title')).toHaveText(title)
    await expect(page.locator('#percent')).toHaveText(percent)
})

// 捲動模式下書本 iframe 蓋到畫面頂端，測到 iframe 裡的座標換算
for (const flow of ['paginated', 'scrolled']) test(`滑鼠移到上下緣叫出工具列，移開收起（${flow}）`, async ({ page }) => {
    await page.addInitScript(flow => localStorage.setItem('settings', JSON.stringify({ flow })), flow)
    await addSamples(page)
    await books(page).first().click()
    await expect(page.locator('.viewer-loading')).toHaveCount(0)
    const reader = page.locator('#reader')
    const { width, height } = page.viewportSize()
    await page.mouse.move(width / 2, height / 2)
    await page.keyboard.press('Escape')
    await expect(reader).toHaveClass(/chrome-hidden/)
    await page.mouse.move(width / 2, 5)
    await expect(reader).not.toHaveClass(/chrome-hidden/)
    await page.mouse.move(width / 2, height / 2)
    await expect(reader).toHaveClass(/chrome-hidden/)
    await page.mouse.move(width / 2, height - 5)
    await expect(reader).not.toHaveClass(/chrome-hidden/)
})

test('開啟保存後，書、進度和開著的書重新整理都還在', async ({ page }) => {
    await addSamples(page)
    await page.click('#keep-btn')
    await page.click('#persist-confirm')
    await expect(page.locator('html')).toHaveAttribute('data-persist', 'true')

    await books(page).first().click()
    await expect(page.locator('.viewer-loading')).toHaveCount(0)
    await page.locator('#progress').fill('0.5')
    // 開書時會先定位到正文開頭（約 1%），要等它真的跳到一半
    await expect(page.locator('#percent')).toHaveText(/^[45]\d%$/)
    const percent = await page.locator('#percent').textContent()
    const title = await page.locator('#book-title').textContent()

    // 在閱讀頁重新整理：回到同一本、同一個位置
    await page.reload()
    await expect(page.locator('#book-title')).toHaveText(title)
    await expect(page.locator('#percent')).toHaveText(percent)

    // 回書架：兩本都還在，剛讀的那本標著讀到一半
    await page.click('#back')
    await expect(books(page)).toHaveCount(2)
    await expect(page.locator('.obi[data-state=reading]')).toHaveCount(1)
})

test('分頁模式顯示本章第幾頁，翻頁會跟著變', async ({ page }) => {
    await addSamples(page)
    await books(page).first().click()
    await expect(page.locator('.viewer-loading')).toHaveCount(0)
    const where = page.locator('#page')
    await expect(where).toHaveText(/\d+\D+\d+/)
    const num = async () => +(await where.textContent()).match(/\d+/)[0]
    const before = await num()
    // PageDown 依閱讀順序翻；ArrowRight 在直排書是往回翻
    await page.keyboard.press('PageDown')
    await expect.poll(num).toBe(before + 1)
})

// foliate 的元素在 closed shadow root 裡，直接量書本 iframe 的欄寬
test('邊距設成最小，橫排書每欄變寬', async ({ page }) => {
    await addSamples(page)
    await books(page).nth(1).click()
    await expect(page.locator('.viewer-loading')).toHaveCount(0)
    const colWidth = () => page.frames().at(-1).evaluate(() => parseFloat(getComputedStyle(document.documentElement).columnWidth))
    const before = await colWidth()
    await page.click('#toc-btn ~ [popovertarget=settings]')
    await page.click('label:has(input[name=margin][value=small])')
    await expect.poll(colWidth).toBeGreaterThan(before)
})
