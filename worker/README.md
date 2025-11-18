# TG Marketer Worker

A distributed worker system for TG Marketer that enables multi-account message sending using local Telethon sessions on Windows.

## Overview

The TG Marketer Worker connects to your TG Marketer backend and processes message sending jobs using multiple Telegram user accounts stored as session files on your local machine.

### Key Features

- **Multi-Account Support**: Use multiple Telegram accounts simultaneously
- **Automatic Rate Limiting**: Respects hourly and daily sending limits per account
- **FloodWait Handling**: Automatically manages Telegram flood wait errors
- **Session Management**: Loads and manages Telethon sessions from local folders
- **Health Monitoring**: Regular heartbeat reporting to track worker status
- **Graceful Shutdown**: Safely closes connections on termination
- **Error Recovery**: Automatic retry logic with exponential backoff

## Prerequisites

- Python 3.10 or higher
- Windows 10/11 (or other OS with appropriate path adjustments)
- Valid Telegram API credentials (api_id and api_hash from my.telegram.org)
- Authenticated .session files from Telethon
- Access to TG Marketer API

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/tg-marketer.git
cd tg-marketer/worker
```

### 2. Create Virtual Environment

```bash
python -m venv venv
```

Activate the environment:

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

## Configuration

### 1. Create Configuration File

```bash
copy config.example.toml config.toml
```

### 2. Edit config.toml

Open `config.toml` and configure:

```toml
[server]
tg_marketer_api_url = "https://your-api.com/api"  # Your TG Marketer API URL
jwt_token = "your_jwt_token_here"                  # Leave empty, use .env instead
worker_id = "worker-win-001"                       # Unique ID for this worker

[worker]
poll_interval_ms = 2000           # How often to check for new jobs (milliseconds)
max_parallel_sessions = 5         # Max concurrent sending sessions
heartbeat_interval_sec = 30       # Heartbeat frequency
idle_timeout_sec = 300            # Unused for now

[sessions]
root_dir = "C:/dev/premium"       # Path to your session files folder
auto_discover = true              # Auto-find session folders
session_extension = ".session"    # Session file extension

[sending]
default_delay_min_sec = 2         # Min delay between messages
default_delay_max_sec = 5         # Max delay between messages
group_delay_sec = 12              # Delay after sending to a group
flood_wait_multiplier = 1.2       # Multiply FloodWait time by this
max_retries = 3                   # Max retry attempts for failed jobs

[limits]
global_hourly_limit = 500         # Global hourly limit across all accounts
global_daily_limit = 2000         # Global daily limit across all accounts

[logging]
level = "INFO"                    # Log level: DEBUG, INFO, WARNING, ERROR
file = "logs/worker.log"          # Log file path
max_size_mb = 100                 # Max log file size before rotation
backup_count = 5                  # Number of backup log files to keep
```

### 3. Create .env File

```bash
copy .env.example .env
```

Edit `.env` and add your JWT token:

```env
TG_MARKETER_JWT=your_actual_jwt_token_from_tg_marketer
ENCRYPTION_KEY=optional_encryption_key_for_sessions
SENTRY_DSN=optional_error_tracking_url
```

## Session Files Structure

Your session files should be organized like this:

```
C:/dev/premium/
├── 989906046260/
│   └── 989906046260.session
├── 989906047212/
│   └── 989906047212.session
├── 989906059383/
│   └── 989906059383.session
└── ...
```

Each folder name should match the session key (phone number or identifier).

## Running the Worker

### Start the Worker

```bash
python src/main.py
```

Or specify a custom config file:

```bash
python src/main.py path/to/custom_config.toml
```

### Expected Output

```
2025-11-18 12:00:00 - __main__ - INFO - Logging initialized
2025-11-18 12:00:00 - __main__ - INFO - Starting TG Marketer Worker: worker-win-001
2025-11-18 12:00:00 - __main__ - INFO - API URL: https://your-api.com/api
2025-11-18 12:00:00 - __main__ - INFO - Sessions root: C:\dev\premium
2025-11-18 12:00:00 - __main__ - INFO - Discovered 3 session(s)
2025-11-18 12:00:00 - __main__ - INFO -   - 989906046260: C:\dev\premium\989906046260\989906046260.session
2025-11-18 12:00:00 - __main__ - INFO -   - 989906047212: C:\dev\premium\989906047212\989906047212.session
2025-11-18 12:00:00 - __main__ - INFO -   - 989906059383: C:\dev\premium\989906059383\989906059383.session
2025-11-18 12:00:00 - heartbeat - INFO - Heartbeat service started
2025-11-18 12:00:00 - __main__ - INFO - Entering main polling loop...
```

### Stop the Worker

Press `Ctrl+C` to initiate graceful shutdown. The worker will:
1. Stop accepting new jobs
2. Finish processing current jobs
3. Send final heartbeat
4. Close all Telethon connections
5. Exit cleanly

## Registering Accounts in TG Marketer

Before the worker can use an account, it must be registered in TG Marketer:

### Option 1: Via Web UI

1. Log into TG Marketer
2. Go to Accounts page
3. Click "Add Account"
4. Fill in:
   - Label: Human-readable name (e.g., "Premium Account 1")
   - Session Key: Folder name (e.g., "989906046260")
   - Phone: Phone number (optional, for reference)
   - Limits: Hourly/Daily sending limits
5. Save

### Option 2: Via API

```bash
curl -X POST https://your-api.com/api/accounts \
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

