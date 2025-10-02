# Bill Image Path Refactoring

## Overview
Refactored the ExpenseTracker API to use relative paths instead of absolute paths for storing bill image locations in the database.

## Changes Made

### 1. ExpensesController.cs
- **Added helper method** `GetAbsoluteFilePath()` to convert relative paths to absolute paths for file operations
- **Modified `GetMyExpenses()`**: Returns relative paths directly instead of constructing URLs
- **Modified `ExportAll()`**: Returns relative paths directly instead of constructing URLs  
- **Modified `GetById()`**: Returns relative paths directly instead of constructing URLs
- **Enhanced `Delete()`**: Added logic to delete associated image files using relative path conversion
- **Updated `UploadBillImage()`**: 
  - Now stores relative paths in database (e.g., `/uploads/bill_123_abc.jpg`)
  - Uses helper method to convert to absolute paths for file operations
  - Improved error handling for file deletion operations

### 2. AppDbContext.cs
- **Added documentation** for `BillImagePath` property explaining it stores relative paths
- **Added configuration** for `BillImagePath` with `MaxLength(500)` constraint
- **Updated comments** to clarify the path format

### 3. Database Migration
- **Generated migration** `UpdateBillImagePathToRelative` 
- **Changed column type** from `nvarchar(max)` to `nvarchar(500)` for better performance
- **Applied migration** to update database schema

## Benefits

### 1. **Portability**
- Application can be moved between environments without path issues
- Database exports/imports work across different server configurations

### 2. **Flexibility** 
- Static file serving can be easily configured or changed
- Supports CDN integration in the future
- Works with different web root configurations

### 3. **Performance**
- Smaller database storage footprint
- Faster queries due to smaller column size (nvarchar(500) vs nvarchar(max))

### 4. **Maintainability**
- Single point of configuration for file path handling
- Easier to implement features like bulk file operations
- Simplified URL generation logic

## Path Format

### Before (Absolute Paths)
```
Database: C:\path\to\wwwroot\uploads\bill_123_abc.jpg
API Response: /uploads/bill_123_abc.jpg
```

### After (Relative Paths)
```  
Database: /uploads/bill_123_abc.jpg
API Response: /uploads/bill_123_abc.jpg
File Operations: C:\path\to\wwwroot\uploads\bill_123_abc.jpg (converted internally)
```

## API Behavior

### Upload Endpoint: `POST /api/expenses/{id}/bill-image`
- Saves file to `wwwroot/uploads/` directory
- Stores relative path `/uploads/{filename}` in database
- Returns relative path in response

### Get Endpoints: `GET /api/expenses`, `GET /api/expenses/{id}`, `GET /api/expenses/export`
- Returns relative paths directly from database
- Frontend can use these paths with the API base URL

### Delete Endpoint: `DELETE /api/expenses/{id}`
- Automatically deletes associated image file
- Converts relative path to absolute path for file system operations

## Migration Applied
```sql
ALTER TABLE [Expenses] ALTER COLUMN [BillImagePath] nvarchar(500) NULL
```

## Testing Recommendations
1. Test file upload and verify relative path storage
2. Test image retrieval through static file serving
3. Test expense deletion with image cleanup
4. Verify existing data compatibility after migration
5. Test with different web root configurations

## Future Enhancements
- Support for cloud storage (Azure Blob, AWS S3) while maintaining relative path concept
- Image optimization and multiple sizes
- Bulk image operations
- Image metadata storage