
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Visão Geral';
      case 'chaplain-scale': return 'Escala Pastoral';
      case 'members': return 'Membros do PG';
      case 'reports': return 'Relatórios';
      case 'admin': return 'Gestão de Líderes';
      case 'sys-admins': return 'Administradores';
      case 'import': return 'Importação de Dados';
      case 'settings': return 'Configurações';
      case 'profile': return 'Meu Perfil';
      default: return 'PGs';
    }
  };

  const pendingChaplainRequests = meetingSchedules.filter(s => s.request_chaplain && s.chaplain_status === 'pending').length;
  const pendingMemberRequests = memberRequests.filter(r => r.status === 'pending').length;
  const leaderResponseNotifications = currentUser.role === 'LIDER' 
    ? memberRequests.filter(r => r.status === 'rejected' || r.status === 'approved') 
    : [];

  const sectorConflictsCount = useMemo(() => {
      if (currentUser.role !== 'ADMIN' || sectors.length === 0 || allCollaborators.length === 0) return 0;
      const validSectorNames = new Set(sectors.map(s => s.name.trim().toLowerCase()));
      return allCollaborators.filter(c => c.active && !validSectorNames.has(c.sector_name.trim().toLowerCase())).length;
  }, [sectors, allCollaborators, currentUser.role]);
  
  const rawNotificationsList = useMemo(() => {
      const list = [];
      if (currentUser.role === 'ADMIN' || currentUser.role === 'CAPELAO') {
          if (pendingChaplainRequests > 0) {
              list.push({
                  id: `chaplain-req-${pendingChaplainRequests}`, 
                  type: 'ESCALA',
                  text: `${pendingChaplainRequests} pedido(s) pendente(s)`,
                  targetTab: 'chaplain-scale',
                  color: 'text-blue-600 bg-blue-50',
                  icon: <CalendarCheck size={16} className="text-blue-600"/>
              });
          }
      }
      if (currentUser.role === 'ADMIN') {
          if (pendingMemberRequests > 0) {
              list.push({
                  id: `member-req-${pendingMemberRequests}`,
                  type: 'MEMBROS',
                  text: `${pendingMemberRequests} solicitação(ões) pendente(s)`,
                  targetTab: 'admin',
                  color: 'text-orange-600 bg-orange-50',
                  icon: <UsersRound size={16} className="text-orange-600"/>
              });
          }
          if (sectorConflictsCount > 0) {
              list.push({
                  id: `sector-conflict-${sectorConflictsCount}`,
                  type: 'ALERTA DE DADOS',
                  text: `${sectorConflictsCount} setores não cadastrados.`,
                  targetTab: 'import',
                  color: 'text-amber-700 bg-amber-50',
                  icon: <AlertTriangle size={16} className="text-amber-600"/>
              });
          }
      }
      if (currentUser.role === 'LIDER') {
          const sortedNotifications = [...leaderResponseNotifications].sort((a, b) => 
             new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          sortedNotifications.forEach(req => {
              const isApproved = req.status === 'approved';
              list.push({
                  id: req.id,
                  type: isApproved ? 'APROVADO' : 'RECUSADO',
                  text: isApproved ? `Membro ${req.collaborator_name} APROVADO!` : `RECUSADO: ${ (req as any).admin_notes || 'Verifique com a gestão.'}`,
                  targetTab: 'members',
                  color: isApproved ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50',
                  icon: isApproved ? <CheckCircle2 size={16} className="text-green-600"/> : <AlertCircle size={16} className="text-red-600"/>
              });
          });
      }
      return list;
  }, [pendingChaplainRequests, pendingMemberRequests, sectorConflictsCount, leaderResponseNotifications, currentUser.role]);

  const notificationsList = useMemo(() => 
    rawNotificationsList.filter(n => !readNotificationIds.includes(n.id)), 
    [rawNotificationsList, readNotificationIds]
  );

  const unreadCount = notificationsList.length;

  const handleNotificationClick = (id: string, targetTab: string) => {
    setReadNotificationIds(prev => [...prev, id]);
    setActiveTab(targetTab);
    setShowNotifications(false);
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] font-sans text-left">
      <aside className="hidden md:flex w-72 bg-[#ffffff] border-r border-slate-100 flex-col sticky top-0 h-screen z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8 border-b border-slate-50">
          <div className="mb-6">
            {GLOBAL_BRAND_LOGO ? (
              <img src={GLOBAL_BRAND_LOGO} alt="System Logo" className="h-10 w-auto object-contain" />
            ) : (
              <div className="text-4xl filter drop-shadow-md">
                🏥
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Hospital {currentUser.hospital}
            </p>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Capelania Pro</h1>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          
          {/* GRUPO 1: Gestão de Pessoas */}
          <div className="space-y-2">
              <p className="px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Gestão de Pessoas</p>
              <NavItem 
                emoji="📊" 
                label="Dashboard" 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
              />
              
              {(currentUser?.role === 'ADMIN' || currentUser?.role === 'CAPELAO') && (
                <NavItem 
                  emoji="🗓️" 
                  label="Escala Pastoral" 
                  active={activeTab === 'chaplain-scale'} 
                  onClick={() => setActiveTab('chaplain-scale')}
                  badge={pendingChaplainRequests > 0 ? pendingChaplainRequests : undefined}
                />
              )}
              
              <NavItem 
                emoji="👥" 
                label="Membros" 
                active={activeTab === 'members'} 
                onClick={() => setActiveTab('members')} 
              />

              <NavItem 
                emoji="Camera" 
                label="Fotos de PG" 
                active={activeTab === 'meetings'} 
                onClick={() => setActiveTab('meetings')} 
                renderIcon={true}
              />
          </div>
          
          <div className="h-px bg-slate-50 my-4"></div>

          {/* GRUPO 2: Sistema / Admin */}
          {currentUser?.role === 'ADMIN' && (
            <div className="space-y-2">
              <p className="px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Sistema / Admin</p>
              <NavItem 
                emoji="👔" 
                label="Líderes" 
                active={activeTab === 'admin'} 
                onClick={() => setActiveTab('admin')} 
                badge={pendingMemberRequests > 0 ? pendingMemberRequests : undefined} 
              />
              <NavItem 
                emoji={<ShieldCheck size={20} />} 
                label="Administradores" 
                active={activeTab === 'sys-admins'} 
                onClick={() => setActiveTab('sys-admins')} 
                renderIcon={true}
              />
              <NavItem 
                emoji="📥" 
                label="Importação" 
                active={activeTab === 'import'} 
                onClick={() => setActiveTab('import')} 
                badge={sectorConflictsCount > 0 ? sectorConflictsCount : undefined} 
              />
              <NavItem 
                emoji="🖨️" 
                label="Relatórios" 
                active={activeTab === 'reports'} 
                onClick={() => setActiveTab('reports')} 
              />
              <NavItem 
                emoji="⚙️" 
                label="Configurações" 
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')} 
              />
            </div>
          )}
          
          <div className="pt-4">
             <InstallButton variant="sidebar" />
          </div>
        </nav>
        
        <div className="p-4 border-t border-slate-50">
           <UserProfileBtn currentUser={currentUser} onClick={() => setActiveTab('profile')} active={activeTab === 'profile'} />
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header Mobile */}
        <header className="md:hidden h-20 bg-white border-b border-slate-100 px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="text-3xl filter drop-shadow-sm">
                🏥
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">{getPageTitle()}</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                   Unidade {currentUser.hospital}
                </p>
              </div>
           </div>
           <div className="flex gap-2">
               <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl relative">
                 {unreadCount > 0 ? <span className="text-2xl animate-pulse">🔔</span> : <span className="text-2xl grayscale opacity-50">🔔</span>}
                 {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
               </button>
               <button onClick={() => setShowMobileMenu(true)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl">
                 <Menu size={22} />
               </button>
           </div>
        </header>

        {/* Header Desktop */}
        <header className="hidden md:flex h-24 bg-white/80 backdrop-blur-md border-b border-slate-100 px-10 items-center justify-between sticky top-0 z-20 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{getPageTitle()}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {currentUser?.hospital} • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHelp(true)} className="px-5 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-3 group shadow-sm hover:shadow-md" title="Ajuda">
              <span className="text-xl">🛟</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-700">Ajuda</span>
            </button>
            <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className={`p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 rounded-xl transition-all relative shadow-sm hover:shadow-md ${unreadCount > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`}>
                  {unreadCount > 0 ? <span className="text-xl">🔔</span> : <span className="text-xl grayscale opacity-40">🔔</span>}
                  {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
                {showNotifications && (
                    <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-in fade-in slide-in-from-top-5 z-50">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h4 className="text-sm font-black text-slate-800">Notificações</h4>
                            {unreadCount > 0 ? <span className="text-[9px] font-black px-2 py-1 rounded-md bg-orange-100 text-orange-700 uppercase tracking-wide">Novas</span> : <span className="text-[9px] font-black px-2 py-1 rounded-md bg-slate-100 text-slate-500 uppercase tracking-wide">Lidas</span>}
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                            {notificationsList.length === 0 ? <div className="text-center py-8 text-slate-400 text-xs italic">Sem novas notificações.</div> : notificationsList.map(notif => (
                                <button key={notif.id} onClick={() => handleNotificationClick(notif.id, notif.targetTab)} className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 border border-transparent hover:border-slate-100 group">
                                    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${notif.type === 'ESCALA' ? 'bg-blue-500' : (notif.type === 'APROVADO' ? 'bg-green-500' : (notif.type === 'RECUSADO' ? 'bg-red-500' : (notif.type === 'ALERTA DE DADOS' ? 'bg-amber-500' : 'bg-orange-500')))}`}></div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">{notif.icon && notif.icon}{notif.type}</p>
                                        <p className={`text-xs font-bold leading-tight group-hover:text-slate-900 ${notif.type === 'RECUSADO' ? 'text-red-700' : (notif.type === 'APROVADO' ? 'text-green-700' : (notif.type === 'ALERTA DE DADOS' ? 'text-amber-700' : 'text-slate-600'))}`}>{notif.text}</p>
                                    </div>
                                    <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-slate-500 mt-2"/>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <button onClick={handleLogout} className="group flex items-center gap-3 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-100 px-5 py-3 rounded-xl transition-all shadow-sm hover:shadow-md">
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-red-400 transition-colors">Sessão</span>
                <span className="text-xs font-black text-slate-700 group-hover:text-red-600 transition-colors">Sair</span>
              </div>
              <div className="w-8 h-8 flex items-center justify-center text-xl transition-all">🚪</div>
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#f8fafc] pb-28 md:pb-12" onClick={() => setShowNotifications(false)}>
            {children}
        </main>

        {/* Navbar Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 flex justify-around items-center px-2 py-3 z-40 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <MobileTab emoji="📊" label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'CAPELAO') && (
               <div className="relative">
                 {pendingChaplainRequests > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                 <MobileTab emoji="🗓️" label="Escala" active={activeTab === 'chaplain-scale'} onClick={() => setActiveTab('chaplain-scale')} />
               </div>
            )}
            <MobileTab emoji="👥" label="Membros" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
            <MobileTab emoji="👤" label="Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>
      </div>
      
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-slate-900/95 z-[100] p-6 animate-in fade-in slide-in-from-right-10 duration-200">
            <div className="flex justify-end mb-8">
                <button onClick={() => setShowMobileMenu(false)} className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20"><X size={24} /></button>
            </div>
            <div className="space-y-4">
                <UserProfileBtn currentUser={currentUser} onClick={() => { setActiveTab('profile'); setShowMobileMenu(false); }} active={activeTab === 'profile'} lightMode={false} />
                <div className="h-px bg-white/10 my-4"></div>
                {currentUser?.role === 'ADMIN' && (
                    <>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Administração</p>
                    <MobileMenuItem 
                        emoji="👔" 
                        label="Líderes" 
                        onClick={() => { setActiveTab('admin'); setShowMobileMenu(false); }} 
                        badge={pendingMemberRequests} 
                    />
                    <MobileMenuItem 
                        emoji={<ShieldCheck size={20} />} 
                        label="Administradores" 
                        onClick={() => { setActiveTab('sys-admins'); setShowMobileMenu(false); }} 
                    />
                    <MobileMenuItem 
                        emoji="📥" 
                        label="Importação" 
                        onClick={() => { setActiveTab('import'); setShowMobileMenu(false); }} 
                        badge={sectorConflictsCount} 
                    />
                    <MobileMenuItem 
                        emoji="⚙️" 
                        label="Configurações" 
                        onClick={() => { setActiveTab('settings'); setShowMobileMenu(false); }} 
                    />
                    <MobileMenuItem 
                        emoji="🖨️" 
                        label="Relatórios" 
                        onClick={() => { setActiveTab('reports'); setShowMobileMenu(false); }} 
                    />
                    <div className="h-px bg-white/10 my-4"></div>
                    </>
                )}
                <button onClick={() => setShowHelp(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 text-slate-300 hover:bg-white/10 font-bold transition-all"><span className="text-xl">🛟</span> Central de Ajuda</button>
                <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 mt-4 font-bold transition-all"><span className="text-xl">🚪</span> Sair do App</button>
                <div className="pt-8 flex justify-center"><InstallButton variant="mobile" /></div>
            </div>
        </div>
      )}
      {showHelp && <HelpSystem role={currentUser.role} onClose={() => setShowHelp(false)} />}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } .pb-safe { padding-bottom: env(safe-area-inset-bottom); } @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }`}</style>
    </div>
  );
};

const NavItem = ({ emoji, label, active, onClick, badge, renderIcon }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-200 group ${active ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'hover:bg-slate-50'}`}>
    <div className="flex items-center gap-4">
        <div className={`w-8 h-8 flex items-center justify-center text-xl transition-transform group-hover:scale-110 filter drop-shadow-sm`}>
            {renderIcon ? emoji : <span className="text-xl">{emoji}</span>}
        </div>
        <span className={`text-[13px] font-bold tracking-tight ${active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>{label}</span>
    </div>
    {badge && <span className="bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-sm">{badge}</span>}
  </button>
);

const MobileTab = ({ emoji, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${active ? 'text-blue-900' : 'text-slate-400'}`}>
        <div className={`transition-transform duration-200 text-2xl filter drop-shadow-sm ${active ? 'scale-110' : 'scale-100 grayscale opacity-70'}`}>{emoji}</div>
        <span className="text-[10px] font-black tracking-wide">{label}</span>
    </button>
);

const MobileMenuItem = ({ emoji, label, onClick, badge }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 rounded-2xl text-white hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center text-xl">
                {emoji}
            </div>
            <span className="font-bold text-sm">{label}</span>
        </div>
        {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full">{badge}</span>}
    </button>
);

const UserProfileBtn = ({ currentUser, onClick, active, lightMode = true }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all border ${active ? 'bg-white border-slate-200 shadow-sm' : 'border-transparent hover:bg-slate-50'} ${!lightMode && 'hover:bg-white/5'}`}>
    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black overflow-hidden shadow-sm shrink-0 text-sm">
      {currentUser?.photo_url ? <img src={currentUser.photo_url} className="w-full h-full object-cover" alt="Perfil" /> : currentUser?.full_name.charAt(0)}
    </div>
    <div className="flex-1 min-w-0 text-left">
      <p className={`text-xs font-black truncate ${lightMode ? 'text-slate-800' : 'text-white'}`}>{currentUser?.full_name}</p>
      <p className={`text-[9px] font-bold uppercase truncate tracking-widest mt-0.5 ${lightMode ? 'text-slate-400' : 'text-slate-400'}`}>{currentUser?.role}</p>
    </div>
  </button>
);

export default AppLayout;
