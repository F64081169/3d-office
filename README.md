# 3D Claude Office — AI Agent Company Simulator

> 「我不是在跟 9 個 AI 聊天，我是在管理一間有 9 個 AI 員工的公司。」

一個 Web-first 的 3D AI 公司模擬器 MVP。你是 **Owner**，只透過 **Director** 管理公司；Director 把工作拆給 **Managers**，Managers 再分派給 **Employees**。每位 Agent 的工作狀態會即時反映在 3D 辦公室裡：坐在電腦前、走去會議室、到主管桌前回報、去休息區。

![Overview](docs/images/overview.jpg)

## 目前進度

| Phase | 內容 | 狀態 |
| --- | --- | --- |
| 1 | Project setup · 3D scene · Office layout · Static agents | ✅ 完成 |
| 2 | Agent data · Click UI · Status UI（＋辦公室貓 Mochi） | ✅ 完成 |
| 3 | Task engine · Director delegation · Mock Agent Provider | ⏭️ 下一步 |
| 4 | Movement · Event system | 🔜 |
| 5 | Performance · Coins · Dashboard | 🔜 |
| 6 | Polish · Premium office · Lighting · Camera | 🔜 |

詳細清單見 [docs/mvp.md](docs/mvp.md)。

## Quick start

需要 Node.js ≥ 20.19（建議 22）。

```bash
npm install
```

```bash
npm run dev
```

打開 http://localhost:5173 。

其他指令：

```bash
npm run typecheck   # 全部 workspace 型別檢查
npm run build       # production build → apps/web/dist
npm run preview     # 預覽 production build
```

## 操作

| 操作 | 效果 |
| --- | --- |
| 左鍵拖曳 | 環繞視角 |
| 右鍵拖曳 | 平移 |
| 滾輪 | 縮放 |
| `W` `A` `S` `D` / 方向鍵 | 移動視角 |
| `Q` / `E` | 下降 / 上升 |
| 點擊 3D 中的 Agent，或左側 Roster | 鏡頭飛到該 Agent，右側打開 Agent Panel |
| 點擊 3D 中的貓 | 打開 Mochi 的資訊卡（Pet / Follow） |
| 點擊空白處 / `Esc` | 關閉 Panel、停止跟隨 |
| 滑過 Roster 的 Agent | 3D 中亮出該 Agent 的部門光圈 |
| 底部 View bar | Overview · Workspace · Director · Meeting Room · Lounge · Coffee Bar · Bathroom · City View |
| `P` | 效能統計（FPS / draw calls / triangles） |
| 右下 `?` | 顯示操作說明 |

開場會有一段鏡頭從城市上空飛進辦公室的動畫，點擊或拖曳可略過。

開發用：網址加上 `?nav`（例如 http://localhost:5173/?nav）會畫出走道導航圖（青色）與目的地支線（粉紅）。

## Phase 2 內容

![Agent panel](docs/images/agent-panel.jpg)

- **Agent Panel**（點擊任一 Agent）：Name、Role、Department / Level、Manager（可點擊跳過去）、Skills、Status、Current Task、Performance（進度條）、Coins（數字動畫）、Team（Manager 才有）。
- **按鈕**：
  - **Reward +100** 可直接使用：Coins 增加，3D 中浮出「+100 Coins」，Agent 舉手歡呼。
  - Chat、Assign Task、View Task 會在 Phase 3 有 Task Engine 後開放，目前顯示為停用並附說明。
- **Status UI**：Roster、Panel、3D 名牌共用同一套狀態色與動畫，3D 角色也會跟著狀態改變：

  | Status | 3D |
  | --- | --- |
  | Idle | 坐著放鬆、偶爾張望，螢幕待機桌布 |
  | Thinking | 手托下巴，螢幕切成文件 |
  | Working | 打字動畫，工程師螢幕顯示 code、研究員顯示文件 |
  | Blocked | 抱頭、地上紅色警示光圈閃爍、名牌變紅、螢幕顯示 BLOCKED |
  | Meeting / Reporting / Break | Phase 4 才會移動到會議室 / 主管桌 / 休息區；目前名牌與 Panel 會更新 |

- **Status preview**：Panel 底部可手動切換狀態，送出的是和 Phase 3 Task Engine 相同的 `AGENT_STATUS_CHANGED` 事件，用來先檢查每種狀態的樣子。
- **事件驅動的 store**：所有公司狀態變化都經過 `applyEvent(OfficeEvent)`。Phase 2 由前端自己 dispatch；Phase 3 改成接 server 的事件串流，UI 不用改。

| | |
| --- | --- |
| ![Blocked status](docs/images/status-blocked.jpg) | ![Mochi on the sofa](docs/images/cat-sofa.jpg) |

## 辦公室貓 Mochi 🐈

![Following Mochi](docs/images/cat-follow.jpg)

橘色虎斑貓，不在組織圖上，職稱是 Chief Morale Officer（薪水用零食支付）。

- 沿著走道導航圖自己走動，會去的地方：西側窗邊曬太陽、Lounge 沙發午睡（會跳上沙發）、北側窗邊看城市、Coffee Bar 討零食、接待區地毯，以及拜訪每位 Agent 的座位（會坐在旁邊看著他）。
- 點擊 Mochi 打開資訊卡，顯示目前在做什麼、在哪裡。
  - **Pet**：Mochi 會發出呼嚕聲、尾巴快速擺動。
  - **Follow**：鏡頭跟著 Mochi 走，期間仍可以旋轉與縮放；按 WASD、`Esc` 或選擇任一視角就會停止跟隨。
