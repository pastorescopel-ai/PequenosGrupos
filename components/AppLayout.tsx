
import React, { useState, useMemo } from 'react';
import { 
  X, Bell, User, LayoutGrid, Users, Camera, Menu, LogOut, ShieldCheck, Settings, Download, BarChart3, ArrowRight, HelpCircle, Database, FileText, Sliders, Clock
} from 'lucide-react';
import { Leader, MeetingSchedule, ChangeRequest } from '../types';
import HelpSystem from './HelpSystem';
import { GLOBAL_BRAND_LOGO } from '../assets_base64';
import { BRANDING } from '../config';

interface AppLayoutProps {
  currentUser: Leader;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleLogout: () => void;
  meetingSchedules: MeetingSchedule[];
  memberRequests: ChangeRequest[];
  onMarkRequestAsSeen: (id: string) => Promise<void>;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  currentUser, activeTab, setActiveTab, handleLogout, meetingSchedules, memberRequests = [], onMarkRequestAsSeen, children 
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const isAdmin = currentUser.role === 'ADMIN';

  const pendingRequestsCount = useMemo(() => {
    return memberRequests.filter(r => r.status === 'pending').length;
  }, [memberRequests]);

  const notifications = useMemo(() => {
      if (isAdmin) {
          const pendingMembers = memberRequests.filter(r => r.status === 'pending').map(r => ({ id: r.id, title: 'Novo Membro', desc: r.collaborator_name, type: 'member', targetTab: 'pending-approvals' }));
          const pendingChaplains = meetingSchedules.filter(s => s.request_chaplain && s.chaplain_status === 'pending').map(s => ({ id: s.id || s.leader_id, title: 'Convite Pastoral', desc: s.pg_name, type: 'chaplain', targetTab: 'chaplain-scale' }));
          return [...pendingMembers, ...pendingChaplains];
      } else {
          return memberRequests.filter(r => r.leader_id === currentUser.id && r.status !== 'pending' && r.seen_by_leader === false).map(r => ({ id: r.id, title: r.status === 'approved' ? 'Aprovado' : 'Recusado', desc: r.collaborator_name, type: 'result', status: r.status, targetTab: 'dashboard' }));
      }
  }, [isAdmin, memberRequests, meetingSchedules, currentUser.id]);

  const hospitalName = BRANDING.units[currentUser.hospital as keyof typeof BRANDING.units] || BRANDING.units['Belém'];

  const pageTitle = useMemo(() => {
    const titles: Record<string, string> = {
        'dashboard': 'Painel de Controle',
        'admin': 'Gestão de Líderes',
        'members': 'Gestão de Membros',
        'pending-approvals': 'Pendências de Vínculo',
        'chaplain-scale': 'Escala de Capelania',
        'meetings': 'Galeria de Fotos',
        'reports': 'Relatórios Mensais',
        'import': 'Importação de Dados',
        'settings': 'Ajustes do Sistema',
        'sys-admins': 'Administradores',
        'profile': 'Meu Perfil'
    };
    return titles[activeTab] || 'Sistema PG';
  }, [activeTab]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-row bg-[#f8fafc] font-sans">
      
      {/* SIDEBAR DESKTOP - OCUPA TODA A ALTURA DO LADO ESQUERDO */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-100 flex-col h-screen z-50 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        
        {/* BRANDING SECTION - TOP ABSOLUTO DA SIDEBAR */}
        <div className="px-8 pt-10 pb-10 flex flex-col items-center text-center bg-white border-b border-slate-50">
            <img src={GLOBAL_BRAND_LOGO} alt="Logo" className="h-16 w-auto object-contain mb-5 drop-shadow-md" />
            <div className="space-y-1">
                <p className="text-[14px] font-black text-slate-900 leading-tight uppercase tracking-tight">
                  {hospitalName}
                </p>
                <div className="flex items-center justify-center gap-2">
                    <div className="h-px w-4 bg-blue-200"></div>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em]">
                      {BRANDING.project}
                    </p>
                    <div className="h-px w-4 bg-blue-200"></div>
                </div>
            </div>
        </div>

        {/* NAVIGATION AREA */}
        <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <DesktopNavItem emoji="📊" label="Início" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <DesktopNavItem emoji="👥" label="Membros" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
          <DesktopNavItem emoji="📸" label="Galeria" active={activeTab === 'meetings'} onClick={() => setActiveTab('meetings')} />
          <DesktopNavItem emoji="👤" label="Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          
          {isAdmin && (
            <>
              <div className="h-px bg-slate-50 my-6 mx-4"></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-3">Diretoria</p>
              <DesktopNavItem 
                emoji="⏳" 
                label="Pendências" 
                active={activeTab === 'pending-approvals'} 
                onClick={() => setActiveTab('pending-approvals')} 
                badge={pendingRequestsCount > 0 ? pendingRequestsCount : undefined}
              />
              <DesktopNavItem emoji="👔" label="Líderes" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
              <DesktopNavItem emoji="🗓️" label="Escala" active={activeTab === 'chaplain-scale'} onClick={() => setActiveTab('chaplain-scale')} />
              <DesktopNavItem emoji="🖨️" label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
              <DesktopNavItem emoji="📥" label="Importar" active={activeTab === 'import'} onClick={() => setActiveTab('import')} />
              <DesktopNavItem emoji="⚙️" label="Configurar" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
              <DesktopNavItem emoji="🛡️" label="Admins" active={activeTab === 'sys-admins'} onClick={() => setActiveTab('sys-admins')} />
            </>
          )}
        </div>
        
        {/* FOOTER DA SIDEBAR (DADOS DO USUÁRIO) */}
        <div className="p-6 border-t border-slate-50 bg-slate-50/40">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-[12px] shadow-lg shadow-blue-100 border border-white/20">
                  {currentUser.full_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                 <p className="text-[11px] font-black text-slate-800 truncate">{currentUser.full_name}</p>
                 <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{currentUser.role}</p>
                 </div>
              </div>
           </div>
        </div>
      </aside>

      {/* CONTAINER DIREITO (HEADER + MAIN CONTENT) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER SUPERIOR - COMEÇA AO LADO DA SIDEBAR */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-4">
             <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">{pageTitle}</h2>
          </div>

          <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)} 
                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl shadow-sm btn-3d-press relative"
              >
                <span className={`text-xl emoji-3d ${notifications.length > 0 ? 'animate-swing-emoji' : 'grayscale opacity-30'}`}>🔔</span>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {notifications.length}
                  </span>
                )}
              </button>

