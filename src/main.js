import { makeBook } from 'foliate-js/view.js'
import { createTOCView } from 'foliate-js/ui/tree.js'
import * as db from './db.js'
import { t, lang, setLang } from './i18n.js'
import './style.css'

const $ = s => document.querySelector(s)

// metadata 可能是字串、{ 語言: 字串 } 或 { name, role } 物件
const text = x => typeof x === 'string' ? x
    : x?.name ? text(x.name) : Object.values(x ?? {})[0] ?? ''
// 製書工具留下的「[Creator name here]」之類佔位字不算作者
const formatAuthor = a => [a ?? []].flat().map(text).filter(s => !/^\[.*\]$/.test(s)).join(t('、'))
const pct = f => `${Math.round((f ?? 0) * 100)}%`
// 書名、作者標上書的語言：螢幕閱讀器才會用對的語音念，日文書名也會用日文字形
const setBookLang = (el, book) => book.language ? el.lang = book.language : el.removeAttribute('lang')

let toastTimer
const toast = (msg, ms = 4000) => {
    $('#toast').textContent = msg
    $('#toast').classList.add('show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), ms)
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
// 底色預設跟著系統的深淺色；persist 不給預設值，交給 db.init 判斷（見 db.js）
const settings = {
    fontSize: 100, lineHeight: 1.7, font: '', writing: '', flow: 'paginated',
    theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
}
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
    // 用 aria-disabled 而不是 disabled：按到底時焦點不會被踢掉
    for (const b of form.querySelectorAll('[data-step]'))
        b.setAttribute('aria-disabled', +b.dataset.step < 0 ? settings.fontSize <= 70 : settings.fontSize >= 200)
    view?.renderer.setStyles?.(getCSS(settings))
    view?.renderer.setAttribute('flow', settings.flow)
}

const saveSettings = () => localStorage.setItem('settings', JSON.stringify(settings))

const form = $('#settings')
// RadioNodeList.value = '' 不會勾選 value="" 的選項，所以逐一比對
for (const input of form.querySelectorAll('input[type=radio]'))
    input.checked = String(settings[input.name]) === input.value
form.elements.lang.value = lang
form.addEventListener('input', e => {
    const { name, value } = e.target
    // 保存與否要二次確認，確認前不動設定
    if (name === 'persist') return askPersist(value === 'true', 'settings')
    settings[name] = value !== '' && !isNaN(value) ? +value : value
    saveSettings()
    if (name === 'lang') {
        setLang(value)
        document.title = t('書架')
        renderLibrary()
    }
    // foliate 只在章節載入時判斷排版方向，切換直/橫排要重開這本書
    else if (name === 'writing' && current) openBook(current.id, view.lastLocation?.cfi)
    else applySettings()
})
form.addEventListener('click', e => {
    const step = +e.target.closest('[data-step]')?.dataset.step
    if (!step) return
    settings.fontSize = Math.min(200, Math.max(70, settings.fontSize + step))
    saveSettings()
    applySettings()
})

// ---- 保存 ----

const syncPersist = () => {
    form.elements.persist.value = String(settings.persist)
    document.documentElement.dataset.persist = settings.persist
}

const persistDialog = $('#persist-dialog')
const askPersist = (on, from = '') => {
    syncPersist()
    persistDialog.dataset.on = on
    persistDialog.dataset.from = from
    $('#persist-title').textContent = t(on ? '在這台裝置保存書籍？' : '不再保存書籍？')
    $('#persist-desc').textContent = t(on
        ? '書和閱讀進度會存在這個瀏覽器裡，下次打開還在，不會上傳。共用或公用電腦上建議不要開啟。'
        : '已保存的書會從這台裝置移除。關閉這個分頁前還能繼續讀，之後書架就會清空。')
    $('#persist-confirm').textContent = t(on ? '保存在這台裝置' : '不再保存')
    // 按 Esc 關閉不會改 returnValue，先清掉上一次的結果
    persistDialog.returnValue = ''
    persistDialog.showModal()
}
const applyPersist = async on => {
    try {
        await db.setPersist(on)
    } catch (e) {
        console.error(e)
        return toast(t('無法切換保存設定，請稍後再試。'))
    }
    settings.persist = on
    saveSettings()
    syncPersist()
    toast(t(on ? '書架會保存在這台裝置' : '已不再保存，關閉分頁後書架會清空'))
}
persistDialog.addEventListener('close', async () => {
    if (persistDialog.returnValue === 'confirm') await applyPersist(persistDialog.dataset.on === 'true')
    // showModal 會關掉設定面板，焦點還不回去：從面板來就把面板開回來；從書架提示來而提示已經消失，就放到第一本書
    if (persistDialog.dataset.from === 'settings') {
        form.showPopover()
        form.querySelector('input[name=persist]:checked')?.focus()
    } else if (!$('#keep-btn').offsetParent) $('.book-cover')?.focus()
})
$('#keep-btn').onclick = () => askPersist(true)

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
        setBookLang(gen, book)
        slot.replaceChildren(gen)
    }
}

