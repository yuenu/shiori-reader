---
name: 書架（EPUB 閱讀器）
description: 文庫本與栞——書站在層板上、繫著書腰，正在讀的那本垂著一條朱色書籤帶。
colors:
  ground: "#f4f4f2"
  paper: "#ffffff"
  ink: "#1c1c1e"
  ink-2: "#5f5f64"
  line: "#e2e2de"
  shelf: "#d8d4cc"
  shu: "#c63d22"
  shu-ink: "#ffffff"
  obi-paper: "#fbfaf7"
  slip: "#f8f6f1"
  sepia-ground: "#ebe1ca"
  sepia-paper: "#f4ecd8"
  sepia-ink: "#4a3a2a"
  sepia-shu: "#ad3c1c"
  night-ground: "#131313"
  night-paper: "#1b1b1b"
  night-ink: "#e4e2de"
  night-shu: "#e8664a"
  cloth-navy: "#24384f"
  cloth-brick: "#7b2f2a"
  cloth-pine: "#2f5a4e"
  cloth-wisteria: "#55467a"
  cloth-ochre: "#8a6326"
  cloth-charcoal: "#3b3b3d"
  cloth-teal: "#1f5f74"
typography:
  shelf-heading:
    fontFamily: "Songti TC, Noto Serif TC, Source Han Serif TC, serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.04em"
  feature-title:
    fontFamily: "Songti TC, Noto Serif TC, Source Han Serif TC, serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.35
  book-title:
    fontFamily: "Songti TC, Noto Serif TC, Source Han Serif TC, serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "system-ui, -apple-system, PingFang TC, Noto Sans TC, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "system-ui, -apple-system, PingFang TC, Noto Sans TC, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  obi:
    fontFamily: "system-ui, -apple-system, PingFang TC, Noto Sans TC, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.1em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  sheet: "16px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  shelf-gap: "28px"
  lg: "36px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.shu}"
    textColor: "{colors.shu-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "40px"
  icon-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    size: "40px"
  segmented:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.md}"
    padding: "3px"
  segmented-option-checked:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "34px"
  obi-new:
    backgroundColor: "{colors.obi-paper}"
    textColor: "{colors.ink}"
    typography: "{typography.obi}"
  obi-reading:
    backgroundColor: "{colors.shu}"
    textColor: "{colors.shu-ink}"
    typography: "{typography.obi}"
  obi-done:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    typography: "{typography.obi}"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

# Design System: 書架（EPUB 閱讀器）

## Overview

文庫本與栞。書庫是一面書架：每本書以文庫本比例（105:148）站在帶陰影的層板上，下緣繫著書腰顯示讀到哪；正在讀的那本在「繼續閱讀」帶裡垂著一條朱色的栞。閱讀頁只剩文字，工具列在需要時才出現，頂端那條栞是收起狀態下唯一的入口。

這是 Read／Operate 介面：熟悉、可靠、不炫技。書的世界（書封、書腰、栞、層板）負責溫度，介面元件保持安靜，不把書庫做成後台的檔案列表。

## Colors

色彩策略：Restrained。中性底色＋一個朱色。

### Primary
- **朱（shu）**：只用在三個地方：栞、書腰的「閱讀中」狀態與進度條、主要動作按鈕。夜讀時換成較亮的 `night-shu`，按鈕字改深色。

### Neutral
- **ground**：書架地，中性淺灰（不是米色紙）。
- **paper**：閱讀面、面板、「繼續閱讀」帶。
- **ink / ink-2**：主文字與次要文字；ink-2 在 ground 上仍維持 4.5:1 以上。
- **line / shelf**：分隔線與層板。

### 布面色（cloth）
沒有封面的書，依書名雜湊從七個布面色挑一個，做成平面的文庫本封面。只用在自動產生的封面。

### Named Rules
- **一點朱**：朱色不當裝飾；畫面上出現朱色，就代表那是「你的進度」或「你可以按的主要動作」。
- **三種底色同一套 token**：白紙／書皮／夜讀切換的是整套 token（`[data-theme]`），書架與閱讀頁一起換，iframe 的 `color-scheme` 必須跟外層一致。

## Typography

書名用系統明體（Songti TC／Noto Serif TC），介面用系統黑體。比例收斂（1.15–1.2），以字重和明／黑對比分層，不靠超大字級。

