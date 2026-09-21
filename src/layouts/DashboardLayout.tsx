import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  LogOut,
  Zap,
  Menu,
  X,
  ChevronRight,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Ítem de navegación ───────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  soloAdmin?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard/proyectos', label: 'Proyectos', icon: <FolderKanban className="w-4 h-4" /> },
  { to: '/dashboard/usuarios',  label: 'Usuarios',  icon: <Users className="w-4 h-4" />, soloAdmin: true },
  { to: '/dashboard/roles',     label: 'Roles',     icon: <Shield className="w-4 h-4" />, soloAdmin: true },
  { to: '/dashboard/entrenamiento-ia', label: 'Entrenamiento IA', icon: <Sparkles className="w-4 h-4" />, soloAdmin: true },
];

// ── Componente principal ─────────────────────────────────────────────

const DashboardLayout: React.FC = () => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItemsVisibles = navItems.filter(
    (item) => !item.soloAdmin || usuario?.esAdministrador
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ── Sidebar (Estilo Linear/Vercel) ───────────────────────── */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-slate-900/80 backdrop-blur-md border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out z-20`}
      >
        {/* Logo + toggle */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-white font-bold text-sm tracking-tight">
                Nexus CASE
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
            title={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {navItemsVisibles.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              {item.icon}
              {sidebarOpen && (
                <>
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Usuario + cerrar sesión */}
        <div className="border-t border-white/10 p-3">
          {sidebarOpen && usuario && (
            <div className="flex items-center gap-2.5 px-2 py-2 mb-2 bg-white/[0.02] border border-white/5 rounded-xl">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                style={{ backgroundColor: usuario.colorCursor ?? '#6366f1' }}
              >
                {usuario.nombreCompleto.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate leading-tight">
                  {usuario.nombreCompleto}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    {usuario.rol}
                  </span>
                  {usuario.esAdministrador && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      ADMIN
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          <button
            id="btn-logout"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-150 cursor-pointer"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ──────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold text-sm sm:text-base tracking-tight">
              Nexus CASE
            </span>
            <span className="text-slate-600 text-xs hidden sm:inline">/</span>
            <span className="text-slate-400 text-xs hidden sm:inline font-medium">
              Panel de Control
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {usuario && (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
                  style={{ backgroundColor: usuario.colorCursor ?? '#6366f1' }}
                >
                  {usuario.nombreCompleto.charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-400 text-xs hidden sm:inline">
                  {usuario.nombreCompleto}
                </span>
              </div>
            )}
            <button
              id="btn-topbar-logout"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        {/* Página activa (renderizada por React Router <Outlet>) */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