const renderLibrary = async () => {
    const books = await db.getBooks()
    // 開過的書依最近閱讀排前面；沒開過的新書依加入時間排後面，一次匯入很多本也不會把正在讀的擠到最後
    books.sort((a, b) => !a.openedAt - !b.openedAt || (b.openedAt ?? b.addedAt) - (a.openedAt ?? a.addedAt))
    coverURLs.forEach(URL.revokeObjectURL)
    coverURLs = []

    const last = books.find(b => b.openedAt && b.fraction < 0.995)
    $('#continue').hidden = !last
    if (last) {
        const c = $('#continue')
        c.dataset.id = last.id
        fillCover(c.querySelector('.cover-slot'), last)
        c.querySelector('h2').textContent = last.title
        setBookLang(c.querySelector('h2'), last)
        c.querySelector('.continue-author').textContent = last.author
        c.querySelector('.continue-where').textContent = last.chapter
            ? t('讀到「{chapter}」・{pct}', { chapter: last.chapter, pct: pct(last.fraction) })
            : t('讀到 {pct}', { pct: pct(last.fraction) })
        c.querySelector('.continue-cover').onclick = c.querySelector('.continue-go').onclick = () => openBook(last.id)
    }

    $('#count').textContent = books.length || ''
    $('#empty').hidden = books.length > 0
    $('#shelf-title').hidden = !books.length
    $('#storage-hint').hidden = !books.length
    // 書架有書時，主要動作是讀書：加入書籍退成次要按鈕，朱色留給繼續閱讀
    $('#add-btn').classList.toggle('btn-accent', !books.length)
    $('#add-btn').classList.toggle('btn-quiet', books.length > 0)
    $('#books').replaceChildren(...books.map((book, i) => {
        const li = $('#book-tpl').content.firstElementChild.cloneNode(true)
        const q = s => li.querySelector(s)
        fillCover(q('.cover-slot'), book)
        q('.book-title').textContent = book.title
        setBookLang(q('.book-title'), book)
        q('.book-author').textContent = book.author
        const done = book.fraction >= 0.995
        const state = done ? t('讀完') : book.fraction ? t('讀到 {pct}', { pct: pct(book.fraction) }) : t('未讀')
        q('.obi').textContent = state
        q('.obi').dataset.state = done ? 'done' : book.fraction ? 'reading' : 'new'
        q('.book-cover').dataset.id = book.id
        // aria-label 會蓋掉按鈕內的書腰文字，所以把進度一起念出來
        q('.book-cover').setAttribute('aria-label', t('開啟《{title}》，{state}', { title: book.title, state }))
        q('.book-cover').onclick = () => openBook(book.id)
        q('.book-del').setAttribute('aria-label', t('從書架刪除《{title}》', book))
        q('.book-del').onclick = async () => {
            if (!confirm(t('確定從書架刪除《{title}》？\n閱讀進度也會一併刪除。', book))) return
            await db.deleteBook(book.id)
            await renderLibrary()
            // 焦點移到原位置的下一本（刪的是最後一本就移到前一本），鍵盤使用者不必從頁首重來
            const covers = document.querySelectorAll('.book-cover')
            const next = covers[i] ?? covers[i - 1] ?? $('#add-btn')
            next.focus()
        }
        return li
    }))
}

