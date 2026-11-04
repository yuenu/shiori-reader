// books: 書目資訊與封面；files: 原始 EPUB；progress: 閱讀進度（分開存，翻頁時才不會重寫大檔）
// 預設不保存：書只放在記憶體，關掉分頁就沒了；使用者選「存在這台裝置」才寫進 IndexedDB
const STORES = ['books', 'files', 'progress']
let dbp
const open = () => dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('epub-reader', 1)
    req.onupgradeneeded = () => {
        req.result.createObjectStore('books', { keyPath: 'id' })
        req.result.createObjectStore('files')
        req.result.createObjectStore('progress', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
})

const tx = async (stores, mode, fn) => {
    const db = await open()
    return new Promise((resolve, reject) => {
        const t = db.transaction(stores, mode)
        const req = fn(store => t.objectStore(store))
        t.oncomplete = () => resolve(req?.result)
        t.onerror = t.onabort = () => reject(t.error)
    })
}

const mem = { books: new Map(), files: new Map(), progress: new Map() }
let persist = false

// saved 是使用者的選擇；還沒選過（從舊版升級）就看 IndexedDB 裡有沒有書，有就繼續保存，免得書不見
export const init = async saved => {
    // IndexedDB 打不開（部分隱私模式）就當作沒有書，照樣用記憶體
    persist = saved ?? (await tx('books', 'readonly', s => s('books').count()).catch(() => 0) > 0)
    // 請瀏覽器不要在空間不足時清掉書庫
    if (persist) navigator.storage?.persist?.()
    return persist
}

// 切換時整批搬家：開啟＝這次開的書存進 IndexedDB；關閉＝搬回記憶體（這個分頁還讀得到），IndexedDB 清空
export const setPersist = async on => {
    if (on === persist) return
    if (on) {
        await tx(STORES, 'readwrite', s => {
            for (const [id, file] of mem.files) s('files').put(file, id)
            for (const book of mem.books.values()) s('books').put(book)
            for (const p of mem.progress.values()) s('progress').put(p)
        })
        STORES.forEach(name => mem[name].clear())
        navigator.storage?.persist?.()
    } else {
        // 同一個 transaction 裡請求依序執行，讀完才清空
        await tx(STORES, 'readwrite', s => {
            s('books').getAll().onsuccess = e => e.target.result.forEach(b => mem.books.set(b.id, b))
            s('progress').getAll().onsuccess = e => e.target.result.forEach(p => mem.progress.set(p.id, p))
            const keys = s('files').getAllKeys(), files = s('files').getAll()
            files.onsuccess = () => keys.result.forEach((k, i) => mem.files.set(k, files.result[i]))
            STORES.forEach(name => s(name).clear())
        })
    }
    persist = on
}

export const getBooks = async () => {
    const [books, progress] = persist ? await Promise.all([
        tx('books', 'readonly', s => s('books').getAll()),
        tx('progress', 'readonly', s => s('progress').getAll()),
    ]) : [[...mem.books.values()], [...mem.progress.values()]]
    const map = new Map(progress.map(p => [p.id, p]))
    return books.map(b => ({ ...b, ...map.get(b.id) }))
}

export const getBook = async id => persist ? tx('books', 'readonly', s => s('books').get(id)) : mem.books.get(id)
export const getFile = async id => persist ? tx('files', 'readonly', s => s('files').get(id)) : mem.files.get(id)
export const getProgress = async id => persist ? tx('progress', 'readonly', s => s('progress').get(id)) : mem.progress.get(id)
// progress: { id, cfi, fraction, chapter, openedAt }
export const saveProgress = async progress => persist
    ? tx('progress', 'readwrite', s => s('progress').put(progress))
    : mem.progress.set(progress.id, progress)

export const addBook = async (book, file) => {
    if (!persist) {
        mem.books.set(book.id, book)
        mem.files.set(book.id, file)
        return
    }
    return tx(['books', 'files'], 'readwrite', s => {
        s('files').put(file, book.id)
        return s('books').put(book)
    })
}

export const deleteBook = async id => persist
    ? tx(STORES, 'readwrite', s => STORES.forEach(name => s(name).delete(id)))
    : STORES.forEach(name => mem[name].delete(id))
