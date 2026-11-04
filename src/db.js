// books: 書目資訊與封面；files: 原始 EPUB；progress: 閱讀進度（分開存，翻頁時才不會重寫大檔）
const dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open('epub-reader', 1)
    req.onupgradeneeded = () => {
        req.result.createObjectStore('books', { keyPath: 'id' })
        req.result.createObjectStore('files')
        req.result.createObjectStore('progress', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
})

// 請瀏覽器不要在空間不足時清掉書庫
navigator.storage?.persist?.()

const tx = async (stores, mode, fn) => {
    const db = await dbp
    return new Promise((resolve, reject) => {
        const t = db.transaction(stores, mode)
        const req = fn(store => t.objectStore(store))
        t.oncomplete = () => resolve(req?.result)
        t.onerror = t.onabort = () => reject(t.error)
    })
}

export const getBooks = async () => {
    const [books, progress] = await Promise.all([
        tx('books', 'readonly', s => s('books').getAll()),
        tx('progress', 'readonly', s => s('progress').getAll()),
    ])
    const map = new Map(progress.map(p => [p.id, p]))
    return books.map(b => ({ ...b, ...map.get(b.id) }))
}

export const getBook = id => tx('books', 'readonly', s => s('books').get(id))
export const getFile = id => tx('files', 'readonly', s => s('files').get(id))
export const getProgress = id => tx('progress', 'readonly', s => s('progress').get(id))
// progress: { id, cfi, fraction, openedAt }
export const saveProgress = progress => tx('progress', 'readwrite', s => s('progress').put(progress))

export const addBook = (book, file) => tx(['books', 'files'], 'readwrite', s => {
    s('files').put(file, book.id)
    return s('books').put(book)
})

export const deleteBook = id => tx(['books', 'files', 'progress'], 'readwrite', s => {
    s('books').delete(id)
    s('files').delete(id)
    s('progress').delete(id)
})
