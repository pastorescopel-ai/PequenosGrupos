
import React, { useState } from 'react';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MapPin } from 'lucide-react';
import { Chaplain, Sector, Collaborator, PG, HospitalUnit } from '../types';

import ImportBaseCollaborators from './ImportBaseCollaborators';
import ImportSectors from './ImportSectors';
import ImportPGs from './ImportPGs';
import ChaplainManagement from './ChaplainManagement';

/**
 * @blindagem_importacao_v8
 * Este componente gerencia a sincronização de bases mestras.
 * As abas são fixas para garantir que RH, PGs, Setores e Capelães estejam sempre acessíveis.
 */
const ImportCollaborators: React.FC<any> = ({ 
  chaplains, sectors, setSectors, allCollaborators, setAllCollaborators, pgs, setPgs 
}) => {
  const [activeImport, setActiveImport] = useState<'rh' | 'pg' | 'sectors' | 'chaplains'>('rh');
  const [defaultUnit, setDefaultUnit] = useState<HospitalUnit>('Belém');

  const tabs = [
    { id: 'rh', label: 'Base RH', icon: '👥' },
    { id: 'pg', label: 'Lista PGs', icon: '🕸️' },
    { id: 'sectors', label: 'Setores', icon: '🏢' },
    { id: 'chaplains', label: 'Capelães', icon: '🛡️' },
  ];

  const handleAddChaplain = async (newChaplain: Chaplain) => {
    try { await setDoc(doc(db, "chaplains", newChaplain.id), newChaplain); } catch (e) { alert("Erro ao salvar capelão."); }
  };

  const handleToggleChaplain = async (id: string) => {
    const chaplain = chaplains.find((c: any) => c.id === id);
    if (chaplain) try { await updateDoc(doc(db, "chaplains", id), { active: !chaplain.active }); } catch (e) {}
  };

  const handleRemoveChaplain = async (id: string) => {
    try { await deleteDoc(doc(db, "chaplains", id)); } catch (e) {}
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 text-left">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Sincronização de Bases</h2>
          <p className="text-slate-500 font-medium italic">Dados oficiais do RH, PGs e Escala Pastoral.</p>
        </div>
        
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2">
             <span className="text-[10px] font-black uppercase text-slate-400 pl-2 tracking-widest">Unidade Alvo:</span>
             <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setDefaultUnit('Belém')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${defaultUnit === 'Belém' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><MapPin size={14}/> HAB</button>
                <button onClick={() => setDefaultUnit('Barcarena')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${defaultUnit === 'Barcarena' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><MapPin size={14}/> HABA</button>
             </div>
        </div>
      </header>

      {/* TABS DE IMPORTAÇÃO */}
      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl w-fit shadow-inner overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveImport(tab.id as any)} 
            className={`flex items-center gap-3 px-6 md:px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeImport === tab.id ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            <span className="text-lg">{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DINÂMICO DAS TABS */}
      <div className="bg-white p-6 md:p-12 rounded-[3rem] border border-slate-200 shadow-sm min-h-[500px]">
        {activeImport === 'rh' && (
            <ImportBaseCollaborators allCollaborators={allCollaborators} setAllCollaborators={setAllCollaborators} sectors={sectors} defaultUnit={defaultUnit} />
        )}
        {activeImport === 'sectors' && (
            <ImportSectors sectors={sectors} setSectors={setSectors} allCollaborators={allCollaborators} defaultUnit={defaultUnit} />
        )}
        {activeImport === 'pg' && (
            <ImportPGs pgs={pgs} setPgs={setPgs} defaultUnit={defaultUnit} />
        )}
        {activeImport === 'chaplains' && (
          <ChaplainManagement 
            allCollaborators={allCollaborators} chaplains={chaplains} 
            onAdd={handleAddChaplain} onToggle={handleToggleChaplain} onRemove={handleRemoveChaplain}
          />
        )}
      </div>
    </div>
  );
};

export default ImportCollaborators;
