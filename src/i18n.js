// 介面原文就是繁中，直接拿原文當 key（gettext 式），繁中不需要字典；{x} 是插值
const en = {
    '書架': 'Library',
    '加入書籍': 'Add books',
    '加入中…': 'Adding…',
    '繼續閱讀': 'Continue reading',
    '全部書籍': 'All books',
    '書架還是空的': 'Your shelf is empty',
    '按右上角「加入書籍」，或直接把 .epub 檔拖進這個視窗。': 'Click “Add books” at the top right, or drop .epub files into this window.',
    '書只存在這台裝置的瀏覽器裡，不會上傳。': 'Books stay in this browser on this device. Nothing is uploaded.',
    '正在打開…': 'Opening…',
    '目次': 'Contents',
    '回書架': 'Back to library',
    '排版設定': 'Typography settings',
    '向左翻頁': 'Turn page left',
    '向右翻頁': 'Turn page right',
    '閱讀進度': 'Reading progress',
    '關閉目次': 'Close contents',
    '排版': 'Typography',
    '關閉排版設定': 'Close typography settings',
    '字級': 'Size',
    '縮小字級': 'Smaller text',
    '放大字級': 'Larger text',
    '行距': 'Spacing',
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
    '讀完': 'Finished',
    '未讀': 'Unread',
    '讀到 {pct}': '{pct} read',
    '讀到「{chapter}」・{pct}': '“{chapter}” · {pct}',
    '開啟《{title}》': 'Open “{title}”',
    '從書架刪除《{title}》': 'Remove “{title}” from library',
    '確定從書架刪除《{title}》？\n閱讀進度也會一併刪除。': 'Remove “{title}” from your library?\nYour reading progress will be deleted too.',
    '無法讀取「{name}」，可能不是有效的 EPUB 檔。': 'Couldn’t read “{name}”. It may not be a valid EPUB file.',
    '已加入 {n} 本書': 'Books added: {n}',
    '只支援 .epub 檔': 'Only .epub files are supported',
    '這本書沒有目次。': 'This book has no table of contents.',
    '無法打開這本書，檔案可能已損壞。': 'Couldn’t open this book. The file may be damaged.',
}

// ?lang=en 可強制語言（方便 demo 連結）；中文一律用繁中，其他語言都給英文
// ponytail: 只看瀏覽器的首選語言，要支援簡中／日文再加字典與判斷
const wanted = new URLSearchParams(location.search).get('lang') ?? navigator.language
export const lang = /^zh/i.test(wanted) ? 'zh-Hant' : 'en'
const dict = { en }[lang]

export const t = (s, vars = {}) => {
    if (import.meta.env.DEV && dict && !(s in dict)) console.warn('i18n 缺翻譯:', s)
    return (dict?.[s] ?? s).replace(/\{(\w+)\}/g, (_, k) => vars[k])
}

// 翻譯 index.html 寫死的文字與 aria-label（模組在 DOM 解析完才執行）
document.documentElement.lang = lang
if (dict) {
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
        const node = walker.currentNode, s = node.data.trim()
        if (dict[s]) node.data = node.data.replace(s, dict[s])
        else if (import.meta.env.DEV && /[㐀-鿿]/.test(s)) console.warn('i18n 缺翻譯:', s)
    }
    for (const el of document.querySelectorAll('[aria-label]'))
        el.setAttribute('aria-label', t(el.getAttribute('aria-label')))
}
