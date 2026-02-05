
import React from 'react';
import { UnitLayout } from '../types';

interface ReportPrintTemplateProps {
  id: string;
  data: {
    name: string;
    code: string;
    numerator: number;
    denominator: number;
    coverage_percent: number;
    leader_name?: string;
    selectedPhotos?: string[];
  };
  assets: {
    header: string;
    footer: string | null;
    signature: { data: string, ratio: number } | null;
  };
  layout: UnitLayout;
  settings: {
    director_name: string;
    director_title: string;
  };
  periodText?: string;
  mode?: 'sector' | 'pg';
}

const ReportPrintTemplate: React.FC<ReportPrintTemplateProps> = ({ 
  id, 
  data, 
  assets, 
  layout, 
  settings, 
  periodText,
  mode = 'sector'
}) => {
  const SCALE = 3.78; 
  const A4_WIDTH = 210 * SCALE;
  const A4_HEIGHT = 297 * SCALE;

  return (
    <div 
      id={`print-template-${id}`}
      style={{ 
        width: `${A4_WIDTH}px`, 
        height: `${A4_HEIGHT}px`,
        backgroundColor: 'white',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Helvetica, Arial, sans-serif'
      }}
    >
      {/* CABEÇALHO */}
      <div 
        style={{ 
          position: 'absolute',
          left: `${layout.header.x * SCALE}px`,
          top: `${layout.header.y * SCALE}px`,
          width: `${layout.header.w * SCALE}px`,
          height: `${layout.header.h * SCALE}px`,
          backgroundColor: layout.header_bg_color || '#ffffff',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '20px',
          zIndex: 10
        }}
      >
        {assets.header && (
          <img 
            src={assets.header} 
            alt="Logo" 
            crossOrigin="anonymous"
            style={{ height: '80%', maxWidth: '90%', objectFit: 'contain' }}
          />
        )}
      </div>

      {/* CORPO */}
      <div 
        style={{
          position: 'absolute',
          top: `${layout.content_y * SCALE}px`,
          left: '40px',
          right: '40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
            <p style={{ margin: 0, fontSize: '10px', color: '#2563eb', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                {mode === 'sector' ? 'Relatório de Engajamento por Departamento' : 'Relatório de Atividade por Pequeno Grupo'}
            </p>
            <h1 style={{ margin: '8px 0 0 0', fontSize: '36px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>{data.name}</h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                {mode === 'sector' ? `ID SETOR: ${data.code}` : `LÍDER: ${data.leader_name}`} • COMPETÊNCIA: {periodText}
            </p>
        </div>

        <div style={{ display: 'flex', gap: '30px' }}>
            <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '25px', padding: '30px', border: '1px solid #f1f5f9' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>{mode === 'sector' ? 'Participação Real' : 'Membros Ativos'}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '48px', fontWeight: '900', color: '#2563eb' }}>{data.numerator} <span style={{ fontSize: '20px', color: '#cbd5e1' }}>/ {data.denominator}</span></p>
            </div>
            <div style={{ flex: 1, backgroundColor: data.coverage_percent >= 80 ? '#f0fdf4' : '#fef2f2', borderRadius: '25px', padding: '30px', border: data.coverage_percent >= 80 ? '1px solid #dcfce7' : '1px solid #fee2e2' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Índice de Cobertura</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '48px', fontWeight: '900', color: data.coverage_percent >= 80 ? '#16a34a' : '#dc2626' }}>{data.coverage_percent.toFixed(1)}%</p>
            </div>
        </div>

        {/* EVIDÊNCIAS V31: Contain para não desconfigurar tamanho enviado */}
        {data.selectedPhotos && data.selectedPhotos.length > 0 && (
            <div style={{ marginTop: '10px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '9px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Evidências Registradas</p>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: data.selectedPhotos.length === 1 ? '1fr' : '1fr 1fr', 
                    gap: '15px',
                    height: '350px' 
                }}>
                    {data.selectedPhotos.map((url, idx) => (
                        <div key={idx} style={{ 
                            borderRadius: '20px', 
                            overflow: 'hidden', 
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f1f5f9', // Fundo neutro caso a foto seja estreita/proporcional
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img 
                                src={url} 
                                crossOrigin="anonymous" 
                                style={{ 
                                    maxWidth: '100%', 
                                    maxHeight: '100%', 
                                    objectFit: 'contain', // LOCKED_REPORT_SHIELD_V31: Sem cortes
                                    display: 'block'
                                }} 
                                alt="Evidência" 
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* ASSINATURA */}
      <div 
        style={{
          position: 'absolute',
          left: '0',
          width: '100%',
          top: `${layout.signature.y * SCALE}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 5
        }}
      >
        {assets.signature && (
          <img 
            src={assets.signature.data} 
            alt="Signature"
            crossOrigin="anonymous"
            style={{ height: `${layout.signature.h * SCALE}px`, objectFit: 'contain' }}
          />
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, width: '100%', top: `${layout.director_name_pos.y * SCALE}px`, textAlign: 'center', fontSize: '15px', fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase' }}>
        {settings.director_name}
      </div>
      <div style={{ position: 'absolute', left: 0, width: '100%', top: `${layout.director_title_pos.y * SCALE}px`, textAlign: 'center', fontSize: '11px', fontWeight: '500', color: '#64748b', textTransform: 'uppercase' }}>
        {settings.director_title}
      </div>

      {/* RODAPÉ */}
      <div style={{ position: 'absolute', left: `${layout.footer.x * SCALE}px`, top: `${layout.footer.y * SCALE}px`, width: `${layout.footer.w * SCALE}px`, height: `${layout.footer.h * SCALE}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        {assets.footer && (
          <img src={assets.footer} alt="Footer" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
    </div>
  );
};

export default ReportPrintTemplate;
