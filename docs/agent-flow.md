# Agent Flow — Director → Manager → Employee

> Phase 1 已建立組織與 3D 座位；本文件定義 Phase 3–5 要實作的任務流程與狀態同步規則。

## 1. 組織圖

```mermaid
graph TD
  O["👤 Owner (You)"] --> D["Aria · Director"]
  D --> EM["Marcus · Engineering Manager"]
  D --> RM["Sofia · Research Manager"]
  EM --> A["Alex · Senior Engineer"]
  EM --> B["Priya · Backend Engineer"]
  EM --> C["Kenji · Systems Engineer"]
  RM --> RA["Leo · Research Scientist"]
  RM --> RB["Mina · Research Analyst"]
  RM --> QA["Omar · QA Engineer"]

  classDef exec fill:#f6ecd2,stroke:#c9a24d,color:#1d232b
  classDef eng fill:#dcecf7,stroke:#3b9fd8,color:#1d232b
  classDef res fill:#fae6d4,stroke:#e08a3c,color:#1d232b
  class D exec
  class EM,A,B,C eng
  class RM,RA,RB,QA res
```

規則：

- **Owner 只跟 Director 對話。** 其他 Agent 只能被點擊查看、手動 Reward 或直接指派（進階操作）。
- 任務只能「往下一層」指派；結果只能「往上一層」回報。

## 2. 任務往下、結果往上

```mermaid
flowchart TD
  O([Owner]) -->|高階任務| D[Director]
  D -->|1 解析需求<br/>2 建立 Project<br/>3 拆解工作| D
  D -->|4 指派| M1[Engineering Manager]
  D -->|4 指派| M2[Research Manager]
  M1 -->|拆成 subtasks| E1[Engineers ×3]
  M2 -->|拆成 subtasks| E2[Researchers ×2 + QA]
  E1 -->|Employee Result| R1{Manager Review}
  E2 -->|Employee Result| R2{Manager Review}
  R1 -->|Manager Report| DR{Director Review}
  R2 -->|Manager Report| DR
  DR -->|整合報告| O
  DR -.->|Project Completed<br/>計分 + 發幣| S[(Performance / Coins)]
```

## 3. Demo 任務拆解

Owner 對 Director 說：

> "Analyze random write performance bottleneck and propose improvements."

| 層級 | 任務 | 指派給 | Priority / Reward |
| --- | --- | --- | --- |
| Project | Random write performance investigation | Aria (Director) | critical / 500 |
| Engineering Task | Analyze current write path and identify bottlenecks. | Marcus | high / 200 |
| ↳ subtask | Profile the write path end-to-end (flame graph, syscall trace). | Alex | medium / 100 |
| ↳ subtask | Inspect lock contention, buffering and cache behaviour. | Priya | medium / 100 |
| ↳ subtask | Examine fsync, page cache and I/O scheduler effects. | Kenji | medium / 100 |
| Research Task | Research possible optimization strategies. | Sofia | high / 200 |
| ↳ subtask | Survey log-structured / LSM techniques and write batching. | Leo | medium / 100 |
| ↳ subtask | Collect benchmark data and industry comparisons. | Mina | medium / 100 |
| QA Task | Design validation and benchmark plan. | Sofia → Omar | high / 200 |
| ↳ subtask | Write the fio benchmark matrix and regression criteria. | Omar | medium / 100 |

（QA Agent 隸屬 Research Manager，所以 QA Task 由 Sofia 轉派給 Omar。）

## 4. 完整時序（含事件與 3D 行為）

