# MVP Plan — 3D Claude Office

## 要驗證的 5 件事

| # | 問題 | 怎麼判斷成功 |
| --- | --- | --- |
| 1 | 3D 辦公室有沒有「AI 公司正在運作」的感覺？ | 不看文字也能從畫面看出誰在忙、誰在開會、誰在回報 |
| 2 | Director → Manager → Employee 階層是否合理？ | Demo 任務拆解結果符合直覺，沒有任務跳層 |
| 3 | Agent 執行任務後，3D 世界能否同步？ | 每個 `AGENT_STATUS_CHANGED` 都對應到可見的位置 / 姿勢變化 |
| 4 | 績效、任務完成、Coins 是否有遊戲化感？ | 完成時有回饋（浮字、Toast、Dashboard 數字跳動） |
| 5 | Owner 能否只透過 Director 管理整間公司？ | 完整 Demo 只需要在 Director Chat 輸入一句話 |

## Phases

每個 Phase 結束時專案都必須可以執行（`npm run dev`）。

### Phase 1 — Project setup · 3D scene · Office layout · Static agents ✅

- [x] npm workspaces monorepo（`apps/web`、`packages/shared`）
- [x] Shared domain model：`Agent`、`Task`、9 位 Agent 的 org seed、home seats
- [x] React + Vite + React Three Fiber + drei + Zustand
- [x] 一層樓 penthouse office：Open Workspace、Director Office、2 個 Manager desk areas、Meeting Room、Lounge、Coffee Bar、Premium Bathroom、Reception + Elevator core
- [x] 窗外：漸層天空 + 太陽光暈、~1,700 棟 instanced 城市、海、兩層山脈、雲、霧氣
- [x] 9 位 Agent：stylized avatar、不同外觀、名牌（Name / Role / Status）
- [x] Camera：開場飛入、8 個預設視角、Orbit / Pan / Zoom、WASD
- [x] Org roster、Performance stats（`P`）
- [x] Asset abstraction（`AssetProvider` + procedural 實作）
- [x] 文件：README、architecture、agent-flow、mvp

### Phase 2 — Agent data · Click UI · Status UI ✅

- [x] 點擊 Agent（3D 或 Roster）→ 右側 Agent Panel（Name、Role、Department、Manager、Skills、Status、Current Task、Performance、Coins、Team）
- [x] Panel 按鈕：Reward +100 可用（Coins 動畫、`+100 Coins` 浮字、歡呼動作）；Chat / Assign Task / View Task 先停用，Phase 3 開放
- [x] Status 顏色與動畫一致化（名牌、Roster、Panel 共用）
- [x] 3D 狀態呈現（座位上）：Thinking 手托下巴、Working 打字 + 螢幕換內容、Blocked 抱頭 + 紅色警示光圈
- [x] Status preview：手動送出 `AGENT_STATUS_CHANGED`，預先檢查每種狀態
- [x] `OfficeEvent` 型別（shared）+ store `applyEvent`：所有狀態變化走同一個入口
- [x] 選取光圈、點空白處 / `Esc` 關閉
- [x] 額外：辦公室貓 Mochi（導航圖、走動 / 坐 / 午睡、跳上沙發、Pet、Follow 鏡頭）

### Phase 3 — Task engine · Director delegation · Mock Agent Provider ✅

- [x] `apps/server`（Fastify 5）+ Prisma 7 / SQLite + seed；重啟後接手未完成任務
- [x] Task Engine：狀態機（不合法轉換會拋錯）、父子任務、roll-up、依優先度設定 reward
- [x] Agent Runtime：Director（plan → kickoff meeting → 工作流 → 整合報告）、Manager（拆解 → 追蹤 → review → 回報）、Employee（準備 → 執行 → Blocked 重試 → 回報）
- [x] `LLMProvider` 介面 + `MockProvider`：Demo 題目有手寫完整內容，其他題目用通用模板，並模擬延遲
- [x] Director Chat Panel（左下）：嵌入即時 Project card、打字中動畫、Demo 題目建議
- [x] Agent Panel 的 Chat / Assign Task / View Task 開放；Task view；Project Completed 通知
- [x] 提前完成 Phase 4 的 Event Bus：server 事件管線 + SSE（重連補送、resync）→ 前端共用 `reduceEvent`
- [x] `npm test`：記憶體內以 40 倍速跑完整 Demo 並驗證委派順序、狀態序列、結果
- [x] 驗證過：完整 Demo 在瀏覽器中跑完（約 100 個事件）；在專案進行中 `kill -9` server 後重啟能接手完成

### Phase 4 — Movement ✅

