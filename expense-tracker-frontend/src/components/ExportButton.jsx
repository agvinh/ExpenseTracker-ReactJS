import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { GetApp, PictureAsPdf, TableChart } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ExportService from '../services/exportService';

const ExportButton = ({ expenses, variant = 'outlined', size = 'medium', disabled = false }) => {
  const { t, i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    if (disabled || !expenses || expenses.length === 0) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (format) => {
    setLoading(true);
    handleClose();

    try {
      const options = {
        locale: i18n.language
      };

      let result;
      if (format === 'pdf') {
        result = await ExportService.exportToPDF(expenses, options);
      } else {
        result = ExportService.exportToCSV(expenses, null, { locale: i18n.language, addBOM: true });
      }

      if (!result.success) {
        console.error('Export failed:', result.message);
        // You could show a toast/alert here
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = disabled || !expenses || expenses.length === 0 || loading;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={<GetApp />}
        onClick={handleClick}
        disabled={isDisabled}
        sx={{ borderRadius: 2 }}
      >
        {loading ? (t('exporting') || 'Exporting...') : (t('export') || 'Export')}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <TableChart fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export CSV" />
        </MenuItem>
        
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon>
            <PictureAsPdf fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export PDF" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportButton;