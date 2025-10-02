import { useEffect, useState } from "react";
import api from "../api/axios";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Grid
} from "@mui/material";
import { Add, Receipt, Visibility, Edit, Delete, GetApp } from "@mui/icons-material";
import ExportDialog from "../components/ExportDialog";

// Base URL for static images (remove trailing /api if present)
const API_BASE_URL = import.meta.env.VITE_API_BASE?.replace(/\/?api\/?$/,'') || '';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [sortBy, setSortBy] = useState('occurredAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseDetails, setExpenseDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });

  useEffect(() => {
    api.get("/expenses").then((res) => {
      console.log('Dashboard expenses loaded:', res.data);
      setExpenses(res.data);
    }).catch(error => {
      console.error('Failed to load expenses:', error);
    });
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return amount.toLocaleString("vi-VN") + "₫";
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'occurredAt') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle view expense details
  const handleViewDetails = async (expense) => {
    setSelectedExpense(expense);
    setLoadingDetails(true);
    setViewDialogOpen(true);
    
    try {
      const response = await api.get(`/expenses/${expense.id}`);
      setExpenseDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch expense details:', error);
      setAlert({
        show: true,
        message: t('failedToLoadDetails') || 'Failed to load expense details',
        severity: 'error'
      });
      setViewDialogOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle edit expense
  const handleEdit = (expense) => {
    // Navigate to edit page (we'll create this later)
    navigate(`/edit/${expense.id}`);
  };

  // Handle delete expense
  const handleDeleteClick = (expense) => {
    setSelectedExpense(expense);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExpense) return;
    
    setDeleteLoading(true);
    try {
      await api.delete(`/expenses/${selectedExpense.id}`);
      
      // Remove from local state
      setExpenses(expenses.filter(e => e.id !== selectedExpense.id));
      
      setAlert({
        show: true,
        message: t('deleteSuccess'),
        severity: 'success'
      });
      
      setDeleteDialogOpen(false);
      setSelectedExpense(null);
    } catch (error) {
      console.error('Failed to delete expense:', error);
      setAlert({
        show: true,
        message: t('deleteFailed'),
        severity: 'error'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Close dialogs
  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedExpense(null);
    setExpenseDetails(null);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedExpense(null);
  };

  // Close alert
  const handleCloseAlert = () => {
    setAlert({ ...alert, show: false });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          {t("expenses")}
        </Typography>
        <Box display="flex" gap={2}>
          {expenses.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={() => setExportDialogOpen(true)}
              size="large"
              sx={{ borderRadius: 2 }}
            >
              {t("export") || "Export"}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            component={Link}
            to="/add"
            size="large"
            sx={{ borderRadius: 2 }}
          >
            {t("addExpense")}
          </Button>
        </Box>
      </Box>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t("noExpensesYet")}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t("startTrackingExpenses")}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            component={Link}
            to="/add"
          >
            {t("addExpense")}
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
          <Table sx={{ minWidth: 650 }} aria-label="expenses table">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortBy === 'occurredAt'}
                    direction={sortBy === 'occurredAt' ? sortOrder : 'asc'}
                    onClick={() => handleSort('occurredAt')}
                    sx={{ 
                      color: 'white !important',
                      '& .MuiTableSortLabel-icon': { color: 'white !important' }
                    }}
                  >
                    {t("tableHeaders.dateTime")}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortBy === 'category'}
                    direction={sortBy === 'category' ? sortOrder : 'asc'}
                    onClick={() => handleSort('category')}
                    sx={{ 
                      color: 'white !important',
                      '& .MuiTableSortLabel-icon': { color: 'white !important' }
                    }}
                  >
                    {t("tableHeaders.category")}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">
                  <TableSortLabel
                    active={sortBy === 'amount'}
                    direction={sortBy === 'amount' ? sortOrder : 'asc'}
                    onClick={() => handleSort('amount')}
                    sx={{ 
                      color: 'white !important',
                      '& .MuiTableSortLabel-icon': { color: 'white !important' }
                    }}
                  >
                    {t("tableHeaders.amount")}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t("tableHeaders.description")}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">{t("tableHeaders.billImage")}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">{t("tableHeaders.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedExpenses.map((expense) => (
                <TableRow 
                  key={expense.id}
                  sx={{ 
                    '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                    '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {formatDate(expense.occurredAt)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip 
                      label={expense.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ fontWeight: 'medium' }}
                    />
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: 'primary.main',
                        fontSize: '1.1rem'
                      }}
                    >
                      {formatAmount(expense.amount)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={expense.description}
                    >
                      {expense.description || '—'}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center">
                    {expense.billImageUrl ? (
                      <Avatar
                        src={`${API_BASE_URL}/uploads/${expense.billImageUrl}`}
                        alt="bill"
                        sx={{ 
                          width: 50, 
                          height: 50, 
                          border: '2px solid',
                          borderColor: 'primary.main',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(`${API_BASE_URL}/uploads/${expense.billImageUrl}`, '_blank')}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t("noImage")}
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell align="center">
                    <Box display="flex" gap={1} justifyContent="center">
                      <Tooltip title={t("viewDetails")}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleViewDetails(expense)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("edit")}>
                        <IconButton 
                          size="small" 
                          color="secondary"
                          onClick={() => handleEdit(expense)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("delete")}>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteClick(expense)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Alert */}
      {alert.show && (
        <Alert 
          severity={alert.severity} 
          onClose={handleCloseAlert}
          sx={{ 
            position: 'fixed', 
            top: 20, 
            right: 20, 
            zIndex: 9999,
            minWidth: 300
          }}
        >
          {alert.message}
        </Alert>
      )}

      {/* View Details Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t("expenseDetails")}</DialogTitle>
        <DialogContent>
          {loadingDetails ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                {t("loadingDetails")}
              </Typography>
            </Box>
          ) : expenseDetails ? (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("dateTime")}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {formatDate(expenseDetails.occurredAt)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("amount")}
                </Typography>
                <Typography variant="h6" color="primary" gutterBottom>
                  {formatAmount(expenseDetails.amount)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("category")}
                </Typography>
                <Chip 
                  label={expenseDetails.category} 
                  color="primary" 
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("description")}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {expenseDetails.description || '—'}
                </Typography>
              </Grid>
              
              {expenseDetails.billImageUrl && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t("billImage")}
                  </Typography>
                  <Box
                    component="img"
                    src={`${API_BASE_URL}/uploads/${expenseDetails.billImageUrl}`}
                    alt="Bill"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 400,
                      objectFit: 'contain',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(`${API_BASE_URL}/uploads/${expenseDetails.billImageUrl}`, '_blank')}
                  />
                </Grid>
              )}
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>{t("close")}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("confirmDelete")}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {t("deleteConfirmation")}
          </Typography>
          {selectedExpense && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {formatDate(selectedExpense.occurredAt)} - {selectedExpense.category}
              </Typography>
              <Typography variant="h6" color="primary">
                {formatAmount(selectedExpense.amount)}
              </Typography>
              {selectedExpense.description && (
                <Typography variant="body2" color="text.secondary">
                  {selectedExpense.description}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDeleteDialog}
            disabled={deleteLoading}
          >
            {t("cancel")}
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : null}
          >
            {deleteLoading ? t("deleting") || "Deleting..." : t("confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        expenses={expenses}
      />
    </Container>
  );
}
