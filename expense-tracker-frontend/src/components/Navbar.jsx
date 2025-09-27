import { AppBar, Toolbar, Typography, Button, IconButton, Box } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Navbar() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const token = localStorage.getItem("token");

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        {/* Logo / App name */}
        <IconButton size="large" edge="start" color="inherit" sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ flexGrow: 1, textDecoration: "none", color: "inherit" }}
        >
          Expense Tracker
        </Typography>

        {/* Language toggle */}
        <Box sx={{ mr: 2 }}>
          <Button color="inherit" onClick={() => i18n.changeLanguage("en")}>EN</Button>
          <Button color="inherit" onClick={() => i18n.changeLanguage("vi")}>VI</Button>
        </Box>

        {/* Auth buttons */}
        {!token ? (
          <>
            <Button color="inherit" component={RouterLink} to="/login">
              {t("login")}
            </Button>
            <Button color="inherit" component={RouterLink} to="/register">
              {t("register")}
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" component={RouterLink} to="/add">
              {t("addExpense")}
            </Button>
            <Button color="inherit" onClick={handleLogout}>
              {t("logout")}
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
