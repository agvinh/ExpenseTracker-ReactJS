# ExpenseTracker Solution / Gi?i ph�p ExpenseTracker

> English follows Vietnamese (Song ng?: VI ? tr�n, EN ? d�?i).

---
## (VI) T?ng quan
Gi?i ph�p g?m 2 ph?n ch�nh:
1. **Backend** (ASP.NET Core /.NET 9 Web API) � ��ng k?/��ng nh?p (JWT), CRUD chi ti�u, upload ?nh, ph�n trang, Identity + EF Core.
2. **Frontend** (React + Vite) � SPA s? d?ng Material UI, i18next (EN/VI), react-hook-form + zod, Axios.

---
## 1. C?u tr�c th� m?c (r�t g?n)
```
/ExpenseTracker.Api            # ASP.NET Core API (.NET 9)
  /Controllers
  /Data (DbContext, Entities, Seeder, Migrations)
  /Dtos
  /wwwroot (uploads)
/ExpenseTracker.Web (n?u d�ng Razor Pages k?t h?p)  
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
> Kh�ng sinh key m?i m?i l?n ch?y.

### 2.2 Ch?y c?c b?
```bash
cd ExpenseTracker.Api
# dotnet ef database update (n?u ch�a c� DB)
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
- �?t breakpoint controller / d?ch v?.  
- G?i qua Swagger (Authorize b?ng JWT).  
- 302 -> ki?m tra default auth scheme (JWT).

---
## 3. Frontend (React + Vite)
### 3.1 C?u h?nh m�i tr�?ng
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
- 401 -> ��ng nh?p l?i ho?c tri?n khai refresh token.

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
- App Pool ri�ng (No Managed Code).  
- Bi?n m�i tr�?ng: ConnectionString, Jwt:Key, Jwt:Issuer.  
- Quy?n ghi th� m?c `wwwroot/uploads` cho IIS_IUSRS.

### 5.2 Frontend
```bash
cd expense-tracker-frontend
npm run build
```
Copy `dist/` l�n IIS, th�m `web.config` SPA fallback:
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
- Access token 15 ph�t; refresh 7�30 ng�y.  
- Endpoint `/api/Auth/refresh`, `/api/Auth/revoke`.

---
## 7. Troubleshooting
| V?n �? | Nguy�n nh�n | Gi?i ph�p |
|--------|-------------|-----------|
| 302 Redirect | Cookie auth challenge | �?t default scheme = JWT |
| 401 d� token ��ng | Sai Jwt:Key | �?ng b? key c?u h?nh |
| 404 swagger.json | Swagger ch? b?t Dev | B?t ? Prod n?u c?n |
| Upload 500 | Th� m?c / quy?n | T?o `wwwroot/uploads` + c?p quy?n |
| CORS l?i | Kh�c domain | Th�m policy & `UseCors` |

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
## 9. �?nh h�?ng
Bi?u �?, export CSV/Excel, refresh token �?y �?, roles, tests.

---
## 10. License / ��ng g�p
- Th�m License (MIT �) n?u open-source.  
- PR / Issues ��?c hoan ngh�nh.  

---
# (EN) Overview
Two primary parts:
1. **Backend** (ASP.NET Core /.NET 9 Web API) � JWT auth, Expense CRUD, image upload, pagination, Identity + EF Core.
2. **Frontend** (React + Vite SPA) � MUI, i18next (EN/VI), react-hook-form + zod, Axios.

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