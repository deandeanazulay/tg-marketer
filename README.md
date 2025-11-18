# TG Marketer - Telegram Mini App

A lightweight Telegram Mini App for managing marketing campaigns with a secure, self-hosted Docker stack.

## Features

- **🚀 One-Command Deployment**: Complete Docker stack with automatic HTTPS
- **🔒 Secure by Default**: HMAC verification, encrypted SQLite, security headers
- **📊 Database Choice**: PostgreSQL with automated backups OR SQLite with Litestream
- **🌐 Automatic HTTPS**: Caddy reverse proxy with Let's Encrypt
- **📱 Mini App Native**: Runs inside Telegram using official WebApp SDK
- **🔄 Auto-Updates**: Optional Watchtower integration

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

## 📝 License

MIT License - see LICENSE file for details.
