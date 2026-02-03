
import React, { useState, useEffect, useRef } from 'react';
import { X, UserCog, ScanText, Search, Briefcase, Phone, Users, UserCheck, ShieldCheck, MapPin } from 'lucide-react';
import { Leader, Collaborator, PG, HospitalUnit, Sector, UserRole } from '../types';

interface UserRegistrationModalProps {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  allCollaborators: Collaborator[];
  pgs: PG[];
  leaders: Leader[];
  sectors: Sector[];
  initialUnit?: HospitalUnit;
  forcedRole?: UserRole; // Agora o papel é definido externamente (padrão LIDER)
}

const UserRegistrationModal: React.FC<UserRegistrationModalProps> = ({ 
  onClose, onSave, allCollaborators, pgs, leaders, sectors, initialUnit, forcedRole = 'LIDER' 
}) => {
  const [currentUnit, setCurrentUnit] = useState<HospitalUnit>(initialUnit || 'Belém');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Collaborator[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  // Sector Autocomplete State
  const [sectorSearch, setSectorSearch] = useState('');
  const [sectorResults, setSectorResults] = useState<Sector[]>([]);
  const [showSectorResults, setShowSectorResults] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const sectorDropdownRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    matricula: '',
    sector: '',
    pgId: '',
    isExternal: false,
    role: forcedRole
  });

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(event.target as Node)) {
        setShowSectorResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lógica de busca por Nome ou Matrícula (Filtrado pela Unidade Selecionada)
  useEffect(() => {
    if (!formData.isExternal && searchTerm.length >= 2) {
      const lowerTerm = searchTerm.toLowerCase();
      // Filtra colaboradores que pertencem à unidade selecionada (ou null/geral se for Belém por padrão)
      const filtered = allCollaborators.filter(c => 
        c.active && 
        (c.hospital === currentUnit || (!c.hospital && currentUnit === 'Belém')) &&
        (c.full_name.toLowerCase().includes(lowerTerm) || 
         c.employee_id.includes(searchTerm))
      ).slice(0, 5);
      setSearchResults(filtered);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchTerm, formData.isExternal, allCollaborators, currentUnit]);

  // Lógica de busca de Setores (Filtrado pela Unidade Selecionada)
  useEffect(() => {
    if (sectorSearch.length >= 1) {
        const lower = sectorSearch.toLowerCase();
        const filtered = sectors.filter(s => 
            (s.hospital === currentUnit || !s.hospital) && 
            (s.name.toLowerCase().includes(lower) || s.code.toLowerCase().includes(lower))
        ).slice(0, 5);
        setSectorResults(filtered);
        setShowSectorResults(true);
    } else {
        setSectorResults([]);
        setShowSectorResults(false);
    }
  }, [sectorSearch, sectors, currentUnit]);

  const handleSelectCollaborator = (collab: Collaborator) => {
    setFormData(prev => ({
      ...prev,
      name: collab.full_name,
      matricula: collab.employee_id,
      sector: collab.sector_name,
    }));
    setSearchTerm(collab.full_name);
    setSectorSearch(collab.sector_name); 
    setShowResults(false);
  };

  const handleSelectSector = (sectorName: string) => {
      setFormData(prev => ({ ...prev, sector: sectorName }));
      setSectorSearch(sectorName);
      setShowSectorResults(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    setFormData({ ...formData, whatsapp: v });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.name || !formData.email || !formData.whatsapp) {
        alert("Preencha os campos obrigatórios (Nome, Email, WhatsApp).");
        return;
    }

    if (formData.role === 'LIDER' && !formData.pgId) {
      alert("Para cadastrar um Líder, é necessário selecionar um Pequeno Grupo.");
      return;
    }

    const finalSector = sectorSearch || formData.sector;
    if (!finalSector) {
        alert("O campo Setor é obrigatório.");
        return;
    }

    setIsSaving(true);
    try {
        await onSave({ 
            ...formData, 
            sector: finalSector, 
            hospital: currentUnit // Salva com a unidade selecionada no topo
        });
        onClose();
    } catch (e) {
        // Erro tratado no pai
    } finally {
        setIsSaving(false);
    }
  };

  const takenPGNames = leaders
    .filter(l => l.active && l.pg_name)
    .map(l => l.pg_name);

  const filteredPGs = pgs.filter(pg => 
    pg.active && 
    (pg.hospital === currentUnit || !pg.hospital) &&
    !takenPGNames.includes(pg.name)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              {forcedRole === 'ADMIN' ? <ShieldCheck className="text-orange-600" /> : <UserCog className="text-blue-600" />}
              {forcedRole === 'ADMIN' ? 'Novo Administrador' : 'Novo Líder de PG'}
            </h3>
            <p className="text-slate-500 text-xs font-medium">Preencha os dados para conceder acesso.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24}/>
          </button>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {/* SELETOR DE UNIDADE DESTAQUE */}
          <div className="p-1.5 bg-slate-100 rounded-2xl flex relative">
             <button 
                type="button"
                onClick={() => { setCurrentUnit('Belém'); setSearchTerm(''); setSectorSearch(''); setFormData(prev => ({...prev, name:'', matricula:'', sector:''})) }}
                className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all z-10 flex items-center justify-center gap-2 ${
                    currentUnit === 'Belém' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
             >
                <MapPin size={16}/> HAB (Belém)
             </button>
             <button 
                type="button"
                onClick={() => { setCurrentUnit('Barcarena'); setSearchTerm(''); setSectorSearch(''); setFormData(prev => ({...prev, name:'', matricula:'', sector:''})) }}
                className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all z-10 flex items-center justify-center gap-2 ${
                    currentUnit === 'Barcarena' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
             >
                <MapPin size={16}/> HABA (Barcarena)
             </button>
          </div>

          <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100 cursor-pointer hover:bg-blue-100/50 transition-colors"
               onClick={() => setFormData({...formData, isExternal: !formData.isExternal, matricula: '', name: '', sector: ''})}>
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded accent-blue-600" 
              checked={formData.isExternal} 
              readOnly
            />
            <div>
              <span className="text-xs font-black uppercase text-blue-800 block">Usuário Externo / Sem Matrícula</span>
              <span className="text-[10px] text-blue-600 font-medium italic">Habilite para cadastrar manualmente quem não consta na base RH.</span>
            </div>
          </div>

          {!formData.isExternal && (
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Buscar Colaborador ({currentUnit})</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-blue-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all"
                  placeholder="Digite Nome ou Matrícula..."
                />
              </div>

              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-[110] animate-in slide-in-from-top-2 max-h-60 overflow-y-auto">
                  {searchResults.map(collab => (
                    <button
                      key={collab.id}
                      type="button"
                      onClick={() => handleSelectCollaborator(collab)}
                      className="w-full p-4 text-left hover:bg-blue-50 flex items-center gap-4 transition-colors border-b border-slate-50 last:border-0 group"
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {collab.full_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-800 text-sm">{collab.full_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Mat: {collab.employee_id} • {collab.sector_name}</p>
                      </div>
                      <UserCheck size={16} className="text-slate-300 group-hover:text-blue-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nome Completo</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required 
                readOnly={!formData.isExternal}
                className={`w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 ${!formData.isExternal && 'text-slate-500 bg-slate-50/50'}`}
                placeholder="Nome"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Matrícula</label>
              <div className="relative">
                <ScanText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                  type="text" 
                  value={formData.matricula}
                  onChange={e => setFormData({...formData, matricula: e.target.value})}
                  required={!formData.isExternal}
                  readOnly={!formData.isExternal}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 ${!formData.isExternal ? 'text-slate-500 bg-slate-50/50' : ''}`}
                  placeholder="ID"
                />
              </div>
            </div>

            <div className="space-y-1.5" ref={sectorDropdownRef}>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Setor</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                  type="text" 
                  value={sectorSearch}
                  onChange={e => { setSectorSearch(e.target.value); setFormData({...formData, sector: e.target.value}); }}
                  required 
                  readOnly={!formData.isExternal}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 ${!formData.isExternal && 'text-slate-500 bg-slate-50/50'}`}
                  placeholder="Setor..."
                  onFocus={() => { if(formData.isExternal) setShowSectorResults(true); }}
                />
                
                {showSectorResults && formData.isExternal && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                        {sectorResults.map(sec => (
                            <button
                                key={sec.id}
                                type="button"
                                onClick={() => handleSelectSector(sec.name)}
                                className="w-full p-3 text-left hover:bg-slate-50 text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0"
                            >
                                {sec.name}
                            </button>
                        ))}
                    </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                  type="tel" 
                  value={formData.whatsapp}
                  onChange={handlePhoneChange}
                  required 
                  maxLength={15}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                  placeholder="(91) 99999-9999"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail de Login</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value.toLowerCase().trim()})}
                required 
                className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                placeholder="email@hospital.com"
              />
            </div>

            {/* Seleção de PG só aparece se for Líder */}
            {formData.role === 'LIDER' ? (
                <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pequeno Grupo (PG)</label>
                <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <select 
                        value={formData.pgId}
                        onChange={e => setFormData({...formData, pgId: e.target.value})}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10"
                    >
                        <option value="">Selecione o PG...</option>
                        {filteredPGs.map(pg => (
                            <option key={pg.id} value={pg.id}>{pg.name}</option>
                        ))}
                    </select>
                </div>
                </div>
            ) : (
                <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nível de Permissão</label>
                    <div className="w-full px-4 py-3 bg-orange-50 border border-orange-100 text-orange-700 rounded-xl font-black text-xs flex items-center gap-2">
                        <ShieldCheck size={16}/> Acesso Total (Administrador)
                    </div>
                </div>
            )}
          </div>

          <div className="flex gap-4 pt-6">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
            <button type="submit" disabled={isSaving} className={`flex-1 py-4 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${forcedRole === 'ADMIN' ? 'bg-orange-600 shadow-orange-100 hover:bg-orange-700' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'}`}>
                {isSaving ? 'Salvando...' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRegistrationModal;