// foliate-js 認得的格式；PDF 要另外接 pdf.js，先不支援
const bookExt = /\.(epub|mobi|azw3?|fb2|fbz|cbz)$/i

const importFiles = async files => {
    if (!files.length) return
    const btn = $('#add-btn')
    btn.setAttribute('aria-busy', 'true')
    btn.querySelector('span').textContent = t('加入中…')
    let added = 0, skipped = 0
    const failed = []
    for (const file of files) {
        // ponytail: 用檔名+大小判斷重複，同一本書改名後會被當成新書
        const id = `${file.name}:${file.size}`
        if (await db.getBook(id)) {
            skipped++
            continue
        }
        try {
            const book = await makeBook(file)
            // foliate 不檢查 Kindle DRM，加密的書會照樣開成亂碼
            if (book.mobi?.headers.palmdoc.encryption) throw new Error('DRM-protected')
            await db.addBook({
                id,
                // CBZ 沒有書名時 foliate 會直接拿檔名（含副檔名）當書名
                title: (text(book.metadata?.title) || file.name).replace(bookExt, ''),
                author: formatAuthor(book.metadata?.author),
                // EPUB 給的是陣列，其他格式可能是字串
                language: [book.metadata?.language].flat()[0],
                cover: await Promise.resolve(book.getCover?.()).catch(() => null) ?? null,
                addedAt: Date.now(),
            }, file)
            book.destroy?.()
            added++
        } catch (e) {
            console.error(e)
            failed.push(file.name)
        }
    }
    btn.removeAttribute('aria-busy')
    btn.querySelector('span').textContent = t('加入書籍')
    // 結果合成一則 toast：分開發的話，後一則會蓋掉前一則的錯誤訊息
    const summary = [
        added && t('已加入 {n} 本書', { n: added }),
        skipped && t('{n} 本已在書架上', { n: skipped }),
        failed.length && t('無法讀取：{names}（檔案可能已損壞，或有 DRM 保護）', { names: failed.join(t('、')) }),
    ].filter(Boolean)
    if (summary.length) toast(summary.join(t('・')), failed.length ? 8000 : 4000)
    renderLibrary()
}

$('#add-btn').onclick = () => $('#file-input').click()

// 範例書放在 public/samples，抓下來當成使用者匯入的檔案；後加入的排在前面，所以《吶喊》放最後
const samples = ['arthur-conan-doyle_the-adventures-of-sherlock-holmes.epub', 'lu-xun_nahan.epub']
$('#samples-btn').onclick = async ({ currentTarget: btn }) => {
    btn.setAttribute('aria-busy', 'true')
    try {
        const files = await Promise.all(samples.map(async name => {
            const res = await fetch(`/samples/${name}`)
            if (!res.ok) throw new Error(`${name}: ${res.status}`)
            return new File([await res.blob()], name, { type: 'application/epub+zip' })
        }))
        await importFiles(files)
    } catch (e) {
        console.error(e)
        toast(t('範例書下載失敗，請稍後再試。'))
    }
    btn.removeAttribute('aria-busy')
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
    const books = files.filter(f => bookExt.test(f.name))
    if (files.length && !books.length) toast(t('只支援 EPUB、MOBI、AZW3、FB2、CBZ 檔'))
    importFiles(books)
})

// ---- 閱讀器 ----

let view, current, tocView

