import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import UsuariosPage from './pages/UsuariosPage';
import ProyectosPage from './pages/ProyectosPage';
import RolesPage from './pages/RolesPage';
import ProyectoMiembrosPage from './pages/ProyectoMiembrosPage';
import DiagramasPage from './pages/DiagramasPage';
import EditorUmlPage from './pages/EditorUmlPage';
import EntrenamientoIaPage from './pages/EntrenamientoIaPage';

// ── Rutas protegidas ─────────────────────────────────────────────────

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// ── App principal ────────────────────────────────────────────────────

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Redirige la raiz segun autenticacion */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />

      {/* Login publico */}
      <Route path="/login" element={<LoginPage />} />

      {/* Editor UML a pantalla completa (protegido, fuera del DashboardLayout) */}
      <Route
        path="/editor/:diagramaId"
        element={
          <ProtectedRoute>
            <EditorUmlPage />
          </ProtectedRoute>
        }
      />

      {/* Dashboard protegido con layout + rutas anidadas */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="proyectos" replace />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="proyectos" element={<ProyectosPage />} />
        <Route path="proyectos/:proyectoId/miembros" element={<ProyectoMiembrosPage />} />
        <Route path="proyectos/:proyectoId/diagramas" element={<DiagramasPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="entrenamiento-ia" element={<EntrenamientoIaPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
