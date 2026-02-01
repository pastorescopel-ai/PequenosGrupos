
import React, { useState } from 'react';
import { Camera, Plus, Calendar, Info, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Leader, PGMeetingPhoto } from '../types';
import MeetingRegistryModal from './MeetingRegistryModal';

interface PGPhotosViewProps {
  user: Leader;
  photos: PGMeetingPhoto[];
  onAddPhoto: (data: { photo: any, description: string }) => void;
}

const PGPhotosView: React.FC<PGPhotosViewProps> = ({ user, photos, onAddPhoto }) => {
  const [showModal, setShowModal] = useState(false);
  
  // Simulação de semana atual
  const currentWeek = 11;
  const hasUploadedThisWeek = photos.some(p => p.week_number === currentWeek);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
         <div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Reuniões de PG</h2>
            <p className="text-slate-500 font-medium">Gerencie as evidências semanais de reunião do setor.</p>
         </div>
         {!hasUploadedThisWeek && (
           <button 
             onClick={() => setShowModal(true)}
             className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 animate-bounce"
           >
             <Plus size={20} /> Registrar Reunião
           </button>
         )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                 <Clock className="text-blue-600" size={24}/> Histórico de Registros
              </h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizado com Nuvem</span>
           </div>

           {photos.length === 0 ? (
             <div className="py-20 text-center opacity-40">
                <Camera size={64} className="mx-auto mb-4"/>
                <p className="font-bold">Nenhum registro fotográfico encontrado.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {photos.map(p => (
                   <div key={p.id} className="group bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 transition-all hover:shadow-xl">
                      <div className="aspect-video relative overflow-hidden">
                         <img src={p.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Reunião"/>
                         <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm">
                           Semana {p.week_number}
                         </div>
                      </div>
                      <div className="p-8">
                         <p className="text-xs font-bold text-slate-600 leading-relaxed italic mb-4">"{p.description}"</p>
                         <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enviado em {new Date(p.uploaded_at).toLocaleDateString()}</span>
                            <CheckCircle2 size={16} className="text-green-500"/>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
           )}
        </div>

        <div className="space-y-6">
           <div className="bg-blue-950 p-10 rounded-[3rem] text-white shadow-2xl">
              <h4 className="text-xl font-black mb-6 flex items-center gap-3">
                 <Info className="text-blue-400" size={20}/> Status da Semana
              </h4>
              <div className="space-y-6">
                 <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${hasUploadedThisWeek ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                       <Calendar size={24}/>
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Semana Atual</p>
                       <p className="font-bold">{hasUploadedThisWeek ? 'Registro Concluído' : 'Registro Pendente'}</p>
                    </div>
                 </div>
                 
                 <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-xs font-medium leading-relaxed text-blue-100/70">
                       Lembre-se: Cada foto enviada é analisada pela Capelania. Registros duplicados ou fora do padrão PG serão invalidados.
                    </p>
                 </div>
              </div>
           </div>

           <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100">
              <div className="flex gap-4 mb-4">
                 <AlertTriangle className="text-orange-600" size={24}/>
                 <p className="text-sm font-black text-orange-900">Atenção ao Padrão</p>
              </div>
              <p className="text-xs text-orange-800 leading-relaxed font-medium">
                 Fotos devem mostrar o grupo reunido no ambiente do hospital ou local de encontro. Evite selfies individuais ou fotos apenas de materiais.
              </p>
           </div>
        </div>
      </div>

      {showModal && (
        <MeetingRegistryModal 
          user={user} 
          onClose={() => setShowModal(false)} 
          onSave={(data) => { onAddPhoto(data); setShowModal(false); }} 
        />
      )}
    </div>
  );
};

export default PGPhotosView;
