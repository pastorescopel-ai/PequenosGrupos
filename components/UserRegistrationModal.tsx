
import React, { useState, useEffect, useRef } from 'react';
import { X, UserCog, ScanText, Search, Briefcase, Phone, Users, UserCheck, ShieldCheck, MapPin, AlertTriangle } from 'lucide-react';
import { Leader, Collaborator, PG, HospitalUnit, Sector, UserRole } from '../types';

interface UserRegistrationModalProps {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  allCollaborators: Collaborator[];
  pgs: PG[];
  leaders: Leader[];
  sectors: Sector[];
  initialUnit?: HospitalUnit;
  forcedRole?: UserRole;
}

const UserRegistrationModal: React.FC<UserRegistrationModalProps> = ({ 
  onClose, onSave, allCollaborators, pgs, leaders, sectors, initialUnit, forcedRole = 'LIDER' 
}) => {
  const [currentUnit, setCurrentUnit] = useState<HospitalUnit>(initialUnit || 'Belém');
  const unitIsLocked = !!initialUnit;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Collaborator[]>([]);
  const [showResults, setShowResults] = useState(false);
  
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

  // ELITE_INTEGRITY_SHIELD_V32: Lookup Automático de RH via Matrícula
  useEffect(() => {
    if (!formData.isExternal && formData.matricula.length >= 4) {
      const collab = allCollaborators.find(c => 
        c.employee_id === formData.matricula && 
        (c.hospital === currentUnit || (!c.hospital && currentUnit === 'Belém'))
      );
      if (collab) {
        setFormData(prev => ({
          ...prev,
          name: collab.full_name,
          sector: collab.sector_name
        }));
        setSectorSearch(collab.sector_name);
      }
    }
  }, [formData.matricula, formData.isExternal, allCollaborators, currentUnit]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowResults(false);
      if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(event.target as Node)) setShowSectorResults(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!formData.isExternal && searchTerm.length >= 2) {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = allCollaborators.filter(c => 
        c.active && 
        (c.hospital === currentUnit || (!c.hospital && currentUnit === 'Belém')) &&
        ((c.full_name || '').toLowerCase().includes(lowerTerm) || (c.employee_id || '').includes(searchTerm))
      ).slice(0, 15); 
      setSearchResults(filtered);
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [searchTerm, formData.isExternal, allCollaborators, currentUnit]);

  useEffect(() => {
    if (sectorSearch.length >= 1) {
        const lower = sectorSearch.toLowerCase();
        const filtered = sectors.filter(s => 
            (s.hospital === currentUnit || !s.hospital) && 
            ((s.name || '').toLowerCase().includes(lower) || (s.code || '').toLowerCase().includes(lower))
        ).slice(0, 10);
        setSectorResults(filtered);
        setShowSectorResults(true);
    } else {
        setShowSectorResults(false);
    }
  }, [sectorSearch, sectors, currentUnit]);

  const handleSelectCollaborator = (collab: Collaborator) => {
    setFormData(prev => ({ ...prev, name: collab.full_name, matricula: collab.employee_id, sector: collab.sector_name }));
    setSearchTerm(collab.full_name);
    setSectorSearch(collab.sector_name); 
    setShowResults(false);
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
    if (formData.role === 'LIDER' && !formData.pgId) { alert("Selecione um Pequeno Grupo."); return; }
    if (!sectorSearch && !formData.sector) { alert("Informe o Setor."); return; }

    setIsSaving(true);
    try {
        await onSave({ ...formData, sector: sectorSearch || formData.sector, hospital: currentUnit });
        onClose();
    } catch (e) {
        setIsSaving(false);
    }
  };

  const filteredPGs = pgs.filter(pg => 
    pg.active && 
    (pg.hospital === currentUnit || !pg.hospital) &&
    !leaders.some(l => l.active && l.pg_name === pg.name && l.hospital === currentUnit)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              {forcedRole === 'ADMIN' ? <ShieldCheck className="text-orange-600" /> : <UserCog className="text-blue-600" />}
              Cadastro Estrito: {currentUnit}
            </h3>
            <p className="text-slate-500 text-xs font-medium">Os dados serão buscados automaticamente pela matrícula.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24}/></button>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {!unitIsLocked && (
              <div className="p-1.5 bg-slate-100 rounded-2xl flex">
                <button type="button" onClick={() => setCurrentUnit('Belém')} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${currentUnit === 'Belém' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>HAB</button>
                <button type="button" onClick={() => setCurrentUnit('Barcarena')} className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${currentUnit === 'Barcarena' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>HABA</button>
              </div>
          )}

          {!formData.isExternal && (
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Matrícula (RH {currentUnit})</label>
              <div className="relative">
                <ScanText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                  type="text" 
                  value={formData.matricula} 
                  onChange={e => setFormData({...formData, matricula: e.target.value.toUpperCase()})} 
                  className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-blue-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                  placeholder="Digite para preencher automático..." 
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
            <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400">Nome Completo</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required readOnly={!formData.isExternal && formData.name !== ''} className={`w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none ${!formData.isExternal && formData.name !== '' ? 'text-slate-500' : ''}`} />
            </div>
            <div className="space-y-1.5" ref={sectorDropdownRef}>
              <label className="text-[10px] font-black uppercase text-slate-400">Setor Principal</label>
              <input type="text" value={sectorSearch} onChange={e => { setSectorSearch(e.target.value); setFormData({...formData, sector: e.target.value}); }} required className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none" />
              {showSectorResults && sectorResults.length > 0 && (
                <div className="absolute bg-white border border-slate-200 rounded-xl mt-2 w-[280px] shadow-2xl z-[120]">
                    {sectorResults.map(s => <button key={s.id} onClick={() => { setSectorSearch(s.name); setShowSectorResults(false); }} className="w-full p-3 text-left hover:bg-slate-50 text-xs font-bold">{s.name}</button>)}
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400">WhatsApp</label>
              <input type="tel" value={formData.whatsapp} onChange={handlePhoneChange} required maxLength={15} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none" placeholder="(91) 99999-9999" />
            </div>
            <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400">E-mail de Login</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase().trim()})} required className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none" placeholder="email@hospital.com" />
            </div>
            {formData.role === 'LIDER' && (
                <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400">Pequeno Grupo (PG)</label>
                    <select value={formData.pgId} onChange={e => setFormData({...formData, pgId: e.target.value})} required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none">
                        <option value="">Selecione o PG do {currentUnit}...</option>
                        {filteredPGs.map(pg => <option key={pg.id} value={pg.id}>{pg.name}</option>)}
                    </select>
                </div>
            )}
          </div>

          <div className="flex gap-4 pt-6">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Cancelar</button>
            <button type="submit" disabled={isSaving} className={`flex-1 py-4 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl transition-all ${forcedRole === 'ADMIN' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                {isSaving ? 'Gravando...' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRegistrationModal;
