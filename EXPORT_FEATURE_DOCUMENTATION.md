# Export Functionality Documentation

## Overview
The ExpenseTracker application now includes comprehensive export functionality that allows users to export their expense data in multiple formats (CSV and PDF) with advanced filtering and customization options.

## Features

### 1. Export Formats
- **CSV Export**: Tabular data export suitable for Excel, Google Sheets, or data analysis
- **PDF Export**: Professional report format with statistics and category breakdown

### 2. Export Options
- **Date Range Filtering**: Export expenses within specific date ranges
- **Custom Filenames**: Option to specify custom filenames for exported files
- **Multi-language Support**: Export respects current language settings (EN/VI)
- **Currency Formatting**: Proper currency formatting based on locale

### 3. Export Statistics
- Total number of expenses
- Total amount with proper currency formatting
- Number of categories
- Date range of expenses

## Implementation Details

### Core Components

#### 1. ExportService (`src/services/exportService.js`)
Main service class handling all export operations:

```javascript
import ExportService from '../services/exportService';

// Export to CSV
ExportService.exportToCSV(expenses, filename);

// Export to PDF
ExportService.exportToPDF(expenses, options);

// Export with date range
ExportService.exportWithDateRange(expenses, dateRange, format, options);
```

#### 2. ExportDialog (`src/components/ExportDialog.jsx`)
Full-featured export dialog with:
- Format selection (CSV/PDF)
- Date range filtering
- Custom filename input
- Export statistics display
- Progress indication

#### 3. ExportButton (`src/components/ExportButton.jsx`)
Quick export button with dropdown menu for immediate CSV/PDF export.

### Dependencies
```json
{
  "jspdf": "^2.5.1",
  "jspdf-autotable": "^3.6.0",
  "papaparse": "^5.4.1",
  "file-saver": "^2.0.5"
}
```

## Usage Examples

### 1. Using ExportDialog in Dashboard

```jsx
import ExportDialog from '../components/ExportDialog';

const [exportDialogOpen, setExportDialogOpen] = useState(false);

// In JSX
<ExportDialog
  open={exportDialogOpen}
  onClose={() => setExportDialogOpen(false)}
  expenses={expenses}
/>
```

### 2. Using ExportButton for Quick Export

```jsx
import ExportButton from '../components/ExportButton';

// In JSX
<ExportButton 
  expenses={expenses}
  variant="outlined"
  size="medium"
/>
```

### 3. Direct Service Usage

```javascript
import ExportService from '../services/exportService';

// Basic CSV export
const result = ExportService.exportToCSV(expenses, 'my-expenses.csv');

// PDF export with options
const pdfResult = ExportService.exportToPDF(expenses, {
  title: 'Monthly Expense Report',
  locale: 'vi'
});

// Export with date filtering
const filteredResult = ExportService.exportWithDateRange(
  expenses,
  { startDate: '2024-01-01', endDate: '2024-01-31' },
  'pdf',
  { title: 'January 2024 Report' }
);
```

## File Formats

### CSV Format
```csv
ID,Amount,Currency,Category,Description,Date,Created At,Has Bill Image
1,50000,VND,Food,Lunch at restaurant,1/15/2024,1/15/2024,Yes
2,120000,VND,Transport,Taxi fare,1/16/2024,1/16/2024,No
```

### PDF Features
- Professional header with title and generation date
- Summary statistics (total expenses, amount, categories)
- Formatted expense table with proper pagination
- Category breakdown section
- Proper currency formatting based on locale

## Internationalization Support

### English (en)
- Currency format: $1,234.56 or 1,234 VND
- Date format: MM/DD/YYYY
- Decimal separator: . (dot)
- Thousand separator: , (comma)

### Vietnamese (vi)
- Currency format: 1.234.456₫
- Date format: DD/MM/YYYY
- Decimal separator: , (comma)
- Thousand separator: . (dot)

## Error Handling

The export services include comprehensive error handling:

```javascript
const result = ExportService.exportToCSV(expenses);
if (result.success) {
  console.log(result.message); // "CSV exported successfully"
} else {
  console.error(result.message); // Error message
}
```

## Performance Considerations

1. **Large Datasets**: Export functions handle large expense lists efficiently
2. **Memory Management**: PDF generation uses streaming for large reports
3. **File Size Optimization**: CSV files are optimized for size and compatibility

## Browser Compatibility

- **Modern Browsers**: Full support for all features
- **File Download**: Uses FileSaver.js for cross-browser compatibility
- **PDF Generation**: Client-side PDF generation works in all modern browsers

## Customization Options

### PDF Customization
```javascript
const options = {
  filename: 'custom-report.pdf',
  title: 'Custom Expense Report',
  locale: 'vi'
};
```

### CSV Customization
```javascript
// Custom filename and data transformation
ExportService.exportToCSV(expenses, 'expenses-2024.csv');
```

## Future Enhancements

1. **Excel Export**: Native .xlsx format support
2. **Chart Integration**: Include charts in PDF reports
3. **Email Export**: Direct email functionality
4. **Cloud Export**: Integration with Google Drive, Dropbox
5. **Scheduled Exports**: Automated periodic exports
6. **Template System**: Customizable PDF templates

## Testing

### Manual Testing Checklist
- [ ] CSV export with various data sizes
- [ ] PDF export with different locales
- [ ] Date range filtering
- [ ] Custom filename functionality
- [ ] Error handling (empty data, invalid dates)
- [ ] Multi-language support
- [ ] Currency formatting

### Test Data Requirements
- Expenses with different categories
- Various date ranges
- Different currencies
- With and without bill images
- Special characters in descriptions

## Troubleshooting

### Common Issues

1. **Empty Export Files**
   - Check if expenses array is populated
   - Verify date range filters

2. **Incorrect Currency Formatting**
   - Ensure locale is set correctly
   - Check currency codes in expense data

3. **PDF Generation Errors**
   - Verify jsPDF dependencies are installed
   - Check for special characters in text

4. **Download Not Starting**
   - Check browser popup/download blockers
   - Verify FileSaver.js is working

### Debug Mode
Enable console logging to troubleshoot:
```javascript
console.log('Expenses to export:', expenses);
console.log('Export options:', options);
```