const show = name => {
    // 開書時多推一筆瀏覽紀錄：瀏覽器返回鍵／手機返回手勢會回到書架，而不是離開網站
    if (name === 'reader' && $('#reader').hidden) history.pushState({ reader: true }, '')
    // 設定面板依這個決定哪些欄位要出現（data-scope）
    document.documentElement.dataset.view = name
    $('#library').hidden = name !== 'library'
    $('#reader').hidden = name !== 'reader'
    if (name === 'library') document.title = t('書架')
}

const setChrome = visible => $('#reader').classList.toggle('chrome-hidden', !visible)
const toggleChrome = () => setChrome($('#reader').classList.contains('chrome-hidden'))
const turn = dir => {
    setChrome(false)
    dir < 0 ? view?.goLeft() : view?.goRight()
}
// 依閱讀順序翻頁（直排書的下一頁在左邊）；turn 是依畫面左右
const page = dir => {
    setChrome(false)
    dir < 0 ? view?.prev() : view?.next()
}
// 整頁全螢幕（不是只放大 #reader）：設定面板在 #reader 外面也照常出現；foliate 換尺寸時會留在原位置
const toggleFullscreen = () => {
    if (!document.fullscreenEnabled) return
    document.fullscreenElement ? document.exitFullscreen()
        : document.documentElement.requestFullscreen({ navigationUI: 'hide' })
}

const closeBook = () => {
    view?.close()
    view?.book?.destroy?.()
    view?.remove()
    view = current = tocView = null
}

const onRelocate = ({ detail: { fraction, cfi, tocItem } }) => {
    $('#progress').value = fraction
    $('#progress').setAttribute('aria-valuetext', pct(fraction))
    $('#percent').textContent = pct(fraction)
    $('#chapter').textContent = tocItem?.label ?? ''
    if (tocItem?.href) tocView?.setCurrentHref(tocItem.href)
    if (current) db.saveProgress({ id: current.id, cfi, fraction, chapter: tocItem?.label, openedAt: Date.now() })
}

const keys = {
    ArrowLeft: () => turn(-1),
    ArrowRight: () => turn(1),
    PageDown: () => page(1),
    PageUp: () => page(-1),
    Escape: toggleChrome,
    // 大寫鎖定或按著 Shift 時 e.key 是大寫
    f: toggleFullscreen,
    F: toggleFullscreen,
}
const onKey = e => {
    // 面板開著時按鍵留給面板（Esc 關面板，不要順便收工具列）
    if ($('#reader').hidden || $(':popover-open') || e.target.closest?.('input, select')
        || e.metaKey || e.ctrlKey || e.altKey) return
    // 工具列收起時按 Tab 先叫出來，焦點才有地方去（不擋預設，焦點照常前進）
    if (e.key === 'Tab') return setChrome(true)
    // 空白鍵翻頁；焦點在按鈕上時留給按鈕自己
    const key = e.key === ' ' && !e.target.closest?.('button, a') ? (e.shiftKey ? 'PageUp' : 'PageDown') : e.key
    if (!keys[key]) return
    e.preventDefault()
    keys[key]()
}

