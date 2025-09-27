# ExpenseTracker Solution / Giải pháp ExpenseTracker

> English follows Vietnamese (Song ngữ: VI ở trên, EN ở dưới).

---
## (VI) Tổng quan
Giải pháp gồm 2 phần chính:
1. **Backend** (ASP.NET Core /.NET 9 Web API) – Đăng ký/đăng nhập (JWT), CRUD chi tiêu, upload ảnh, phân trang, Identity + EF Core.
2. **Frontend** (React + Vite) – SPA sử dụng Material UI, i18next (EN/VI), react-hook-form + zod, Axios.

---
## 1. Cấu trúc thư mục (rút gọn)
```
/ExpenseTracker.Api            # ASP.NET Core API (.NET 9)
  /Controllers
  /Data (DbContext, Entities, Seeder, Migrations)
  /Dtos
  /wwwroot (uploads)
/ExpenseTracker.Web (nếu dùng Razor Pages kết hợp)  
/expense-tracker-frontend     # React (Vite)
  /src
  /public
README.md
```

---
## 2. Backend
### 2.1 Cấu hình
`appsettings.json` hoặc user-secrets:
```json
"ConnectionStrings": {"DefaultConnection": "Server=localhost;Database=ExpenseTrackerDb;Trusted_Connection=True;TrustServerCertificate=True;"},
"Jwt": {"Key": "<Chuỗi >= 32 ký tự hoặc Base64 32 bytes>", "Issuer": "ExpenseTracker"}
```
> Không sinh key mới mỗi lần chạy.

### 2.2 Chạy cục bộ
```bash
cd ExpenseTracker.Api
# dotnet ef database update (nếu chưa có DB)
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
- Đặt breakpoint controller / dịch vụ.  
- Gọi qua Swagger (Authorize bằng JWT).  
- 302 -> kiểm tra default auth scheme (JWT).

---
## 3. Frontend (React + Vite)
### 3.1 Cấu hình môi trường
`.env`:
```
VITE_API_BASE=https://localhost:7162/api
```
### 3.2 Chạy
```bash
cd expense-tracker-frontend
npm install
npm run dev
npm run build   # tạo dist/
```
### 3.3 Debug
- DevTools Network kiểm tra header Authorization.  
- 401 -> đăng nhập lại hoặc triển khai refresh token.

---
## 4. Quy trình JWT qua Swagger
1. POST `/api/Auth/register` (1 lần).  
2. POST `/api/Auth/login` -> lấy `token`.  
3. Authorize -> nhập `Bearer <token>`.  
4. Gọi API Expenses.  
5. Upload: `POST /api/Expenses/{id}/bill-image`.

---
## 5. Triển khai IIS
### 5.1 Backend
```bash
cd ExpenseTracker.Api
dotnet publish -c Release -o ..\publish\api
```
- App Pool riêng (No Managed Code).  
- Biến môi trường: ConnectionString, Jwt:Key, Jwt:Issuer.  
- Quyền ghi thư mục `wwwroot/uploads` cho IIS_IUSRS.

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
- Application con `/api` trỏ API.  
- `.env`: `VITE_API_BASE=https://domain.com/api`.

---
## 6. Refresh Token (tuỳ chọn)
- Bảng `RefreshTokens` (hash SHA256).  
- Access token 15 phút; refresh 7–30 ngày.  
- Endpoint `/api/Auth/refresh`, `/api/Auth/revoke`.

---
## 7. Troubleshooting
| Vấn đề | Nguyên nhân | Giải pháp |
|--------|-------------|-----------|
| 302 Redirect | Cookie auth challenge | Đặt default scheme = JWT |
| 401 dù token đúng | Sai Jwt:Key | Đồng bộ key cấu hình |
| 404 swagger.json | Swagger chỉ bật Dev | Bật ở Prod nếu cần |
| Upload 500 | Thư mục / quyền | Tạo `wwwroot/uploads` + cấp quyền |
| CORS lỗi | Khác domain | Thêm policy & `UseCors` |

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
## 9. Định hướng
Biểu đồ, export CSV/Excel, refresh token đầy đủ, roles, tests.

---
## 10. License / Đóng góp
- Thêm License (MIT …) nếu open-source.  
- PR / Issues được hoan nghênh.  

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