
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  MapPin, 
  Loader2, 
  Layers, 
  Users, 
  ShieldCheck, 
  Download, 
  Archive,
  CheckCircle2
} from 'lucide-react';
// @ts-ignore
import saveAs from 'file-saver';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import JSZip from 'jszip';

import { Leader, ReportSettings, HospitalUnit, Sector, Collaborator, UnitLayout, PGMeetingPhoto } from '../types';
import { GLOBAL_BRAND_LOGO, REPORT_SPECIFIC_LOGO } from '../assets_base64';

interface ReportCoverageProps {
  isAdmin: boolean;
  user: Leader;
  settings: ReportSettings;
  sectors: Sector[];
  members: Collaborator[];
  allCollaborators: Collaborator[];
  leaders: Leader[]; // Injetado via MainContent
  photos?: PGMeetingPhoto[];
}

const ReportCoverage: React.FC<ReportCoverageProps> = ({ isAdmin, user, settings, sectors, members, allCollaborators, leaders = [], photos = [] }) => {
  const [selectedUnit, setSelectedUnit] = useState<HospitalUnit>(user.hospital);
  const [isGenerating, setIsGenerating] = useState(false);
  const [renderItems, setReportItemsToRender] = useState<any[]>([]);
  
  const [printMode, setPrintMode] = useState<'sector' | 'pg'>('sector');
  const [reportPeriod, setReportPeriod] = useState({ month: 'Janeiro', year: '2026' });

  const [assets, setAssets] = useState<{ 
    header: string | null, 
    headerRatio: number,
    footer: string | null, 
    signature: string | null,
    signatureRatio: number 
  }>({ header: null, headerRatio: 1, footer: null, signature: null, signatureRatio: 1 });

  const getBase64ImageFromURL = (url: string): Promise<{ data: string, ratio: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas error');
        ctx.drawImage(img, 0, 0);
        resolve({
          data: canvas.toDataURL('image/png'),
          ratio: img.width / img.height
        });
      };
      img.onerror = (e) => reject(e);
      img.src = url + (url.includes('?') ? '&' : '?') + 'v_final_clarity=' + Date.now();
    });
  };

  useEffect(() => {
    const loadAssets = async () => {
      let headerUrl = selectedUnit === 'Belém' ? settings.template_belem_url : settings.template_barcarena_url;
      const footerUrl = selectedUnit === 'Belém' ? settings.footer_belem_url : settings.footer_barcarena_url;
      
      let headerData = null, headerRatio = 1, footerB64 = null, signatureB64 = null, signatureRatio = 1;
      
      try { 
        if (headerUrl) { 
          const res = await getBase64ImageFromURL(headerUrl); 
          headerData = res.data; 
          headerRatio = res.ratio; 
        } else if (REPORT_SPECIFIC_LOGO || GLOBAL_BRAND_LOGO) {
          headerData = REPORT_SPECIFIC_LOGO || GLOBAL_BRAND_LOGO;
          headerRatio = 2;
        }
      } catch (e) {}
      try { if (footerUrl) { const res = await getBase64ImageFromURL(footerUrl); footerB64 = res.data; } } catch (e) {}
      try { if (settings.signature_url) { const res = await getBase64ImageFromURL(settings.signature_url); signatureB64 = res.data; signatureRatio = res.ratio; } } catch (e) {}
      
      setAssets({ header: headerData, headerRatio, footer: footerB64, signature: signatureB64, signatureRatio });
    };
    loadAssets();
  }, [selectedUnit, settings]);

  const reportItems = useMemo(() => {
    const targetSectors = isAdmin 
        ? sectors.filter(s => s.hospital === selectedUnit || !s.hospital)
        : sectors.filter(s => s.hospital === user.hospital || !s.hospital);

    const items: any[] = [];
    if (printMode === 'sector') {
      targetSectors.forEach(sector => {
        const sectorMembers = members.filter(m => m.sector_name === sector.name && m.active !== false);
        const sectorLeaders = leaders.filter(l => l.sector_name === sector.name && l.active && l.hospital === selectedUnit);
        
        // Unifica os IDs de matrícula para evitar duplicidade líder/membro
        const uniqueMatriculas = new Set([
            ...sectorMembers.map(m => m.employee_id),
            ...sectorLeaders.map(l => l.employee_id)
        ]);

        const sectorRH = allCollaborators.filter(c => c.sector_name === sector.name && c.active);
        const denominator = sectorRH.length || 1;
        const numerator = uniqueMatriculas.size;
        
        items.push({
          id: sector.id, code: sector.code, name: sector.name, denominator, numerator,
          coverage_percent: (numerator / denominator) * 100, type: 'sector'
        });
      });
    } else {
      // Agrupamento por PG
      const uniquePGNames = Array.from(new Set([
          ...members.filter(m => m.active !== false).map(m => (m as any).pg_name),
          ...leaders.filter(l => l.active).map(l => l.pg_name)
      ])).filter(Boolean);

      uniquePGNames.forEach(pgName => {
        const pgMembers = members.filter(m => (m as any).pg_name === pgName && m.active !== false);
        const pgLeaders = leaders.filter(l => l.pg_name === pgName && l.active);
        
        const sectorName = pgMembers[0]?.sector_name || pgLeaders[0]?.sector_name;
        if (!sectorName) return;

        const sector = targetSectors.find(s => s.name === sectorName);
        if (!sector) return;

        const uniqueMatriculas = new Set([
            ...pgMembers.map(m => m.employee_id),
            ...pgLeaders.map(l => l.employee_id)
        ]);

        const sectorRH = allCollaborators.filter(c => c.sector_name === sectorName && c.active);
        items.push({
          id: `pg-${pgName}`, code: sector.code, name: pgName, sector_name: sectorName, 
          denominator: sectorRH.length || 1, numerator: uniqueMatriculas.size,
          coverage_percent: (uniqueMatriculas.size / (sectorRH.length || 1)) * 100, type: 'pg'
        });
      });
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [sectors, members, allCollaborators, leaders, selectedUnit, isAdmin, user.hospital, printMode]);

  const drawMasterFrame = (pdf: any, layout: UnitLayout) => {
    const hBg = layout.header_bg_color || '#ffffff';
    pdf.setFillColor(hBg);
    pdf.rect(layout.header.x, layout.header.y, layout.header.w, layout.header.h, 'F');

    if (assets.header) {
        const padding = 5;
        const availH = layout.header.h - (padding * 2);
        const imgW = availH * assets.headerRatio;
        pdf.addImage(assets.header, 'PNG', layout.header.x + padding, layout.header.y + padding, Math.min(imgW, layout.header.w - 10), availH);
    }

    if (assets.footer) {
        pdf.addImage(assets.footer, 'PNG', layout.footer.x, layout.footer.y, layout.footer.w, layout.footer.h);
    }
    
    if (assets.signature) {
        const sigH = layout.signature.h || 12; 
        const sigW = sigH * assets.signatureRatio;
        const sigX = 105 - (sigW / 2);
        pdf.addImage(assets.signature, 'PNG', sigX, layout.signature.y, sigW, sigH);
    }
    
    if (settings.director_name) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(40, 40, 40);
        pdf.text(settings.director_name.toUpperCase(), 105, layout.director_name_pos.y + 4, { align: 'center' });
    }
    if (settings.director_title) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(100, 100, 100);
        pdf.text(settings.director_title.toUpperCase(), 105, layout.director_title_pos.y + 3, { align: 'center' });
    }
  };

  const generatePDFBlob = async (itemsBatch: any[]): Promise<Blob> => {
    setReportItemsToRender(itemsBatch);
    await new Promise(resolve => setTimeout(resolve, 2200));

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const key = selectedUnit === 'Belém' ? 'belem' : 'barcarena';
    
    const currentLayout = settings.layout?.[key] || {
        header: { x: 0, y: 0, w: 210, h: 45 },
        header_bg_color: '#ffffff',
        footer: { x: 0, y: 260, w: 210, h: 37 },
        signature: { x: 55, y: 220, w: 100, h: 12 },
        director_name_pos: { x: 55, y: 238, w: 100, h: 10 },
        director_title_pos: { x: 55, y: 245, w: 100, h: 8 },
        content_y: 50
    };

    for (let i = 0; i < itemsBatch.length; i += 3) {
        if (i > 0) pdf.addPage();
        drawMasterFrame(pdf, currentLayout);

        const pageItems = itemsBatch.slice(i, i + 3);
        for (let j = 0; j < pageItems.length; j++) {
            const item = pageItems[j];
            const element = document.getElementById(`card-sync-v14-${item.id}`);
            if (element) {
                const canvas = await html2canvas(element, { 
                    scale: 2, 
                    backgroundColor: null, 
                    useCORS: true, 
                    logging: false 
                });
                const imgData = canvas.toDataURL('image/png', 1.0);
                const yPos = currentLayout.content_y + (j * 56); 
                pdf.addImage(imgData, 'PNG', 10, yPos, 190, 54);
            }
        }
    }
    return pdf.output('blob');
  };

  const handleBulkExportZip = async () => {
    if (reportItems.length === 0) return;
    setIsGenerating(true);
    const zip = new JSZip();
    try {
        for (const item of reportItems) {
            const blob = await generatePDFBlob([item]);
            zip.file(`RELATORIO_${item.name.replace(/\s+/g, '_')}.pdf`, blob);
        }
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `PACOTE_RELATORIOS_${selectedUnit.toUpperCase()}.zip`);
    } catch (e) {
        alert("Erro na geração do ZIP.");
    } finally {
        setIsGenerating(false);
        setReportItemsToRender([]);
    }
  };

  const handleSingleExport = async (item: any) => {
    setIsGenerating(true);
    try {
        const blob = await generatePDFBlob([item]);
        saveAs(blob, `RELATORIO_${item.name.replace(/\s+/g, '_')}.pdf`);
    } finally {
        setIsGenerating(false);
        setReportItemsToRender([]);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-32 text-left">
      
      <div style={{ position: 'fixed', top: '-5000px', left: '-5000px', pointerEvents: 'none' }}>
          <div className="flex flex-col gap-10 bg-transparent">
              {renderItems.map(item => (
                  <div key={item.id} id={`card-sync-v14-${item.id}`} style={{ width: '720px', height: '210px' }} className="p-12 bg-white font-sans border-[3px] border-slate-200 rounded-[3rem] flex items-center gap-10 shadow-none">
                    <div className="flex-1 min-w-0 flex flex-col justify-center h-full space-y-5">
                        <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1 pr-6">
                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.25em] mb-2">Unidade</p>
                                <h4 className="text-3xl font-black text-slate-900 uppercase leading-tight tracking-tight break-words">{item.name}</h4>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">{reportPeriod.month} {reportPeriod.year}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">CÓD: {item.code}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-8 pt-2">
                            <div className="space-y-1"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ativos (PG + Líder)</p><p className="text-2xl font-black text-slate-800 leading-none">{item.numerator} <span className="text-slate-300 text-lg">/ {item.denominator}</span></p></div>
                            <div className="space-y-1"><p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Performance</p><p className={`text-2xl font-black leading-none ${item.coverage_percent >= 80 ? 'text-green-600' : 'text-orange-600'}`}>{item.coverage_percent.toFixed(0)}%</p></div>
                            <div className="flex items-center pt-2"><div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner"><div className={`h-full transition-all duration-1000 ${item.coverage_percent >= 80 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(item.coverage_percent, 100)}%` }}></div></div></div>
                        </div>
                    </div>
                    <div className="w-[2px] h-20 bg-slate-100 shrink-0"></div>
                    <div className="w-28 flex flex-col justify-center items-center text-center gap-3 shrink-0">
                        <div className={`p-4 rounded-[1.5rem] border ${item.coverage_percent >= 80 ? 'bg-green-50 border-green-100 text-green-600' : 'bg-orange-50 border-orange-100 text-orange-600'}`}><ShieldCheck size={36}/></div>
                        <p className="text-[7px] font-black uppercase text-slate-400 leading-tight tracking-wide">Autenticado via<br/>PG Hospital</p>
                    </div>
                  </div>
              ))}
          </div>
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight uppercase leading-none">Emissão Master</h2>
          <p className="text-slate-500 font-medium mt-2">Relatórios Oficiais (Considerando Líderes como Ativos).</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
             <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                <button onClick={() => setPrintMode('sector')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${printMode === 'sector' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}><Layers size={14}/> Setores</button>
                <button onClick={() => setPrintMode('pg')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${printMode === 'pg' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}><Users size={14}/> PGs</button>
             </div>
             <button onClick={handleBulkExportZip} disabled={isGenerating || reportItems.length === 0} className="px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 bg-blue-900 text-white hover:bg-black transition-all shadow-2xl active:scale-95 disabled:opacity-50">
                {isGenerating ? <Loader2 size={18} className="animate-spin"/> : <Archive size={18} />} 
                <span>Exportar Tudo (ZIP)</span>
             </button>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-10 border-b border-slate-100 bg-slate-50/40 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unidade Hospitalar</label><div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm"><button onClick={() => setSelectedUnit('Belém')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedUnit === 'Belém' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Belém</button><button onClick={() => setSelectedUnit('Barcarena')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedUnit === 'Barcarena' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Barcarena</button></div></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mês de Referência</label><select value={reportPeriod.month} onChange={e => setReportPeriod({...reportPeriod, month: e.target.value})} className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 text-xs shadow-sm cursor-pointer outline-none">{['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dizembro'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ano</label><select value={reportPeriod.year} onChange={e => setReportPeriod({...reportPeriod, year: e.target.value})} className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 text-xs shadow-sm"><option value="2025">2025</option><option value="2026">2026</option></select></div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-100">
                    <tr className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
                        <th className="py-8 px-12">Unidade Analítica (Setor)</th>
                        <th className="py-8 px-4 text-center"> Ativos / RH Efetivo</th>
                        <th className="py-8 px-4">Performance Ministerial</th>
                        <th className="py-8 px-12 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {reportItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="py-10 px-12">
                                <p className="font-black text-slate-800 text-xl uppercase tracking-tight">{item.name}</p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 flex items-center gap-2"><MapPin size={12}/> ID: {item.code}</p>
                            </td>
                            <td className="py-10 px-4 text-center">
                                <span className="font-black text-slate-800 text-2xl">{item.numerator} / {item.denominator}</span>
                            </td>
                            <td className="py-10 px-4 min-w-[240px]">
                                <div className="flex items-center gap-6">
                                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                        <div className={`h-full transition-all duration-1000 ${item.coverage_percent >= 80 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(item.coverage_percent, 100)}%` }}></div>
                                    </div>
                                    <span className={`text-base font-black ${item.coverage_percent >= 80 ? 'text-green-600' : 'text-orange-600'}`}>{item.coverage_percent.toFixed(1)}%</span>
                                </div>
                            </td>
                            <td className="py-10 px-12 text-right">
                                <button onClick={() => handleSingleExport(item)} disabled={isGenerating} className="bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all shadow-md inline-flex items-center gap-3 disabled:opacity-50">
                                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Emitir PDF
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ReportCoverage;
