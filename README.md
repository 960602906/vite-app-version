# vite-app-version

面向 Vite SPA 的**发版检测**方案：构建期注入 `buildTime`，运行期拉取最新 `index.html` 对比版本，发现更新后回调通知（UI 由业务项目自行实现）。

适用于：用户长时间不刷新页面、后台发版后 chunk 变化、需要提示或自动刷新等场景。

---

## 特性

- **零 UI 耦合**：插件只负责检测，弹窗 / Notification / 静默刷新由 `onUpdate` 回调实现
- **构建期 + 运行期分离**：`appVersionCheck()` 注入版本信息，`startVersionWatch()` 启动监听
- **触发方式可配置**：切回标签页、窗口聚焦、网络恢复、首次延迟、定时轮询
- **配置合并**：`watch` 只写需要改的字段，其余走默认值
- **TypeScript 支持**：插件、client、虚拟模块均有类型

---

## 环境要求

| 依赖 | 版本 |
|------|------|
| `vite` | `^5.0.0` 或 `^6.0.0` |
| Node.js | 建议 18+ |

---

## 安装

```bash
# pnpm
pnpm add -D vite-app-version

# npm
npm i -D vite-app-version

# yarn
yarn add -D vite-app-version
```

> 安装为 **devDependency** 即可：Vite 插件在构建时使用；client 代码会随应用打包进产物。

---

## 工作原理

```
┌─────────────────────────────────────────────────────────────┐
│  vite build                                                  │
│  appVersionCheck() 注入：                                     │
│    · index.html  → <meta name="buildTime" content="...">    │
│    · define      → __APP_BUILD_TIME__                       │
│    · define      → __APP_VERSION_WATCH_CONFIG__             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  用户浏览器（旧页面未刷新）                                    │
│  JS 内持有旧的 __APP_BUILD_TIME__                            │
└─────────────────────────────────────────────────────────────┘
                              │
          触发检查（可见 / 聚焦 / 联网 / 延迟 / 轮询）
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  fetch /index.html?time=... → 解析 meta buildTime            │
│  与本地 __APP_BUILD_TIME__ 对比                               │
│  不一致 → 调用 onUpdate({ currentBuildTime, serverBuildTime })│
└─────────────────────────────────────────────────────────────┘
```

---

## 快速接入（3 步）

### 第 1 步：配置 Vite 插件

```ts
// vite.config.ts
import { defineConfig } from "vite"
import { appVersionCheck } from "vite-app-version"

export default defineConfig({
  plugins: [
    appVersionCheck()
    // 或按需调整，见下方「配置说明」
  ]
})
```

### 第 2 步：声明 TypeScript 全局变量

```ts
// src/vite-env.d.ts（或 env.d.ts）
/// <reference types="vite/client" />

declare global {
  /** 由 vite-app-version 在 production build 时注入 */
  const __APP_BUILD_TIME__: string
  const __APP_VERSION_WATCH_CONFIG__:
    | import("vite-app-version").ResolvedVersionWatchTriggers
    | undefined
}

export {}
```

若使用虚拟模块，额外添加：

```ts
/// <reference types="vite-app-version/virtual" />
```

### 第 3 步：应用入口启动监听

在 `main.tsx` 或独立模块中调用（**必须在浏览器环境执行**）：

```ts
// src/setup-version-check.ts
import { startVersionWatch } from "vite-app-version/client"

export function setupVersionCheck() {
  // 开发环境跳过；buildTime 为空时也跳过
  if (!import.meta.env.PROD || !__APP_BUILD_TIME__) {
    return
  }

  startVersionWatch({
    enabled: true,
    currentBuildTime: __APP_BUILD_TIME__,
    onUpdate: ({ currentBuildTime, serverBuildTime }) => {
      console.log("发现新版本", { currentBuildTime, serverBuildTime })
      window.location.reload()
    }
  })
}
```

```ts
// main.tsx
import { setupVersionCheck } from "./setup-version-check"

setupVersionCheck()
// ... createRoot().render(...)
```

---

## 完整示例

### 示例 A：Ant Design 强制刷新弹窗（带倒计时）

```tsx
// setup-version-check.tsx
import { Modal } from "antd"
import { startVersionWatch } from "vite-app-version/client"
import type { VersionUpdateInfo } from "vite-app-version/client"

const AUTO_RELOAD_SECONDS = 10

function showUpdateModal({ currentBuildTime, serverBuildTime }: VersionUpdateInfo) {
  let remaining = AUTO_RELOAD_SECONDS
  let reloaded = false

  const reload = () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  }

  const modal = Modal.info({
    title: "系统版本更新通知",
    content: `检测到新版本（${serverBuildTime}），请刷新页面。`,
    okText: `立即刷新 (${remaining}s)`,
    closable: false,
    maskClosable: false,
    keyboard: false,
    centered: true,
    onOk: reload
  })

  const timer = window.setInterval(() => {
    remaining -= 1
    if (remaining <= 0) {
      window.clearInterval(timer)
      reload()
      return
    }
    modal.update({ okText: `立即刷新 (${remaining}s)` })
  }, 1000)
}

export function setupVersionCheck() {
  if (!import.meta.env.PROD || !__APP_BUILD_TIME__) return

  startVersionWatch({
    enabled: true,
    currentBuildTime: __APP_BUILD_TIME__,
    onUpdate: showUpdateModal
  })
}
```

