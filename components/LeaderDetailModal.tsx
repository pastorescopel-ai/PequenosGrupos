
import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCog, 
  Mail, 
  IdCard, 
  Building, 
  Calendar, 
  History, 
  ShieldAlert, 
  Lock, 
  ArrowRightLeft, 
  Trash2, 
  Key, 
  Save, 
  ChevronRight,
  Camera,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Phone,
  Users
} from 'lucide-react';
import { Leader, HospitalUnit, InactivationReason, PGMeetingPhoto, PG } from '../types';
import HelpNote from './HelpNote';

interface LeaderDetailModalProps {
  leader: Leader;
  pgs: PG[];
  leaders?: Leader[]; // Opcional, mas ideal para filtrar PGs ocupados
  photos: PGMeetingPhoto[];
  onClose: () => void;
  onUpdate: (data: Partial<Leader>) => void;
  onInactivate: (reason: InactivationReason) => void;
  onResetPassword: (tempPass: string) => void;
}

type TabType = 'perfil' | 'atividade' | 'gestao';

const LeaderDetailModal: React.FC<LeaderDetailModalProps> = ({ 
  leader, 
  pgs,
  leaders = [],
  photos, 
  onClose, 
  onUpdate, 
  onInactivate, 
  onResetPassword 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('perfil');
  const [editForm, setEditForm] = useState<Partial<Leader>>(leader);

  // Fecha com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    // Bloqueia rolagem do fundo
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // MOCK de Histórico de Atividades
  const activityHistory = [
    { id: 1, type: 'photo', text: 'Enviou evidência da Semana 10', date: '05/03/2024 19:42', icon: <Camera size={14}/> },
    { id: 2, type: 'member', text: 'Solicitou inclusão de Ricardo Carvalho', date: '04/03/2024 10:15', icon: <UserCog size={14}/> },
    { id: 3, type: 'login', text: 'Acesso realizado via Mobile', date: '03/03/2024 08:30', icon: <Activity size={14}/> },
    { id: 4, type: 'schedule', text: 'Alterou horário: Sexta às 19:30', date: '01/03/2024 15:00', icon: <Clock size={14}/> },
  ];

  const handleWhatsAppClick = () => {
    if (!leader.whatsapp) return;
    const cleanNumber = leader.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNumber}`, '_blank');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    
    // Máscara (XX) XXXXX-XXXX
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");

    setEditForm({ ...editForm, whatsapp: v });
  };

  // Identifica nomes de PGs já ocupados por OUTROS líderes ativos
  const takenPGNames = leaders
    .filter(l => l.active && l.pg_name && l.id !== leader.id) // Ignora o próprio líder sendo editado
    .map(l => l.pg_name);

  // Filtra PGs pela unidade selecionada e remove os já ocupados
  const filteredPGs = pgs.filter(pg => 
    pg.active && 
    (pg.hospital === editForm.hospital || !pg.hospital) &&
    !takenPGNames.includes(pg.name)
  );

  const handleSaveUpdate = () => {
      // Validação de campos obrigatórios
      if (!editForm.full_name?.trim()) {
          alert("O campo 'Nome Exibido' é obrigatório.");
          return;
      }
      if (!editForm.whatsapp?.trim()) {
          alert("O campo 'WhatsApp' é obrigatório para contato.");
          return;
      }
      if (!editForm.employee_id?.trim()) {
          alert("O campo 'Matrícula' é obrigatório.");
          return;
      }
      if (!editForm.sector_name?.trim()) {
          alert("O campo 'Setor' é obrigatório.");
          return;
      }
      if (!editForm.pg_name?.trim()) {
          alert("A seleção de um 'Pequeno Grupo' é obrigatória.");
          return;
      }

      onUpdate(editForm);
  };

  return (
    <div 
      className="fixed inset-0 bg-blue-950/60 backdrop-blur-xl z-[150] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose} // Fecha ao clicar no fundo
    >
      <div 
        className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300 min-h-[600px] relative"
        onClick={(e) => e.stopPropagation()} // Impede que o clique dentro do modal feche ele
      >
        
        {/* Botão de Fechar Flutuante (Mobile Friendly) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-3 bg-slate-100/80 backdrop-blur-sm rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm md:hidden"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Sidebar do Perfil (Identidade) */}
        <aside className="w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col relative z-10">
          <div className="p-10 text-center">
             <div className="relative inline-block mb-6">
                <div className="w-32 h-32 rounded-[2.5rem] bg-blue-600 border-8 border-white shadow-2xl flex items-center justify-center text-white text-4xl font-black uppercase overflow-hidden">
                  {leader.photo_url ? (
                    <img src={leader.photo_url} className="w-full h-full object-cover" alt="Perfil" />
                  ) : (
                    leader.full_name.charAt(0)
                  )}
                </div>
                <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg ${leader.active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                   {leader.active ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
                </div>
             </div>
             <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{leader.full_name}</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{leader.pg_name}</p>
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">Hospital Adventista de {leader.hospital}</p>
             
             <div className="mt-8 space-y-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 text-left shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Ministerial</p>
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{leader.active ? 'Ativo no PG' : 'Inativo'}</span>
                      <div className={`w-2 h-2 rounded-full ${leader.active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                   </div>
                </div>

                {leader.whatsapp && (
                  <button 
                    onClick={handleWhatsAppClick}
                    className="w-full bg-green-500 text-white p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-green-600 transition-all shadow-lg shadow-green-100"
                  >
                    <Phone size={18}/>
                    <span className="text-xs font-black uppercase tracking-widest">WhatsApp</span>
                  </button>
                )}
             </div>
          </div>
          
          <div className="flex-1 px-6 space-y-1">
             <TabButton active={activeTab === 'perfil'} onClick={() => setActiveTab('perfil')} icon={<UserCog size={18}/>} label="Dados do Perfil" />
             <TabButton active={activeTab === 'atividade'} onClick={() => setActiveTab('atividade')} icon={<History size={18}/>} label="Histórico de Atividade" />
             <TabButton active={activeTab === 'gestao'} onClick={() => setActiveTab('gestao')} icon={<ShieldAlert size={18}/>} label="Painel de Controle" />
          </div>

          <button onClick={onClose} className="m-8 py-4 px-6 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-100 transition-all active:scale-95">
             <ArrowLeft size={14}/> Sair da Central
          </button>
        </aside>

        {/* Área de Conteúdo Principal */}
        <main className="flex-1 p-12 overflow-y-auto custom-scrollbar relative">
           {/* Desktop Close Button (Top Right) */}
           <button 
             onClick={onClose} 
             className="absolute top-8 right-8 hidden md:flex p-2 text-slate-300 hover:text-slate-600 transition-colors"
           >
             <X size={24} />
           </button>

           {activeTab === 'perfil' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                <header>
                   <h4 className="text-3xl font-black text-slate-800 tracking-tight">Informações Master</h4>
                   <p className="text-slate-500 font-medium">Dados cadastrais vinculados ao prontuário institucional.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <InfoCard icon={<IdCard className="text-blue-600"/>} label="Matrícula" value={leader.employee_id} />
                   <InfoCard icon={<Mail className="text-blue-600"/>} label="E-mail de Acesso" value={leader.email || 'Não informado'} />
                   <InfoCard icon={<Building className="text-blue-600"/>} label="Setor Oficial" value={leader.sector_name || 'Capelania'} />
                   <InfoCard icon={<Users className="text-blue-600"/>} label="Pequeno Grupo" value={leader.pg_name || 'Não vinculado'} />
                   <InfoCard icon={<Phone className="text-blue-600"/>} label="WhatsApp" value={leader.whatsapp || 'Não informado'} />
                   <InfoCard icon={<Calendar className="text-blue-600"/>} label="Membro desde" value="01/01/2024" />
                </div>

                <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100">
                   <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ShieldAlert size={16}/> Observações Administrativas
                   </h5>
                   <p className="text-sm text-blue-900 leading-relaxed font-medium">
                      Este líder é o responsável direto pela cobertura de Pequenos Grupos no setor <b>{leader.sector_name}</b>. Qualquer mudança de setor deve ser refletida aqui para garantir a integridade dos relatórios mensais.
                   </p>
                </div>
             </div>
           )}

           {activeTab === 'atividade' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                <header>
                   <h4 className="text-3xl font-black text-slate-800 tracking-tight">Timeline Ministerial</h4>
                   <p className="text-slate-500 font-medium">Rastreabilidade completa de ações realizadas no sistema.</p>
                </header>

                <div className="space-y-4">
                   {activityHistory.map((item, idx) => (
                      <div key={item.id} className="relative pl-12 pb-8 last:pb-0">
                         {idx !== activityHistory.length - 1 && (
                            <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-100"></div>
                         )}
                         <div className="absolute left-0 top-0 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                            {item.icon}
                         </div>
                         <div>
                            <p className="font-bold text-slate-800 text-sm">{item.text}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.date}</p>
                         </div>
                      </div>
                   ))}
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                   <p className="text-xs font-bold text-slate-400 italic">Fim do histórico recente.</p>
                </div>
             </div>
           )}

           {activeTab === 'gestao' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <header>
                   <h4 className="text-3xl font-black text-slate-800 tracking-tight">Painel de Controle</h4>
                   <p className="text-slate-500 font-medium">Ações de segurança e transferência operacional.</p>
                </header>

                <div className="grid grid-cols-1 gap-4">
                   <AdminAction 
                      icon={<Key className="text-blue-600"/>} 
                      title="Redefinir Senha Provisória" 
                      description="Gera um código temporário para o líder"
                      onClick={() => onResetPassword('Mudar@123')}
                   />
                   <AdminAction 
                      icon={<Trash2 className="text-red-600"/>} 
                      title="Inativar Acesso" 
                      description="Bloqueia o login mantendo o histórico"
                      variant="danger"
                      onClick={() => {
                        const reason = prompt('Qual o motivo da inativação?');
                        if (reason) onInactivate('Outros');
                      }}
                   />
                </div>

                <div className="pt-8 border-t border-slate-100">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Atualização Rápida de Cadastro</h5>
                   <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase px-2">Nome Exibido <span className="text-red-500">*</span></label>
                            <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600" required />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase px-2">WhatsApp <span className="text-red-500">*</span></label>
                            <input type="tel" value={editForm.whatsapp} onChange={handlePhoneChange} maxLength={15} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600" required />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase px-2">Matrícula <span className="text-red-500">*</span></label>
                            <input type="text" value={editForm.employee_id} onChange={e => setEditForm({...editForm, employee_id: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600" required />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase px-2">Setor <span className="text-red-500">*</span></label>
                            <input type="text" value={editForm.sector_name} onChange={e => setEditForm({...editForm, sector_name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600" required />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase px-2">Unidade <span className="text-red-500">*</span></label>
                            <select value={editForm.hospital} onChange={e => setEditForm({...editForm, hospital: e.target.value as HospitalUnit, pg_name: ''})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" required>
                               <option value="Belém">Belém</option>
                               <option value="Barcarena">Barcarena</option>
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase px-2">Pequeno Grupo <span className="text-red-500">*</span></label>
                            <select 
                                value={editForm.pg_name || ''} 
                                onChange={e => setEditForm({...editForm, pg_name: e.target.value})} 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" 
                                required
                            >
                                <option value="">Selecione o PG...</option>
                                {filteredPGs.map(pg => (
                                    <option key={pg.id} value={pg.name}>{pg.name}</option>
                                ))}
                            </select>
                         </div>
                      </div>
                      <button onClick={handleSaveUpdate} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95">
                         <Save size={18}/> Salvar Alterações
                      </button>
                   </div>
                </div>
             </div>
           )}
        </main>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-400 hover:bg-white hover:text-slate-700'
    }`}
  >
    {icon} <span>{label}</span>
  </button>
);

const InfoCard = ({ icon, label, value }: any) => (
  <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center gap-5">
     <div className="p-3 bg-white rounded-xl shadow-sm">{icon}</div>
     <div className="min-w-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="font-bold text-slate-800 truncate">{value}</p>
     </div>
  </div>
);

const AdminAction = ({ icon, title, description, variant, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-6 rounded-3xl border border-slate-100 text-left transition-all group ${
      variant === 'danger' ? 'hover:border-red-500 bg-red-50/20' : 'hover:border-blue-600 bg-white'
    }`}
  >
     <div className="flex items-center gap-5">
        <div className={`p-4 rounded-2xl transition-all ${
          variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
        }`}>
           {icon}
        </div>
        <div>
           <p className="font-black text-slate-800 text-sm tracking-tight">{title}</p>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{description}</p>
        </div>
     </div>
     <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>
);

export default LeaderDetailModal;
