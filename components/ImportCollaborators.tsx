
import React, { useState } from 'react';
import { UserCircle2, Building2, Network, ShieldCheck } from 'lucide-react';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ImportBaseCollaborators from './ImportBaseCollaborators';
import ImportSectors from './ImportSectors';
import ImportPGs from './ImportPGs';
import ChaplainManagement from './ChaplainManagement';
import { Chaplain, Sector, Collaborator, PG } from '../types';

type ImportType = 'collaborators' | 'sectors' | 'pgs' | 'chaplains';

interface ImportCollaboratorsProps {
  adminId: string;
  chaplains: Chaplain[];
  setChaplains: React.Dispatch<React.SetStateAction<Chaplain[]>>;
  sectors: Sector[];
  setSectors: React.Dispatch<React.SetStateAction<Sector[]>>;
  allCollaborators: Collaborator[];
  setAllCollaborators: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  pgs: PG[];
  setPgs: React.Dispatch<React.SetStateAction<PG[]>>;
}

const ImportCollaborators: React.FC<ImportCollaboratorsProps> = ({ 
  adminId, chaplains, setChaplains, sectors, setSectors, allCollaborators, setAllCollaborators, pgs, setPgs 
}) => {
  const [activeImport, setActiveImport] = useState<ImportType>('collaborators');

  const tabs = [
    { id: 'collaborators', label: 'Base RH', icon: <UserCircle2 size={18} /> },
    { id: 'pgs', label: 'Lista PGs', icon: <Network size={18} /> },
    { id: 'chaplains', label: 'Capelães', icon: <ShieldCheck size={18} /> },
    { id: 'sectors', label: 'Setores', icon: <Building2 size={18} /> },
  ];

  // --- HANDLERS DE PERSISTÊNCIA PARA CAPELÃES ---
  const handleAddChaplain = async (newChaplain: Chaplain) => {
    try {
        // Salva diretamente no Firestore
        await setDoc(doc(db, "chaplains", newChaplain.id), newChaplain);
        // O hook useFirestoreData atualizará o estado automaticamente via onSnapshot
    } catch (error) {
        console.error("Erro ao salvar capelão:", error);
        alert("Erro ao salvar capelão no banco de dados.");
    }
  };

  const handleToggleChaplain = async (id: string) => {
    const chaplain = chaplains.find(c => c.id === id);
    if (!chaplain) return;
    try {
        await updateDoc(doc(db, "chaplains", id), { active: !chaplain.active });
    } catch (error) {
        console.error("Erro ao alterar status:", error);
    }
  };

  const handleRemoveChaplain = async (id: string) => {
    try {
        await deleteDoc(doc(db, "chaplains", id));
    } catch (error) {
        console.error("Erro ao remover capelão:", error);
        alert("Erro ao remover capelão.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Painel Administrativo</h2>
        <p className="text-slate-500 font-medium">Sincronização master de bases reais para o banco virtual.</p>
      </header>

      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl w-fit shadow-inner">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveImport(tab.id as ImportType)} 
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              activeImport === tab.id ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm min-h-[500px]">
        {activeImport === 'collaborators' && (
            <ImportBaseCollaborators 
                allCollaborators={allCollaborators} 
                setAllCollaborators={setAllCollaborators} 
                sectors={sectors} // Passando setores para validação
            />
        )}
        {activeImport === 'sectors' && <ImportSectors sectors={sectors} setSectors={setSectors} />}
        {activeImport === 'pgs' && <ImportPGs pgs={pgs} setPgs={setPgs} />}
        {activeImport === 'chaplains' && (
          <ChaplainManagement 
            allCollaborators={allCollaborators}
            chaplains={chaplains} 
            onAdd={handleAddChaplain}
            onToggle={handleToggleChaplain}
            onRemove={handleRemoveChaplain}
          />
        )}
      </div>
    </div>
  );
};

export default ImportCollaborators;
