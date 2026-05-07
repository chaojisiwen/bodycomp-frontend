# 🛡️ bodycomp-frontend 开发环境排障手册

> **一句话说明**：网站打不开？按这个清单从上到下查，90%的问题都能自己解决。

---

## 一、项目基本信息（务必记住）

| 项目 | 内容 |
|------|------|
| **正确路径** | `/Users/wentaozhao/WorkBuddy/20260417225228/bodycomp-frontend` |
| **启动命令** | `npm run dev`（或直接用 `./start-dev.sh` 一键脚本） |
| **访问地址** | `http://localhost:5173/` |
| **技术栈** | React 18 + TypeScript + Vite 5 + TailwindCSS |

---

## 二、常见故障速查表

### ❌ 问题1：cd 进入目录时报错 "No such file or directory"

**原因**：WorkBuddy 每次会话的文件夹名不一样（比如 `20260417225228` vs `20260503011508`），你记混了。

**解决**：
1. 打开 Finder → 按 `Cmd + Shift + G`
2. 输入 `~/WorkBuddy` 回车
3. 找到最新的那个长数字文件夹（日期最新的）
4. 点进去 → 找到 `bodycomp-frontend` 文件夹
5. 右键文件夹 → `新建位于文件夹位置的终端窗口`
6. 在终端里输入 `./start-dev.sh` 回车

**预防**：直接用这个一键脚本，它会自动找路，不用你记路径。

---

### ❌ 问题2：网站打开是空白页 / 显示旧版本 / 一直转圈

**原因**：Service Worker（浏览器里的"小缓存管家"）把旧页面缓存了，没更新。

**解决**：
1. 在浏览器里按 `F12`（或右键 → 检查）
2. 顶部 tab 切换到 `Application`（中文可能是"应用"）
3. 左侧找到 `Service Workers`
4. 中间找到你的网址，点 **`Unregister`**（取消注册）
5. 关闭开发者工具
6. 按 `Cmd + Shift + R` 强制刷新页面

**预防**：以后每次有重大更新，都先 Unregister 再刷新。

---

### ❌ 问题3：`npm run dev` 提示 "port 5173 is already in use"

**原因**：上次的开发服务器没关干净，端口被占着。

**解决**：
1. 在终端里按 `Ctrl + C` 停掉当前进程
2. 执行命令：`lsof -ti :5173 | xargs kill -9`
3. 重新运行 `./start-dev.sh`

**预防**：一键启动脚本里已经自动处理了这个问题。

---

### ❌ 问题4：`npm run dev` 提示找不到命令 / module not found

**原因**：`node_modules` 文件夹没了（依赖没装）。

**解决**：
1. 确保在项目根目录
2. 执行：`npm install`
3. 等进度条跑完（可能需要 1-3 分钟）
4. 再运行 `./start-dev.sh`

**预防**：一键启动脚本会自动检查，没有就自动装。

---

### ❌ 问题5：终端能启动，但浏览器打不开 `localhost:5173`

**排查步骤**：
1. 终端里有没有显示 `Local: http://localhost:5173/`？
   - 没有 → 看上面的问题 3 和 4
   - 有 → 继续下一步
2. 浏览器地址栏输入的是不是 `http://localhost:5173/`？（注意是 http 不是 https）
3. 换个浏览器试试（Chrome / Safari / Edge）
4. 检查电脑防火墙/安全软件是否拦截了本地端口

---

## 三、标准启动流程（每次开发前执行）

```bash
# 方式一：一键启动（推荐）
./start-dev.sh

# 方式二：手动步骤
cd /Users/wentaozhao/WorkBuddy/20260417225228/bodycomp-frontend
npm run dev
```

启动成功后，浏览器访问：`http://localhost:5173/`

---

## 四、紧急联系 WorkBuddy 的 checklist

如果上面的方法都试过了还是不行，再找 WorkBuddy，并提供以下信息：

1. 你在终端里执行了什么命令？
2. 终端报错的完整文字是什么？（截图或复制粘贴）
3. 浏览器里显示什么？空白？报错？旧页面？
4. 你之前做了什么操作？（比如关机、更新代码、切换分支）

---

## 五、文件说明

| 文件 | 用途 |
|------|------|
| `start-dev.sh` | 一键启动脚本，自动检查环境并启动 |
| `DEV-GUIDE.md` | 本手册，排障速查 |
| `package.json` | 项目配置，里面有 `scripts` 定义 |

---

> 📝 最后更新：2026-05-03 | 如有新增问题，及时补充到此文档
