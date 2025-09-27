import { useState } from "react";
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
  Alert,
  ToggleButton,
  ToggleButtonGroup
} from "@mui/material";
import { LoginOutlined } from "@mui/icons-material";

export default function Login() {
  const { t, i18n } = useTranslation();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      console.log("Attempting login...");
      const res = await api.post("/auth/login", { userName, password });
      console.log("Login successful, response:", res.data);
      
      localStorage.setItem("token", res.data.token);
      console.log("Token saved to localStorage");
      
      // Trigger custom event to notify App component about token change
      window.dispatchEvent(new Event("tokenChanged"));
      console.log("tokenChanged event dispatched");
      
      console.log("Navigating to /add...");
      navigate("/add");
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LoginOutlined sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            {t("login")}
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

          {error && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
              fullWidth
              label={t("username")}
              variant="outlined"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <TextField
              fullWidth
              label={t("password")}
              type="password"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? "..." : t("login")}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
