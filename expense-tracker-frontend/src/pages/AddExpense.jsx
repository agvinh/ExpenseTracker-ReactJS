// src/pages/AddExpense.jsx
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatAmountDisplay, parseAmountToNumber, getAllowedCharsRegex, getPlaceholderText } from "../utils/currency";
import { extractAmountFromImage, formatExtractedAmount } from "../services/ocrService";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Grid,
  CircularProgress,
  Chip,
  Stack
} from "@mui/material";
import { AddCircleOutlined, CloudUpload, AutoAwesome, PhotoCamera } from "@mui/icons-material";

export default function AddExpense() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const { t, i18n } = useTranslation();
  
  // Get current locale
  const currentLocale = i18n.language;

  // Create schema with i18n messages
  const schema = z.object({
    occurredAt: z.string().min(1, t("dateRequired")),
    amountDisplay: z.string().min(1, t("amountRequired")),
    category: z.string().min(1, t("categoryRequired")),
    description: z.string().optional(),
    file: z.any().optional(), // xử lý thủ công
  });

  const { register, handleSubmit, control, watch, setValue,
          formState: { errors, isSubmitting } } =
    useForm({ resolver: zodResolver(schema), mode: "onTouched",
      defaultValues: {
        occurredAt: new Date().toISOString().slice(0,16), // yyyy-MM-ddTHH:mm (input type="datetime-local")
        amountDisplay: "",
        category: "",
        description: "",
      }
    });

  const amountDisplay = watch("amountDisplay");

  // Handle OCR extraction
  const handleOcrExtraction = async (file) => {
    if (!file) return;
    
    setOcrLoading(true);
    setOcrResult(null);
    setServerError("");
    
    try {
      const result = await extractAmountFromImage(file);
      setOcrResult(result);
      
      if (result.success && result.extractedAmount) {
        // Auto-fill the amount field
        const formattedAmount = formatExtractedAmount(result.extractedAmount, currentLocale);
        setValue("amountDisplay", formattedAmount);
      }
    } catch (error) {
      console.error('OCR failed:', error);
      setServerError(t("ocrFailed") || "Failed to extract amount from image");
    } finally {
      setOcrLoading(false);
    }
  };

  // Handle file selection
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    
    if (file) {
      await handleOcrExtraction(file);
    }
  };

  async function onSubmit(values) {
    setServerError("");

    // 1) Parse amount
    const amount = parseAmountToNumber(values.amountDisplay, currentLocale);
    if (!isFinite(amount) || amount <= 0) {
      return alert(t("amountMustBePositive"));
    }
    // Giới hạn 2 chữ số thập phân
    if (Math.round(amount * 100) !== amount * 100) {
      return alert(t("amountMaxDecimals"));
    }

    try {
      // 2) Tạo Expense trước
      const createRes = await api.post("/expenses", {
        occurredAt: new Date(values.occurredAt),
        amount,
        category: values.category,
        description: values.description || null,
      });

      // 3) Upload ảnh nếu có
      const file = values.file?.[0];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/expenses/${createRes.data.id}/bill-image`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate("/");
    } catch {
      setServerError(t("failedToSave"));
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
          <AddCircleOutlined sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            {t("addExpense")}
          </Typography>
          
          {/* Language Switcher */}
          <ToggleButtonGroup
            value={i18n.language}
            exclusive
            onChange={(e, newLang) => newLang && i18n.changeLanguage(newLang)}
            aria-label="language selection"
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="en" aria-label="english">
              EN
            </ToggleButton>
            <ToggleButton value="vi" aria-label="vietnamese">
              VI
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {serverError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {serverError}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2.5}>
            {/* Date & Time - Full width */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t("dateTime")}
                type="datetime-local"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                disabled={isSubmitting}
                error={!!errors.occurredAt}
                helperText={errors.occurredAt?.message}
                {...register("occurredAt")}
              />
            </Grid>
            
            {/* Amount - Full width */}
            <Grid item xs={12}>
              <Controller
                name="amountDisplay"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    label={t("amount")}
                    variant="outlined"
                    placeholder={getPlaceholderText(currentLocale)}
                    value={field.value}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const formattedValue = formatAmountDisplay(rawValue, currentLocale);
                      field.onChange(formattedValue);
                    }}
                    onKeyDown={(e) => {
                      // Cho phép các phím điều hướng và xóa
                      if (e.key === 'Backspace' || e.key === 'Delete' || 
                          e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
                          e.key === 'Tab' || e.key === 'Enter') {
                        return;
                      }
                      // Cho phép ký tự theo locale
                      if (!getAllowedCharsRegex(currentLocale).test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    inputProps={{ inputMode: "decimal" }}
                    disabled={isSubmitting}
                    error={!!errors.amountDisplay}
                    helperText={
                      errors.amountDisplay?.message || 
                      `${t("willBeSavedAs")} ${isFinite(parseAmountToNumber(amountDisplay, currentLocale)) ? parseAmountToNumber(amountDisplay, currentLocale) : "—"}`
                    }
                  />
                )}
              />
            </Grid>

            {/* Category - Full width */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t("category")}
                variant="outlined"
                placeholder={t("categoryPlaceholder")}
                disabled={isSubmitting}
                error={!!errors.category}
                helperText={errors.category?.message}
                {...register("category")}
              />
            </Grid>

            {/* Description - Full width */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t("description")}
                variant="outlined"
                placeholder={t("descriptionPlaceholder")}
                disabled={isSubmitting}
                multiline
                rows={3}
                {...register("description")}
              />
            </Grid>

            {/* File Upload with OCR */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                {t("billImage")}
                <Chip 
                  icon={<AutoAwesome />} 
                  label="Auto Extract Amount" 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                  sx={{ ml: 1 }}
                />
              </Typography>
              
              <Button
                variant="outlined"
                component="label"
                startIcon={ocrLoading ? <CircularProgress size={20} /> : <PhotoCamera />}
                disabled={isSubmitting || ocrLoading}
                fullWidth
                sx={{ 
                  py: 2, 
                  borderStyle: 'dashed',
                  '&:hover': {
                    borderStyle: 'dashed',
                    backgroundColor: 'rgba(25, 118, 210, 0.04)'
                  }
                }}
              >
                {ocrLoading ? "Extracting amount..." : selectedFile ? selectedFile.name : "Choose Bill Image"}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileChange}
                  {...register("file")}
                />
              </Button>

              {/* OCR Results */}
              {ocrResult && (
                <Box sx={{ mt: 2 }}>
                  {ocrResult.success && ocrResult.extractedAmount ? (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Amount extracted:</strong> {formatExtractedAmount(ocrResult.extractedAmount, currentLocale)} VND
                      </Typography>
                    </Alert>
                  ) : ocrResult.success && ocrResult.possibleAmounts?.length > 0 ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        <strong>Multiple amounts found:</strong>
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {ocrResult.possibleAmounts.map((amount, index) => (
                          <Chip
                            key={index}
                            label={`${formatExtractedAmount(amount, currentLocale)} VND`}
                            size="small"
                            clickable
                            onClick={() => {
                              const formatted = formatExtractedAmount(amount, currentLocale);
                              setValue("amountDisplay", formatted);
                            }}
                            sx={{ mb: 1 }}
                          />
                        ))}
                      </Stack>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Click on an amount to use it
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Could not extract amount from image. Please enter manually.
                    </Alert>
                  )}
                </Box>
              )}
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isSubmitting}
                sx={{ 
                  py: 2, 
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  borderRadius: 2
                }}
              >
                {isSubmitting ? t("saving") : t("save")}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}
