#!/bin/bash
# =============================================
#  DataPilot 一键部署脚本
#  在 Ubuntu 22.04 服务器上运行：
#     chmod +x deploy.sh && ./deploy.sh
# =============================================
set -e

APP_DIR="$HOME/datapilot"
# ⚠️ 把下面改成你的 GitHub 仓库地址（先 git push 到 GitHub）
#     或者不克隆，手动 scp 上传项目到 ~/datapilot
REPO_URL="https://github.com/你的用户名/DataPilot.git"

echo "=============================================="
echo "  DataPilot - 服务器一键部署"
echo "=============================================="
echo ""

# ── 1. 安装系统依赖 ──────────────────────────────
echo "[1/6] 安装系统依赖..."
sudo apt-get update -qq
sudo apt-get install -y -qq python3 python3-pip python3-venv git curl nginx

# 检查 Node.js（需要 >= 18）
if ! command -v node &>/dev/null; then
    echo "安装 Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
fi
echo "Node.js: $(node -v), npm: $(npm -v)"
echo "Python: $(python3 --version)"

# ── 2. 克隆项目 ──────────────────────────────────
echo ""
echo "[2/6] 克隆项目..."
if [ -d "$APP_DIR" ]; then
    echo "项目目录已存在，执行 git pull..."
    cd "$APP_DIR"
    git pull
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# ── 3. 配置环境变量 ──────────────────────────────
echo ""
echo "[3/6] 配置环境变量..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "已创建 .env 文件，请编辑填入你的 API Key："
        echo "  nano $APP_DIR/.env"
        echo ""
        read -p "是否现在编辑？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            nano .env
        fi
    else
        cat > .env << 'ENVEOF'
LLM_API_KEY=请填入你的DeepSeek-API-Key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
PORT=8080
ENVEOF
        echo "已创建 .env 模板，请编辑填入你的 API Key：nano $APP_DIR/.env"
    fi
else
    echo ".env 已存在，跳过"
fi

# ── 4. 构建前端 ──────────────────────────────────
echo ""
echo "[4/6] 构建前端..."
npm install --silent
npm run build
echo "前端构建完成 → dist/"

# ── 5. 安装 Python 依赖 ──────────────────────────
echo ""
echo "[5/6] 安装 Python 依赖..."
python3 -m pip install --user -r requirements.txt --quiet
echo "Python 依赖安装完成"

# ── 6. 配置自动守护（systemd） ────────────────────
echo ""
echo "[6/6] 配置自动守护服务..."

# 先杀掉旧进程
sudo systemctl stop datapilot 2>/dev/null || true

# 创建 systemd 服务
sudo tee /etc/systemd/system/datapilot.service > /dev/null << SERVICEEOF
[Unit]
Description=DataPilot - 智能数据分析助手
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=python3 -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8080
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICEEOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable datapilot
sudo systemctl start datapilot

sleep 3

# 检查状态
if systemctl is-active --quiet datapilot; then
    echo ""
    echo "=============================================="
    echo "  ✅ 部署成功！"
    echo "=============================================="
    echo ""
    echo "  本地访问：http://localhost:8080"
    echo "  外网访问：http://$(curl -s ifconfig.me):8080"
    echo ""
    echo "  管理命令："
    echo "    sudo systemctl status datapilot  # 查看状态"
    echo "    sudo systemctl restart datapilot # 重启"
    echo "    sudo journalctl -u datapilot -f  # 查看日志"
    echo ""
    echo "  ⚠️ 请确保云服务器安全组开放了 8080 端口！"
    echo ""
else
    echo "⚠️ 服务启动失败，查看日志："
    sudo journalctl -u datapilot --no-pager -n 20
fi