### 示例 B：使用虚拟模块（不用全局变量）

```ts
import { buildTime } from "virtual:app-version"
import { startVersionWatch } from "vite-app-version/client"

startVersionWatch({
  enabled: import.meta.env.PROD,
  currentBuildTime: buildTime,
  onUpdate: () => window.location.reload()
})
```

### 示例 C：React Hook 封装

```ts
// hooks/useVersionCheck.ts
import { useEffectOnce } from "react-use"
import { setupVersionCheck } from "@/setup-version-check"

export function useVersionCheck() {
  useEffectOnce(() => {
    setupVersionCheck()
  })
}
```

```tsx
// App 根组件或 GlobalInitializer
import { useVersionCheck } from "@/hooks/useVersionCheck"

function GlobalInitializer({ children }) {
  useVersionCheck()
  return children
}
```

---

## 配置说明

### `appVersionCheck(options?)` — 构建期配置

所有**触发时机**在 `vite.config.ts` 配置，采用**合并策略**：只写需要修改的字段。

#### 默认 `watch` 配置

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `visibilityChange` | `true` | 页面从隐藏变为可见（切回标签页） |
| `focus` | `true` | 浏览器窗口获得焦点 |
| `online` | `true` | 网络从离线恢复 |
| `initialDelay` | `10000` | 启动后首次检查延迟（ms），`0` = 关闭 |
| `pollInterval` | `300000` | 定时轮询间隔（ms），`0` = 关闭 |

#### 只改轮询间隔（其余保持默认）

```ts
appVersionCheck({
  watch: {
    pollInterval: 60_000 // 1 分钟轮询一次
  }
})
```

#### 关闭轮询，仅依赖用户交互触发

```ts
appVersionCheck({
  watch: {
    pollInterval: 0
  }
})
```

#### 自定义 buildTime 格式（需与解析逻辑一致）

```ts
import dayjs from "dayjs"

appVersionCheck({
  formatBuildTime: () => dayjs().format("YYYY-MM-DD HH:mm:ss"),
  logBuildTime: true // 构建时在终端打印 buildTime，便于 CI 排查
})
```

#### 完整插件选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `metaName` | `string` | `"buildTime"` | 写入 `index.html` 的 meta 名 |
| `globalName` | `string` | `"__APP_BUILD_TIME__"` | buildTime 的 define 变量名 |
| `watchConfigGlobalName` | `string` | `"__APP_VERSION_WATCH_CONFIG__"` | watch 配置的 define 变量名 |
| `watch` | `VersionWatchTriggers` | 见上表 | 触发方式，与默认值合并 |
| `formatBuildTime` | `() => string` | `ISO 时间戳` | 自定义 buildTime 生成 |
| `productionOnly` | `boolean` | `true` | 仅 `vite build` 注入 define；`dev` 为空 |
| `logBuildTime` | `boolean` | `false` | 构建完成时打印 buildTime |

### `startVersionWatch(options)` — 运行期配置

| 选项 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `currentBuildTime` | `string` | 是 | 当前页面版本，传 `__APP_BUILD_TIME__` 或 `virtual:app-version` 的 `buildTime` |
| `onUpdate` | `(info) => void` | 是 | 发现新版本时的回调，**UI 在这里实现** |
| `enabled` | `boolean` | 否 | 是否启用，建议显式传 `import.meta.env.PROD` 或 `true` |
| `htmlPath` | `string` | 否 | 检查的 HTML 路径，默认 `{BASE_URL}index.html` |
| `metaName` | `string` | 否 | 与插件 `metaName` 保持一致，默认 `buildTime` |

#### `onUpdate` 回调参数

```ts
interface VersionUpdateInfo {
  currentBuildTime: string // 当前页面加载时的 buildTime
  serverBuildTime: string  // 服务端最新 index.html 中的 buildTime
}
```

> **注意**：`watch` 触发配置**不在** `startVersionWatch` 里设置，统一由 `appVersionCheck({ watch })` 注入到 `__APP_VERSION_WATCH_CONFIG__`。

---

## 子路径导出