## Monitoring

### Worker Status

Check worker status via API:

```bash
curl https://your-api.com/api/worker?action=stats&worker_id=worker-win-001 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Logs

Worker logs are written to `logs/worker.log` by default. Monitor in real-time:

```bash
tail -f logs/worker.log
```

### Account Status

View account status:

```bash
curl https://your-api.com/api/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Worker Can't Connect to API

**Problem:** Worker shows "Failed to send heartbeat" errors

**Solutions:**
- Check API URL in config.toml
- Verify JWT token in .env file
- Ensure network connectivity
- Check firewall rules

### Session Files Not Found

**Problem:** "Session file not found" errors

**Solutions:**
- Verify `root_dir` path in config.toml
- Check folder and file naming (must match session_key)
- Ensure session files have correct extension (.session)

### FloodWait Errors

**Problem:** Frequent FloodWait errors

**Solutions:**
- Increase delays in config.toml (default_delay_min_sec/max_sec)
- Reduce hourly/daily limits for accounts
- Add more accounts to distribute load
- Increase flood_wait_multiplier

### Session Authorization Failed

**Problem:** "Session is not authorized" errors

**Solutions:**
- Re-authenticate session using Telethon
- Check if account was logged out elsewhere
- Verify API credentials (api_id, api_hash)

### Account Banned

**Problem:** "Phone number banned" errors

**Solutions:**
- Remove banned account from TG Marketer
- Check Telegram's terms of service
- Reduce sending frequency
- Use more natural sending patterns

## Advanced Configuration

### Running Multiple Workers

You can run multiple worker instances:

1. Copy worker folder to multiple locations
2. Use different `worker_id` in each config.toml
3. Run each instance separately

**Benefits:**
- Distribute sessions across machines
- Higher throughput
- Geographic distribution
- Redundancy

### Custom Session Discovery

Disable auto-discovery and manually manage sessions:

```toml
[sessions]
auto_discover = false
```

Then load sessions programmatically in your code.

### Windows Service Installation

To run worker as a Windows service:

1. Install NSSM (Non-Sucking Service Manager)
2. Run:

```bash
nssm install TGWorker "C:\path\to\venv\Scripts\python.exe" "C:\path\to\worker\src\main.py"
nssm set TGWorker AppDirectory "C:\path\to\worker"
nssm start TGWorker
```

## Security Best Practices

1. **Never commit .session files to Git**
   - Add `*.session` to `.gitignore`

2. **Protect JWT tokens**
   - Store in .env file
   - Never commit .env to Git
   - Rotate tokens regularly

3. **Encrypt session files at rest**
   - Use Windows BitLocker or VeraCrypt
   - Restrict file permissions

4. **Use HTTPS for API**
   - Always use TLS/SSL
   - Validate certificates

5. **Monitor for suspicious activity**
   - Check logs regularly
   - Set up alerts for errors

## API Reference

### Worker Endpoints

#### GET /api/worker?action=pending-jobs

Fetch pending jobs for processing.

**Parameters:**
- `limit` (optional): Max jobs to return (default: 10)
- `account_id` (optional): Filter by account ID
- `worker_id` (required): Worker identifier

**Response:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "account_id": "uuid",
      "session_key": "989906046260",
      "chat_id": -1001234567890,
      "template_text": "Hello, world!",
      "status": "assigned",
      "scheduled_for": "2025-11-18T12:00:00Z"
    }
  ],
  "count": 1
}
```

#### POST /api/worker?action=heartbeat

Send worker health status.

**Body:**
```json
{
  "worker_id": "worker-win-001",
  "hostname": "MY-PC",
  "version": "1.0.0",
  "active_accounts": ["989906046260", "989906047212"],
  "stats": {
    "messages_sent": 150,
    "messages_failed": 2,
    "uptime_seconds": 3600
  }
}
```

#### POST /api/worker?action=update-job

Update job status after processing.

**Body:**
```json
{
  "job_id": "uuid",
  "status": "done",
  "error_message": null,
  "sent_at": "2025-11-18T12:00:00Z"
}
```

#### POST /api/worker?action=update-account

Update account status (for FloodWait, errors).

**Body:**
```json
{
  "account_id": "uuid",
  "status": "cooldown",
  "error_message": "FloodWait",
  "flood_wait_until": "2025-11-18T13:00:00Z"
}
```

## License

MIT License - see LICENSE file for details.

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/your-org/tg-marketer/issues
- Documentation: https://docs.tg-marketer.com