- 這套導航圖（`apps/web/src/world/navigation.ts`）也是 Phase 4 Agent 走動要用的基礎。

## Phase 1 內容

- **一層樓 penthouse office**（離地約 160m）：Open Workspace（兩個團隊 pod）、玻璃 Director Office、Meeting Room（11 席 + 大螢幕）、Lounge、Coffee Bar、Reception + 電梯核心（品牌背光牆）、Premium Bathroom。
- **Premium Bathroom**：石材牆面、深色石材地板、木質隔間（一間門半開）、懸浮大理石洗手台 + 3 個 vessel sink + 黃銅龍頭、大型鏡面（進入浴室時為真實反射）、背光鏡面光暈與檯下間接燈、智慧馬桶造型、毛巾架、植物。
- **窗外景觀**：落地窗、漸層天空與太陽光暈、約 1,700 棟 instanced 城市大樓、西側海面、北側兩層山脈、雲、大氣霧。全部 procedural，沒有下載任何 HDRI 或模型。
- **9 位 Agent**：Director 1、Managers 2、Employees 6。Stylized avatar 各有不同外觀，名牌顯示 Name / Role / Status，並依距離切換詳細程度。
- **Asset abstraction**：所有家具都透過 `AssetProvider` 取得，之後可換成 GLTF / Blender / AI 生成模型。

| | |
| --- | --- |
| ![Workspace](docs/images/workspace.jpg) | ![Director](docs/images/director.jpg) |
| ![Meeting room](docs/images/meeting-room.jpg) | ![Bathroom](docs/images/bathroom.jpg) |
| ![Coffee bar](docs/images/coffee-bar.jpg) | ![City view](docs/images/city-view.jpg) |

> 截圖由 headless Chromium（軟體 GL）產生，實際 GPU 上會更銳利。

## 組織

```
Owner (You)
└─ Aria · Director
   ├─ Marcus · Engineering Manager
   │  ├─ Alex  · Senior Engineer
   │  ├─ Priya · Backend Engineer
   │  └─ Kenji · Systems Engineer
   └─ Sofia · Research Manager
      ├─ Leo   · Research Scientist
      ├─ Mina  · Research Analyst
      └─ Omar  · QA Engineer
```

資料來源：[`packages/shared/src/org.ts`](packages/shared/src/org.ts)。

## Repository 結構

```
3d-office/
├─ apps/
│  ├─ web/                    ✅ React + Vite + React Three Fiber
│  │  └─ src/
│  │     ├─ world/            辦公室場景：layout、building、rooms、lighting、exterior、navigation、cat/
│  │     ├─ agents/           Avatar（狀態姿勢）、名牌與浮動特效投影、狀態色、外觀
│  │     ├─ assets/           AssetProvider、procedural 家具、材質、canvas textures
│  │     ├─ camera/           開場飛入、預設視角、Orbit + WASD
│  │     ├─ store/            Zustand store
│  │     └─ ui/               HUD（Roster、View bar、Agent / Cat Panel、Stats）
│  └─ server/                 🔜 Phase 3：Fastify API + Event stream
├─ packages/
│  ├─ shared/                 ✅ Agent / Task / OfficeEvent 型別、組織 seed、座位
│  ├─ agent-runtime/          🔜 Phase 3：Director / Manager / Employee 行為
│  ├─ task-engine/            🔜 Phase 3：任務狀態機、拆解、roll-up
│  └─ llm-provider/           🔜 Phase 3：Mock / Claude / OpenAI
├─ assets/                    之後放 GLTF / texture（目前全部 procedural）
├─ prisma/                    🔜 Phase 3：SQLite schema
└─ docs/
   ├─ architecture.md
   ├─ agent-flow.md
   └─ mvp.md
```

只有實際用到的資料夾才是 npm workspace（目前 `apps/web`、`packages/shared`）。其他資料夾只有 README，說明之後要放什麼，避免太早建立沒用到的抽象。

## Tech stack

| 層 | 技術 |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| 3D | three.js, React Three Fiber, @react-three/drei |
| State | Zustand |
| Backend（Phase 3） | Node.js, TypeScript, Fastify |
| Database（Phase 3） | SQLite + Prisma |
| AI（Phase 3） | Provider abstraction：Mock（預設）、Claude、OpenAI |

## 效能

目標：桌機 Chrome 約 60 FPS。Phase 1 全景約 620 draw calls / 310k triangles。主要手段：

- shadow map 只算一次後凍結（baked）
- 只有 1 個投影光源，其他用 Lightformer IBL
- 城市大樓、窗框、燈條、木格柵用 instancing
- 椅子、桌框、螢幕、植物、書櫃合併 geometry
- 天花板在俯瞰時自動隱藏
- 真鏡面反射只在進入浴室時開啟

詳見 [docs/architecture.md §3.5](docs/architecture.md)。

## Docs

- [Architecture](docs/architecture.md)：Frontend、Backend、Agent Runtime、Task Engine、Event Bus、Database、3D World、LLM Provider（含 Mermaid 圖）
- [Agent Flow](docs/agent-flow.md)：組織圖、任務拆解、時序圖、狀態機、Status → 3D 對照、計分公式
- [MVP Plan](docs/mvp.md)：驗證目標、各 Phase checklist、Demo flow、不做的項目
