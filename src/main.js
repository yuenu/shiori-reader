import { makeBook } from 'foliate-js/view.js'
import { createTOCView } from 'foliate-js/ui/tree.js'
import * as db from './db.js'
import './style.css'

const $ = s => document.querySelector(s)

// metadata 可能是字串、{ 語言: 字串 } 或 { name, role } 物件
const text = x => typeof x === 'string' ? x
    : x?.name ? text(x.name) : Object.values(x ?? {})[0] ?? ''
const formatAuthor = a => [a ?? []].flat().map(text).join('、')
const pct = f => `${Math.round((f ?? 0) * 100)}%`

let toastTimer
const toast = msg => {
    $('#toast').textContent = msg
    $('#toast').classList.add('show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4000)
}

// ---- 設定 ----

const themes = {
    light: { fg: '#1c1c1e', link: '#b8381f' },
    sepia: { fg: '#4a3a2a', link: '#9a3a18' },
    dark: { fg: '#d8d6d2', link: '#ff8a6e' },
}
const fonts = {
    serif: '"Songti TC", "Noto Serif TC", "Source Han Serif TC", "Noto Serif CJK TC", serif',
    sans: '"PingFang TC", "Noto Sans TC", "Source Han Sans TC", "Noto Sans CJK TC", sans-serif',
}
const settings = { fontSize: 100, lineHeight: 1.7, font: '', theme: 'light', writing: '', flow: 'paginated' }
try { Object.assign(settings, JSON.parse(localStorage.getItem('settings'))) } catch {}

// 注入書本 iframe 的樣式；背景透明，讓外層的紙色透出來
// 夜讀時書本自己寫死的深色字／淺色底會看不清，一律改成繼承主題色、底色透明
// ponytail: 夜讀會吃掉書本的標題配色，要保留就得改成逐色調亮
const getCSS = ({ fontSize, lineHeight, font, theme, writing }) => `
    html {
        color: ${themes[theme].fg} !important;
        font-size: ${fontSize}% !important;
        color-scheme: ${theme === 'dark' ? 'dark' : 'light'};
    }
    html, body {
        background: transparent !important;
        ${writing ? `writing-mode: ${writing} !important;` : ''}
    }
    ${theme === 'dark' ? 'body, body * { color: inherit !important; background-color: transparent !important; }' : ''}
    ${fonts[font] ? `body, body *:not(code, pre, kbd, samp) { font-family: ${fonts[font]} !important; }` : ''}
    p, li, blockquote, dd { line-height: ${lineHeight} !important; }
    a:any-link { color: ${themes[theme].link} !important; }
    ::selection { background: rgba(217, 71, 43, .28); }
`

const applySettings = () => {
    document.documentElement.dataset.theme = settings.theme
    $('#font-size-out').value = `${settings.fontSize}%`
    view?.renderer.setStyles?.(getCSS(settings))
    view?.renderer.setAttribute('flow', settings.flow)
}

const saveSettings = () => localStorage.setItem('settings', JSON.stringify(settings))

const form = $('#settings')
// RadioNodeList.value = '' 不會勾選 value="" 的選項，所以逐一比對
for (const input of form.querySelectorAll('input[type=radio]'))
    input.checked = String(settings[input.name]) === input.value
form.addEventListener('input', e => {
    const { name, value } = e.target
    settings[name] = value !== '' && !isNaN(value) ? +value : value
    saveSettings()
    // foliate 只在章節載入時判斷排版方向，切換直/橫排要重開這本書
    if (name === 'writing' && current) openBook(current.id, view.lastLocation?.cfi)
    else applySettings()
})
form.addEventListener('click', e => {
    const step = +e.target.closest('[data-step]')?.dataset.step
    if (!step) return
    settings.fontSize = Math.min(200, Math.max(70, settings.fontSize + step))
    saveSettings()
    applySettings()
})

// ---- 書架 ----

// 沒有封面的書，依書名配一個布面色，做成直排書名的文庫本封面
const clothColors = ['#24384f', '#7b2f2a', '#2f5a4e', '#55467a', '#8a6326', '#3b3b3d', '#1f5f74']
const hash = s => [...s].reduce((h, c) => (h * 31 + c.codePointAt(0)) | 0, 7)

let coverURLs = []
const fillCover = (slot, book) => {
    if (book.cover) {
        const img = new Image()
        img.alt = ''
        img.src = URL.createObjectURL(book.cover)
        coverURLs.push(img.src)
        slot.replaceChildren(img)
    } else {
        const gen = document.createElement('span')
        // 有中日文字才直排，純英文書名橫排比較好讀
        gen.className = /[぀-ヿ㐀-鿿豈-﫿]/.test(book.title) ? 'gen-cover' : 'gen-cover latin'
        gen.style.setProperty('--cloth', clothColors[Math.abs(hash(book.title)) % clothColors.length])
        gen.innerHTML = '<span class="gen-title"></span><span class="gen-author"></span>'
        gen.firstChild.textContent = book.title
        gen.lastChild.textContent = book.author
        slot.replaceChildren(gen)
    }
}

const renderLibrary = async () => {
    const books = await db.getBooks()
    books.sort((a, b) => (b.openedAt ?? b.addedAt) - (a.openedAt ?? a.addedAt))
    coverURLs.forEach(URL.revokeObjectURL)
    coverURLs = []

    const last = books.find(b => b.openedAt && b.fraction < 0.995)
    $('#continue').hidden = !last
    if (last) {
        const c = $('#continue')
        fillCover(c.querySelector('.cover-slot'), last)
        c.querySelector('h2').textContent = last.title
        c.querySelector('.continue-author').textContent = last.author
        c.querySelector('.continue-where').textContent =
            `讀到${last.chapter ? `「${last.chapter}」・` : ''}${pct(last.fraction)}`
        c.querySelector('.meter span').style.width = pct(last.fraction)
        c.querySelector('.continue-cover').onclick = c.querySelector('.continue-go').onclick = () => openBook(last.id)
    }

    $('#count').textContent = books.length || ''
    $('#empty').hidden = books.length > 0
    $('#shelf-title').hidden = !books.length
    $('#books').replaceChildren(...books.map(book => {
        const li = $('#book-tpl').content.firstElementChild.cloneNode(true)
        const q = s => li.querySelector(s)
        fillCover(q('.cover-slot'), book)
        q('.book-title').textContent = book.title
        q('.book-author').textContent = book.author
        const done = book.fraction >= 0.995
        q('.obi').textContent = done ? '讀完' : book.fraction ? `讀到 ${pct(book.fraction)}` : '未讀'
        q('.obi').dataset.state = done ? 'done' : book.fraction ? 'reading' : 'new'
        q('.book-cover').setAttribute('aria-label', `開啟《${book.title}》`)
        q('.book-cover').onclick = () => openBook(book.id)
        q('.book-del').setAttribute('aria-label', `從書架刪除《${book.title}》`)
        q('.book-del').onclick = async () => {
            if (!confirm(`確定從書架刪除《${book.title}》？\n閱讀進度也會一併刪除。`)) return
            await db.deleteBook(book.id)
            renderLibrary()
        }
        return li
    }))
}

const importFiles = async files => {
    if (!files.length) return
    const btn = $('#add-btn')
    btn.setAttribute('aria-busy', 'true')
    btn.querySelector('span').textContent = '加入中…'
    let added = 0
    for (const file of files) {
        // ponytail: 用檔名+大小判斷重複，同一本書改名後會被當成新書
        const id = `${file.name}:${file.size}`
        if (await db.getBook(id)) continue
        try {
            const book = await makeBook(file)
            await db.addBook({
                id,
                title: text(book.metadata?.title) || file.name.replace(/\.epub$/i, ''),
                author: formatAuthor(book.metadata?.author),
                cover: await Promise.resolve(book.getCover?.()).catch(() => null) ?? null,
                addedAt: Date.now(),
            }, file)
            book.destroy?.()
            added++
        } catch (e) {
            console.error(e)
            toast(`無法讀取「${file.name}」，可能不是有效的 EPUB 檔。`)
        }
    }
    btn.removeAttribute('aria-busy')
    btn.querySelector('span').textContent = '加入書籍'
    if (added) toast(`已加入 ${added} 本書`)
    renderLibrary()
}

$('#file-input').addEventListener('change', e => {
    importFiles([...e.target.files])
    e.target.value = ''
})
let dragDepth = 0
addEventListener('dragenter', e => {
    if (!e.dataTransfer.types.includes('Files')) return
    dragDepth++
    document.body.classList.add('dragging')
})
addEventListener('dragleave', () => {
    if (--dragDepth <= 0) document.body.classList.remove('dragging'), dragDepth = 0
})
addEventListener('dragover', e => e.preventDefault())
addEventListener('drop', e => {
    e.preventDefault()
    dragDepth = 0
    document.body.classList.remove('dragging')
    const files = [...e.dataTransfer.files]
    const epubs = files.filter(f => f.name.toLowerCase().endsWith('.epub'))
    if (files.length && !epubs.length) toast('只支援 .epub 檔')
    importFiles(epubs)
})

// ---- 閱讀器 ----

let view, current, tocView

const show = name => {
    $('#library').hidden = name !== 'library'
    $('#reader').hidden = name !== 'reader'
    if (name === 'library') document.title = '書架'
}

const setChrome = visible => $('#reader').classList.toggle('chrome-hidden', !visible)
const toggleChrome = () => setChrome($('#reader').classList.contains('chrome-hidden'))
const turn = dir => {
    setChrome(false)
    dir < 0 ? view?.goLeft() : view?.goRight()
}

const closeBook = () => {
    view?.close()
    view?.book?.destroy?.()
    view?.remove()
    view = current = tocView = null
}

const onRelocate = ({ detail: { fraction, cfi, tocItem } }) => {
    $('#progress').value = fraction
    $('#percent').textContent = pct(fraction)
    $('#chapter').textContent = tocItem?.label ?? ''
    if (tocItem?.href) tocView?.setCurrentHref(tocItem.href)
    if (current) db.saveProgress({ id: current.id, cfi, fraction, chapter: tocItem?.label, openedAt: Date.now() })
}

const onKey = e => {
    if (e.target.closest?.('input, select, [popover]')) return
    if (e.key === 'ArrowLeft') turn(-1)
    else if (e.key === 'ArrowRight') turn(1)
}

// 書本內容在 iframe 裡：點左右三成翻頁、點中間叫出工具列
const onDocClick = doc => e => {
    if (e.target.closest('a') || !doc.getSelection().isCollapsed) return
    const x = e.clientX + doc.defaultView.frameElement.getBoundingClientRect().left
    if (x < innerWidth * 0.3) turn(-1)
    else if (x > innerWidth * 0.7) turn(1)
    else toggleChrome()
}

const openBook = async (id, cfi) => {
    try {
        const [meta, file, progress] = await Promise.all([db.getBook(id), db.getFile(id), db.getProgress(id)])
        closeBook()
        current = meta
        $('#viewer').replaceChildren(Object.assign(document.createElement('p'), {
            className: 'viewer-loading', textContent: '正在打開…' }))
        $('#book-title').textContent = document.title = meta.title
        $('#chapter').textContent = ''
        setChrome(true)
        show('reader')

        const book = await makeBook(file)
        // 強制直/橫排時，翻頁方向要跟著換（直排由右往左翻）
        // ponytail: 強制橫排一律當 ltr，阿拉伯文等 RTL 書請選「原書」
        if (settings.writing) book.dir = settings.writing === 'vertical-rl' ? 'rtl' : 'ltr'
        view = document.createElement('foliate-view')
        $('#viewer').append(view)
        await view.open(book)
        view.addEventListener('relocate', onRelocate)
        view.addEventListener('load', ({ detail: { doc } }) => {
            doc.addEventListener('keydown', onKey)
            doc.addEventListener('click', onDocClick(doc))
        })
        view.renderer.setAttribute('margin', '64px')
        view.renderer.setAttribute('gap', '6%')
        applySettings()

        tocView = view.book.toc?.length ? createTOCView(view.book.toc, href => {
            view.goTo(href)
            $('#toc').hidePopover()
            setChrome(false)
        }) : null
        $('#toc-list').replaceChildren(tocView?.element
            ?? Object.assign(document.createElement('p'), { className: 'toc-empty', textContent: '這本書沒有目次。' }))
        $('#progress').dir = view.book.dir ?? 'ltr'

        await view.init({ lastLocation: cfi ?? progress?.cfi, showTextStart: true })
        $('#viewer .viewer-loading')?.remove()
    } catch (e) {
        console.error(e)
        closeBook()
        show('library')
        toast('無法打開這本書，檔案可能已損壞。')
    }
}

document.addEventListener('keydown', onKey)
$('#prev').onclick = () => turn(-1)
$('#next').onclick = () => turn(1)
$('#progress').oninput = e => view?.goToFraction(+e.target.value)
$('#back').onclick = () => {
    closeBook()
    show('library')
    renderLibrary()
}
// 目次打開時，把目前章節捲進可視範圍
$('#toc').addEventListener('toggle', e => {
    if (e.newState === 'open') $('#toc [aria-current]')?.scrollIntoView({ block: 'center' })
})

applySettings()
renderLibrary()