```mermaid
sequenceDiagram
  autonumber
  actor Owner
  participant D as Director (Aria)
  participant EM as Eng Manager (Marcus)
  participant RM as Research Manager (Sofia)
  participant E as Employees
  participant UI as 3D World / HUD

  Owner->>D: "Analyze random write bottleneck."
  D-->>Owner: "Understood. I am creating a project and assigning work."
  Note over D: TASK_CREATED (project)<br/>AGENT_STATUS_CHANGED director → thinking
  D->>UI: Dashboard 出現 Project

  D->>D: split → 3 tasks
  Note over D,RM: AGENT_STATUS_CHANGED → meeting (Director + Managers)
  D->>UI: Director 與 Managers 走進 Meeting Room
  D->>EM: TASK_ASSIGNED Engineering Task
  D->>RM: TASK_ASSIGNED Research Task + QA Task
  Note over EM,RM: Managers 回到座位 (meeting → thinking)

  EM->>E: TASK_ASSIGNED ×3 subtasks
  RM->>E: TASK_ASSIGNED ×3 subtasks
  E->>UI: thinking（座位上思考）→ TASK_STARTED → working（打字、螢幕亮 code）
  E-->>E: provider.runAgent(execute)
  E->>UI: TASK_COMPLETED + AGENT_REWARDED (+100 Coins 浮字)
  E->>EM: reporting（走到 Marcus 桌前）
  E->>RM: reporting（走到 Sofia 桌前）
  Note over E: 回報完 → idle，走回座位

  EM->>EM: review + roll-up
  RM->>RM: review + roll-up
  EM->>D: reporting（走到 Director Office）
  RM->>D: reporting（走到 Director Office）
  D->>D: review + integrate
  D->>UI: Director 回辦公室，狀態 reporting
  D-->>Owner: Consolidated report（Director Chat）
  Note over D,UI: PROJECT_COMPLETED → Coins distributed → Performance updated
  UI-->>Owner: Toast「Project Completed」
```

## 5. 狀態機

### Employee

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> thinking: TASK_ASSIGNED
  thinking --> working: plan ready (TASK_STARTED)
  working --> blocked: provider error / timeout
  blocked --> working: retry
  working --> reporting: result ready (TASK_COMPLETED)
  reporting --> idle: manager acknowledged
  idle --> break: idle long enough (optional)
  break --> idle
```

### Manager

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> meeting: Director kickoff
  meeting --> thinking: TASK_ASSIGNED
  thinking --> working: subtasks assigned
  working --> working: tracking (wait for all subtasks)
  working --> reporting: all subtasks reviewed
  reporting --> idle: Director acknowledged
```

### Director

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> thinking: Owner message
  thinking --> meeting: project created + split
  meeting --> working: tasks assigned (waiting for managers)
  working --> thinking: all manager reports in (review + integrate)
  thinking --> reporting: report to Owner
  reporting --> idle: PROJECT_COMPLETED
```

## 6. Status → 3D 對照

| Status | 3D 目的地 | 姿勢 | 名牌 |
| --- | --- | --- | --- |
| `idle` | 自己座位 | 坐著放鬆 | ⚪ Idle |
| `thinking` | 自己座位 | 坐著、手托下巴 | 🟣 Thinking |
| `working` | 自己座位 | 打字，螢幕切換 | 🟢 Working |
| `meeting` | Meeting Room 座位 | 走過去入座 | 🔵 Meeting |
| `reporting` | 主管桌前 | 走過去站著 | 🟡 Reporting |
| `break` | Lounge / Coffee Bar | 走過去 | 🟠 Break |
| `blocked` | 原地 | 紅色光圈 | 🔴 Blocked |

座位資料：`HOME_SEATS`（`packages/shared/src/org.ts`）、`MEETING_SEATS`（`apps/web/src/world/layout.ts`）。

實作進度：

- ✅ Phase 2：座位上的部分已完成，包括 idle / thinking / working / blocked 的姿勢、螢幕內容、名牌與警示光圈。可從 Agent Panel 的 Status preview 手動觸發。
- 🔜 Phase 4：需要移動的部分（meeting / reporting / break），沿用 `world/navigation.ts` 的導航圖。

## 7. 績效與 Coins

每個 Task 完成時計分（0–100）：

```
score = 50 (Base)
      + Quality    0–20   ← provider 回傳的 quality，或 Manager review
      + Speed      0–10   ← 實際耗時 vs 預估
      + Difficulty 0–10   ← priority：low 2 / medium 5 / high 8 / critical 10
      + Review     0–10   ← 上一層 review 是否一次通過
```

Agent performance 以移動平均更新，限制在 0–100：

```
performance = clamp(round(performance × 0.8 + score × 0.2), 0, 100)
```

Coins：

| Task 類型 | Reward |
| --- | --- |
| Normal（low / medium） | 100 |
| Hard（high） | 200 |
| Critical | 500 |

- 任務完成即發放 `task.reward` 給執行者，事件 `AGENT_REWARDED`，3D 顯示 `+N Coins`。
- Owner 可在 Agent panel 按 **Reward +100**（同樣走 `AGENT_REWARDED`）。
