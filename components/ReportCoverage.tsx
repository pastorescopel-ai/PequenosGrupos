
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, Loader2, Download, X, Users, Building2, Flame, Camera, Archive } from 'lucide-react';
import { Sector, Collaborator, Leader, ReportSettings, PGMeetingPhoto, HospitalUnit, PG } from '../types';
import ReportPrintTemplate from './ReportPrintTemplate';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface InconsistentMember extends Collaborator {
    reason: 'divergent_sector' | 'not_in_rh' | 'active_member';
    original_sector_name?: string;
}

interface ReportItemData {
    id: string;
    code: string;
    name: string;
    denominator: number;
    numerator: number;
    external_count: number;
    coverage_percent: number;
    members_list: InconsistentMember[];
    leader_name?: string;
    type: 'sector' | 'pg';
    selectedPhotos?: string[];
}

interface ReportCoverageProps {
  isAdmin: boolean;
  user: Leader;
  settings: ReportSettings;
  sectors: Sector[];
  members: Collaborator[];
  allCollaborators: Collaborator[];
  leaders: Leader[];
  photos: PGMeetingPhoto[];
  pgs: PG[];
}

const ReportCoverage: React.FC<ReportCoverageProps> = ({
  isAdmin, user, settings, sectors, members, allCollaborators, leaders, pgs, photos
}) => {
  const [selectedUnit, setSelectedUnit] = useState<HospitalUnit>(user.hospital || 'Belém');
  const [reportMode, setReportMode] = useState<'sector' | 'pg'>('sector');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [auditingItem, setAuditingItem] = useState<ReportItemData | null>(null);
  const [configModalItem, setConfigModalItem] = useState<ReportItemData | null>(null);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [photoLimit, setPhotoLimit] = useState(2);

  const normalize = (s?: string) => s ? s.trim().toUpperCase() : '';

  // BUFFER BASE64 V29 (Mantido para garantir pixels no PDF)
  const imageUrlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Erro base64:", url, e);
      return url;
    }
  };

  const reportData = useMemo(() => {
      const isBelem = selectedUnit === 'Belém';
      
      if (reportMode === 'sector') {
          const rhBaseBySector = new Map<string, Collaborator[]>();
          allCollaborators.filter(c => c.active).forEach(c => {
              if (c.hospital === selectedUnit || (!c.hospital && isBelem)) {
                 const name = normalize(c.sector_name);
                 if (!rhBaseBySector.has(name)) rhBaseBySector.set(name, []);
                 rhBaseBySector.get(name)?.push(c);
              }
          });

          const participantsBySector = new Map<string, Map<string, Collaborator>>();
          const addParticipant = (collab: any) => {
              if (collab.hospital === selectedUnit || (!collab.hospital && isBelem)) {
                  const secName = normalize(collab.sector_name);
                  if (!participantsBySector.has(secName)) participantsBySector.set(secName, new Map());
                  participantsBySector.get(secName)?.set(collab.employee_id, collab);
              }
          };

          members.filter(m => m.active !== false).forEach(addParticipant);
          leaders.filter(l => l.active).forEach(l => {
              addParticipant({ id: l.id, employee_id: l.employee_id, full_name: l.full_name, sector_name: l.sector_name, hospital: l.hospital });
          });

          // LOCKED_GLOBAL_REPORTS_V32: Garantindo que setores da unidade selecionada apareçam
          const targetSectors = sectors.filter(s => s.active && (s.hospital === selectedUnit || (!s.hospital && isBelem)));
          
          return targetSectors.map(sector => {
              const secName = normalize(sector.name);
              const rhBase = rhBaseBySector.get(secName) || [];
              const participantsMap = participantsBySector.get(secName);
              const participants = participantsMap ? Array.from(participantsMap.values()) : [];
              const rhIds = new Set(rhBase.map(c => c.employee_id));
              const externalCount = participants.filter(p => p.employee_id.startsWith('EXT-')).length;

              const inconsistent = participants.filter(p => !rhIds.has(p.employee_id) && !p.employee_id.startsWith('EXT-')).map(p => {
                  const rhRecord = allCollaborators.find(rh => rh.employee_id === p.employee_id && rh.active);
                  return { ...p, reason: rhRecord ? 'divergent_sector' : 'not_in_rh', original_sector_name: rhRecord?.sector_name } as InconsistentMember;
              });

              return {
                  id: sector.id, code: sector.code, name: sector.name,
                  denominator: rhBase.length,
                  numerator: participants.length,
                  external_count: externalCount,
                  coverage_percent: rhBase.length > 0 ? (participants.length / rhBase.length) * 100 : 0,
                  members_list: inconsistent,
                  type: 'sector'
              } as ReportItemData;
          }).filter(item => 
              searchTerm === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.toLowerCase().includes(searchTerm.toLowerCase())
          ).sort((a, b) => a.name.localeCompare(b.name));
      } else {
          const targetPGs = pgs.filter(pg => pg.active && (pg.hospital === selectedUnit || (!pg.hospital && isBelem)));
          return targetPGs.map(pg => {
              const pgLeader = leaders.find(l => l.pg_name === pg.name && l.active && (l.hospital === selectedUnit || (!l.hospital && isBelem)));
              const pgMembers = members.filter(m => m.pg_name === pg.name && m.active !== false && (m.hospital === selectedUnit || (!m.hospital && isBelem)));
              const totalCount = (pgLeader ? 1 : 0) + pgMembers.length;
              let sectorRHCount = 0;
              if (pgLeader) {
                  const leaderSector = normalize(pgLeader.sector_name);
                  sectorRHCount = allCollaborators.filter(c => c.active && normalize(c.sector_name) === leaderSector && (c.hospital === selectedUnit || (!c.hospital && isBelem))).length;
              }
              return {
                  id: pg.id, code: 'PG', name: pg.name,
                  leader_name: pgLeader?.full_name || 'Sem Líder',
                  denominator: sectorRHCount || totalCount,
                  numerator: totalCount,
                  external_count: pgMembers.filter(m => m.employee_id.startsWith('EXT-')).length,
                  coverage_percent: sectorRHCount > 0 ? (totalCount / sectorRHCount) * 100 : 100,
                  members_list: [], type: 'pg'
              } as ReportItemData;
          }).filter(item => 
              searchTerm === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || (item.leader_name && item.leader_name.toLowerCase().includes(searchTerm.toLowerCase()))
          ).sort((a, b) => a.name.localeCompare(b.name));
      }
  }, [selectedUnit, reportMode, searchTerm, sectors, pgs, allCollaborators, members, leaders]);

  const getAvailablePhotosForItem = (item: ReportItemData) => {
    if (!photos) return [];
    return photos
      .filter(p => {
        if (item.type === 'pg') return normalize(p.pg_name) === normalize(item.name);
        const matchExplicitSector = p.sector_name && normalize(p.sector_name) === normalize(item.name);
        const matchLeaderOfSector = leaders.some(l => l.id === p.leader_id && normalize(l.sector_name) === normalize(item.name));
        return matchExplicitSector || matchLeaderOfSector;
      })
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  };

  const generateSinglePDF = async (item: ReportItemData) => {
    setIsGenerating(true);
    try {
        if (includePhotos) {
            const available = getAvailablePhotosForItem(item);
            const rawUrls = available.slice(0, photoLimit).map(p => p.url);
            const base64Photos = await Promise.all(rawUrls.map(url => imageUrlToBase64(url)));
            item.selectedPhotos = base64Photos;
        }

        const element = document.getElementById(`print-template-${item.id}`);
        if (!element) throw new Error("Template not found");
        await new Promise(r => setTimeout(r, 1200));

        const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' });
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, 210, 297);
        window.open(pdf.output('bloburl'), '_blank');
    } catch (e) {
        alert("Erro ao gerar PDF.");
    } finally {
        setIsGenerating(false);
        setConfigModalItem(null);
    }
  };

  const handleBatchZip = async () => {
    if (reportData.length === 0) return;
    setIsGenerating(true);
    const zip = new JSZip();
    try {
        for (const item of reportData) {
            if (includePhotos) {
                const available = getAvailablePhotosForItem(item);
                const rawUrls = available.slice(0, photoLimit).map(p => p.url);
                item.selectedPhotos = await Promise.all(rawUrls.map(url => imageUrlToBase64(url)));
            }

            const element = document.getElementById(`print-template-${item.id}`);
            if (!element) continue;
            await new Promise(r => setTimeout(r, 300));
            
            const canvas = await html2canvas(element, { scale: 2.0, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            const pdfBlob = pdf.output('blob');
            zip.file(`${item.name.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`, pdfBlob);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `Lote_Auditoria_${selectedUnit}_${reportMode}.zip`);
    } catch (e) {
        alert("Erro no processamento em lote.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleExportExcel = () => {
    const header = reportMode === 'sector' ? "ID Setor;Nome Setor;RH;Adesão %\n" : "ID PG;Nome PG;Líder;Total;Adesão %\n";
    let csv = "\ufeff" + header;
    reportData.forEach(item => {
        csv += `${item.code};${item.name};${item.denominator};${item.coverage_percent.toFixed(2)}%\n`;
    });
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `Relatorio_${reportMode}.csv`);
  };

  const periodLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  const currentLayout = selectedUnit === 'Belém' ? settings.layout?.belem : settings.layout?.barcarena;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-left">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Auditoria de Adesão</h2>
          <p className="text-slate-500 font-medium">Controle oficial por {reportMode === 'sector' ? 'departamentos' : 'grupos'}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
           <button onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-100 flex items-center gap-2 hover:bg-emerald-100 transition-all"><Download size={16}/> Exportar Dados</button>
           {reportData.length === 1 ? (
               <button onClick={() => setConfigModalItem(reportData[0])} disabled={isGenerating} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-100"><Printer size={16}/> Abrir PDF</button>
           ) : (
               <button onClick={handleBatchZip} disabled={isGenerating} className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"><Archive size={16}/> Gerar Lote (ZIP)</button>
           )}
        </div>
      </header>

      {/* BARRA DE FILTROS LOCKED_GLOBAL_REPORTS_V32 */}
      <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm no-print">
         <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
            <input type="text" placeholder={`Filtrar...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-bold outline-none" />
         </div>
         
         <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* SELETOR DE UNIDADE (RESTAURADO E FUNCIONAL) */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setSelectedUnit('Belém')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedUnit === 'Belém' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>HAB</button>
                <button onClick={() => setSelectedUnit('Barcarena')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedUnit === 'Barcarena' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>HABA</button>
            </div>

            {/* SELETOR DE MODO */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setReportMode('sector')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase ${reportMode === 'sector' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Building2 size={14}/> Setores</button>
                <button onClick={() => setReportMode('pg')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase ${reportMode === 'pg' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}><Flame size={14}/> PGs</button>
            </div>
         </div>
      </div>

      <div className="space-y-6 no-print">
         {reportData.map(item => (
            <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 group shadow-sm hover:border-blue-200 transition-all">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                  <div className="flex items-center gap-4">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all`}>{item.name.charAt(0)}</div>
                     <div>
                        <h4 className="text-lg font-black text-slate-800 leading-tight">{item.name}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{reportMode === 'sector' ? `Cód: ${item.code}` : `Líder: ${item.leader_name}`}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Participantes</p>
                        <p className="text-xl font-black text-slate-800">{item.numerator} <span className="text-sm text-slate-300">/ {item.denominator}</span></p>
                     </div>
                     <div className="flex gap-2">
                        {reportMode === 'sector' && (
                            <button onClick={() => setAuditingItem(item)} className="p-3 bg-slate-50 text-slate-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all flex items-center gap-2"><Users size={18}/><span className="hidden sm:inline text-[9px] font-black uppercase">Membros</span></button>
                        )}
                        {/* IMPRESSORA MANTIDA (REQUISITO V32) */}
                        <button onClick={() => setConfigModalItem(item)} className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"><Printer size={18}/></button>
                     </div>
                  </div>
               </div>
               <div className="relative w-full h-10 bg-slate-100 rounded-2xl overflow-hidden">
                  <div className={`absolute left-0 top-0 h-full transition-all duration-1000 ${item.coverage_percent < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(item.coverage_percent, 100)}%` }} />
               </div>
            </div>
         ))}
         {reportData.length === 0 && (
             <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                 <p className="text-slate-400 font-bold italic">Nenhum dado encontrado para esta unidade/filtro.</p>
             </div>
         )}
      </div>

      <div className="fixed opacity-0 pointer-events-none -z-50 left-[-5000px] top-0">
          {reportData.map(item => (
              <ReportPrintTemplate 
                key={item.id} id={item.id} data={item}
                assets={{ header: (selectedUnit === 'Belém' ? settings.template_belem_url : settings.template_barcarena_url) || '', footer: null, signature: settings.signature_url ? { data: settings.signature_url, ratio: 1 } : null }}
                layout={currentLayout || ({} as any)} settings={settings} periodText={periodLabel} mode={reportMode}
              />
          ))}
      </div>

      {configModalItem && (
          <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-start mb-8 text-left">
                      <div><h3 className="text-2xl font-black text-slate-800 tracking-tight">Relatório Oficial</h3><p className="text-slate-500 text-xs font-bold uppercase">{configModalItem.name}</p></div>
                      <button onClick={() => setConfigModalItem(null)} className="p-2 text-slate-400 hover:text-slate-800"><X size={24}/></button>
                  </div>
                  <div className="space-y-8">
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-left">
                          <label className="flex items-center justify-between cursor-pointer group">
                              <div className="flex items-center gap-4"><div className={`p-3 rounded-2xl ${includePhotos ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}><Camera size={20}/></div><div><p className="font-black text-slate-800 text-sm">Anexar Evidências?</p></div></div>
                              <input type="checkbox" checked={includePhotos} onChange={e => setIncludePhotos(e.target.checked)} className="hidden" />
                              <div className={`w-12 h-6 rounded-full relative ${includePhotos ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${includePhotos ? 'left-7' : 'left-1'}`} /></div>
                          </label>
                          {includePhotos && (
                              <div className="mt-8 space-y-4 animate-in fade-in">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quantidade de fotos:</p>
                                  <div className="flex gap-2">
                                      {[1, 2, 4].map(num => (
                                          <button key={num} onClick={() => setPhotoLimit(num)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${photoLimit === num ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>{num}</button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                      <button onClick={() => generateSinglePDF(configModalItem)} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"><Printer size={18}/> Gerar Documento</button>
                  </div>
              </div>
          </div>
      )}

      {auditingItem && (
          <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-hidden flex flex-col text-left">
                  <div className="flex justify-between items-start mb-6">
                      <div><h3 className="text-2xl font-black text-slate-800 tracking-tight">Participantes: {auditingItem.name}</h3></div>
                      <button onClick={() => setAuditingItem(null)} className="p-2 text-slate-400 hover:text-slate-800"><X size={28}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <div className="space-y-4">
                          {auditingItem.members_list.map(member => (
                              <div key={member.id} className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-black text-blue-600">{member.full_name.charAt(0)}</div>
                                      <div><p className="font-black text-slate-800 text-sm">{member.full_name}</p><p className="text-[9px] font-black text-slate-400 uppercase">Setor: {member.sector_name}</p></div>
                                  </div>
                                  <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[8px] font-black uppercase">Ativo</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center">
                <Loader2 className="animate-spin text-blue-600 mx-auto mb-6" size={48} />
                <h3 className="text-xl font-black text-slate-800">Preparando Lote</h3>
                <p className="text-slate-500 text-sm">Convertendo evidências e gerando documentos...</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default ReportCoverage;
