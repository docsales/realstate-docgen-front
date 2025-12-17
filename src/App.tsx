import { useState, useEffect } from 'react';
import { LogOut, Settings, ChevronDown } from 'lucide-react';
import { LoginView } from './features/auth/LoginView';
import { RegisterView } from './features/auth/RegisterView';
import { DashboardView } from './features/dashboard/DashboardView';
import { NewDealWizard } from './features/deals/NewDealWizard';
import { DealDetailsView } from './features/deals/DealDetailsView';
import { SettingsView } from './features/settings/SettingsView';
import { useAuth } from './hooks/useAuth';

const logoSrc = "/images/docsales-logo.png";

export default function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [view, setView] = useState<'dashboard' | 'new-deal' | 'edit-deal' | 'deal-details' | 'settings'>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // Reset view to dashboard when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      setView('dashboard');
    }
  }, [isAuthenticated]);

  const handleDealClick = (dealId: string) => {
    setSelectedDealId(dealId);
    setView('deal-details');
  };

  const handleBackToDashboard = () => {
    setSelectedDealId(null);
    setView('dashboard');
  };

  const handleEditDeal = (dealId: string) => {
    setSelectedDealId(dealId);
    setView('edit-deal');
  };

  // Auth Flow
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterView onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <LoginView onNavigateToRegister={() => setAuthView('register')} />;
  }

  // Authenticated Flow
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Persistent Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
            <img
              src={logoSrc}
              alt="DocSales Logo"
              className="h-10 object-contain"
            />
          </div>
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
                  <button
                    onClick={() => setView('settings')}
                    className="flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configurações</span>
                  </button>
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

      {/* Main Content Router */}
      <main className="min-h-[calc(100vh-64px)]">
        {view === 'dashboard' && <DashboardView onNewDeal={() => setView('new-deal')} onDealClick={handleDealClick} />}
        {view === 'new-deal' && (
          <NewDealWizard
            onCancel={() => setView('dashboard')}
            onFinish={() => setView('dashboard')}
          />
        )}
        {view === 'edit-deal' && selectedDealId && (
          <NewDealWizard
            dealId={selectedDealId}
            onCancel={handleBackToDashboard}
            onFinish={handleBackToDashboard}
          />
        )}
        {view === 'deal-details' && selectedDealId && (
          <DealDetailsView 
            dealId={selectedDealId} 
            onBack={handleBackToDashboard}
            onEdit={handleEditDeal}
          />
        )}
        {view === 'settings' && (
          <SettingsView onBack={handleBackToDashboard} />
        )}
      </main>
    </div>
  );
}