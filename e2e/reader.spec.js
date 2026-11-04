import { test, expect } from '@playwright/test'

// 每個 test 都是新的瀏覽器環境，IndexedDB 和 localStorage 都是空的
const books = page => page.locator('#books .book-cover')

const addSamples = async page => {
    await page.goto('/')
    await page.click('#samples-btn')
    await expect(books(page)).toHaveCount(2)
}

test('加入範例書；預設不保存，重新整理後書架清空', async ({ page }) => {
    await addSamples(page)
    await page.reload()
    await expect(page.locator('#empty')).toBeVisible()
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
