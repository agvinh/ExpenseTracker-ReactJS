import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  CircularProgress,
  Avatar,
  Chip,
  Stack
} from "@mui/material";
import { Save, ArrowBack, AutoAwesome, PhotoCamera } from "@mui/icons-material";
import api from "../api/axios";
import { formatAmountDisplay, parseAmountToNumber } from "../utils/currency";
import { extractAmountFromImage, formatExtractedAmount } from "../services/ocrService";

// Get API base URL without /api suffix for static files
const API_BASE_URL = import.meta.env.VITE_API_BASE.replace('/api', '');

export default function EditExpense() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expense, setExpense] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });
  const [newImage, setNewImage] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  // Dynamic validation schema with translations
  const createSchema = () => {
    return z.object({
      occurredAt: z.string().min(1, t("dateRequired")),
      amount: z.string()
        .min(1, t("amountRequired"))
        .refine((val) => {
          const num = parseAmountToNumber(val, i18n.language);
          return num > 0;
        }, t("amountMustBePositive"))
        .refine((val) => {
          const num = parseAmountToNumber(val, i18n.language);
          return Number.isInteger(num * 100);
        }, t("amountMaxDecimals")),
      category: z.string().min(1, t("categoryRequired")),
      description: z.string().optional(),
    });
  };

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(createSchema()),
    defaultValues: {
      occurredAt: "",
      amount: "",
      category: "",
      description: "",
    }
  });

  const watchedAmount = watch("amount");

  // Fetch expense details
  useEffect(() => {
    const fetchExpense = async () => {
      try {
        console.log('Fetching expense with ID:', id);
        const response = await api.get(`/expenses/${id}`);
        console.log('API response:', response.data);
        const expenseData = response.data;
        setExpense(expenseData);
        
        // Convert the date to the correct format for datetime-local input
        const date = new Date(expenseData.occurredAt);
        const formattedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        
        // Set form values
        console.log('Setting form values:', {
          occurredAt: formattedDate,
          amount: formatAmountDisplay(expenseData.amount, i18n.language),
          category: expenseData.category,
          description: expenseData.description
        });
        setValue("occurredAt", formattedDate);
        setValue("amount", formatAmountDisplay(expenseData.amount, i18n.language));
        setValue("category", expenseData.category);
        setValue("description", expenseData.description || "");
        
      } catch (error) {
        console.error('Failed to fetch expense:', error);
        console.error('Error details:', error.response?.data, error.response?.status);
        
        let errorMessage = t('failedToLoadDetails') || 'Failed to load expense details';
        if (error.response?.status === 401) {
          errorMessage = 'Authentication required. Please login again.';
        } else if (error.response?.status === 404) {
          errorMessage = 'Expense not found.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        setAlert({
          show: true,
          message: errorMessage,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchExpense();
    }
  }, [id, setValue, t, i18n.language]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const numericAmount = parseAmountToNumber(data.amount, i18n.language);
      const updateData = {
        occurredAt: new Date(data.occurredAt).toISOString(),
        amount: numericAmount,
        category: data.category.trim(),
        description: data.description?.trim() || "",
      };

      await api.put(`/expenses/${id}`, updateData);

      // Upload new image if selected
      if (newImage) {
        const formData = new FormData();
        formData.append("file", newImage);
        await api.post(`/expenses/${id}/bill-image`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      setAlert({
        show: true,
        message: t("expenseUpdated") || "Expense updated successfully",
        severity: "success"
      });

      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);

    } catch (error) {
      console.error('Failed to update expense:', error);
      setAlert({
        show: true,
        message: t("failedToUpdate") || "Failed to update expense",
        severity: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setNewImage(file);
      await handleOcrExtraction(file);
    }
  };

  // Handle OCR extraction
  const handleOcrExtraction = async (file) => {
    if (!file) return;
    
    setOcrLoading(true);
    setOcrResult(null);
    
    try {
      const result = await extractAmountFromImage(file);
      setOcrResult(result);
      
      if (result.success && result.extractedAmount) {
        // Auto-fill the amount field
        const formattedAmount = formatExtractedAmount(result.extractedAmount, i18n.language);
        setValue("amount", formattedAmount);
      }
    } catch (error) {
      console.error('OCR failed:', error);
      setAlert({
        show: true,
        message: t("ocrFailed") || "Failed to extract amount from image",
        severity: 'error'
      });
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, show: false });
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            {t("loadingDetails")}
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!expense) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Expense not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      {/* Alert */}
      {alert.show && (
        <Alert 
          severity={alert.severity} 
          onClose={handleCloseAlert}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Box display="flex" alignItems="center" mb={4}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/dashboard")}
          sx={{ mr: 2 }}
        >
          {t("back") || "Back"}
        </Button>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          {t("editExpense") || "Edit Expense"}
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Date & Time */}
            <Grid item xs={12}>
              <Controller
                name="occurredAt"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="datetime-local"
                    label={t("dateTime")}
                    fullWidth
                    error={!!errors.occurredAt}
                    helperText={errors.occurredAt?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            {/* Amount */}
            <Grid item xs={12}>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t("amount")}
                    fullWidth
                    error={!!errors.amount}
                    helperText={errors.amount?.message}
                    onChange={(e) => {
                      const formatted = formatAmountDisplay(e.target.value, i18n.language);
                      field.onChange(formatted);
                    }}
                  />
                )}
              />
              {watchedAmount && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {t("willBeSavedAs")} {parseAmountToNumber(watchedAmount, i18n.language)}
                </Typography>
              )}
            </Grid>

            {/* Category */}
            <Grid item xs={12}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t("category")}
                    placeholder={t("categoryPlaceholder")}
                    fullWidth
                    error={!!errors.category}
                    helperText={errors.category?.message}
                  />
                )}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t("description")}
                    placeholder={t("descriptionPlaceholder")}
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>

            {/* Current Bill Image */}
            {expense.billImageUrl && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Current {t("billImage")}:
                </Typography>
                <Avatar
                  src={`${API_BASE_URL}${expense.billImageUrl}`}
                  alt="Current bill"
                  sx={{ 
                    width: 100, 
                    height: 100, 
                    border: '2px solid',
                    borderColor: 'primary.main',
                    cursor: 'pointer'
                  }}
                  onClick={() => window.open(`${API_BASE_URL}${expense.billImageUrl}`, '_blank')}
                />
              </Grid>
            )}

            {/* New Bill Image Upload */}
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={{ p: 2, textAlign: 'left' }}
              >
                {newImage ? newImage.name : (expense.billImageUrl ? `Replace ${t("billImage")}` : t("billImage"))}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </Button>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                sx={{ 
                  py: 1.5, 
                  fontSize: '1.1rem',
                  borderRadius: 2
                }}
              >
                {saving ? t("saving") : t("updateExpense") || "Update Expense"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}