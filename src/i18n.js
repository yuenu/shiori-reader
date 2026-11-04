import { dicts } from './locales.js'

export let lang
let dict

export const t = (s, vars = {}) => {
    if (import.meta.env.DEV && dict && !(s in dict)) console.warn('i18n 缺翻譯:', s)
    return (dict?.[s] ?? s).replace(/\{(\w+)\}/g, (_, k) => vars[k])
}

// 原文和各語言譯文都對回原文 key：不管畫面上現在是哪種語言，都找得到該換成什麼
const keyOf = new Map(Object.values(dicts).flatMap(Object.entries).flatMap(([k, v]) => [[k, k], [v, k]]))
// 書名、作者、目次是書的內容，不翻；這幾塊換語言後由各自的 render 重畫
const CONTENT = '#books, #continue, #toc-list, #book-title, #chapter'

// 就地翻譯畫面上的文字與 aria-label（模組在 DOM 解析完才執行）；帶插值的字串由 render 重畫
const translateDOM = () => {
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
        const node = walker.currentNode, s = node.data.trim()
        // 開發模式的 CSS 是 <style> 注入的，也要跳過；語言選項用各自的語言寫（標了 lang），不翻
        if (!s || node.parentElement?.closest(`${CONTENT}, style, script, [lang]:not(html)`)) continue
        const key = keyOf.get(s)
        if (key) node.data = node.data.replace(s, t(key))
        else if (import.meta.env.DEV && /[㐀-鿿]/.test(s)) console.warn('i18n 缺翻譯:', s)
    }
    for (const el of document.querySelectorAll('[aria-label]')) {
        const key = keyOf.get(el.getAttribute('aria-label'))
        if (key && !el.closest(CONTENT)) el.setAttribute('aria-label', t(key))
    }
}

// 簡中地區（zh-CN、zh-SG…）給簡中，其餘中文給繁中，日文給日文，其他語言都給英文
export const setLang = wanted => {
    lang = /^zh-(hans|cn|sg|my)/i.test(wanted) ? 'zh-Hans' : /^zh/i.test(wanted) ? 'zh-Hant' : /^ja/i.test(wanted) ? 'ja' : 'en'
    dict = dicts[lang]
    document.documentElement.lang = lang
    translateDOM()
}

// ?lang=en 可強制語言（方便 demo 連結），其次是設定裡選過的，最後看瀏覽器
let saved
try { saved = JSON.parse(localStorage.getItem('settings'))?.lang } catch {}
setLang(new URLSearchParams(location.search).get('lang') ?? saved ?? navigator.language)
