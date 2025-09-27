import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup
} from "@mui/material";
import { PersonAddOutlined } from "@mui/icons-material";

export default function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Create schema with i18n messages
  const schema = z.object({
    userName: z.string().min(3, t("usernameTooShort")),
    email: z.string().email(t("emailInvalid")),
    password: z.string().min(6, t("passwordTooShort")),
    confirmPassword: z.string().min(6, t("confirmPasswordTooShort")),
  }).refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: t("passwordsNotMatch"),
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } =
    useForm({ resolver: zodResolver(schema), mode: "onTouched" });

  async function onSubmit(values) {
    try {
      await api.post("/auth/register", {
        userName: values.userName,
        email: values.email,
        password: values.password,
      });
      navigate("/login");
    } catch {
      // map lỗi server (ví dụ "DuplicateUserName")
      setError("userName", { message: t("usernameOrEmailExists") });
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <PersonAddOutlined sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            {t("register")}
          </Typography>
          
          {/* Language Switcher */}
          <ToggleButtonGroup
            value={i18n.language}
            exclusive
            onChange={(e, newLang) => newLang && i18n.changeLanguage(newLang)}
            aria-label="language selection"
            sx={{ mb: 3 }}
          >
            <ToggleButton value="en" aria-label="english">
              EN
            </ToggleButton>
            <ToggleButton value="vi" aria-label="vietnamese">
              VI
            </ToggleButton>
          </ToggleButtonGroup>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: "100%" }} noValidate>
            <TextField
              fullWidth
              label={t("username")}
              variant="outlined"
              margin="normal"
              required
              disabled={isSubmitting}
              error={!!errors.userName}
              helperText={errors.userName?.message}
              {...register("userName")}
            />
            <TextField
              fullWidth
              label={t("email")}
              type="email"
              variant="outlined"
              margin="normal"
              required
              disabled={isSubmitting}
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email")}
            />
            <TextField
              fullWidth
              label={t("password")}
              type="password"
              variant="outlined"
              margin="normal"
              required
              disabled={isSubmitting}
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register("password")}
            />
            <TextField
              fullWidth
              label={t("confirmPassword")}
              type="password"
              variant="outlined"
              margin="normal"
              required
              disabled={isSubmitting}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "..." : t("register")}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}