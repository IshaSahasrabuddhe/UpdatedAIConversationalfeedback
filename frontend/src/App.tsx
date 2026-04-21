import type { ReactElement } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import AdminConversationDetailPage from "./pages/AdminConversationDetailPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: ReactElement }) {
  const { isAdminAuthenticated } = useAuth();
  return isAdminAuthenticated ? children : <Navigate to="/login?mode=admin" replace />;
}

function LoginRoute() {
  const location = useLocation();
  const { isAdminAuthenticated, isAuthenticated } = useAuth();
  const mode = new URLSearchParams(location.search).get("mode");

  if (mode === "admin") {
    return isAdminAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <LoginPage />;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/conversations/:conversationId"
        element={
          <AdminRoute>
            <AdminConversationDetailPage />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
