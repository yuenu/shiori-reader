// 介面原文就是繁中，直接拿原文當 key（gettext 式），繁中不需要字典；{x} 是插值
const en = {
    '書架': 'Library',
    '加入書籍': 'Add books',
    '加入中…': 'Adding…',
    '繼續閱讀': 'Continue reading',
    '全部書籍': 'All books',
    '書架還是空的': 'Your shelf is empty',
    '按右上角「加入書籍」，或直接把 .epub 檔拖進這個視窗。': 'Click “Add books” at the top right, or drop .epub files into this window.',
    '按右上角「加入書籍」選擇 .epub 檔。': 'Tap “Add books” at the top right to choose .epub files.',
    '書只放在這個分頁裡，不會上傳；關閉分頁就會清空，要留著請到設定開啟保存。': 'Books stay in this tab and are never uploaded. They’re cleared when you close it; to keep them, turn on saving in Settings.',
    '書保存在這台裝置的瀏覽器裡，不會上傳。': 'Books are kept in this browser on this device. Nothing is uploaded.',
    '只在這個分頁：關閉後書架會清空。': 'This tab only: the shelf empties when you close it.',
    '保存在這台裝置…': 'Keep on this device…',
    '設定': 'Settings',
    '關閉設定': 'Close settings',
    '語言': 'Language',
    '繁體中文': '繁體中文',
    '保存': 'Keep books',
    '只在這個分頁': 'This tab only',
    '存在這台裝置': 'On this device',
    '依畫面左右翻頁': 'Turn page left / right',
    '空白鍵': 'Space',
    '顯示或收起工具列': 'Show or hide toolbar',
    '取消': 'Cancel',
    '在這台裝置保存書籍？': 'Keep books on this device?',
    '書和閱讀進度會存在這個瀏覽器裡，下次打開還在，不會上傳。共用或公用電腦上建議不要開啟。': 'Your books and reading progress will stay in this browser for next time. Nothing is uploaded. Leave this off on shared or public computers.',
    '保存在這台裝置': 'Keep on this device',
    '不再保存書籍？': 'Stop keeping books?',
    '已保存的書會從這台裝置移除。關閉這個分頁前還能繼續讀，之後書架就會清空。': 'Saved books will be removed from this device. You can keep reading until you close this tab; after that the shelf will be empty.',
    '不再保存': 'Stop keeping',
    '書架會保存在這台裝置': 'Your shelf will be kept on this device',
    '已不再保存，關閉分頁後書架會清空': 'No longer kept. The shelf empties when you close this tab',
    '無法切換保存設定，請稍後再試。': 'Couldn’t change where books are kept. Please try again.',
    '正在打開…': 'Opening…',
    '目次': 'Contents',
    '回書架': 'Back to library',
    '排版設定': 'Typography settings',
    '全螢幕': 'Full screen',
    '顯示工具列': 'Show toolbar',
    '上一頁': 'Previous page',
    '下一頁': 'Next page',
    '閱讀進度': 'Reading progress',
    '關閉目次': 'Close contents',
    '字級': 'Size',
    '縮小字級': 'Smaller text',
    '放大字級': 'Larger text',
    '行距': 'Line spacing',
    '緊': 'Tight',
    '適中': 'Normal',
    '寬': 'Loose',
    '字體': 'Font',
    '原書': 'Original',
    '明體': 'Serif',
    '黑體': 'Sans',
    '底色': 'Theme',
    '白紙': 'Paper',
    '書皮': 'Sepia',
    '夜讀': 'Night',
    '方向': 'Writing',
    '橫排': 'Horizontal',
    '直排': 'Vertical',
    '翻頁': 'Flow',
    '分頁': 'Paged',
    '捲動': 'Scrolled',
    '放開以加入書架': 'Drop to add to library',
    '載入範例書': 'Load sample books',
    '範例書下載失敗，請稍後再試。': 'Couldn’t download the sample books. Please try again later.',
    '、': ', ',
    '・': ' · ',
    '讀完': 'Finished',
    '未讀': 'Unread',
    '讀到 {pct}': '{pct} read',
    '讀到「{chapter}」・{pct}': '“{chapter}” · {pct}',
    '開啟《{title}》，{state}': 'Open “{title}”, {state}',
    '從書架刪除《{title}》': 'Remove “{title}” from library',
    '確定從書架刪除《{title}》？\n閱讀進度也會一併刪除。': 'Remove “{title}” from your library?\nYour reading progress will be deleted too.',
    '無法讀取：{names}（可能不是有效的 EPUB 檔）': 'Couldn’t read: {names} (may not be a valid EPUB file)',
    '已加入 {n} 本書': 'Books added: {n}',
    '{n} 本已在書架上': '{n} already in library',
    '只支援 .epub 檔': 'Only .epub files are supported',
    '這本書沒有目次。': 'This book has no table of contents.',
    '無法打開這本書，檔案可能已損壞。': 'Couldn’t open this book. The file may be damaged.',
}

export let lang
let dict

export const t = (s, vars = {}) => {
    if (import.meta.env.DEV && dict && !(s in dict)) console.warn('i18n 缺翻譯:', s)
    return (dict?.[s] ?? s).replace(/\{(\w+)\}/g, (_, k) => vars[k])
}

// 原文和英文都對回原文 key：不管畫面上現在是哪種語言，都找得到該換成什麼
const keyOf = new Map(Object.entries(en).flatMap(([k, v]) => [[k, k], [v, k]]))
// 書名、作者、目次是書的內容，不翻；這幾塊換語言後由各自的 render 重畫
const CONTENT = '#books, #continue, #toc-list, #book-title, #chapter'

// 就地翻譯畫面上的文字與 aria-label（模組在 DOM 解析完才執行）；帶插值的字串由 render 重畫
const translateDOM = () => {
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
        const node = walker.currentNode, s = node.data.trim()
        // 開發模式的 CSS 是 <style> 注入的，也要跳過
        if (!s || node.parentElement?.closest(`${CONTENT}, style, script`)) continue
        const key = keyOf.get(s)
        if (key) node.data = node.data.replace(s, t(key))
        else if (import.meta.env.DEV && /[㐀-鿿]/.test(s)) console.warn('i18n 缺翻譯:', s)
    }
    for (const el of document.querySelectorAll('[aria-label]')) {
        const key = keyOf.get(el.getAttribute('aria-label'))
        if (key && !el.closest(CONTENT)) el.setAttribute('aria-label', t(key))
    }
}

// 中文一律用繁中，其他語言都給英文
// ponytail: 只有繁中與英文，要支援簡中／日文再加字典與判斷
export const setLang = wanted => {
    lang = /^zh/i.test(wanted) ? 'zh-Hant' : 'en'
    dict = { en }[lang]
    document.documentElement.lang = lang
    translateDOM()
}

// ?lang=en 可強制語言（方便 demo 連結），其次是設定裡選過的，最後看瀏覽器
let saved
try { saved = JSON.parse(localStorage.getItem('settings'))?.lang } catch {}
setLang(new URLSearchParams(location.search).get('lang') ?? saved ?? navigator.language)
