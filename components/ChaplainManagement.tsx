
import React, { useState } from 'react';
import { Search, Plus, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chaplain, Collaborator } from '../types';
import HelpNote from './HelpNote';
import ConfirmModal from './ConfirmModal';
import ChaplainCard from './ChaplainCard';
import EditChaplainModal from './EditChaplainModal';

interface ChaplainManagementProps {
  chaplains: Chaplain[];
  onAdd: (chaplain: Chaplain) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  allCollaborators: Collaborator[];
}

const ChaplainManagement: React.FC<ChaplainManagementProps> = ({ chaplains, onAdd, onToggle, onRemove, allCollaborators }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Collaborator[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null);
  const [editingChaplain, setEditingChaplain] = useState<Chaplain | null>(null);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length > 2) {
      const results = allCollaborators.filter(c =>
        c.full_name.toLowerCase().includes(term.toLowerCase()) ||
        c.employee_id.includes(term)
      ).filter(c => !chaplains.some(chap => chap.employee_id === c.employee_id));
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const promoteChaplain = (collab: Collaborator) => {
    onAdd({
      id: `chap-${collab.employee_id}-${Date.now()}`,
      employee_id: collab.employee_id,
      name: collab.full_name,
      hospital: 'Belém', // Unificado internamente
      active: true
    });
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleUpdateChaplain = async (id: string, data: Partial<Chaplain>) => {
    try {
      await updateDoc(doc(db, "chaplains", id), data);
    } catch (error) {
      console.error("Erro ao atualizar capelão:", error);
      throw error;
    }
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      onRemove(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  const displayedChaplains = chaplains.filter(c => showInactive ? true : c.active);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 text-left">
      <HelpNote
        type="info"
        text="A equipe pastoral atende de forma unificada as unidades hospitalares (Belém e Barcarena)."
      />

      <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Promover Novos Capelães</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Busque na base oficial para habilitar.</p>
          </div>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input
            type="text"
            placeholder="Nome ou Matrícula..."
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none shadow-sm focus:ring-4 focus:ring-blue-600/5 transition-all"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2">
              {searchResults.map(res => (
                <button key={res.employee_id} onClick={() => promoteChaplain(res)} className="w-full p-4 flex items-center justify-between hover:bg-blue-50 transition-colors group">
                  <div className="flex items-center gap-3 text-left min-w-0">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">{res.full_name.charAt(0)}</div>
                    <div className="min-w-0"><p className="text-sm font-black text-slate-800 truncate">{res.full_name}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{res.sector_name}</p></div>
                  </div>
                  <Plus className="text-blue-300 group-hover:text-blue-600 shrink-0" size={20} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${showInactive ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          {showInactive ? <EyeOff size={14} /> : <Eye size={14} />}
          {showInactive ? 'Ocultar Inativos' : 'Ver Inativos'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedChaplains.map(chap => (
          <ChaplainCard
            key={chap.id}
            chaplain={chap}
            onEdit={setEditingChaplain}
            onToggle={onToggle}
            onRemove={(id, name) => setItemToDelete({ id, name })}
          />
        ))}
      </div>

      {editingChaplain && (
        <EditChaplainModal
          chaplain={editingChaplain}
          onClose={() => setEditingChaplain(null)}
          onSave={handleUpdateChaplain}
        />
      )}

      {itemToDelete && (
        <ConfirmModal
          title="Remover Capelão?"
          description={<>Deseja remover permanentemente <b>{itemToDelete.name}</b>?</>}
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
          confirmText="Excluir Definitivamente"
          variant="danger"
        />
      )}
    </div>
  );
};

export default ChaplainManagement;
