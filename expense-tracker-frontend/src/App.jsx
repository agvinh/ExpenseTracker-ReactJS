import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AddExpense from "./pages/AddExpense";
import EditExpense from "./pages/EditExpense";
import Navbar from "./components/Navbar";

// Create Material UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Listen for storage changes to update token state
  useEffect(() => {
    const handleStorageChange = () => {
      const newToken = localStorage.getItem("token");
      console.log("Token changed:", newToken);
      setToken(newToken);
    };
    
    // Custom event for same-tab updates
    window.addEventListener("tokenChanged", handleStorageChange);
    // Storage event for cross-tab updates
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("tokenChanged", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  console.log("App render - current token:", token);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={token ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/add"
            element={token ? <AddExpense /> : <Navigate to="/login" />}
          />
          <Route
            path="/edit/:id"
            element={token ? <EditExpense /> : <Navigate to="/login" />}
          />
          <Route
            path="/dashboard"
            element={token ? <Dashboard /> : <Navigate to="/login" />}
          />
          {/* Catch-all route - redirect to appropriate page */}
          <Route
            path="*"
            element={token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