- [x] ~~Event Bus（server）+ SSE → 前端 `applyEvent`~~（Phase 3 已完成）
- [x] Status → 目的地 / 姿勢對照（見 agent-flow.md §6）：會議室固定座位、主管桌前 / Director Office 訪客椅、Lounge / Coffee Bar / 窗邊
- [x] Shared world model（`packages/shared/src/world.ts`）：導航圖從 web 移到 shared，前端畫走路、runtime 算抵達時間用同一份資料
- [x] Waypoint 路徑 + lerp 走路動畫（起身 → 走 → 轉向 → 坐下 / 站定），中途改目的地會沿原路退回；不瞬移
- [x] Runtime 依抵達時間排程：kickoff meeting 等全員入座、回報等走到主管面前
- [x] Break：完成任務後、閒置時隨機去休息（Lounge 沙發、Coffee Bar 拿咖啡）
- [x] 名牌、Follow 鏡頭、點擊聚焦跟著即時位置；名牌改在渲染後投影，不再落後一幀
- [x] 測試：路徑不碰家具、影響時間軸的走路時間上限、座位不重複
- [x] ~~螢幕內容隨 status 變化（idle / code / docs / error）~~（Phase 2–3 已完成）

### Phase 5 — Performance · Coins · Dashboard ✅

- [x] 計分公式（50 + Quality + Speed + Difficulty + Review）與 performance 移動平均，放在 shared，server 與前端共用（`packages/shared/src/scoring.ts`，含測試）
- [x] Provider 回傳 `quality`；runtime 依實際耗時、priority、是否一次通過計分
- [x] 任務完成自動發 Coins（100 / 200 / 500），`✓ Score` 與 `+N Coins` 浮字疊在一起、Agent 歡呼；Reward +100 沿用
- [x] 上方 KPI 列 + Company Dashboard overlay：Active / Completed / Blocked Tasks、Average Performance、Total Coins Distributed、Active Agents、Leaderboard、Projects、Recent completions
- [x] Meeting Room 大螢幕顯示即時 Dashboard（canvas texture，數字變了才重畫）
- [x] Agent Panel 戰績、Task view 分數卡、Project Completed Toast 顯示發出的 Coins 與平均分數；Director 回報進度時也會提到
- [x] 分數、Coins、performance 寫入 SQLite，重啟後保留

### Phase 6 — Polish ✅

- [x] **Claude provider**（`LLM_PROVIDER=claude`）：每個 Agent 的思考都是一次 Claude API 呼叫，用 structured outputs 回傳計畫、子任務、結果與 quality；呼叫失敗或被拒時該步驟退回 Mock，憑證錯誤或連續失敗 3 次則整個 session 改用 Mock。以假 client 測試，不需要網路或 API key
- [ ] OpenAI provider：沒有做（產品主體是 Claude；介面不變，之後加一個實作即可）
- [x] **自動導播**（View bar 的 Auto，預設開啟）：開會切到會議室、Employee 回報切到主管桌、Blocked 切到該 Agent、Manager 回報切到 Director Office、專案完成切到會議室看板；閒置時巡視各區。自己動鏡頭就交還控制權
- [x] **後製，可開關**（`?` → Graphics）：High = 燈具光暈（bloom）、MSAA、暗角；Standard = 原本的 renderer。畫面持續卡頓時自動降到 Standard 一次（使用者自己選過 High 就不降）
  - AO（N8AO）試過後拿掉：它會抹掉 Agent 腳下的半透明接地陰影，效果比 AO 更差
- [x] **辦公室細節**：會議室玻璃上的即時 Task Board（To do / In progress / Review / Done 便利貼，完成的貼紙帶分數）；浴室洗手台的皂液瓶、毛巾托盤、擴香瓶

## Demo Flow ✅

1. 打開網頁 → 2. 進入 3D Office → 3. Camera 飛進辦公室 → 4. Director 在辦公室 → 5. Managers / Employees 在座位 → 6. 打開 Director Chat → 7. 輸入 "Analyze random write bottleneck." → 8. Director：「Project created.」→ 9. Dashboard 出現 Project → 10. Director 走去 Meeting Room → 11. Managers 進入 Meeting Room → 12. 任務拆解 → 13. Employees 回到座位 → 14. Thinking / Working → 15. 任務完成 → 16. Employees 向 Manager report → 17. Managers 向 Director report → 18. Director 回辦公室 → 19. Director 對 Owner 回報 → 20. Project Completed → 21. Coins distributed → 22. Performance updated → 23. 顯示「Project Completed」

進度：

- Phase 1 完成步驟 1–5。
- Phase 2 加上點擊 Agent 查看資料，以及狀態在 3D 中的呈現。
- Phase 3 完成步驟 6–9、12、14–17、19–20、23：對話、建立專案、拆解、執行、回報、Project Completed 通知。
- Phase 4 完成步驟 10–11、13、16–18 的 3D 部分：Director 與 Managers 走進會議室、會後走回座位、Employees 走到主管桌前回報、Managers 走進 Director Office 回報、Director 回到辦公桌。
- Phase 5 完成步驟 21–22：每個任務完成時發 Coins、更新 Performance；第 23 步的通知會附上總共發出的 Coins 與平均分數。整個 Demo Flow 23 步都已可執行。

## 不做（延後）

複雜招聘系統、多樓層、完整經濟系統、真正長時間自主 Agent、複雜記憶系統、Multiplayer、完整日夜循環、天氣、Full physics、高品質 humanoid 動畫、大型 procedural city、NFT / crypto。
