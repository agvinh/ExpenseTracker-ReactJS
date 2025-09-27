# ExpenseTracker Solution / Gi?i pháp ExpenseTracker

> English follows Vietnamese (Song ng?: VI ? trên, EN ? dý?i).

---
## (VI) T?ng quan
Gi?i pháp g?m 2 ph?n chính:
1. **Backend** (ASP.NET Core /.NET 9 Web API) – Ðãng k?/ðãng nh?p (JWT), CRUD chi tiêu, upload ?nh, phân trang, Identity + EF Core.
2. **Frontend** (React + Vite) – SPA s? d?ng Material UI, i18next (EN/VI), react-hook-form + zod, Axios.

---
## 1. C?u trúc thý m?c (rút g?n)
```
/ExpenseTracker.Api            # ASP.NET Core API (.NET 9)
  /Controllers
  /Data (DbContext, Entities, Seeder, Migrations)
  /Dtos
  /wwwroot (uploads)
/ExpenseTracker.Web (n?u dùng Razor Pages k?t h?p)  
/expense-tracker-frontend     # React (Vite)
  /src
  /public
README.md
```

---
## 2. Backend
### 2.1 C?u h?nh
`appsettings.json` ho?c user-secrets:
```json
"ConnectionStrings": {"DefaultConnection": "Server=localhost;Database=ExpenseTrackerDb;Trusted_Connection=True;TrustServerCertificate=True;"},
"Jwt": {"Key": "<Chu?i >= 32 k? t? ho?c Base64 32 bytes>", "Issuer": "ExpenseTracker"}
```
> Không sinh key m?i m?i l?n ch?y.

### 2.2 Ch?y c?c b?
```bash
cd ExpenseTracker.Api
# dotnet ef database update (n?u chýa có DB)
dotnet run
```
Swagger: `https://localhost:<sslPort>/swagger`.

### 2.3 Migrations
```bash
dotnet tool install --global dotnet-ef
cd ExpenseTracker.Api
dotnet ef migrations add <Name>
dotnet ef database update
```

### 2.4 Debug
- Ð?t breakpoint controller / d?ch v?.  
- G?i qua Swagger (Authorize b?ng JWT).  
- 302 -> ki?m tra default auth scheme (JWT).

---
## 3. Frontend (React + Vite)
### 3.1 C?u h?nh môi trý?ng
`.env`:
```
VITE_API_BASE=https://localhost:7162/api
```
### 3.2 Ch?y
```bash
cd expense-tracker-frontend
npm install
npm run dev
npm run build   # t?o dist/
```
### 3.3 Debug
- DevTools Network ki?m tra header Authorization.  
- 401 -> ðãng nh?p l?i ho?c tri?n khai refresh token.

---
## 4. Quy tr?nh JWT qua Swagger
1. POST `/api/Auth/register` (1 l?n).  
2. POST `/api/Auth/login` -> l?y `token`.  
3. Authorize -> nh?p `Bearer <token>`.  
4. G?i API Expenses.  
5. Upload: `POST /api/Expenses/{id}/bill-image`.

---
## 5. Tri?n khai IIS
### 5.1 Backend
```bash
cd ExpenseTracker.Api
dotnet publish -c Release -o ..\publish\api
```
- App Pool riêng (No Managed Code).  
- Bi?n môi trý?ng: ConnectionString, Jwt:Key, Jwt:Issuer.  
- Quy?n ghi thý m?c `wwwroot/uploads` cho IIS_IUSRS.

### 5.2 Frontend
```bash
cd expense-tracker-frontend
npm run build
```
Copy `dist/` lên IIS, thêm `web.config` SPA fallback:
```xml
<?xml version="1.0"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA" stopProcessing="true">
          <match url="^(?!.*(\.|__vite_ping)).*$" />
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```
### 5.3 CORS
```csharp
builder.Services.AddCors(o=>o.AddPolicy("frontend",p=>p.WithOrigins("https://your-frontend-domain").AllowAnyHeader().AllowAnyMethod()));
app.UseCors("frontend");
```
### 5.4 Chung domain
- Root: React dist.  
- Application con `/api` tr? API.  
- `.env`: `VITE_API_BASE=https://domain.com/api`.

