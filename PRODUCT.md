# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
擁有者本人自用的電子書閱讀器。使用情境：桌機／筆電（白天）與手機／平板（觸控）。閱讀內容涵蓋中文橫排小說、中文／日文直排書、英文書、漫畫與圖文書。

## Product Purpose
在瀏覽器裡開本機 EPUB 檔閱讀，不需後端、不需帳號。書存在瀏覽器（IndexedDB），記住每本書的閱讀進度。成功的樣子：打開就回到上次讀到的地方，閱讀時只看到文字。

## Positioning
純前端、離線可用、對中文直排與 CJK 排版友善（foliate-js 原生支援直排與 RTL 翻頁方向）。

## Operating Context
- 書庫：匯入（按鈕或拖曳）、瀏覽、刪除書籍，依最近閱讀排序。
- 閱讀器：目錄、翻頁（按鈕／方向鍵／觸控滑動）、進度條、排版設定（字級、行距、字體、主題、直／橫排、分頁／捲動）。
- 設定為全域、存在 localStorage。

## Capabilities and Constraints
- Vanilla JS + Vite，渲染交給 foliate-js（`<foliate-view>`，書本內容在 iframe 裡）。
- 書本 iframe 必須 `allow-scripts allow-same-origin`，因此 index.html 的 CSP（`script-src 'self'`）不可移除。
- 點擊書本內容發生在 iframe 內，不會觸發父頁面的 popover light dismiss。
- 尚未實作：書籤、劃線筆記、全文搜尋。

## Evidence on Hand
沒有品牌資產、Logo 或文案；書封來自使用者匯入的 EPUB，可能缺封面。

## Product Principles
1. 閱讀時文字優先：介面在閱讀時退場，需要時才出現。
2. 書庫要有「收藏書」的溫度，不能像後台或檔案列表。
3. CJK 直排是一等公民，不是附加選項。
4. 桌機與觸控裝置都要順手。