| 导入路径 | 用途 | 运行环境 |
|----------|------|----------|
| `vite-app-version` | `appVersionCheck()` Vite 插件 | Node / Vite |
| `vite-app-version/client` | `startVersionWatch()` 等运行时 API | 浏览器 |
| `virtual:app-version` | `buildTime`、`watchTriggers` | 浏览器（需插件启用） |
| `vite-app-version/virtual` | 虚拟模块 TypeScript 类型 | 类型声明 |

### Client 额外 API

```ts
import {
  startVersionWatch,
  createVersionChecker,
  fetchHtmlBuildTime,
  manualCheck,           // VersionChecker 实例方法
  mergeWatchConfig,
  resolveWatchTriggers,
  DEFAULT_WATCH_TRIGGERS
} from "vite-app-version/client"
```

- `fetchHtmlBuildTime(htmlPath?, metaName?)` — 手动拉取并解析远端 buildTime
- `createVersionChecker(options)` — 获取单例 `VersionChecker`
- `checker.manualCheck()` — 手动触发一次检查

---

## 部署与 `base` 路径

若 `vite.config.ts` 配置了 `base`（如 `/order/`），client 默认会请求 `{BASE_URL}index.html`，一般无需额外配置。

特殊部署场景可手动指定：

```ts
startVersionWatch({
  currentBuildTime: __APP_BUILD_TIME__,
  htmlPath: "/order/index.html",
  onUpdate: (info) => { /* ... */ }
})
```

---

## 本地测试

版本检测**仅在生产构建环境**生效（`import.meta.env.PROD === true`），请使用 `build + preview` 测试，不要用 `vite dev`。

```bash
# 终端 1：第一次构建并预览
pnpm run build
pnpm run preview
```

1. 浏览器打开 preview 地址（默认 `http://localhost:4173`）
2. 登录或进入系统，**保持标签页不刷新**

```bash
# 终端 2：模拟发版（第二次构建）
pnpm run build
```

3. 回到浏览器，执行以下任一操作：
   - 切换到其他标签页再切回来（`visibilityChange`）
   - 点击浏览器窗口（`focus`）
   - 等待 10 秒（`initialDelay`）
   - 等待轮询间隔（默认 5 分钟 `pollInterval`）

4. 应触发 `onUpdate` 回调

### 验证构建注入是否成功

构建后检查 `dist/index.html`：

```html
<meta name="buildTime" content="2026-06-05T15:00:00.000Z">
```

在产物 JS 中搜索 buildTime 字符串，确认 `__APP_BUILD_TIME__` 已被内联。

---

## 常见问题

### 1. 开发环境（`vite dev`）为什么不触发？

`productionOnly` 默认为 `true`，开发时 `__APP_BUILD_TIME__` 为空字符串，`setupVersionCheck` 应主动跳过。这是预期行为。

### 2. `onUpdate` 为什么不执行？

排查清单：

- [ ] 是否使用 `pnpm run build` + `preview` / 正式环境，而非 `dev`
- [ ] `setupVersionCheck` 是否在 `main.tsx` 中被调用
- [ ] 是否显式传入 `currentBuildTime: __APP_BUILD_TIME__`
- [ ] 是否完成了**两次 build**（第二次 buildTime 才会与页面内旧值不同）
- [ ] preview 进程是否仍在运行并指向最新 `dist`
- [ ] 浏览器是否启用了强缓存（可用无痕模式重试）

### 3. 为什么不能在 `vite.config.ts` 里写 `onUpdate` 回调？

`vite.config.ts` 运行在 **Node**，`onUpdate` 运行在**浏览器**，无法直接传递函数。正确做法：插件负责注入版本信息，应用在 `startVersionWatch({ onUpdate })` 中实现 UI。

### 4. 与 chunk 加载失败自动刷新如何配合？

本插件解决「**主动提醒用户刷新**」。chunk 404 导致的动态 import 失败，建议项目内另行实现全局 `chunk-load-recovery`（监听 `vite:preloadError` / `unhandledrejection` 自动 reload）。两者互补，不冲突。

### 5. 发布到 npm 后 client 如何被正确打包？

`vite-app-version/client` 导出 **TypeScript 源码**，由使用方 Vite 在应用构建时编译并内联 `import.meta.env` / `define`。请确保：

- `enabled`、`currentBuildTime` 在**应用源码**中传入（不要依赖包内预构建 `dist/client.js` 的环境判断）
- 不要将 `watch` 写在 `startVersionWatch` 中（应写在 `appVersionCheck`）

---

## 发布到 npm（维护者）

```bash
cd packages/vite-app-version

# 运行测试与构建（prepublishOnly 会自动 build）
pnpm test
pnpm publish --access public
```

发布前检查：

- [ ] `package.json` 的 `version` 已递增
- [ ] `pnpm run build` 成功，`dist/` 产物完整
- [ ] `README.md` 与 API 一致
- [ ] 已登录 npm：`npm login`

---

## License

MIT
