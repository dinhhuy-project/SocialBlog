# IP Address Logging Implementation Guide

## Overview
Đã implement full IP address logging cho ứng dụng của bạn. Hệ thống sẽ log IP address của mọi user trên các action quan trọng.

## Features Implemented

### 1. **Automatic IP Logging on Every Request**
- Middleware tự động log IP address cho tất cả API requests
- Xử lý proxy headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
- Log format: `[IP LOG] METHOD /path - IP: xxx.xxx.xxx.xxx`

### 2. **Authentication Actions Logging**
Các action sau được log chi tiết:

#### **Register** (`POST /api/auth/register`)
```
[REGISTER] New registration attempt from IP: 192.168.1.1, Email: user@example.com
[REGISTER] User created successfully - ID: 1, Username: john_doe, IP: 192.168.1.1
```

#### **Login** (`POST /api/auth/login`)
```
[LOGIN] Login attempt for email: user@example.com, IP: 192.168.1.1
[LOGIN] Low-risk login successful for user: john_doe (ID: 1), IP: 192.168.1.1, Previous IP: 192.168.1.1
```

Hoặc:
```
[LOGIN] High-risk login detected for user: john_doe (ID: 1), Current IP: 192.168.5.5, Last IP: 192.168.1.1
```

#### **2FA Verification** (`POST /api/auth/verify-2fa-email`)
```
[2FA] 2FA verification attempt - Action: approve, IP: 192.168.5.5
[2FA] 2FA approved for user: john_doe (ID: 1) from IP: 192.168.5.5
```

### 3. **IP Address Helper Functions**

#### Get Client IP
```typescript
import { getClientIp } from './auth';

const ip = getClientIp(req);
console.log('Client IP:', ip);
```

Tự động xử lý các trường hợp:
- Khi đằng sau proxy/load balancer
- Cloudflare
- IPv4 và IPv6

#### Mask IP (Privacy)
```typescript
import { maskIp } from './auth';

const masked = maskIp('192.168.1.100');
// Result: '192.168.*.*'
```

### 4. **IP Logger Utility** (`server/ip-logger.ts`)

Các hàm hữu ích:

```typescript
import {
  logIpAccess,
  getUserIpLogs,
  getIpLogs,
  getRecentIpLogs,
  isSuspiciousIp,
  getUserIpHistory,
  parseBrowserInfo,
  getLogStatistics,
} from './ip-logger';

// Log an access event
logIpAccess({
  userId: 1,
  username: 'john_doe',
  email: 'john@example.com',
  action: 'login',
  ip: '192.168.1.1',
  maskedIp: maskIp('192.168.1.1'),
  userAgent: req.headers['user-agent'],
  status: 'success',
  details: 'Login from new IP',
});

// Get logs cho user
const logs = getUserIpLogs(1);

// Get logs cho IP
const ipLogs = getIpLogs('192.168.1.1');

// Get recent logs
const recent = getRecentIpLogs(50);

// Check if IP is suspicious (3+ failed attempts)
const suspicious = isSuspiciousIp('192.168.1.1');

// Get user's IP history
const history = getUserIpHistory(1);

// Parse browser info
const browserInfo = parseBrowserInfo(userAgent);
// Result: { browser: 'Chrome', os: 'Windows' }

// Get statistics
const stats = getLogStatistics();
/*
{
  totalLogs: 150,
  uniqueIps: 12,
  uniqueUsers: 8,
  successfulLogins: 45,
  failedLogins: 3,
  registrations: 5
}
*/
```

## Admin API Routes

Admin (Role ID = 1) có thể sử dụng những routes sau:

### 1. **Get Recent IP Logs**
```
GET /api/admin/ip-logs?limit=50
```

Response:
```json
{
  "logs": [
    {
      "timestamp": "2025-11-19T10:30:45.123Z",
      "userId": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "action": "login",
      "ip": "192.168.1.1",
      "maskedIp": "192.168.*.*",
      "userAgent": "Mozilla/5.0...",
      "status": "success",
      "details": "Low-risk login"
    }
  ],
  "total": 50,
  "timestamp": "2025-11-19T10:35:00.000Z"
}
```

