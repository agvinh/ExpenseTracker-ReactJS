import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Box,
  Alert,
  Typography,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { fetchAllExpenses } from '../services/expenseService';
import ExportService from '../services/exportService';

const ExportDialog = ({ open, onClose, expenses }) => {
  const { t, i18n } = useTranslation();
  const [exportFormat, setExportFormat] = useState('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customFilename, setCustomFilename] = useState('');
  const [useServerAll, setUseServerAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleExport = async () => {
    if (!expenses || expenses.length === 0) {
      setAlert({ type: 'error', message: 'No expenses to export' });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const dateRange = {
        startDate: startDate || null,
        endDate: endDate || null
      };

      const options = {
        filename: customFilename || null,
        locale: i18n.language
      };

      let result;
      let workingExpenses = expenses;

      // If user wants full server-side export (optionally with date filters) fetch first
      if (useServerAll) {
        const rangeParam = {
          startDate: startDate || null,
          endDate: endDate || null
        };
        workingExpenses = await fetchAllExpenses(rangeParam);
        if (!workingExpenses || workingExpenses.length === 0) {
          setAlert({ type: 'warning', message: t('noExpensesYet') || 'No expenses found for export' });
          setLoading(false);
          return;
        }
      }
      if (!useServerAll && (startDate || endDate)) {
        result = await ExportService.exportWithDateRange(workingExpenses, dateRange, exportFormat, options);
      } else {
        if (exportFormat === 'pdf') {
          result = await ExportService.exportToPDF(workingExpenses, options);
        } else {
          result = ExportService.exportToCSV(workingExpenses, options.filename, { locale: i18n.language, addBOM: true });
        }
      }

      if (result.success) {
        setAlert({ type: 'success', message: result.message });
        setTimeout(() => {
          onClose();
          setAlert(null);
        }, 2000);
      } else {
        setAlert({ type: 'error', message: result.message });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Export failed: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setAlert(null);
      setStartDate('');
      setEndDate('');
      setCustomFilename('');
    }
  };

  const exportStats = ExportService.getExportStats(expenses);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <DownloadIcon />
          {t('exportReports') || 'Export Reports'}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {alert && (
          <Alert severity={alert.type} sx={{ mb: 2 }}>
            {alert.message}
          </Alert>
        )}

        {/* Export Statistics */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            {t('exportStats') || 'Export Statistics'}
          </Typography>
          <Typography variant="body2">
            {t('totalExpenses') || 'Total Expenses'}: {exportStats.totalExpenses}
          </Typography>
          <Typography variant="body2">
            {t('totalAmount') || 'Total Amount'}: {exportStats.totalAmount?.toFixed(2)}
          </Typography>
          <Typography variant="body2">
            {t('categories') || 'Categories'}: {exportStats.categories.length}
          </Typography>
          {exportStats.dateRange.start && (
            <Typography variant="body2">
              {t('dateRange') || 'Date Range'}: {exportStats.dateRange.start.toLocaleDateString()} - {exportStats.dateRange.end.toLocaleDateString()}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Toggle server-side full export */}
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={<Radio checked={useServerAll} onChange={() => setUseServerAll(true)} />}
            label={t('exportAllServer') || 'Export ALL from server (ignore pagination)'}
          />
          <FormControlLabel
            control={<Radio checked={!useServerAll} onChange={() => setUseServerAll(false)} />}
            label={t('exportCurrentLoaded') || 'Export current loaded data'}
          />
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {useServerAll
              ? (t('exportAllHint') || 'Will call backend to fetch full list (with optional date filters).')
              : (t('exportCurrentHint') || 'Uses only the expenses already loaded in the dashboard.')}
          </Typography>
        </Box>

        {/* Export Format Selection */}
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">{t('exportFormat') || 'Export Format'}</FormLabel>
          <RadioGroup
            row
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <FormControlLabel
              value="csv"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <CsvIcon />
                  CSV
                </Box>
              }
            />
            <FormControlLabel
              value="pdf"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <PdfIcon />
                  PDF
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {/* Date Range Filter */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('dateRangeFilter') || 'Date Range Filter'} ({t('optional') || 'Optional'})
          </Typography>
          <Box display="flex" gap={2}>
            <TextField
              label={t('startDate') || 'Start Date'}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
            <TextField
              label={t('endDate') || 'End Date'}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
          </Box>
        </Box>

        {/* Custom Filename */}
        <TextField
          label={t('customFilename') || 'Custom Filename (Optional)'}
          value={customFilename}
          onChange={(e) => setCustomFilename(e.target.value)}
          fullWidth
          size="small"
          helperText={t('filenameHelper') || 'Leave empty for auto-generated filename'}
          sx={{ mb: 2 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('cancel') || 'Cancel'}
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={loading || !expenses || expenses.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
        >
          {loading ? (t('exporting') || 'Exporting...') : (t('export') || 'Export')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;