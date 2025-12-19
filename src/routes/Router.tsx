import { Routes, Route, Navigate, Outlet, useNavigate, Link } from 'react-router-dom';
import { LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

// Views
import { LoginView } from '../features/auth/LoginView';
import { RegisterView } from '../features/auth/RegisterView';
import { DashboardView } from '../features/dashboard/DashboardView';
import { NewDealWizard } from '../features/deals/NewDealWizard';
import { DealDetailsView } from '../features/deals/DealDetailsView';
import { SettingsView } from '../features/settings/SettingsView';

const logoSrc = "/images/docsales-logo.png";

// Layout compartilhado para rotas protegidas
const AuthenticatedLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Persistent Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <img
              src={logoSrc}
              alt="DocSales Logo"
              className="h-10 object-contain"
            />
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-700">{user?.name}</span>
              <span className="text-xs text-slate-500">Imobiliária Premium</span>
            </div>
            
            {/* User Menu Dropdown com daisyUI */}
            <div className="cursor-pointer dropdown dropdown-end">
              <div tabIndex={0} role="button" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white border-2 border-white bg-gradient-to-br from-[#ef0474] to-[#085995] shadow-md">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-white rounded-box z-[1] w-52 p-2 shadow-lg border border-slate-100 mt-2">
                <li>
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configurações</span>
                  </Link>
                </li>
                <div className="divider my-0"></div>
                <li>
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-slate-100 rounded-md"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </div>
  );
};

// Componentes wrapper para usar useNavigate
const LoginViewWrapper = () => {
  const navigate = useNavigate();
  return <LoginView onNavigateToRegister={() => navigate('/register')} />;
};

const RegisterViewWrapper = () => {
  const navigate = useNavigate();
  return <RegisterView onNavigateToLogin={() => navigate('/login')} />;
};


export const AppRouter = () => {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginViewWrapper />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterViewWrapper />
          </PublicRoute>
        }
      />

      {/* Rotas protegidas com layout compartilhado */}
      <Route
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/deals/new" element={<NewDealWizard />} />
        <Route path="/deals/:id" element={<DealDetailsView />} />
        <Route path="/deals/:id/edit" element={<NewDealWizard />} />
        <Route path="/settings" element={<SettingsView />} />
      </Route>

      {/* Rota catch-all - redireciona para dashboard se autenticado, senão para login */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