### 2. **Get User's IP Logs**
```
GET /api/admin/user/{userId}/ip-logs
```

Response:
```json
{
  "userId": 1,
  "logs": [...],
  "history": [
    {
      "ip": "192.168.1.1",
      "maskedIp": "192.168.*.*",
      "timestamp": "2025-11-19T10:30:45.123Z",
      "action": "login"
    }
  ],
  "suspiciousActivity": false
}
```

### 3. **Get Logs for Specific IP**
```
GET /api/admin/ip/{ipAddress}/logs
```

Response:
```json
{
  "ipAddress": "192.168.1.1",
  "maskedIp": "192.168.*.*",
  "logs": [...],
  "totalAttempts": 10,
  "failedAttempts": 2,
  "isSuspicious": false
}
```

### 4. **Get IP Statistics**
```
GET /api/admin/ip-stats
```

Response:
```json
{
  "totalLogs": 150,
  "uniqueIps": 12,
  "uniqueUsers": 8,
  "successfulLogins": 45,
  "failedLogins": 3,
  "registrations": 5,
  "timestamp": "2025-11-19T10:35:00.000Z",
  "description": "IP logging and authentication statistics"
}
```

## Database Integration

Bạn đã có `lastLoginIp` field trong users table:

```typescript
lastLoginIp: varchar("last_login_ip", { length: 50 })
```

Nó được update tự động khi user login thành công.

Nếu muốn persistent storage cho logs, bạn có thể tạo bảng:

```sql
CREATE TABLE ip_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(50),
  ip_address VARCHAR(50),
  masked_ip VARCHAR(50),
  user_agent TEXT,
  status ENUM('success', 'failed', 'pending'),
  details VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Console Logs Example

Khi chạy app, bạn sẽ thấy logs như:

```
[IP LOG] POST /api/auth/register - IP: 192.168.1.1
[REGISTER] New registration attempt from IP: 192.168.1.1, Email: user@example.com
[REGISTER] User created successfully - ID: 1, Username: john_doe, IP: 192.168.1.1
[IP LOG] POST /api/auth/register 201 in 45ms [IP: 192.168.1.1] :: {"id":1,...}

[IP LOG] POST /api/auth/login - IP: 192.168.1.1
[LOGIN] Login attempt for email: user@example.com, IP: 192.168.1.1
[LOGIN] Low-risk login successful for user: john_doe (ID: 1), IP: 192.168.1.1, Previous IP: none
[IP LOG] POST /api/auth/login 200 in 50ms [IP: 192.168.1.1]

[IP LOG] POST /api/auth/login - IP: 192.168.5.5
[LOGIN] Login attempt for email: user@example.com, IP: 192.168.5.5
[LOGIN] High-risk login detected for user: john_doe (ID: 1), Current IP: 192.168.5.5, Last IP: 192.168.1.1
[IP LOG] POST /api/auth/verify-2fa-email - IP: 192.168.5.5
[2FA] 2FA verification attempt - Action: approve, IP: 192.168.5.5
[2FA] 2FA approved for user: john_doe (ID: 1) from IP: 192.168.5.5
```

## Security Notes

1. **IP Masking**: Khi log, IP được mask cho privacy (e.g., `192.168.*.*`)
2. **Suspicious Activity Detection**: Tự động detect nếu có 3+ failed login attempts từ cùng IP
3. **High-Risk Logins**: Trigger 2FA khi login từ IP khác
4. **Admin Only Access**: Tất cả IP logging routes chỉ admin có thể access

## Testing

Để test, bạn có thể:

1. Register user từ browser (localhost)
2. Login từ browser
3. Login từ IP khác (dùng VPN hoặc proxy)
4. Access admin routes để xem logs

## Next Steps (Optional)

1. **Persistent Storage**: Move logs từ memory sang database
2. **Geolocation**: Integrate IP geolocation service
3. **Email Alerts**: Notify user về suspicious logins
4. **Dashboard**: Build admin UI để view logs
5. **Retention Policy**: Auto-delete logs sau 30 ngày
6. **Blocked IPs**: Implement IP blacklist/whitelist system
