# ExpenseTracker Solution 

> *Comprehensive expense management solution with OCR integration*  

---

## 1. Overview  

ExpenseTracker is a comprehensive personal expense management solution featuring:  

- ✅ JWT Authentication (Register/Login)  
- ✅ CRUD Operations for expenses  
- ✅ Bill image upload & management  
- ✅ OCR automatic amount extraction (Tesseract)  
- ✅ Multi-language support (EN/VI)  
- ✅ Locale-aware currency formatting  
- ✅ Responsive Material-UI design  

### Tech Stack  
```
Backend:  .NET 9.0 + ASP.NET Core Web API + EF Core + SQL Server
Frontend: React 18 + Vite + MUI + React Hook Form + Zod
OCR:      Tesseract 5.2.0 (English + Vietnamese)
Auth:     JWT Bearer Token
I18n:     react-i18next
```

### 1.1 Technologies Used  
- **Backend**: .NET 9.0 + ASP.NET Core Web API + Entity Framework Core + SQL Server  
- **Frontend**: React 18 + Vite + Material-UI + React Hook Form + Zod  
- **OCR**: Tesseract 5.2.0 (English + Vietnamese)  
- **Authentication**: JWT Bearer Token  
- **Internationalization**: react-i18next (EN/VI)  

### 1.2 Solution Structure  
```
ExpenseTracker.sln
├── ExpenseTracker.Api/          # Backend (ASP.NET Core Web API)
└── expense-tracker-frontend/    # Frontend (React + Vite)
```  

---

## 2. System Architecture  

### 2.1 Architecture Overview  
```
┌─────────────────┐    HTTP/HTTPS    ┌─────────────────┐
│   React SPA     │ ◄──────────────► │  ASP.NET Core   │
│   (Frontend)    │                  │   Web API       │
│                 │                  │   (Backend)     │
├─────────────────┤                  ├─────────────────┤
│ • Material-UI   │                  │ • Controllers   │
│ • React Router  │                  │ • Services      │
│ • Axios Client  │                  │ • OCR Engine    │
│ • i18next       │                  │ • EF Core       │
└─────────────────┘                  └─────────────────┘
                                               │
                                               ▼
                                     ┌─────────────────┐
                                     │   SQL Server    │
                                     │   Database      │
                                     └─────────────────┘
```

### 2.2 Main Data Flow  
- User Input → Form Validation → API → Database → UI Update  
- Image Upload → OCR Processing → Amount Extraction → Auto-fill Form  

---

## 3. Backend (ASP.NET Core Web API)  

### 3.1 Project Structure  
```
ExpenseTracker.Api/
├── Controllers/
│   ├── AuthController.cs
│   └── ExpensesController.cs
├── Data/
│   ├── AppDbContext.cs
│   ├── DbSeeder.cs
│   └── Migrations/
├── Dtos/
│   ├── ExpenseDto.cs
│   ├── LoginDto.cs
│   └── OcrResultDto.cs
├── Services/
│   └── TesseractOcrService.cs
├── tessdata/
│   ├── eng.traineddata
│   └── vie.traineddata
├── wwwroot/uploads/
├── Program.cs
└── ExpenseTracker.Api.csproj
```  

### 3.2 Database Schema  
```sql
Users:
- Id (PK)
- UserName
- Email
- PasswordHash
- CreatedAt

Expenses:
- Id (PK)
- UserId (FK → Users)
- Amount (decimal(18,2))
- Currency (nvarchar(3))
- Category (nvarchar(50))
- Description (ntext)
- OccurredAt (datetime2)
- BillImagePath (nvarchar(500))
- CreatedAt
- UpdatedAt
```

### 3.3 API Endpoints  
```
# Authentication
POST /api/auth/register
POST /api/auth/login

# Expense CRUD
GET    /api/expenses
POST   /api/expenses
GET    /api/expenses/{id}
PUT    /api/expenses/{id}
DELETE /api/expenses/{id}

# File & OCR
POST /api/expenses/{id}/bill-image
POST /api/expenses/extract-amount
```

