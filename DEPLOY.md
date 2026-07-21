# DataPilot 部署指南 - 学生云服务器

## 服务器购买（约 10 元/月）

### 腾讯云校园专区
1. 打开 https://cloud.tencent.com/act/campus
2. 完成学生认证（学信网）
3. 选择「轻量应用服务器」2核2G
4. 系统选择 **Ubuntu 22.04 64位**
5. 付款（支持微信/支付宝）

### 阿里云学生机（备选）
1. 打开 https://developer.aliyun.com/plan/student
2. 同样学生认证 → 2核2G → 约 10 元/月

买完后你会得到：
- 服务器公网 IP（如 `1.2.3.4`）
- SSH 用户名 root，初始密码

---

## 部署步骤（3 步搞定）

### 1. SSH 连接服务器

在 Windows 上按 `Win+R` 输入 `powershell`，然后：

```bash
ssh root@你的服务器IP
```

输入初始密码，然后设置新密码。

### 2. 上传项目（二选一）

#### 方式 A：Git（推荐，先把项目推到 GitHub）

```bash
# 在服务器上
git clone https://github.com/你的用户名/DataPilot.git ~/datapilot
cd ~/datapilot
```

#### 方式 B：SCP 上传

在本地 Windows PowerShell 执行：
```bash
scp -r "C:\Users\28056\Desktop\作品集\DataPilot - 智能数据分析助手\" root@你的IP:~/datapilot
# 注意：node_modules 和 dist 不传，太大了
```

### 3. 一键部署

```bash
cd ~/datapilot
chmod +x deploy.sh
./deploy.sh
```

脚本会自动完成：
- 安装 Python3 + Node.js
- 构建前端
- 安装 Python 依赖
- 配置 systemd 自动守护（崩溃自动重启）
- 启动服务

---

## 打开防火墙端口

部署后，需要在腾讯云控制台开放 8080 端口：

1. 登录腾讯云控制台 → 轻量应用服务器
2. 点你的服务器 → 防火墙
3. 添加规则：
   - 协议：TCP
   - 端口：8080
   - 来源：0.0.0.0/0

---

## 访问网址

```
http://你的服务器IP:8080
```

如果想用你的域名（datapilot.nihaofushiqi.asia），去 Cloudflare DNS 加一条 A 记录：
- 类型：A
- 名称：datapilot
- 地址：你的服务器IP

---

## 管理命令

```bash
# 查看服务状态
sudo systemctl status datapilot

# 重启服务
sudo systemctl restart datapilot

# 查看实时日志
sudo journalctl -u datapilot -f

# 停止服务
sudo systemctl stop datapilot
```

---

## 稳定性保障

- `Restart=always` + `RestartSec=5`：服务崩溃后 **5 秒自动重启**
- systemd 开机自启，**服务器重启也自动恢复**
- 不需要 cloudflared，不需要你电脑开机
- **24 小时在线，HR 随时能打开**
