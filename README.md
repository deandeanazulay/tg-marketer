# TG Marketer - Telegram Mini App

A lightweight Telegram Mini App for managing marketing campaigns with a secure, self-hosted Docker stack and distributed worker system for multi-account message sending.

## Features

- **🚀 One-Command Deployment**: Complete Docker stack with automatic HTTPS
- **🔒 Secure by Default**: HMAC verification, encrypted SQLite, security headers
- **📊 Database Choice**: PostgreSQL with automated backups OR SQLite with Litestream
- **🌐 Automatic HTTPS**: Caddy reverse proxy with Let's Encrypt
- **📱 Mini App Native**: Runs inside Telegram using official WebApp SDK
- **🔄 Auto-Updates**: Optional Watchtower integration
- **⚡ Multi-Account Worker**: Distributed Python worker for mass sending via Telethon
- **📈 Rate Limiting**: Automatic hourly/daily limits with FloodWait handling
- **🔄 Health Monitoring**: Worker heartbeat and status tracking

## 🚀 One-Command Setup

### Prerequisites
- Docker and Docker Compose
- Domain name (for production) or localhost (for development)

### 1. Clone and Configure

```bash
git clone <repo>
cd tg-marketer

# Copy environment template
cp .env.example .env

# Edit .env with your Telegram bot token and other settings
nano .env
```

### 2. Choose Your Database & Start

**Option A: SQLite with Litestream backups (Recommended for small-medium apps)**
```bash
make up
```

**Option B: PostgreSQL with pgBackRest backups (Recommended for high-traffic apps)**
```bash
make up-pg
```

**Option C: With auto-updates enabled**
```bash
make up-watch
```

### 3. Access Your App

After startup, you'll see:
- **Web App**: https://app.localhost
- **API**: https://api.localhost  
- **MinIO Console** (SQLite mode): http://localhost:9001

## 🔧 Configuration

### Database Adapter Selection

The app now uses **database-driven configuration**. To change adapters:

1. **Connect to your database**
2. **Update the `app_config` table**:
   ```bash
   # For PostgreSQL
   UPDATE app_config SET config = jsonb_set(config, '{adapters,data}', '"postgres"') WHERE app = 'miniapp';
   
   # For SQLite  
   UPDATE app_config SET config = jsonb_set(config, '{adapters,data}', '"sqlite"') WHERE app = 'miniapp';
   
   # For Mock/Demo mode
   UPDATE app_config SET config = jsonb_set(config, '{adapters,data}', '"mock"') WHERE app = 'miniapp';
   ```

3. **Restart the API container**:
   ```bash
   docker compose restart api
   ```

### Production Deployment

1. **Update Caddyfile** with your real domains:
   ```caddyfile
   your-app.com {
       reverse_proxy web:80
       # ... rest of config
   }
   
   api.your-app.com {
       reverse_proxy api:3000
       # ... rest of config  
   }
   ```

2. **Set production environment variables**:
   ```bash
   # Strong passwords for production
   POSTGRES_PASSWORD=your_very_secure_password
   MINIO_ROOT_PASSWORD=another_secure_password
   TELEGRAM_BOT_TOKEN=your_real_bot_token
   ```

3. **Deploy**:
   ```bash
   make up-pg  # or make up for SQLite
   ```

## 🛠️ Management Commands

```bash
make help          # Show all available commands
make up            # Start with SQLite (default)
make up-pg         # Start with PostgreSQL  
make down          # Stop all services
make logs          # View all logs
make logs-api      # View API logs only
make health        # Check service health
make rebuild       # Rebuild and restart
make clean         # Remove everything (⚠️ destructive)

# Database operations
make backup-now    # Trigger immediate backup (PostgreSQL)
make restore-db    # Restore from backup (PostgreSQL)

# Development helpers
make dev-reset     # Reset development environment
make dev-shell-api # Open shell in API container
make dev-shell-db  # Open database shell
```

## 🔒 Security Features

- **🔐 SQLCipher Encryption**: SQLite databases are encrypted with AES-256
- **🛡️ Security Headers**: HSTS, CSP, COEP/COOP, XSS protection
- **🔑 Secret Management**: Docker secrets for sensitive data
- **🚫 No Client Secrets**: All tokens and keys stay server-side
- **✅ HMAC Verification**: Telegram initData verified with bot token
- **🔒 SCRAM-SHA-256**: PostgreSQL uses strong authentication