---

## 4. Frontend (React + Vite)  

### 4.1 Project Structure  
```
expense-tracker-frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── api/axios.js
│   ├── components/Navbar.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── AddExpense.jsx
│   │   └── EditExpense.jsx
│   ├── services/ocrService.js
│   ├── utils/currency.js
│   ├── App.jsx
│   ├── i18n.js
│   └── main.jsx
├── package.json
├── vite.config.js
└── .env
```  

### 4.2 Features  
- Multi-language support (EN/VI)  
- Locale-aware currency formatting  
- File upload + OCR auto-fill  
- Responsive design (Material-UI)  
- JWT token management  
- Real-time form validation (React Hook Form + Zod)  

---

## 5. Development Environment Setup  

### 5.1 System Requirements  
- .NET 9.0 SDK  
- Node.js 18+ & npm  
- SQL Server (LocalDB or full version)  
- VS Code or Visual Studio 2022  

### 5.2 Backend Setup  
```bash
cd ExpenseTracker.Api
dotnet restore
dotnet ef database update
dotnet run
# → https://localhost:7162
# → https://localhost:7162/swagger
```

### 5.3 Frontend Setup  
```bash
cd expense-tracker-frontend
npm install
echo "VITE_API_BASE=https://localhost:7162/api" > .env
npm run dev
# → http://localhost:5173
```

### 5.4 Development Workflow  
```bash
# Terminal 1 - Backend
dotnet watch run

# Terminal 2 - Frontend
npm run dev
```

---

## 6. Deployment  

### 6.1 IIS Deployment  
- **Backend**: Run `dotnet publish -c Release -o ..\publish`, deploy to IIS with "No Managed Code" setting  
- **Frontend**: Run `npm run build`, copy `dist/` folder to IIS, add `web.config` for SPA fallback routing  

### 6.2 Docker Deployment  
- **Backend**: ASP.NET 9 base image + publish artifacts  
- **Frontend**: Node build stage → Nginx serve stage  

### 6.3 Cloud Deployment Options  
- **Azure**: App Service + SQL Database + Static Web Apps  
- **AWS**: Elastic Beanstalk + RDS + S3/CloudFront  

---

## 7. Troubleshooting  

| Issue | Root Cause | Solution |
|-------|------------|----------|
| 302 Redirect | Cookie authentication challenge | Set default authentication scheme to JWT |
| 401 Unauthorized | Wrong JWT key or token expired | Synchronize Jwt:Key configuration |
| 404 swagger.json | Swagger only enabled in Development | Enable in Production if needed |
| 500 Upload Error | Missing folder or insufficient permissions | Create `wwwroot/uploads` directory and grant write permissions |
| CORS Error | Cross-origin request blocked | Add CORS policy configuration |
| OCR Processing Failure | Missing tessdata files | Download eng/vie traineddata files |

---

## 8. Development Roadmap  

- **Dashboard & Analytics**: Interactive charts and expense analytics  
- **Data Export**: CSV/Excel export functionality  
- **Enhanced Security**: Refresh tokens & role-based access control  
- **Notifications**: Email notifications and alerts  
- **Mobile Application**: React Native or Flutter mobile app  
- **Advanced OCR**: Google Vision API integration, template-based extraction  
- **Testing**: Unit tests, Integration tests, E2E testing  
- **DevOps**: CI/CD pipeline with GitHub Actions  

---

## 9. Scripts Reference  

### Backend Commands  
```bash
# Restore packages
dotnet restore

# Run migrations
dotnet ef database update

# Create new migration
dotnet ef migrations add MigrationName

# Run in watch mode
dotnet watch run

# Build for production
dotnet publish -c Release
```

### Frontend Commands  
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## 10. License & Contributing  

This project is licensed under the **Apache 2.0 License** — see [LICENSE](LICENSE) file for details.  

**Contributions are welcome!** Please feel free to submit Pull Requests.

---

✨ **Happy Building!** ✨