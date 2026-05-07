#!/bin/bash

# ============================================
# bodycomp-frontend 一键开发启动脚本
# 用途：自动检查环境 + 启动Vite开发服务器
# 使用：在项目根目录执行 ./start-dev.sh
# ============================================

PROJECT_DIR="/Users/wentaozhao/WorkBuddy/20260417225228/bodycomp-frontend"
PORT=5173

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  🚀 bodycomp-frontend 开发启动器${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 检查是否在正确目录（如果当前不在，自动切换）
if [ "$(pwd)" != "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  当前目录不对，自动切换到项目路径...${NC}"
    cd "$PROJECT_DIR" || {
        echo -e "${RED}❌ 错误：找不到项目目录 ${PROJECT_DIR}${NC}"
        echo "请确认路径是否正确，或联系 WorkBuddy 检查"
        exit 1
    }
fi
echo -e "${GREEN}✅ 项目目录正确：$(pwd)${NC}"

# 2. 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  依赖没装，正在执行 npm install...（可能需要几分钟）${NC}"
    npm install || {
        echo -e "${RED}❌ npm install 失败，请检查网络或 Node 环境${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 依赖已安装${NC}"
fi

# 3. 检查端口是否被占用
PID=$(lsof -ti :$PORT 2>/dev/null)
if [ -n "$PID" ]; then
    echo -e "${YELLOW}⚠️  端口 ${PORT} 已被占用（PID: ${PID}），正在关闭旧进程...${NC}"
    kill -9 "$PID" 2>/dev/null
    sleep 1
    echo -e "${GREEN}✅ 旧进程已清理${NC}"
else
    echo -e "${GREEN}✅ 端口 ${PORT} 可用${NC}"
fi

# 4. 提示用户清除浏览器缓存（Service Worker）
echo ""
echo -e "${YELLOW}💡 提示：如果页面显示异常，请在浏览器中按：${NC}"
echo -e "   ${YELLOW}F12 → Application → Service Workers → Unregister${NC}"
echo -e "   ${YELLOW}然后刷新页面（Cmd + Shift + R）${NC}"
echo ""

# 5. 启动开发服务器
echo -e "${BLUE}🚀 正在启动 Vite 开发服务器...${NC}"
echo -e "${GREEN}   启动后访问：http://localhost:${PORT}/${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

npm run dev

# 捕获退出信号
echo ""
echo -e "${BLUE}👋 开发服务器已停止${NC}"
