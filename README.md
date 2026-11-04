# shiori-reader

[![English](https://img.shields.io/badge/lang-English-c63d22)](README.md) [![繁體中文](https://img.shields.io/badge/lang-%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87-5f5f64)](README.zh-TW.md)

A browser-only EPUB reader with first-class CJK vertical text. No server, no account, and nothing is uploaded.

Demo: https://shiori.josh-hsu.com

![The library: books stand on a shelf with an obi band showing reading progress](docs/screenshot.png)

## Features

- Import: click **Add books** or drop ebook files (EPUB, MOBI, AZW3, FB2, CBZ) onto the window, several at a time
- An empty shelf offers public-domain sample books in one click
- The library is sorted by what you read last, and a book opens where you left off
- Turning pages: buttons, arrow keys, Space / Page Down, tapping the left or right side, swiping
- Typography: size, line spacing, font (original / serif / sans), theme (paper / sepia / night), vertical or horizontal writing, paged or scrolled
- Table of contents
- Interface in English, Traditional Chinese, Simplified Chinese or Japanese. It follows your browser language; change it in Settings on the library page, or add `?lang=en` / `?lang=zh-Hant` / `?lang=zh-Hans` / `?lang=ja` to the URL
- Works offline after the first visit

Not yet supported: bookmarks, highlights and notes, full-text search.

Requires a browser with the Popover API (Chrome 114, Safari 17, Firefox 125 or later).

## Privacy and storage

By default, books stay in the current tab only. They are held in memory, never uploaded, and gone once you close the tab.

To keep your shelf, open **Settings** on the library page and set **Keep books** to **On this device**. You'll be asked to confirm; after that, books and reading progress are stored in the browser's IndexedDB on this device. Switching back to **This tab only** removes them from the device (also after a confirmation). Clearing the site's data clears the shelf too.

Settings such as theme, typography and language are stored in localStorage.

## Keyboard

| Key | Action |
| --- | --- |
| ← / → | Turn the page left / right |
| Space, Page Down | Next page |
| Shift + Space, Page Up | Previous page |
| Esc | Show or hide the toolbar |
| Tab | Brings the toolbar back when it's hidden |

The browser's back button and the mobile back gesture return to the library.

## Accessibility

- All controls can be reached and used with a keyboard, with a visible focus ring
- Screen readers get labelled buttons, reading progress as a percentage, status messages for imports and errors, and book titles marked with the book's own language
- The first theme follows your system's light or dark mode; reduced-motion and Windows High Contrast settings are respected

Found a barrier? Please open an issue.

## Development

Requires Node 22 (see `.nvmrc`).

```sh
npm install
npm run dev
```

`npm run build` writes plain static files to `dist/`, which any static host can serve.

## License

[MIT](LICENSE)

The rendering engine is [foliate-js](https://github.com/johnfactotum/foliate-js) (MIT), which bundles [zip.js](https://github.com/gildas-lormeau/zip.js) (BSD-3-Clause) and [fflate](https://github.com/101arrowz/fflate) (MIT).

The sample books (`public/samples/`) are in the public domain:

- Lu Xun, *Nahan* (吶喊): text from [Wikisource](https://zh.wikisource.org/wiki/吶喊) (based on the 1948 *Complete Works of Lu Xun*), typeset as a vertical EPUB by this project
- Arthur Conan Doyle, *The Adventures of Sherlock Holmes*: produced by [Standard Ebooks](https://standardebooks.org/ebooks/arthur-conan-doyle/the-adventures-of-sherlock-holmes), CC0