## 💾 Backup Strategies

### PostgreSQL Mode
- **pgBackRest**: Automated full backups (daily) + incremental (hourly)
- **Point-in-time recovery** capability
- **Backup retention**: 7 full, 4 differential, 3 incremental

### SQLite Mode  
- **Litestream**: Continuous replication to S3-compatible storage (MinIO)
- **Real-time sync**: Changes replicated every 10 seconds
- **Snapshot retention**: 72 hours of point-in-time recovery

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   Caddy Proxy   │────│  Web App     │    │   API       │
│  (HTTPS/TLS)    │    │  (React)     │    │ (Node.js)   │
└─────────────────┘    └──────────────┘    └─────────────┘
         │                                         │
         │              ┌─────────────────────────┼─────────────┐
         │              │                         │             │
         │              ▼                         ▼             ▼
    ┌─────────┐   ┌──────────────┐      ┌─────────────┐  ┌──────────────┐
    │ Client  │   │ PostgreSQL   │  OR  │   SQLite    │  │   MinIO      │
    │(Browser)│   │+ pgBackRest  │      │+ Litestream │  │ (S3 Storage) │
    └─────────┘   └──────────────┘      └─────────────┘  └──────────────┘
```

## 🔧 Troubleshooting

### Common Issues

**HTTPS Certificate Issues (localhost)**
- Accept the self-signed certificate in your browser
- Or add `--insecure` flag for development

**Database Connection Issues**
- Check logs: `make logs-db`
- Verify environment variables in `.env`
- Ensure secrets are created: `make secrets`

**API Health Check Failing**
- Check API logs: `make logs-api`
- Verify database is healthy: `make health`
- Check if migrations ran: `make dev-shell-api`

**Port Conflicts**
- Change ports in `docker-compose.yml` if needed
- Default ports: 80, 443 (Caddy), 9000, 9001 (MinIO)

### Getting Help

1. **Check service health**: `make health`
2. **View logs**: `make logs` 
3. **Reset environment**: `make dev-reset`
4. **Open API shell**: `make dev-shell-api`

## 🤖 Worker System

TG Marketer includes a distributed worker system that runs locally on Windows (or other OS) and processes message sending jobs using multiple Telegram accounts via Telethon.

### Worker Features

- **Multi-Account Support**: Use unlimited Telegram accounts simultaneously
- **Session Management**: Auto-discover and load local `.session` files
- **Smart Rate Limiting**: Respects hourly/daily limits per account
- **FloodWait Handling**: Automatic cooldown management
- **Health Monitoring**: Regular heartbeat reporting to API
- **Error Recovery**: Retry logic with exponential backoff

### Quick Start

1. **Install Worker Dependencies**:
```bash
cd worker
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

2. **Configure Worker**:
```bash
copy config.example.toml config.toml
copy .env.example .env
# Edit config.toml and .env with your settings
```

3. **Organize Session Files**:
```
premium/
├── 989906046260/
│   └── 989906046260.session
├── 989906047212/
│   └── 989906047212.session
└── ...
```

4. **Run Worker**:
```bash
python src/main.py
```

5. **Register Accounts in TG Marketer**:
   - Log into TG Marketer web interface
   - Navigate to Accounts page
   - Add each account with its session_key
   - Set hourly/daily limits

For detailed worker documentation, see [worker/README.md](worker/README.md).

### Worker API Endpoints

The system includes REST API endpoints for worker communication:

- `GET /api/accounts` - List all sending accounts
- `POST /api/accounts` - Register new account
- `GET /api/worker?action=pending-jobs` - Fetch jobs to process
- `POST /api/worker?action=heartbeat` - Send health status
- `POST /api/worker?action=update-job` - Update job status
- `POST /api/worker?action=update-account` - Update account status

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  TG Marketer WebApp                 │
│              (React + Telegram SDK)                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   TG Marketer API     │
         │   (Node.js + Express) │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────┐
         │ Supabase Database │
         │  (PostgreSQL)     │
         └───────┬───────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │  Worker Polling Loop  │
         │   (Python + Telethon) │
         └───────┬───────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌───────────────┐  ┌───────────────┐
│  TG Session 1 │  │  TG Session 2 │  ...
│ (.session file)  │ (.session file) │
└───────────────┘  └───────────────┘
```

## 📝 License

MIT License - see LICENSE file for details.
