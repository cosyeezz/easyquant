# EasyQuant 启动指南

## 快速启动

### 1. 安装依赖

```bash
# 后端依赖
pip install -r requirements.txt

# 前端依赖
cd client && npm install && cd ..
```

### 2. 配置数据库

创建 `.env` 文件：

```bash
# 内网数据库（推荐）
DATABASE_URL="postgresql+asyncpg://easyquant:easyquant20251123@192.168.3.15:5432/easyquant"

# 或远程数据库（通过 SSH 隧道）
# DATABASE_URL="postgresql+asyncpg://cosyee:Zz0.0.0.@quant.cosyee.cn:5432/cosyee_easyquant"
# SSH_USER=root
# SSH_PASSWORD=Zz0.0.0.
# SSH_HOST=quant.cosyee.cn
# SSH_PORT=22
```

### 3. 启动服务

```bash
python manage.py start
```

服务地址：
- 后端：http://localhost:8000
- 前端：http://localhost:3000
- API 文档：http://localhost:8000/docs

### 4. 停止服务

```bash
python manage.py stop
```

## 常见问题

### 数据库迁移版本不匹配

如果遇到 `Can't locate revision identified by 'xxx'` 错误：

```bash
# 清理迁移历史
PGPASSWORD=easyquant20251123 psql -h 192.168.3.15 -U easyquant -d easyquant -c "DELETE FROM alembic_version;"

# 重新启动
python manage.py start
```

### 前端依赖未安装

如果前端启动失败（`vite: command not found`），需要先安装前端依赖：

```bash
cd client && npm install && cd ..
python manage.py start
```

### 端口占用

查看端口占用情况：

```bash
lsof -i :8000 -i :3000
```

## 日志文件

- 后端日志：`logs/server_console.log`
- 前端日志：`logs/client.log`
- 错误日志：`logs/*.err.log`
