
import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Check, X } from 'lucide-react';
import { Sector } from '../types';

const INITIAL_SECTORS: Sector[] = [];

const SectorManager: React.FC = () => {
  const [sectors, setSectors] = useState<Sector[]>(INITIAL_SECTORS);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newSector, setNewSector] = useState({ code: '', name: '' });

  const filtered = sectors.filter(s => 
    (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.code || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleActive = (id: string) => {
    setSectors(sectors.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const addSector = () => {
    if (!newSector.code || !newSector.name) return;
    const item: Sector = {
      id: Math.random().toString(),
      code: newSector.code.toUpperCase(),
      name: newSector.name,
      active: true,
      created_at: new Date().toISOString()
    };
    setSectors([...sectors, item]);
    setNewSector({ code: '', name: '' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar setor..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-all font-bold"
        >
          <Plus size={20} />
          Novo Setor
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-lg animate-in fade-in zoom-in duration-200">
          <h4 className="font-bold text-slate-800 mb-4">Novo Setor</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                value={newSector.code}
                onChange={e => setNewSector({...newSector, code: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={newSector.name}
                onChange={e => setNewSector({...newSector, name: e.target.value})}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded font-medium">Cancelar</button>
            <button onClick={addSector} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Confirmar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {sectors.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-bold italic">Nenhum setor cadastrado.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-bold text-slate-500 uppercase">Código</th>
                <th className="text-left py-3 px-6 text-xs font-bold text-slate-500 uppercase">Nome</th>
                <th className="text-center py-3 px-6 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="text-right py-3 px-6 text-xs font-bold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-blue-600">{s.code}</td>
                  <td className="py-4 px-6 text-slate-800 font-medium">{s.name}</td>
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={() => toggleActive(s.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        s.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {s.active ? <Check size={12}/> : <X size={12}/>}
                      {s.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SectorManager;
