
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Menu, X, ArrowRight, AlertTriangle, CheckCircle2, AlertCircle, CalendarCheck, UsersRound, ShieldCheck
} from 'lucide-react';
import { Leader, MeetingSchedule, ChangeRequest, Sector, Collaborator } from '../types';
import HelpSystem from './HelpSystem';
import InstallButton from './InstallButton';
import { GLOBAL_BRAND_LOGO } from '../assets_base64';

interface AppLayoutProps {
  currentUser: Leader;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleLogout: () => void;
  meetingSchedules: MeetingSchedule[];
  memberRequests: ChangeRequest[];
  sectors?: Sector[];
  allCollaborators?: Collaborator[];
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  currentUser, activeTab, setActiveTab, handleLogout, meetingSchedules, memberRequests = [], sectors = [], allCollaborators = [], children 
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Início';
      case 'chaplain-scale': return 'Escala Pastoral';
      case 'members': return 'Membros';
      case 'reports': return 'Relatórios';
      case 'admin': return 'Líderes';
      case 'profile': return 'Perfil';
      case 'import': return 'Base de Dados';
      case 'settings': return 'Configurações';
      case 'sys-admins': return 'Administradores';
      default: return 'Pequenos Grupos';
    }
  };

  const pendingChaplainRequests = meetingSchedules.filter(s => s.request_chaplain && s.chaplain_status === 'pending').length;
  const pendingMemberRequests = memberRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen flex bg-[#f8fafc] font-sans text-left">
      <aside className="hidden md:flex w-72 bg-[#ffffff] border-r border-slate-100 flex-col sticky top-0 h-screen z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 border-b border-slate-50">
          <div className="mb-6">
            {GLOBAL_BRAND_LOGO ? (
              <img src={GLOBAL_BRAND_LOGO} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <div className="text-4xl filter drop-shadow-md">🏥</div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Hospital {currentUser.hospital}</p>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Pequenos Grupos</h1>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem emoji="📊" label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'CAPELAO') && (
            <NavItem emoji="🗓️" label="Escala Pastoral" active={activeTab === 'chaplain-scale'} onClick={() => setActiveTab('chaplain-scale')} badge={pendingChaplainRequests > 0 ? pendingChaplainRequests : undefined} />
          )}
          <NavItem emoji="👥" label="Membros" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
          <NavItem emoji="📸" label="Encontros" active={activeTab === 'meetings'} onClick={() => setActiveTab('meetings')} />
          <div className="h-px bg-slate-50 my-4"></div>
          {currentUser?.role === 'ADMIN' && (
            <div className="space-y-2">
              <NavItem emoji="👔" label="Líderes" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} badge={pendingMemberRequests > 0 ? pendingMemberRequests : undefined} />
              <NavItem emoji="🛡️" label="Admins" active={activeTab === 'sys-admins'} onClick={() => setActiveTab('sys-admins')} />
              <NavItem emoji="📥" label="Importação" active={activeTab === 'import'} onClick={() => setActiveTab('import')} />
              <NavItem emoji="🖨️" label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
              <NavItem emoji="⚙️" label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-50">
           <UserProfileBtn currentUser={currentUser} onClick={() => setActiveTab('profile')} active={activeTab === 'profile'} />
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="hidden md:flex h-24 bg-white/80 backdrop-blur-md border-b border-slate-100 px-10 items-center justify-between sticky top-0 z-20 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{getPageTitle()}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Pequenos Grupos • Hospital {currentUser?.hospital}</p>
          </div>
          <button onClick={handleLogout} className="group flex items-center gap-3 bg-white border border-slate-200 hover:bg-red-50 px-5 py-3 rounded-xl transition-all shadow-sm">
            <span className="text-xs font-black text-slate-700 group-hover:text-red-600">Sair</span>
            <div className="text-xl">🚪</div>
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#f8fafc]">
            {children}
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ emoji, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-200 group ${active ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'hover:bg-slate-50'}`}>
    <div className="flex items-center gap-4">
        <span className="text-xl">{emoji}</span>
        <span className={`text-[13px] font-bold tracking-tight transition-colors ${active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>{label}</span>
    </div>
    {badge && <span className="bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">{badge}</span>}
  </button>
);

const UserProfileBtn = ({ currentUser, onClick, active }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all border ${active ? 'bg-white border-slate-200 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}>
    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black overflow-hidden shrink-0 text-sm">
      {currentUser?.photo_url ? <img src={currentUser.photo_url} className="w-full h-full object-cover" alt="Perfil" /> : currentUser?.full_name.charAt(0)}
    </div>
    <div className="flex-1 min-w-0 text-left text-xs font-black truncate text-slate-800">
      {currentUser?.full_name}
    </div>
  </button>
);

export default AppLayout;