              <button onClick={() => setShowHelp(true)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl shadow-sm btn-3d-press">
                <span className="text-xl emoji-3d">❓</span>
              </button>

              <div className="h-6 w-px bg-slate-200 mx-2"></div>

              <button onClick={handleLogout} className="h-10 px-4 flex items-center justify-center bg-red-50 border border-red-100 rounded-xl shadow-sm btn-3d-press gap-2 group">
                <span className="text-lg emoji-3d group-hover:scale-110 transition-transform">🚪</span>
                <span className="hidden md:block text-[9px] font-black uppercase text-red-600 tracking-widest">Sair</span>
              </button>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL - ROLÁVEL ABAIXO DO HEADER */}
        <main className="flex-1 overflow-y-auto overscroll-contain pb-32 md:pb-12 p-4 md:p-10 lg:p-12 custom-scrollbar bg-[#f8fafc]">
            <div className="max-w-6xl mx-auto">
                {children}
            </div>
        </main>
      </div>

      {/* MOBILE NAV (APENAS MOBILE) */}
      <nav className="md:hidden fixed bottom-nav-floating h-18 bg-white/90 border border-white/40 flex items-center justify-around z-[60] px-4 py-2">
        <BottomNavItem emoji="🏠" label="Início" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <BottomNavItem emoji="👥" label="Membros" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
        <BottomNavItem emoji="📸" label="Galeria" active={activeTab === 'meetings'} onClick={() => setActiveTab('meetings')} />
        <BottomNavItem 
            emoji="✨" 
            label="Menu" 
            active={showMobileMenu} 
            onClick={() => setShowMobileMenu(true)} 
            badge={isAdmin && notifications.length > 0}
        />
      </nav>

      {/* MOBILE DRAWER (APENAS MOBILE) */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="absolute bottom-6 left-4 right-4 bg-white rounded-[2.5rem] p-8 pb-10 animate-in slide-in-from-bottom-20 duration-500 shadow-3xl border border-white">
                <div className="flex justify-between items-center mb-8 text-left">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Administração</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{hospitalName}</p>
                    </div>
                    <button onClick={() => setShowMobileMenu(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {isAdmin ? (
                        <>
                            <Menu3DButton emoji="⏳" label="Pedidos" color="bg-orange-50" onClick={() => { setActiveTab('pending-approvals'); setShowMobileMenu(false); }} />
                            <Menu3DButton emoji="👔" label="Líderes" color="bg-blue-50" onClick={() => { setActiveTab('admin'); setShowMobileMenu(false); }} />
                            <Menu3DButton emoji="🗓️" label="Escala" color="bg-emerald-50" onClick={() => { setActiveTab('chaplain-scale'); setShowMobileMenu(false); }} />
                            <Menu3DButton emoji="🖨️" label="Relatórios" color="bg-indigo-50" onClick={() => { setActiveTab('reports'); setShowMobileMenu(false); }} />
                            <Menu3DButton emoji="📥" label="Importar" color="bg-purple-50" onClick={() => { setActiveTab('import'); setShowMobileMenu(false); }} />
                            <Menu3DButton emoji="⚙️" label="Config" color="bg-slate-50" onClick={() => { setActiveTab('settings'); setShowMobileMenu(false); }} />
                        </>
                    ) : (
                        <div className="col-span-2 p-10 text-center opacity-40 italic text-sm font-bold bg-slate-50 rounded-3xl">Acesso restrito.</div>
                    )}
                </div>
            </div>
        </div>
      )}

      {showHelp && <HelpSystem role={currentUser.role} onClose={() => setShowHelp(false)} />}
    </div>
  );
};

const DesktopNavItem = ({ emoji, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]' : 'hover:bg-slate-50 text-slate-500 hover:pl-6'}`}>
    <span className="text-2xl emoji-3d">{emoji}</span>
    <span className="text-[13px] font-black tracking-tight">{label}</span>
    {badge && (
      <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white">
        {badge}
      </span>
    )}
  </button>
);

const BottomNavItem = ({ emoji, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 flex-1 h-full transition-all relative ${active ? 'scale-110' : 'opacity-50'}`}>
    <div className={`text-2xl emoji-3d ${active ? 'animate-float' : 'grayscale'}`}>
        {emoji}
    </div>
    <span className={`text-[8px] font-black uppercase ${active ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
    {badge && <span className="absolute top-2 right-1/2 translate-x-3 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
  </button>
);

const Menu3DButton = ({ emoji, label, color, onClick }: any) => (
  <button onClick={onClick} className={`${color} p-6 rounded-3xl flex flex-col items-center justify-center gap-2 btn-3d-press border border-white shadow-sm`}>
    <span className="text-3xl emoji-3d">{emoji}</span>
    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">{label}</span>
  </button>
);

export default AppLayout;
