# TG Marketer - Backend API & Worker System

A self-hosted backend system for managing multi-account Telegram mass messaging campaigns with distributed worker support.

## Features

- **🔒 Secure API**: JWT-based authentication with email/password
- **📊 Supabase Backend**: PostgreSQL database with real-time capabilities
- **⚡ Multi-Account Worker**: Distributed Python worker for mass sending via Telethon
- **📈 Rate Limiting**: Automatic hourly/daily limits with FloodWait handling
- **🔄 Health Monitoring**: Worker heartbeat and status tracking
- **🚀 Job Queue**: Robust job processing with retry logic
- **🎯 Session Management**: Auto-discover and manage Telethon session files

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (for worker)
- Supabase account (free tier works)
- Telegram accounts with session files

### 1. Clone and Configure

```bash
git clone <repo>
cd tg-marketer

# Copy environment template
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

The migrations will be automatically applied when you deploy to Supabase or can be run manually:

```bash
# Migrations are in: supabase/migrations/
# They will create:
# - users table (authentication)
# - tg_accounts table (Telegram accounts)
# - jobs table (message queue)
# - worker_heartbeats table (worker health)
# - And other necessary tables
```

### 4. Start Backend

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
API_URL=http://localhost:3000/api
API_SECRET_KEY=your_secret_key_for_jwt_signing

# Worker Authentication
WORKER_JWT_SECRET=your_worker_jwt_secret

# Optional: Admin credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_password
```

### Default Admin Account

A default admin account is created during migration:
- Email: `admin@tgmarketer.local`
- Password: `admin123`

**IMPORTANT**: Change this password immediately after first login!

## 🔐 API Authentication

### Register New User

```bash
curl -X POST http://localhost:3000/api/auth?action=register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "name": "John Doe"
  }'
```

Response:
```json
{
  "success": true,
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### Verify Token

```bash
curl -X POST http://localhost:3000/api/auth?action=verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🤖 Worker System

TG Marketer includes a distributed worker system that runs locally and processes message sending jobs using multiple Telegram accounts via Telethon.

### Worker Features

- **Multi-Account Support**: Use unlimited Telegram accounts simultaneously
- **Session Management**: Auto-discover and load local `.session` files
- **Smart Rate Limiting**: Respects hourly/daily limits per account
- **FloodWait Handling**: Automatic cooldown management
- **Health Monitoring**: Regular heartbeat reporting to API
- **Error Recovery**: Retry logic with exponential backoff

### Quick Worker Setup

1. **Install Worker Dependencies**:
```bash
cd worker
python -m venv venv
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
```

2. **Configure Worker**:
```bash
cp config.example.toml config.toml
cp .env.example .env
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

5. **Register Accounts via API**:
```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Premium Account 1",
    "session_key": "989906046260",
    "phone": "+1234567890",
    "is_premium": true,
    "hourly_limit": 100,
    "daily_limit": 500
  }'
```

For detailed worker documentation, see [worker/README.md](worker/README.md).

## 📡 API Endpoints

### Health Check

```bash
GET /api/health
```

Returns system status and active worker count.

### Authentication

- `POST /api/auth?action=register` - Create new user
- `POST /api/auth?action=login` - Login user
- `POST /api/auth?action=verify` - Verify JWT token

### Account Management

All account endpoints require `Authorization: Bearer <JWT>` header.

- `GET /api/accounts` - List all Telegram sending accounts
- `POST /api/accounts` - Register new Telegram account
- `PUT /api/accounts?id=<uuid>` - Update account settings
- `DELETE /api/accounts?id=<uuid>` - Deactivate account

### Worker API

Worker endpoints require worker JWT token.

- `GET /api/worker?action=pending-jobs` - Fetch jobs to process
- `POST /api/worker?action=heartbeat` - Send health status
- `POST /api/worker?action=update-job` - Update job status
- `POST /api/worker?action=update-account` - Update account status
- `GET /api/worker?action=stats` - Get worker statistics

## 🏗️ Architecture

```
┌─────────────────┐
│   Web Frontend  │  (Optional simple status page)
│     (React)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │  (Authentication + Job Management)
│   (Node.js)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Supabase     │  (PostgreSQL Database)
│   PostgreSQL    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Worker Polling  │  (Python + Telethon)
│     Loop        │  (Runs locally on Windows/Linux)
└────────┬────────┘
         │
    ┌────┴─────┐
    ▼          ▼
┌────────┐ ┌────────┐
│Session1│ │Session2│ ... (Local .session files)
└────────┘ └────────┘
```

## 🔒 Security Best Practices

1. **Change Default Passwords**: Update admin password immediately
2. **Use Strong Secrets**: Generate secure API_SECRET_KEY and WORKER_JWT_SECRET
3. **Enable HTTPS**: Use reverse proxy (Nginx/Caddy) with SSL certificates
4. **Protect Session Files**: Keep `.session` files secure and encrypted
5. **Rotate JWT Tokens**: Implement token rotation in production
6. **Whitelist IPs**: Restrict worker API access to known IPs
7. **Monitor Logs**: Regularly check for suspicious activity

## 🛠️ Development

### Build

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

### Type Checking

```bash
npx tsc --noEmit
```

## 📊 Database Schema

Key tables:

- **users** - User accounts with email/password authentication
- **tg_accounts** - Telegram sending accounts with session keys
- **jobs** - Message sending job queue
- **worker_heartbeats** - Worker health and status
- **campaigns** - Campaign management
- **templates** - Message templates
- **destinations** - Target chat/channel list

For complete schema, see `supabase/migrations/` directory.

## 🔧 Troubleshooting

### Worker Can't Connect to API

- Verify `tg_marketer_api_url` in worker's `config.toml`
- Check JWT token in worker's `.env` file
- Ensure API is running and accessible

### Session Files Not Found

- Verify `root_dir` path in `config.toml`
- Check folder structure matches session_key
- Ensure session files have `.session` extension

### FloodWait Errors

- Increase delays in worker config
- Reduce hourly/daily limits per account
- Add more accounts to distribute load

### Database Connection Issues

- Verify Supabase credentials in `.env`
- Check Supabase project is active
- Ensure migrations have been applied

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions:
- Check [worker/README.md](worker/README.md) for worker-specific help
- Review logs in `worker/logs/worker.log`
- Check API logs for backend issues
