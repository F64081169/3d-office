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

### Phase 3 — Task engine · Director delegation · Mock Agent Provider

- [ ] `apps/server`（Fastify）+ Prisma / SQLite + seed
- [ ] Task Engine：狀態機、父子任務、roll-up
- [ ] Agent Runtime：Director / Manager / Employee 行為
- [ ] `LLMProvider` 介面 + `MockProvider`（依角色模板、延遲）
- [ ] Director Chat Panel（固定在畫面角落）

### Phase 4 — Movement · Event system

- [ ] Event Bus（server）+ WebSocket / SSE → 前端 `applyEvent`
- [ ] Status → 目的地 / 姿勢對照（見 agent-flow.md §6）
- [ ] Waypoint 路徑 + lerp 走路動畫（坐 ↔ 站 ↔ 走）：沿用 Phase 2 的 `navigation.ts`，補上會議室 / 主管桌 / 休息區的目的地
- [ ] 螢幕內容隨 status 變化（idle / code / docs）

### Phase 5 — Performance · Coins · Dashboard

- [ ] 計分公式與 performance 更新
- [ ] Coins 發放、`+N Coins` 浮字、Reward +100
- [ ] Company Dashboard overlay：Active / Completed / Blocked Tasks、Average Performance、Total Coins Distributed、Active Agents
- [ ] Meeting Room 大螢幕顯示即時 Dashboard

### Phase 6 — Polish

- [ ] 後製（AO / bloom，可開關）、更好的光影
- [ ] 浴室與高級感細節、更多道具
- [ ] Camera：會議時自動導播（跟隨模式已在 Phase 2 為貓實作，可直接用於 Agent）
- [ ] Claude / OpenAI provider

## Demo Flow（Phase 5 完成時）

1. 打開網頁 → 2. 進入 3D Office → 3. Camera 飛進辦公室 → 4. Director 在辦公室 → 5. Managers / Employees 在座位 → 6. 打開 Director Chat → 7. 輸入 "Analyze random write bottleneck." → 8. Director：「Project created.」→ 9. Dashboard 出現 Project → 10. Director 走去 Meeting Room → 11. Managers 進入 Meeting Room → 12. 任務拆解 → 13. Employees 回到座位 → 14. Thinking / Working → 15. 任務完成 → 16. Employees 向 Manager report → 17. Managers 向 Director report → 18. Director 回辦公室 → 19. Director 對 Owner 回報 → 20. Project Completed → 21. Coins distributed → 22. Performance updated → 23. 顯示「Project Completed」

Phase 1 已完成步驟 1–5。Phase 2 加上點擊 Agent 查看資料，以及狀態在 3D 中的呈現。

## 不做（延後）

複雜招聘系統、多樓層、完整經濟系統、真正長時間自主 Agent、複雜記憶系統、Multiplayer、完整日夜循環、天氣、Full physics、高品質 humanoid 動畫、大型 procedural city、NFT / crypto。
