import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dicts } from './locales.js'

const vars = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join()

test('每種語言都翻了同一批字串', () => {
    for (const [lang, d] of Object.entries(dicts))
        assert.deepEqual(Object.keys(d).sort(), Object.keys(dicts.en).sort(), lang)
})

test('譯文的插值 {x} 跟原文一樣', () => {
    for (const d of Object.values(dicts))
        for (const [k, v] of Object.entries(d)) assert.equal(vars(v), vars(k), v)
})

// i18n.js 的 keyOf 靠這個把畫面上任何語言的字串對回原文
test('同一個字串只對到一個原文 key', () => {
    const owner = new Map()
    for (const d of Object.values(dicts))
        for (const [k, v] of Object.entries(d)) for (const s of [k, v]) {
            assert.equal(owner.get(s) ?? k, k, s)
            owner.set(s, k)
        }
})