---
## 6. Refresh Token (tu? ch?n)
- B?ng `RefreshTokens` (hash SHA256).  
- Access token 15 phút; refresh 7–30 ngày.  
- Endpoint `/api/Auth/refresh`, `/api/Auth/revoke`.

---
## 7. Troubleshooting
| V?n ð? | Nguyên nhân | Gi?i pháp |
|--------|-------------|-----------|
| 302 Redirect | Cookie auth challenge | Ð?t default scheme = JWT |
| 401 dù token ðúng | Sai Jwt:Key | Ð?ng b? key c?u h?nh |
| 404 swagger.json | Swagger ch? b?t Dev | B?t ? Prod n?u c?n |
| Upload 500 | Thý m?c / quy?n | T?o `wwwroot/uploads` + c?p quy?n |
| CORS l?i | Khác domain | Thêm policy & `UseCors` |

---
## 8. Scripts
```bash
# Backend
dotnet watch run
# Frontend
npm run dev
npm run build
# DB
dotnet ef migrations add <Name>
dotnet ef database update
```

---
## 9. Ð?nh hý?ng
Bi?u ð?, export CSV/Excel, refresh token ð?y ð?, roles, tests.

---
## 10. License / Ðóng góp
- Thêm License (MIT …) n?u open-source.  
- PR / Issues ðý?c hoan nghênh.  

---
# (EN) Overview
Two primary parts:
1. **Backend** (ASP.NET Core /.NET 9 Web API) – JWT auth, Expense CRUD, image upload, pagination, Identity + EF Core.
2. **Frontend** (React + Vite SPA) – MUI, i18next (EN/VI), react-hook-form + zod, Axios.

## 1. Directory Structure (short)
```
ExpenseTracker.Api/
ExpenseTracker.Web/ (optional Razor Pages host)
expense-tracker-frontend/
```

## 2. Backend
Config (`appsettings.json`):
```json
"ConnectionStrings": {"DefaultConnection": "Server=localhost;Database=ExpenseTrackerDb;Trusted_Connection=True;TrustServerCertificate=True;"},
"Jwt": {"Key": "<>=32 chars or Base64 32 bytes>", "Issuer": "ExpenseTracker"}
```
Run:
```bash
cd ExpenseTracker.Api
# dotnet ef database update
dotnet run
```
Migrations:
```bash
dotnet ef migrations add <Name>
dotnet ef database update
```
Debug via Swagger + breakpoints.

## 3. Frontend
Env:
```
VITE_API_BASE=https://localhost:7162/api
```
Run & build:
```bash
npm install
npm run dev
npm run build
```

## 4. JWT Flow (Swagger)
1. Register -> 2. Login -> 3. Authorize -> 4. Call Expenses -> 5. Upload bill image.

## 5. Deploy on IIS
Backend publish:
```bash
dotnet publish -c Release -o ..\publish\api
```
Frontend build -> copy `dist/` + SPA fallback `web.config`.
If different domains enable CORS. Same domain: host frontend root + API under `/api`.

## 6. Optional Refresh Tokens
Implement table, short-lived access token (15m), rotation on refresh.

## 7. Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| 302 redirect | Cookie challenge | Set default auth = JWT |
| 401 valid token | Wrong key | Sync Jwt:Key |
| 404 swagger.json | Swagger only Dev | Enable in Prod if needed |
| 500 upload | Missing folder/ACL | Create uploads + grant write |
| CORS blocked | Cross origin | Add CORS policy |

## 8. Useful Scripts
See Vietnamese section above (same commands).

## 9. Roadmap
Charts, exports, full refresh token, roles, tests.

## 10. License / Contributing
Add license (MIT etc). PRs welcome.

---
**Enjoy building!**