// 捲動模式下使用者自己捲（滾輪、手指拖）就收起工具列；iframe 裡的事件不會冒到外層，內外都要聽
// 不用 foliate 的 relocate：錨定後的第一次捲動它不會發。分頁模式不收，輕點的手指微動也算 touchmove
const onUserScroll = () => {
    if (settings.flow === 'scrolled') setChrome(false)
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
            className: 'viewer-loading', role: 'status', textContent: t('正在打開…') }))
        $('#book-title').textContent = document.title = meta.title
        setBookLang($('#book-title'), meta)
        $('#chapter').textContent = ''
        setChrome(true)
        show('reader')
        // 焦點移到書名，螢幕閱讀器會念出開了哪本書；原本的封面按鈕已經隱藏
        $('#book-title').focus()

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
            doc.addEventListener('wheel', onUserScroll, { passive: true })
            doc.addEventListener('touchmove', onUserScroll, { passive: true })
        })
        view.addEventListener('wheel', onUserScroll, { passive: true })
        view.addEventListener('touchmove', onUserScroll, { passive: true })
        view.renderer.setAttribute('margin', '64px')
        view.renderer.setAttribute('gap', '6%')
        applySettings()

        tocView = view.book.toc?.length ? createTOCView(view.book.toc, href => {
            view.goTo(href)
            $('#toc').hidePopover()
            setChrome(false)
        }) : null
        $('#toc-list').replaceChildren(tocView?.element
            ?? Object.assign(document.createElement('p'), { className: 'toc-empty', textContent: t('這本書沒有目次。') }))
        $('#progress').dir = view.book.dir ?? 'ltr'
        $('#ticks').replaceChildren(...view.getSectionFractions().map(value =>
            Object.assign(document.createElement('option'), { value })))
        // 左右兩顆鈕是畫面方向；直排（rtl）書往左才是下一頁
        const rtl = view.book.dir === 'rtl'
        $('#prev').setAttribute('aria-label', t(rtl ? '下一頁' : '上一頁'))
        $('#next').setAttribute('aria-label', t(rtl ? '上一頁' : '下一頁'))

        await view.init({ lastLocation: cfi ?? progress?.cfi, showTextStart: true })
        $('#viewer .viewer-loading')?.remove()
    } catch (e) {
        console.error(e)
        exitReader()
        toast(t('無法打開這本書，檔案可能已損壞。'))
    }
}

const leaveReader = async () => {
    const id = current?.id
    for (const p of document.querySelectorAll(':popover-open')) p.hidePopover()
    // 全螢幕鈕只在閱讀頁，回書架就退出，不然書架上找不到出口
    if (document.fullscreenElement) document.exitFullscreen()
    closeBook()
    show('library')
    await renderLibrary()
    // 焦點回到剛讀的那本：還沒讀完就是「繼續閱讀」，讀完的在書架上
    const c = $('#continue')
    const target = !c.hidden && c.dataset.id === id ? $('.continue-go')
        : [...document.querySelectorAll('.book-cover')].find(b => b.dataset.id === id)
    target?.focus()
}
// 「回書架」也走瀏覽紀錄，返回鍵和畫面按鈕才會是同一件事、紀錄不會多一筆
const exitReader = () => history.state?.reader ? history.back() : leaveReader()
addEventListener('popstate', () => {
    if (!$('#reader').hidden) leaveReader()
})
// 重新整理後書架是初始畫面，清掉留下來的閱讀頁紀錄
if (history.state?.reader) history.replaceState(null, '')

document.addEventListener('keydown', onKey)
$('#prev').onclick = () => turn(-1)
$('#next').onclick = () => turn(1)
$('#progress').oninput = e => view?.goToFraction(+e.target.value)
$('#back').onclick = exitReader
// iPhone Safari 沒有 Fullscreen API，按鈕直接藏起來
$('#fs-btn').hidden = !document.fullscreenEnabled
$('#fs-btn').onclick = toggleFullscreen
document.addEventListener('fullscreenchange', () => $('#fs-btn').setAttribute('aria-pressed', !!document.fullscreenElement))
// 栞：工具列收起時唯一看得到的入口，點它叫回整個工具列
$('#shiori').onclick = () => {
    setChrome(true)
    $('#toc-btn').focus()
}
// 目次打開時，把目前章節捲進可視範圍
$('#toc').addEventListener('toggle', e => {
    if (e.newState === 'open') $('#toc [aria-current]')?.scrollIntoView({ block: 'center' })
})

applySettings()
// 先確定書放在記憶體還是 IndexedDB，才畫得出書架
db.init(settings.persist).then(on => {
    settings.persist = on
    saveSettings()
    syncPersist()
    renderLibrary()
})

// 離線可用；開發模式不註冊，免得快取住 Vite 的開發模組
if (import.meta.env.PROD) navigator.serviceWorker?.register('/sw.js')
