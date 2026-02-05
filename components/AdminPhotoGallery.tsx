import React, { useState, useMemo } from 'react';
import { Camera, Search, Filter, Calendar, MapPin, CheckCircle2, LayoutGrid, List } from 'lucide-react';
import { PGMeetingPhoto, HospitalUnit } from '../types';

interface AdminPhotoGalleryProps {
  photos: PGMeetingPhoto[];
}

const AdminPhotoGallery: React.FC<AdminPhotoGalleryProps> = ({ photos }) => {
  const [selectedUnit, setSelectedUnit] = useState<HospitalUnit | 'TODAS'>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedWeek, setSelectedWeek] = useState<string>('TODAS');

  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
        const matchesUnit = selectedUnit === 'TODAS' || p.hospital === selectedUnit;
        const matchesTerm = (p.pg_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.leader_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWeek = selectedWeek === 'TODAS' || p.week_number.toString() === selectedWeek;
        return matchesUnit && matchesTerm && matchesWeek;
    }).sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  }, [photos, selectedUnit, searchTerm, selectedWeek]);

  const weeks = useMemo(() => {
    // Added explicit type annotations for sort arguments to resolve arithmetic operation type error
    const w = Array.from(new Set(photos.map(p => p.week_number))).sort((a: number, b: number) => b - a);
    return w;
  }, [photos]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 text-left">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase">Auditória de Encontros</h2>
          <p className="text-slate-500 font-medium">Galeria global de evidências de Pequenos Grupos.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
          <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={18}/></button>
          <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><List size={18}/></button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                  <input 
                    type="text" 
                    placeholder="Buscar por PG ou Líder..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-600/5 transition-all"
                  />
              </div>
              <div className="flex gap-2">
                  <select 
                    value={selectedUnit}
                    onChange={e => setSelectedUnit(e.target.value as any)}
                    className="px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none"
                  >
                      <option value="TODAS">Todas Unidades</option>
                      <option value="Belém">HAB</option>
                      <option value="Barcarena">HABA</option>
                  </select>
                  <select 
                    value={selectedWeek}
                    onChange={e => setSelectedWeek(e.target.value)}
                    className="px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none"
                  >
                      <option value="TODAS">Semana: Todas</option>
                      {weeks.map(w => <option key={w} value={w}>Semana {w}</option>)}
                  </select>
              </div>
          </div>
      </div>

      {filteredPhotos.length === 0 ? (
          <div className="py-32 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem]">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200 shadow-sm"><Camera size={40} /></div>
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Nenhuma evidência encontrada</h3>
          </div>
      ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"}>
              {filteredPhotos.map(photo => (
                  <div key={photo.id} className={`bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-xl transition-all group ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : ''}`}>
                      <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-48 h-32 rounded-2xl shrink-0' : 'aspect-video'}`}>
                          <img src={photo.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Meeting" />
                          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-[9px] font-black uppercase text-blue-600 shadow-sm">
                              Semana {photo.week_number}
                          </div>
                          {viewMode === 'grid' && (
                              <div className="absolute bottom-3 right-3 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg">
                                  <CheckCircle2 size={14}/>
                              </div>
                          )}
                      </div>
                      <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                          <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${photo.hospital === 'Belém' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                  {photo.hospital === 'Belém' ? 'HAB' : 'HABA'}
                              </span>
                              <span className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[120px]">{photo.pg_name}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-600 italic line-clamp-2 mb-4">"{photo.description}"</p>
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                              <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                      {photo.leader_name?.charAt(0)}
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{photo.leader_name}</span>
                              </div>
                              <span className="text-[8px] font-black text-slate-300 uppercase">{new Date(photo.uploaded_at).toLocaleDateString()}</span>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default AdminPhotoGallery;