### Hierarchy
- `shelf-heading`：頁面標題「書架」。
- `feature-title`：繼續閱讀的書名，手機縮到 19px。
- `book-title`：書架上的書名，最多兩行。
- `body`／`label`：介面內文與欄位標籤。
- `obi`：書腰文字，加寬字距、等寬數字。

### Named Rules
- **書名用明體，按鈕用黑體**：明體只給書的名字和面板標題，任何控制項都不用明體。
- **數字等寬**：百分比、書數一律 `font-variant-numeric: tabular-nums`。

## Layout

- 書架內容寬度上限 1120px，左右 24px（手機 16px）。
- 書架是 `auto-fill` 網格：桌機欄寬至少 128px、欄距 28px；手機至少 92px、欄距 18px。層板是每格往左右各延伸半個欄距的條帶，相鄰的接成一整條。
- 「繼續閱讀」是滿版的紙色帶（上下細線），不是卡片。
- 閱讀頁：書本內容全螢幕，上 56px／下 64px 的工具列疊在 foliate 的 64px 邊界上，收起時文字不移動。
- 斷點：640px。窄螢幕時排版設定變成底部抽屜。

## Elevation & Depth

深度只來自「書是實體物件」：書封投影、層板投影、浮出的面板。都帶位移與柔和模糊，沒有零位移的光暈。

### Shadow Vocabulary
- 書封：`0 1px 2px rgba(0,0,0,.14), 0 8px 16px -8px rgba(0,0,0,.35)`；滑過時書往上抽 8px，投影拉長。
- 層板：`0 8px 12px -6px` 的暖色陰影。
- 面板：`0 16px 48px -16px rgba(0,0,0,.35)`。

### Named Rules
- **不假造質感**：書封是平面印刷色，不用 CSS 漸層模擬布紋、折痕或浮雕。

## Shapes

- 書封：`1px 3px 3px 1px`，書背那側幾乎直角。
- 按鈕與分段選項：6px；圖示按鈕與分段容器：8px；面板：12px；手機抽屜上緣：16px。
- 栞：14px 寬的帶子，下端是燕尾缺口（clip-path）。這是本系統唯一的裝飾形狀，也用在目次的「目前章節」標記。

## Components

### Buttons
- 主要按鈕：朱底白字、40px 高、6px 圓角、字重 600，hover 加深 14%，按下時下移 1px。
- 圖示按鈕：40px 方形、透明底，hover 淡墨底。圖示是 24px 格、1.75 線寬的描邊 SVG（`#i-*` sprite），不用 Unicode 字元代替。

### Inputs / Fields
- 排版設定一律用分段選項（radio），讓所有選擇攤開可見，不藏在下拉選單裡。選中的那格浮起成紙色。
- 字級用步進器（A − 100% + A）。
- 底色選項直接用各自的底色和字色當色票。

### Navigation
- 閱讀頁：點畫面左右三成翻頁，點中間叫出／收起工具列；方向鍵翻頁；翻頁時工具列自動收起。
- 目次是從左側滑入的抽屜，打開時有遮罩；點遮罩、按 Esc、按 ✕ 或選章節都會關閉。

### 書腰（Signature）
貼在書封下緣 17% 的帶子：「未讀」米白、「讀到 N%」朱色、「讀完」墨黑。這是書架上唯一的進度表示，不再另外放百分比徽章。

### 栞（Signature）
- 「繼續閱讀」的書封後面垂一條栞，滑過時會輕輕擺動（整個介面唯一的編排動畫）。
- 閱讀頁頂端也有一條栞：工具列收起時垂下，點它開目次；工具列出現時它收進去。

## Do's and Don'ts

### Do:
- 讓閱讀頁回到只剩文字的狀態，工具列在需要時才出現。
- 新增的狀態或標記沿用書的語彙（書腰、栞、層板），朱色只標記進度與主要動作。
- 蓋在書本 iframe 上的浮層，要有一層真正的遮罩元素接住點擊（popover 的 `::backdrop` 擋不住點擊，會穿進 iframe）。

### Don't:
- 不要把書庫做成檔案列表或卡片網格，不要在書封外再加百分比徽章或圓環。
- 不要用 CSS 假造紙紋、布紋、木紋。
- 不要在標題上方放小字 kicker，也不要用 emoji 或 Unicode 字元充當圖示。
- 不要讓收起的工具列還能被 Tab 聚焦。
