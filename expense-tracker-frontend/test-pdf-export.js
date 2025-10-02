// Test script for PDF export functionality
import ExportService from './src/services/exportService.js';

// Sample Vietnamese expense data
const testExpenses = [
  {
    id: 1,
    amount: 123456,
    currency: 'VND',
    category: 'Ăn uống',
    description: 'Cơm trưa tại nhà hàng Việt Nam',
    occurredAt: '2025-10-01T12:00:00Z',
    billImagePath: null,
    createdAt: '2025-10-01T12:00:00Z'
  },
  {
    id: 2,
    amount: 67890,
    currency: 'VND',
    category: 'Di chuyển',
    description: 'Taxi từ sân bay về nhà',
    occurredAt: '2025-10-02T08:30:00Z',
    billImagePath: 'bill.jpg',
    createdAt: '2025-10-02T08:30:00Z'
  }
];

// Test PDF export
console.log('Testing PDF export with Vietnamese text...');
const result = ExportService.exportToPDF(testExpenses, {
  title: 'Báo cáo chi tiêu tháng 10',
  filename: 'test-vietnamese-export.pdf'
});

console.log('Export result:', result);