import React, { useState, useEffect } from 'react';
import { 
  FileText, LayoutDashboard, Upload, Settings, UserCog, Hospital, UsersRound, Camera, CalendarCheck, 
  RefreshCw, ShieldCheck
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { Leader, ChangeRequest, ReportSettings, PGMeetingPhoto, MeetingSchedule, Chaplain, Sector, Collaborator, PG } from '../types';
import ImportCollaborators from './ImportCollaborators';
import ReportCoverage from './ReportCoverage';
import LeaderDashboard from './LeaderDashboard';
import ProfileView from './ProfileView';
import AdminManagement from './AdminManagement';
import SettingsView from './SettingsView';
import AdminDashboard from './AdminDashboard';
import AdminMemberView from './MemberManagement/AdminMemberView';
import LeaderMemberView from './MemberManagement/LeaderMemberView';
import PGPhotosView from './PGPhotosView';
import ChaplainScale from './ChaplainScale';
import SystemAdminsView from './SystemAdminsView';

import { useMemberActions } from '../hooks/useMemberLogic';

interface PGModuleProps {
  authenticatedUser: Leader; 
}

const PGModule: React.FC<PGModuleProps> = ({ authenticatedUser }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [targetPGId, setTargetPGId] = useState<string | null>(null);
  
  const [allCollaborators, setAllCollaborators] = useState<Collaborator[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [pgs, setPgs] = useState<PG[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [members, setMembers] = useState<Collaborator[]>([]);
  const [chaplains, setChaplains] = useState<Chaplain[]>([]);
  const [meetingSchedules, setMeetingSchedules] = useState<MeetingSchedule[]>([]);
  const [pgPhotos, setPgPhotos] = useState<PGMeetingPhoto[]>([]);
  const [memberRequests, setMemberRequests] = useState<ChangeRequest[]>([]);
  const [reportSettings, setReportSettings] = useState<ReportSettings>({
    director_name: '',
    director_title: '',
    footer_text: 'Hospital Adventista - Pequenos Grupos',
    template_belem_url: '',
    template_barcarena_url: '',
    footer_belem_url: '',
    footer_barcarena_url: '',
    signature_url: ''
  });

  const { handleMemberRequestAction, createAddRequest } = useMemberActions(authenticatedUser, leaders);

  const safeDbAction = async (action: () => Promise<any>) => {
      if(!db) return;
      try { await action(); } catch(e) { console.error(e); }
  };

  const handleUpdateUser = async (data: Partial<Leader>) => {
      if (authenticatedUser && db) {
          try {
              await updateDoc(doc(db, "leaders", authenticatedUser.id), data);
          } catch(e) {
              console.error(e);
          }
      }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return authenticatedUser.role === 'ADMIN' 
          ? <AdminDashboard 
              user={authenticatedUser}
              onUpdateUser={handleUpdateUser}
              meetingSchedules={meetingSchedules} 
              onNavigateToScale={() => setActiveTab('chaplain-scale')} 
              leaders={leaders} 
              members={members} 
              sectors={sectors} 
              memberRequests={memberRequests} 
              onNavigateToMembers={(pgName) => {
                  setTargetPGId(pgName || null);
                  setActiveTab('members');
              }}
              allCollaborators={allCollaborators}
            /> 
          : <LeaderDashboard 
              user={authenticatedUser} 
              onUpdateUser={handleUpdateUser}
              memberRequests={memberRequests} 
              photos={pgPhotos} 
              chaplains={chaplains} 
              meetingSchedule={meetingSchedules.filter(s => s.leader_id === authenticatedUser.id)[0]} 
              allSchedules={meetingSchedules} 
              onUpdateSchedule={(s) => setMeetingSchedules([...meetingSchedules, s as MeetingSchedule])} 
              members={members} 
            />;
      case 'members':
        return authenticatedUser.role === 'ADMIN'
          ? <AdminMemberView 
              user={authenticatedUser} memberRequests={memberRequests} members={members} 
              allCollaborators={allCollaborators} pgs={pgs} leaders={leaders} sectors={sectors}
              onAddRequest={(r, pg) => safeDbAction(() => createAddRequest(r, pg))}
              onRequestAction={(id, status, req) => safeDbAction(() => handleMemberRequestAction(id, status, req))}
              initialPGId={targetPGId}
              onClearPGId={() => setTargetPGId(null)}
            />
          : <LeaderMemberView 
              user={authenticatedUser} members={members} allCollaborators={allCollaborators} 
              pgs={pgs} leaders={leaders} sectors={sectors}
              onAddRequest={(r, pg) => safeDbAction(() => createAddRequest(r, pg))}
              memberRequests={memberRequests}
            />;
      case 'reports':
        return <ReportCoverage isAdmin={authenticatedUser.role === 'ADMIN'} user={authenticatedUser} settings={reportSettings} sectors={sectors} members={members} allCollaborators={allCollaborators} leaders={leaders} photos={pgPhotos} pgs={pgs} />;
      case 'meetings':
        return <PGPhotosView user={authenticatedUser} photos={pgPhotos} onAddPhoto={async (d) => {}} />;
      case 'admin':
        return authenticatedUser.role === 'ADMIN' ? <AdminManagement pgs={pgs} leaders={leaders} setLeaders={setLeaders} memberRequests={memberRequests} onRequestAction={(id, s) => {}} allCollaborators={allCollaborators} photos={pgPhotos} sectors={sectors} /> : null;
      case 'sys-admins':
        return <SystemAdminsView leaders={leaders} allCollaborators={allCollaborators} pgs={pgs} sectors={sectors} onUpdateUser={handleUpdateUser} />;
      case 'settings':
        return <SettingsView settings={reportSettings} onUpdate={async (s) => {}} sectors={sectors} allCollaborators={allCollaborators} />;
      case 'import':
        return <ImportCollaborators adminId={authenticatedUser.id} chaplains={chaplains} setChaplains={setChaplains} sectors={sectors} setSectors={setSectors} allCollaborators={allCollaborators} setAllCollaborators={setAllCollaborators} pgs={pgs} setPgs={setPgs} />;
      case 'profile':
        return <ProfileView user={authenticatedUser} onUpdate={handleUpdateUser} />;
      default:
        return <div className="p-20 text-center font-black text-slate-300">Selecione uma opção no menu lateral.</div>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[3rem] overflow-hidden border border-slate-200">
      <div className="flex h-full">
        <aside className="w-64 bg-white border-r border-slate-100 p-6 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4">Módulo PGs</p>
          <NavBtn icon={<LayoutDashboard size={18}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          {authenticatedUser.role === 'ADMIN' && (
            <NavBtn icon={<UserCog size={18}/>} label="Líderes" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
          )}
          <NavBtn icon={<UsersRound size={18}/>} label="Membros" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
          {(authenticatedUser.role === 'ADMIN' || authenticatedUser.role === 'CAPELAO') && (
            <NavBtn icon={<CalendarCheck size={18}/>} label="Escala" active={activeTab === 'chaplain-scale'} onClick={() => setActiveTab('chaplain-scale')} />
          )}
          <NavBtn icon={<Camera size={18}/>} label="Fotos" active={activeTab === 'meetings'} onClick={() => setActiveTab('meetings')} />
          {authenticatedUser.role === 'ADMIN' && (
            <>
              <div className="h-px bg-slate-100 my-4"></div>
              <NavBtn icon={<FileText size={18}/>} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
              <NavBtn icon={<Settings size={18}/>} label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
              <NavBtn icon={<Upload size={18}/>} label="Importação" active={activeTab === 'import'} onClick={() => setActiveTab('import')} />
              <NavBtn icon={<ShieldCheck size={18}/>} label="Admins" active={activeTab === 'sys-admins'} onClick={() => setActiveTab('sys-admins')} />
            </>
          )}
        </aside>
        <main className="flex-1 p-10 overflow-y-auto bg-white/50">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const NavBtn = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
    {icon} {label}
  </button>
);

export default PGModule;