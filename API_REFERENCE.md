# TG Marketer v2.0 - API Reference

## Base URL

```
http://localhost:3000/api
```

For production, replace with your actual domain.

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth?action=register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe" // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

**Error (400):**
```json
{
  "error": "Email and password required"
}
```

**Error (409):**
```json
{
  "error": "Email already registered"
}
```

---

### Login

Authenticate an existing user.

**Endpoint:** `POST /api/auth?action=login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

**Error (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

### Verify Token

Verify a JWT token and get user information.

**Endpoint:** `POST /api/auth?action=verify`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Error (401):**
```json
{
  "error": "Invalid token"
}
```

---

## System Endpoints

### Health Check

Get system health status.

**Endpoint:** `GET /api/health`

**Headers:** None required

**Response (200):**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "database": "supabase",
  "workers": 2,
  "timestamp": "2025-11-18T10:30:00.000Z",
  "uptime": 3600
}
```

---

## Account Management Endpoints

All account endpoints require authentication.

### List Telegram Accounts

Get all registered Telegram sending accounts.

**Endpoint:** `GET /api/accounts`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `status` (optional) - Filter by status: `idle`, `active`, `cooldown`, `error`
- `is_active` (optional) - Filter by active state: `true` or `false`

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "label": "Premium Account 1",
    "session_key": "989906046260",
    "phone": "+1234567890",
    "is_active": true,
    "is_premium": true,
    "hourly_limit": 100,
    "daily_limit": 500,
    "hourly_sent": 45,
    "daily_sent": 320,
    "status": "active",
    "last_active_at": "2025-11-18T10:25:00.000Z",
    "created_at": "2025-11-17T08:00:00.000Z"
  }
]
```

---

### Create Telegram Account

Register a new Telegram sending account.

**Endpoint:** `POST /api/accounts`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "label": "Premium Account 1",
  "session_key": "989906046260",
  "phone": "+1234567890",
  "is_premium": true,
  "hourly_limit": 100,
  "daily_limit": 500
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "label": "Premium Account 1",
  "session_key": "989906046260",
  "phone": "+1234567890",
  "is_active": true,
  "status": "idle",
  "created_at": "2025-11-18T10:30:00.000Z"
}
```

---

### Update Telegram Account

Update account settings.

**Endpoint:** `PUT /api/accounts?id=<account-id>`

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "label": "New Label",
  "is_active": true,
  "hourly_limit": 150,
  "daily_limit": 600,
  "status": "idle",
  "last_error": null,
  "flood_wait_until": null
}
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "label": "New Label",
  "session_key": "989906046260",
  "status": "idle",
  "updated_at": "2025-11-18T10:35:00.000Z"
}
```

---

### Delete Telegram Account

Deactivate a Telegram account (soft delete).

**Endpoint:** `DELETE /api/accounts?id=<account-id>`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200):**
```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Worker Endpoints

These endpoints are used by the Python worker for job processing.

### Get Pending Jobs

Fetch jobs ready for processing.

**Endpoint:** `GET /api/worker?action=pending-jobs`

**Headers:**
```
Authorization: Bearer <worker-jwt-token>
```

**Query Parameters:**
- `limit` (optional) - Max jobs to return (default: 10)
- `worker_id` (required) - Worker identifier

**Response (200):**
```json
{
  "jobs": [
    {
      "id": "job-uuid",
      "campaign_id": "campaign-uuid",
      "account_id": "account-uuid",
      "session_key": "989906046260",
      "chat_id": "-1001234567890",
      "template_text": "Hello, world!",
      "status": "assigned",
      "scheduled_for": "2025-11-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Send Heartbeat

Report worker health status.

**Endpoint:** `POST /api/worker?action=heartbeat`

**Headers:**
```
Authorization: Bearer <worker-jwt-token>
Content-Type: application/json
```

**Request Body:**
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

**Response (200):**
```json
{
  "success": true
}
```

---

### Update Job Status

Update job after processing.

**Endpoint:** `POST /api/worker?action=update-job`

**Headers:**
```
Authorization: Bearer <worker-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "job_id": "job-uuid",
  "status": "done",
  "error_message": null,
  "sent_at": "2025-11-18T10:30:00.000Z"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### Update Account Status

Update account state (for FloodWait, errors).

**Endpoint:** `POST /api/worker?action=update-account`

**Headers:**
```
Authorization: Bearer <worker-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "account_id": "account-uuid",
  "status": "cooldown",
  "error_message": "FloodWait",
  "flood_wait_until": "2025-11-18T13:00:00.000Z"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### Get Worker Statistics

Get worker system statistics.

**Endpoint:** `GET /api/worker?action=stats`

**Headers:**
```
Authorization: Bearer <worker-jwt-token>
```

**Response (200):**
```json
{
  "total_workers": 3,
  "online_workers": 2,
  "total_accounts": 15,
  "active_accounts": 12,
  "jobs_queued": 50,
  "jobs_processing": 5,
  "jobs_completed_today": 1250
}
```

---

## Error Responses

All endpoints may return these common errors:

### 401 Unauthorized
```json
{
  "error": "Authorization token required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

### 405 Method Not Allowed
```json
{
  "error": "Method not allowed"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting in production using:
- Nginx `limit_req` module
- Express rate limiter middleware
- Cloudflare rate limiting

---

## CORS

For cross-origin requests, configure CORS headers in your reverse proxy or add CORS middleware to the API.

Example Nginx configuration:
```nginx
add_header Access-Control-Allow-Origin "*";
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
add_header Access-Control-Allow-Headers "Content-Type, Authorization";
```

---

## WebSocket Support

Currently not implemented. For real-time updates, consider:
- Server-Sent Events (SSE)
- WebSocket connection
- Polling with `setInterval`

---

## Pagination

For large result sets, implement pagination using query parameters:
```
?page=1&limit=20
```

Currently not implemented in v2.0.0.

---

## Filtering & Sorting

Additional query parameters for filtering:
```
?sort=created_at&order=desc&filter=active
```

Currently limited to basic status filtering in accounts endpoint.

---

## Versioning

API version is included in the health check response:
```json
{
  "version": "2.0.0"
}
```

For future API versions, consider URL-based versioning:
```
/api/v2/accounts
```

---

## Example Usage

### Complete Authentication Flow

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth?action=register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 2. Save JWT from response
JWT="<jwt-from-response>"

# 3. Use JWT for authenticated requests
curl -X GET http://localhost:3000/api/accounts \
  -H "Authorization: Bearer $JWT"
```

### Add Telegram Account

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "My First Account",
    "session_key": "989906046260",
    "phone": "+1234567890",
    "is_premium": true,
    "hourly_limit": 100,
    "daily_limit": 500
  }'
```

---

## Support

For API issues:
- Check server logs
- Verify JWT token is valid
- Ensure Supabase connection is active
- Check environment variables

For detailed implementation, see source code in `/api` directory.
