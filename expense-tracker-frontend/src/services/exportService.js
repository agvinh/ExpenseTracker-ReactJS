import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { exportTranslations } from '../locales/exportTranslations';

// Centralized export translations import
const translations = exportTranslations;

// --- Unicode Font Handling (Vietnamese Support) ---
// We'll lazy-load a Unicode font (DejaVu Sans or fallback Roboto) placed under /public/fonts/
// Put a font file (e.g. DejaVuSans.ttf) in: public/fonts/DejaVuSans.ttf
// DejaVu Sans license: Bitstream Vera / DejaVu (permissive) – safe to bundle.
const UNICODE_FONT_FILENAME = 'DejaVuSans.ttf';
const UNICODE_FONT_NAME = 'DejaVuSans';
let unicodeFontLoaded = false; // cache flag

async function ensureUnicodeFont(doc) {
  if (unicodeFontLoaded) return;
  try {
    const url = `/fonts/${UNICODE_FONT_FILENAME}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load font: ${url}`);
    const buffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    // Convert to base64
    let binary = '';
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    const base64 = btoa(binary);
    // Register into jsPDF VFS
    doc.addFileToVFS(UNICODE_FONT_FILENAME, base64);
    // Register normal + bold (reuse same glyphs for bold if only regular file present)
    doc.addFont(UNICODE_FONT_FILENAME, UNICODE_FONT_NAME, 'normal');
    doc.addFont(UNICODE_FONT_FILENAME, UNICODE_FONT_NAME, 'bold');
    unicodeFontLoaded = true;
  } catch (e) {
    console.warn('[PDF] Unicode font load failed, falling back to Helvetica. Diacritics may break.', e);
  }
}

const configureDocument = async (doc, locale) => {
  doc.setLanguage(locale === 'vi' ? 'vi' : 'en');
  try {
    await ensureUnicodeFont(doc);
    if (unicodeFontLoaded) {
      doc.setFont(UNICODE_FONT_NAME, 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }
  } catch {
    doc.setFont('helvetica', 'normal');
  }
};

// Clean text (remove invisible control chars) but KEEP Vietnamese diacritics intact.
const sanitizeText = (text) => {
  if (text == null) return '';
  return text.toString()
    .replace(/\u200b|\u200c|\u200d|\ufeff/g, '');
};

// Currency formatter – we now allow using the ₫ symbol when font is loaded.
const formatCurrencyForPDF = (amount, currency = 'VND', locale = 'en') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }

  const numAmount = Number(amount);

  if (currency === 'VND') {
    if (locale === 'vi') {
      // Vietnamese formatted number with dot thousand separator
      const formatted = numAmount.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      return `${formatted} ₫`;
    } else {
      const formatted = numAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      return `${formatted} ₫`;
    }
  } else if (currency === 'USD') {
    // Format as: $123,456.78
    const formatted = numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `$${formatted}`;
  } else {
    // Other currencies
    const formatted = numAmount.toLocaleString('en-US');
    return `${formatted} ${currency}`;
  }
};

export class ExportService {
  // Helper to detect whether an expense has an attached bill image. Backend sends billImageUrl.
  static hasBill(expense) {
    if (!expense) return false;
    // Support multiple property name variants just in case.
    return !!(expense.billImageUrl || expense.billImagePath || expense.billImageURL || expense.billImage);
  }
  /**
   * Export expenses to CSV format
   * @param {Array} expenses - Array of expense objects
   * @param {string} filename - Optional filename (default: expenses-YYYY-MM-DD.csv)
   */
  static exportToCSV(expenses, filename = null, options = {}) {
    try {
      const {
        addBOM = true,               // Excel nhận UTF-8
        excelLocaleMode = false,     // Dùng ; nếu Excel locale dùng dấu phẩy cho thập phân
        locale = 'en'
      } = options;
      const t = translations[locale] || translations.en;

      const delimiter = excelLocaleMode ? ';' : ',';

      // Localized header labels
      const headers = {
        id: t.exportHeaders.id,
        amount: t.exportHeaders.amount,
        currency: t.exportHeaders.currency,
        category: t.exportHeaders.category,
        description: t.exportHeaders.description,
        date: t.exportHeaders.date,
        hasBill: t.exportHeaders.hasBill
      };

  const yesLabel = t.yes;
  const noLabel = t.no;

      const csvData = expenses.map(expense => ({
        [headers.id]: expense.id,
        [headers.amount]: expense.amount,
        [headers.currency]: expense.currency,
        [headers.category]: expense.category,
        [headers.description]: expense.description,
        [headers.date]: new Date(expense.occurredAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : undefined),
        [headers.hasBill]: ExportService.hasBill(expense) ? yesLabel : noLabel
      }));

      let csv = Papa.unparse(csvData, {
        header: true,
        delimiter,
        quotes: true
      });

      if (addBOM) {
        csv = '\uFEFF' + csv;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const defaultFilename = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, filename || defaultFilename);
      return { success: true, message: 'CSV exported successfully' };
    } catch (error) {
      console.error('CSV Export Error:', error);
      return { success: false, message: 'Failed to export CSV: ' + error.message };
    }
  }

