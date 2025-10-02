// Centralized export-related translations to reuse across app (CSV/PDF exports)
export const exportTranslations = {
  en: {
    expenseReport: 'Expense Report',
    generatedOn: 'Generated on',
    totalExpenses: 'Total Expenses',
    totalAmount: 'Total Amount',
    categories: 'Categories',
    categoryBreakdown: 'Category Breakdown',
    yes: 'Yes',
    no: 'No',
    exportHeaders: {
      id: 'ID',
      amount: 'Amount',
      currency: 'Currency',
      category: 'Category',
      description: 'Description',
      date: 'Date',
      createdAt: 'Created At',
      hasBill: 'Has Bill'
    },
    exportCategoryHeaders: {
      category: 'Category',
      count: 'Count',
      totalAmount: 'Total Amount'
    }
  },
  vi: {
    expenseReport: 'Báo cáo chi tiêu',
    generatedOn: 'Được tạo vào',
    totalExpenses: 'Tổng số chi tiêu',
    totalAmount: 'Tổng số tiền',
    categories: 'Danh mục',
    categoryBreakdown: 'Phân tích theo danh mục',
    yes: 'Có',
    no: 'Không',
    exportHeaders: {
      id: 'ID',
      amount: 'Số tiền',
      currency: 'Tiền tệ',
      category: 'Danh mục',
      description: 'Mô tả',
      date: 'Ngày',
      createdAt: 'Ngày tạo',
      hasBill: 'Có hóa đơn'
    },
    exportCategoryHeaders: {
      category: 'Danh mục',
      count: 'Số lượng',
      totalAmount: 'Tổng tiền'
    }
  }
};

export default exportTranslations;
