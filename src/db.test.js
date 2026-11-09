import { test } from 'node:test'
import assert from 'node:assert/strict'
import { IDBFactory } from 'fake-indexeddb'

// db.js 的狀態（persist、記憶體裡的書）放在模組裡：換一份 IndexedDB、重新 import 一份 db.js 就是一個新分頁；
// 沿用同一份 IndexedDB 再 import 一次，就是重新整理
let n = 0
const load = idb => {
    globalThis.indexedDB = idb
    return import(`./db.js?${n++}`)
}

// 兩本書：關閉保存時檔案靠 getAllKeys/getAll 的順序對回書，只有一本測不出對錯
const books = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]
const files = { a: new Uint8Array([1]), b: new Uint8Array([2]) }
const progress = { id: 'a', cfi: 'epubcfi(/6/2)', fraction: 0.5 }

const fill = async db => {
    for (const b of books) await db.addBook(b, files[b.id])
    await db.saveProgress(progress)
}
const assertAll = async db => {
    assert.deepEqual(await db.getBooks(), [{ ...books[0], ...progress }, books[1]])
    assert.deepEqual(await db.getFile('a'), files.a)
    assert.deepEqual(await db.getFile('b'), files.b)
}
const assertEmpty = async db => {
    assert.deepEqual(await db.getBooks(), [])
    assert.equal(await db.getFile('a'), undefined)
    assert.equal(await db.getProgress('a'), undefined)
}

test('預設不保存：重新整理後書就沒了', async () => {
    const idb = new IDBFactory()
    let db = await load(idb)
    assert.equal(await db.init(false), false)
    await fill(db)
    await assertAll(db)

    db = await load(idb)
    await db.init(false)
    await assertEmpty(db)
})

test('開啟保存：這次開的書搬進 IndexedDB，重新整理後還在', async () => {
    const idb = new IDBFactory()
    let db = await load(idb)
    await db.init(false)
    await fill(db)
    await db.setPersist(true)
    await assertAll(db)

    db = await load(idb)
    await db.init(true)
    await assertAll(db)
})

test('關閉保存：書搬回記憶體，這個分頁還讀得到，IndexedDB 清空', async () => {
    const idb = new IDBFactory()
    let db = await load(idb)
    await db.init(true)
    await fill(db)
    await db.setPersist(false)
    await assertAll(db)

    db = await load(idb)
    await db.init(true)
    await assertEmpty(db)
})

test('還沒選過（從舊版升級）：IndexedDB 有書才繼續保存', async () => {
    const idb = new IDBFactory()
    let db = await load(idb)
    assert.equal(await db.init(undefined), false)
    await db.setPersist(true)
    await fill(db)

    db = await load(idb)
    assert.equal(await db.init(undefined), true)
    await assertAll(db)
})

test('IndexedDB 打不開（部分隱私模式）就當作沒有書，用記憶體', async () => {
    const db = await load({ open() { throw new DOMException('blocked', 'SecurityError') } })
    assert.equal(await db.init(undefined), false)
    await fill(db)
    await assertAll(db)
})

test('刪書：三個 store 都刪掉，另一本不受影響', async () => {
    for (const persist of [false, true]) {
        const db = await load(new IDBFactory())
        await db.init(persist)
        await fill(db)
        await db.deleteBook('a')
        assert.deepEqual(await db.getBooks(), [books[1]], `persist=${persist}`)
        assert.equal(await db.getFile('a'), undefined)
        assert.equal(await db.getProgress('a'), undefined)
        assert.deepEqual(await db.getFile('b'), files.b)
    }
})