  /**
   * Export expenses to PDF format
   * @param {Array} expenses - Array of expense objects
   * @param {Object} options - Export options
   */
  static async exportToPDF(expenses, options = {}) {
    try {
      const {
        filename = null,
        title = 'Expense Report',
        locale = 'en'
      } = options;

      // Get translations for the current locale
      const t = translations[locale] || translations.en;

      // Create and configure PDF document
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      await configureDocument(doc, locale);
  const activeFont = unicodeFontLoaded ? UNICODE_FONT_NAME : 'helvetica';
      
      // Add title
      doc.setFontSize(18);
  doc.setFont(activeFont, 'bold');
  const reportTitle = title === 'Expense Report' ? t.expenseReport : sanitizeText(title);
  doc.text(reportTitle, 14, 22, { baseline: 'alphabetic' });
      
      // Add generation date
      doc.setFontSize(12);
  doc.setFont(activeFont, 'normal');
  doc.text(`${t.generatedOn}: ${new Date().toLocaleDateString(locale === 'vi' ? 'vi-VN' : undefined)}`, 14, 32);
      
      // Add summary statistics
      const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      const totalExpenses = expenses.length;
      const categories = [...new Set(expenses.map(exp => exp.category))];
      
      doc.setFontSize(10);
  doc.setFont(activeFont, 'normal');
  doc.text(`${t.totalExpenses}: ${totalExpenses}`, 14, 42);
  doc.text(`${t.totalAmount}: ${formatCurrencyForPDF(totalAmount, expenses[0]?.currency || 'USD', locale)}`, 14, 48);
  doc.text(`${t.categories}: ${categories.length}`, 14, 54);

      // Prepare table data with proper text handling
      const tableData = expenses.map(expense => [
        expense.id,
        formatCurrencyForPDF(expense.amount, expense.currency, locale),
        sanitizeText(expense.category),
        sanitizeText(expense.description?.substring(0, 60) + (expense.description?.length > 60 ? '…' : '')),
        new Date(expense.occurredAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : undefined),
        ExportService.hasBill(expense) ? t.yes : t.no
      ]);

      // Add table with translated headers
      autoTable(doc, {
        head: [[t.exportHeaders.id, t.exportHeaders.amount, t.exportHeaders.category, t.exportHeaders.description, t.exportHeaders.date, t.exportHeaders.hasBill]],
        body: tableData,
        startY: 65,
        styles: {
          font: activeFont,
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          font: activeFont,
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 65 },
      });

      // Add category breakdown if there are multiple categories
      if (categories.length > 1) {
        const categoryBreakdown = categories.map(category => {
          const categoryExpenses = expenses.filter(exp => exp.category === category);
          const categoryTotal = categoryExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
          return [
            sanitizeText(category),
            categoryExpenses.length,
            formatCurrencyForPDF(categoryTotal, expenses[0]?.currency || 'USD', locale)
          ];
        });

        // Add category breakdown table
        const finalY = doc.lastAutoTable?.finalY || 65;
  doc.setFontSize(14);
  doc.setFont(activeFont, 'bold');
  doc.text(t.categoryBreakdown, 14, finalY + 20);

        autoTable(doc, {
          head: [[t.exportCategoryHeaders.category, t.exportCategoryHeaders.count, t.exportCategoryHeaders.totalAmount]],
          body: categoryBreakdown,
          startY: finalY + 30,
          styles: {
            font: activeFont,
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: {
            font: activeFont,
            fillColor: [52, 152, 219],
            textColor: 255,
            fontStyle: 'bold',
          },
        });
      }

      // Save the PDF
      const defaultFilename = `expense-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename || defaultFilename);

      return { success: true, message: 'PDF exported successfully' };
    } catch (error) {
      console.error('PDF Export Error:', error);
      return { success: false, message: 'Failed to export PDF: ' + error.message };
    }
  }

  /**
   * Export expenses with date range filtering
   * @param {Array} expenses - Array of expense objects
   * @param {Object} dateRange - { startDate, endDate }
   * @param {string} format - 'csv' or 'pdf'
   * @param {Object} options - Additional options
   */
  static async exportWithDateRange(expenses, dateRange, format = 'csv', options = {}) {
    try {
      let filteredExpenses = expenses;

      // Filter by date range if provided
      if (dateRange.startDate && dateRange.endDate) {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        
        filteredExpenses = expenses.filter(expense => {
          const expenseDate = new Date(expense.occurredAt);
          return expenseDate >= startDate && expenseDate <= endDate;
        });
      }

      if (filteredExpenses.length === 0) {
        return { success: false, message: 'No expenses found in the selected date range' };
      }

      // Generate filename with date range
      const startDateStr = dateRange.startDate ? new Date(dateRange.startDate).toISOString().split('T')[0] : 'all';
      const endDateStr = dateRange.endDate ? new Date(dateRange.endDate).toISOString().split('T')[0] : 'all';
      const filename = `expenses-${startDateStr}-to-${endDateStr}.${format}`;

      // Export based on format
      if (format === 'pdf') {
        const locale = options.locale || 'en';
        const t = translations[locale] || translations.en;
        const pdfOptions = {
          ...options,
          filename,
          title: `${t.expenseReport} (${startDateStr} - ${endDateStr})`
        };
  return await this.exportToPDF(filteredExpenses, pdfOptions);
      } else {
        return this.exportToCSV(filteredExpenses, filename);
      }
    } catch (error) {
      console.error('Export with date range error:', error);
      return { success: false, message: 'Failed to export: ' + error.message };
    }
  }

  /**
   * Get export statistics
   * @param {Array} expenses - Array of expense objects
   */
  static getExportStats(expenses) {
    if (!expenses || expenses.length === 0) {
      return {
        totalExpenses: 0,
        totalAmount: 0,
        categories: [],
        dateRange: { start: null, end: null }
      };
    }

    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const categories = [...new Set(expenses.map(exp => exp.category))];
    const dates = expenses.map(exp => new Date(exp.occurredAt)).sort((a, b) => a - b);

    return {
      totalExpenses: expenses.length,
      totalAmount,
      categories,
      dateRange: {
        start: dates[0],
        end: dates[dates.length - 1]
      }
    };
  }
}

export default ExportService;