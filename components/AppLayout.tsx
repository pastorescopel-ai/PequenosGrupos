
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, CalendarCheck, UsersRound, FileText, User, UserCog, Upload, Settings, Hospital, Bell, LogOut, HelpCircle, Menu, X, BellRing, ArrowRight, AlertCircle, CheckCircle2, AlertTriangle
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
      case 'dashboard': return 'Dashboard';
      case 'chaplain-scale': return 'Escala';
      case 'members': return 'Membros';
      case 'reports': return 'Relatórios';
      case 'admin': return 'Líderes';
      case 'import': return 'Importar';
      case 'settings': return 'Ajustes';
      case 'profile': return 'Perfil';
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
    <div className="min-h-screen flex bg-slate-50 font-sans text-left">
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen shadow-sm z-30">
        <div className="p-8 border-b border-slate-100">
          <div className="mb-4">
            {GLOBAL_BRAND_LOGO ? (
              <img src={GLOBAL_BRAND_LOGO} alt="System Logo" className="h-12 w-auto object-contain" />
            ) : (
              <div className="bg-blue-600 w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg shadow-blue-100">
                <Hospital size={24} />
              </div>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em] leading-tight">
              Hospital Adventista {currentUser.hospital}
            </p>
            <h1 className="text-lg font-black text-slate-800 leading-tight tracking-tight">Pequenos Grupos</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem icon={<LayoutDashboard size={18}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'CAPELAO') && (
            <NavItem 
              icon={<CalendarCheck size={18}/>} 
              label="Escala Pastoral" 
              active={activeTab === 'chaplain-scale'} 
              onClick={() => setActiveTab('chaplain-scale')}
              badge={pendingChaplainRequests > 0 ? pendingChaplainRequests : undefined}
            />
          )}
          <NavItem icon={<UsersRound size={18}/>} label="Gestão de Membros" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
          {currentUser?.role === 'ADMIN' && <NavItem icon={<FileText size={18}/>} label="Relatórios PG" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />}
          <NavItem icon={<User size={18}/>} label="Meu Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          {currentUser?.role === 'ADMIN' && (
            <div className="pt-6 mt-4 border-t border-slate-100 space-y-2">
              <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Administração</p>
              <NavItem icon={<UserCog size={18}/>} label="Cadastro de Líderes" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} badge={pendingMemberRequests > 0 ? pendingMemberRequests : undefined} />
              <NavItem icon={<Upload size={18}/>} label="Importação" active={activeTab === 'import'} onClick={() => setActiveTab('import')} badge={sectorConflictsCount > 0 ? sectorConflictsCount : undefined} />
              <NavItem icon={<Settings size={18}/>} label="Configurações PDF" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </div>
          )}
          <InstallButton variant="sidebar" />
        </nav>
        <div className="p-6 border-t border-slate-100">
           <UserProfileBtn currentUser={currentUser} onClick={() => setActiveTab('profile')} active={activeTab === 'profile'} />
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="md:hidden h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="bg-blue-600 w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg shadow-blue-100">
                <Hospital size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">{getPageTitle()}</h2>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
                   {currentUser.hospital ? `Hospital ${currentUser.hospital}` : 'Hospital Adventista'}
                </p>
              </div>
           </div>
           <div className="flex gap-2">
               <button onClick={() => setShowNotifications(!showNotifications)} className="p-3 bg-slate-50 text-slate-500 rounded-xl relative">
                 {unreadCount > 0 ? <BellRing size={24} className="text-orange-500 animate-pulse" /> : <Bell size={24} />}
                 {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
               </button>
               <button onClick={() => setShowMobileMenu(true)} className="p-3 bg-slate-50 text-slate-500 rounded-xl">
                 <Menu size={24} />
               </button>
           </div>
        </header>

        <header className="hidden md:flex h-24 bg-white border-b border-slate-200 px-12 items-center justify-between sticky top-0 z-20 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{getPageTitle()}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser?.hospital} • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowHelp(true)} className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-2xl transition-all flex items-center gap-2 group" title="Abrir Central de Ajuda">
              <HelpCircle size={20} />
              <span className="text-[10px] font-black uppercase hidden sm:block pr-1">Ajuda</span>
            </button>
            <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className={`p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all relative ${unreadCount > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`}>
                  {unreadCount > 0 ? <BellRing size={20} className="text-orange-500" /> : <Bell size={20} />}
                  {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
                {showNotifications && (
                    <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 animate-in fade-in slide-in-from-top-5 z-50">
                        <div className="flex justify-between items-center mb-3 px-2">
                            <h4 className="text-sm font-black text-slate-800">Notificações</h4>
                            {unreadCount > 0 ? <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-orange-100 text-orange-700">{unreadCount} Novas</span> : <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-500">Lidas</span>}
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {notificationsList.length === 0 ? <div className="text-center py-6 text-slate-400 text-xs italic">Tudo limpo!</div> : notificationsList.map(notif => (
                                <button key={notif.id} onClick={() => handleNotificationClick(notif.id, notif.targetTab)} className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 transition-colors flex items-start gap-3 border border-transparent hover:border-slate-100">
                                    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${notif.type === 'ESCALA' ? 'bg-blue-500' : (notif.type === 'APROVADO' ? 'bg-green-500' : (notif.type === 'RECUSADO' ? 'bg-red-500' : (notif.type === 'ALERTA DE DADOS' ? 'bg-amber-500' : 'bg-orange-500')))}`}></div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5 flex items-center gap-1">{notif.icon && notif.icon}{notif.type}</p>
                                        <p className={`text-xs font-bold leading-tight ${notif.type === 'RECUSADO' ? 'text-red-700' : (notif.type === 'APROVADO' ? 'text-green-700' : (notif.type === 'ALERTA DE DADOS' ? 'text-amber-700' : 'text-slate-700'))}`}>{notif.text}</p>
                                    </div>
                                    <ArrowRight size={14} className="ml-auto text-slate-300 mt-2"/>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <button onClick={handleLogout} className="group flex items-center gap-3 bg-slate-50 hover:bg-red-50 px-6 py-3 rounded-2xl transition-all border border-transparent hover:border-red-100">
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-red-400 transition-colors">Encerrar</span>
                <span className="text-xs font-black text-slate-800 group-hover:text-red-600 transition-colors">Sair</span>
              </div>
              <div className="w-10 h-10 bg-white group-hover:bg-red-600 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-white transition-all shadow-sm"><LogOut size={18} /></div>
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-50 pb-28 md:pb-12" onClick={() => setShowNotifications(false)}>
            {children}
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around items-center px-2 py-3 z-40 pb-safe">
            <MobileTab icon={<LayoutDashboard size={22}/>} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'CAPELAO') && (
               <div className="relative">
                 {pendingChaplainRequests > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                 <MobileTab icon={<CalendarCheck size={22}/>} label="Escala" active={activeTab === 'chaplain-scale'} onClick={() => setActiveTab('chaplain-scale')} />
               </div>
            )}
            <MobileTab icon={<UsersRound size={22}/>} label="Membros" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
            <MobileTab icon={<User size={22}/>} label="Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>
      </div>
      
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 bg-slate-900/90 z-[100] p-6 animate-in fade-in slide-in-from-right-10 duration-200">
            <div className="flex justify-end mb-8">
                <button onClick={() => setShowMobileMenu(false)} className="p-3 bg-white/10 text-white rounded-full"><X size={24} /></button>
            </div>
            <div className="space-y-4">
                <UserProfileBtn currentUser={currentUser} onClick={() => { setActiveTab('profile'); setShowMobileMenu(false); }} active={activeTab === 'profile'} lightMode={false} />
                <div className="h-px bg-white/10 my-4"></div>
                {currentUser?.role === 'ADMIN' && (
                    <>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Administração</p>
                    <MobileMenuItem icon={<UserCog size={20}/>} label="Líderes" onClick={() => { setActiveTab('admin'); setShowMobileMenu(false); }} badge={pendingMemberRequests} />
                    <MobileMenuItem icon={<Upload size={20}/>} label="Importação" onClick={() => { setActiveTab('import'); setShowMobileMenu(false); }} badge={sectorConflictsCount} />
                    <MobileMenuItem icon={<Settings size={20}/>} label="Configurações" onClick={() => { setActiveTab('settings'); setShowMobileMenu(false); }} />
                    <MobileMenuItem icon={<FileText size={20}/>} label="Relatórios" onClick={() => { setActiveTab('reports'); setShowMobileMenu(false); }} />
                    <div className="h-px bg-white/10 my-4"></div>
                    </>
                )}
                <button onClick={() => setShowHelp(true)} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 text-slate-300 hover:bg-white/10"><HelpCircle size={20} /> <span className="font-bold">Central de Ajuda</span></button>
                <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 mt-4"><LogOut size={20} /> <span className="font-bold">Sair do App</span></button>
                <div className="pt-8 flex justify-center"><InstallButton variant="mobile" /></div>
            </div>
        </div>
      )}
      {showHelp && <HelpSystem role={currentUser.role} onClose={() => setShowHelp(false)} />}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } .pb-safe { padding-bottom: env(safe-area-inset-bottom); } @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }`}</style>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl text-[12px] font-bold transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}>
    <div className="flex items-center gap-3">{icon} <span>{label}</span></div>
    {badge && <span className="bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-sm">{badge}</span>}
  </button>
);

const MobileTab = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all ${active ? 'text-blue-600' : 'text-slate-400'}`}>
        <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`}>{icon}</div>
        <span className="text-[9px] font-bold">{label}</span>
    </button>
);

const MobileMenuItem = ({ icon, label, onClick, badge }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 rounded-2xl text-white hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-4">{icon} <span className="font-bold text-sm">{label}</span></div>
        {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full">{badge}</span>}
    </button>
);

const UserProfileBtn = ({ currentUser, onClick, active, lightMode = true }: any) => (
  <button onClick={onClick} className={`flex items-center gap-4 w-full p-2 rounded-xl transition-all border-2 ${active ? 'bg-blue-50/10 border-blue-500' : 'border-transparent'} ${!lightMode && 'text-white'}`}>
    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black overflow-hidden shadow-sm border border-white shrink-0">
      {currentUser?.photo_url ? <img src={currentUser.photo_url} className="w-full h-full object-cover" alt="Perfil" /> : currentUser?.full_name.charAt(0)}
    </div>
    <div className="flex-1 min-w-0 text-left">
      <p className={`text-xs font-black truncate ${lightMode ? 'text-slate-800' : 'text-white'}`}>{currentUser?.full_name}</p>
      <p className={`text-[9px] font-bold uppercase truncate tracking-widest ${lightMode ? 'text-slate-400' : 'text-slate-400'}`}>{currentUser?.role}</p>
    </div>
  </button>
);

export default AppLayout;
