
import React, { useState, useEffect } from 'react';
import { 
  FileText, LayoutDashboard, Upload, Settings, UserCog, Hospital, UsersRound, Camera, CalendarCheck, 
  RefreshCw
} from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

import { Leader, ChangeRequest, ReportSettings, PGMeetingPhoto, MeetingSchedule, Chaplain, Sector, Collaborator, PG } from './types';
import ImportCollaborators from './components/ImportCollaborators';
import ReportCoverage from './components/ReportCoverage';
import LeaderDashboard from './components/LeaderDashboard';
import ProfileView from './components/ProfileView';
import AdminManagement from './components/AdminManagement';
import SettingsView from './components/SettingsView';
import AdminDashboard from './components/AdminDashboard';
import MemberManagement from './components/MemberManagement';
import PGPhotosView from './components/PGPhotosView';
import ChaplainScale from './components/ChaplainScale';

interface PGModuleProps {
  authenticatedUser: Leader; 
}

const PGModule: React.FC<PGModuleProps> = ({ authenticatedUser }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // O estado agora é alimentado apenas via props ou Firebase, 
  // eliminando o risco de circularidade no stringify do localStorage.
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

  const safeDbAction = async (action: () => Promise<void>) => {
      if(!db) return;
      try { await action(); } catch(e) { console.error(e); }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return authenticatedUser.role === 'ADMIN' 
          ? <AdminDashboard meetingSchedules={meetingSchedules} onNavigateToScale={() => setActiveTab('chaplain-scale')} leaders={leaders} members={members} sectors={sectors} /> 
          : <LeaderDashboard user={authenticatedUser} memberRequests={memberRequests} photos={pgPhotos} chaplains={chaplains} meetingSchedule={meetingSchedules.filter(s => s.leader_id === authenticatedUser.id)[0]} allSchedules={meetingSchedules} onUpdateSchedule={(s) => setMeetingSchedules([...meetingSchedules, s as MeetingSchedule])} members={members} />;
      case 'chaplain-scale':
        return (authenticatedUser.role === 'ADMIN' || authenticatedUser.role === 'CAPELAO') ? <ChaplainScale meetingSchedules={meetingSchedules} chaplains={chaplains} onChaplainAction={(lid, act, aid) => {}} /> : null;
      case 'members':
        return <MemberManagement user={authenticatedUser} pgs={pgs} onAddRequest={async (r, targetPgName) => {
             await safeDbAction(async () => {
               await setDoc(doc(collection(db, "change_requests"), r.id), r);
               if(r.type === 'add' && r.status === 'approved') {
                 await setDoc(doc(db, "members", r.collaborator_id), {
                    id: r.collaborator_id,
                    employee_id: r.collaborator_id,
                    full_name: r.collaborator_name,
                    sector_name: r.collaborator_sector,
                    pg_name: targetPgName || authenticatedUser.pg_name,
                    active: true,
                    join_date: new Date().toLocaleDateString()
                 });
               }
             });
          }} 
          memberRequests={memberRequests} members={members} setMembers={setMembers} allCollaborators={allCollaborators} />;
      case 'reports':
        // Added missing 'leaders' prop to ReportCoverage component fix
        return <ReportCoverage 
          isAdmin={authenticatedUser.role === 'ADMIN'} 
          user={authenticatedUser} 
          settings={reportSettings} 
          photos={pgPhotos} 
          sectors={sectors} 
          members={members} 
          allCollaborators={allCollaborators}
          leaders={leaders}
        />;
      case 'meetings':
          return <PGPhotosView 
            user={authenticatedUser} 
            photos={pgPhotos} 
            onAddPhoto={async (d) => {
              const newPhoto = {
                id: Date.now().toString(),
                url: d.photo,
                description: d.description,
                uploaded_at: new Date().toISOString(),
                week_number: 1,
                leader_id: authenticatedUser.id
              };
              setPgPhotos([newPhoto, ...pgPhotos]);
            }} 
          />;
      case 'admin':
        return authenticatedUser.role === 'ADMIN' ? <AdminManagement pgs={pgs} leaders={leaders} setLeaders={setLeaders} memberRequests={memberRequests} onRequestAction={(id, status) => {}} photos={pgPhotos} allCollaborators={allCollaborators} /> : null;
      case 'import':
        return authenticatedUser.role === 'ADMIN' ? <ImportCollaborators allCollaborators={allCollaborators} setAllCollaborators={setAllCollaborators} adminId={authenticatedUser.id} chaplains={chaplains} setChaplains={setChaplains} sectors={sectors} setSectors={setSectors} pgs={pgs} setPgs={setPgs} /> : null;
      case 'settings':
          return authenticatedUser.role === 'ADMIN' ? <SettingsView settings={reportSettings} onUpdate={setReportSettings} /> : null;
      case 'profile':
          return <ProfileView user={authenticatedUser} onUpdate={(d) => {}} />;
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
          {(authenticatedUser.role === 'ADMIN' || authenticatedUser.role === 'CAPELAO') && (
            <NavBtn icon={<CalendarCheck size={18}/>} label="Escala Pastoral" active={activeTab === 'chaplain-scale'} onClick={() => setActiveTab('chaplain-scale')} />
          )}
          <NavBtn icon={<UsersRound size={18}/>} label="Membros" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
          <NavBtn icon={<Camera size={18}/>} label="Fotos de PG" active={activeTab === 'meetings'} onClick={() => setActiveTab('meetings')} />
          <NavBtn icon={<FileText size={18}/>} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          {authenticatedUser.role === 'ADMIN' && (
            <>
              <div className="h-px bg-slate-100 my-4"></div>
              <NavBtn icon={<UserCog size={18}/>} label="Líderes" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
              <NavBtn icon={<Upload size={18}/>} label="Importação" active={activeTab === 'import'} onClick={() => setActiveTab('import')} />
              <NavBtn icon={<Settings size={18}/>} label="Ajustes PDF" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
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
