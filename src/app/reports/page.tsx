"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BloodTestStorage } from '@/utils/storage';

interface UIFile {
  name: string;
  type: string;
  dataUrl: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<UIFile[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUIFiles: UIFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await readFileAsDataURL(file);
      newUIFiles.push({
        name: file.name,
        type: file.type,
        dataUrl
      });
    }

    // Append to existing files
    setSelectedFiles(prev => [...prev, ...newUIFiles]);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    if (selectedFiles.length === 0) return;
    setLoading(true);
    
    try {
      // Send all base64 URIs to the backend
      const res = await fetch('/api/analyze-blood-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: selectedFiles.map(f => f.dataUrl) })
      });
      const json = await res.json();
      
      if (json.success) {
        setAnalysisResult(json.data);
      } else {
        alert("Failed to analyze report: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error contacting analysis API.");
    }
    setLoading(false);
  };

  const saveToDashboard = async () => {
    if (!analysisResult) return;
    setLoading(true);
    
    // Inject the intelligent AI supplements into the biomarkers array as META data 
    // so we can reliably fetch them later without a schema migration.
    const biomarkersWithMeta = [...analysisResult.biomarkers];
    
    // Safely coerce to array (LLMs sometimes hallucinate strings despite JSON Schema)
    let suppArray: string[] = [];
    if (Array.isArray(analysisResult.supplements_required)) {
      suppArray = analysisResult.supplements_required;
    } else if (typeof analysisResult.supplements_required === 'string') {
      suppArray = analysisResult.supplements_required.split(',').map((s: string) => s.trim());
    }

    if (suppArray && suppArray.length > 0) {
      biomarkersWithMeta.push({
        marker: '__SUPPLEMENTS__',
        status: 'META',
        value: suppArray.join(',')
      });
    }

    const success = await BloodTestStorage.save(biomarkersWithMeta, analysisResult.summary, analysisResult.report_date);
    if (success) {
      router.push('/progress'); // Redirect back to Dashboard
    } else {
      alert("Failed to save to database. Check your connection or table schema.");
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-tertiary)', minHeight: '100vh', paddingBottom: '90px' }}>
      {/* Brand Header */}
      <header className="glass-panel" style={{ 
        position: 'sticky', top: 0, zIndex: 40, padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--border-subtle)', borderRadius: 0, marginBottom: 'var(--space-6)'
      }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span style={{ fontSize: '1.5rem' }}>🍏</span> NutriSync
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
              Lab Reports
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => router.push('/progress')} style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}>
             Cancel
          </button>
        </div>
      </header>

      <div className="container" style={{ padding: '0 var(--space-4)' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>Upload your latest blood panel, PDF, or photos to sync with your AI Meal Planner.</p>
        
        {/* Upload Container */}
        {!analysisResult && (
          <div className="card animate-fade-in" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <input 
              type="file" 
              accept="image/*, application/pdf" 
              multiple
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
            
            {selectedFiles.length === 0 ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ height: '200px', border: '2px dashed var(--border-subtle)', borderRadius: '16px', background: 'transparent', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <div style={{ fontWeight: 600 }}>Tap to Select Files or PDFs</div>
                <div style={{ fontSize: '0.8rem' }}>Take photos or upload PDF lab reports</div>
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Selected Documents</h3>
                  <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer' }}>+ Add More</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} style={{ position: 'relative', borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden', background: 'var(--bg-secondary)', padding: file.type.includes('image') ? '0' : '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
                      
                      {file.type.includes('image') ? (
                        <img src={file.dataUrl} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          <span style={{ fontSize: '0.75rem', marginTop: '8px', textAlign: 'center', wordBreak: 'break-all', padding: '0 8px', color: 'var(--text-muted)' }}>{file.name}</span>
                        </>
                      )}

                      <button 
                        onClick={() => removeFile(idx)}
                        style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button 
              onClick={startAnalysis}
              disabled={selectedFiles.length === 0 || loading}
              className="btn btn-primary"
              style={{ padding: '16px', fontSize: '1.1rem', background: 'var(--error)' }}
            >
              {loading ? "Analyzing Biomarkers..." : `Analyze ${selectedFiles.length} Document(s)`}
            </button>
          </div>
        )}

        {/* Results View */}
        {analysisResult && (
          <div className="card animate-fade-in" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255, 45, 85, 0.2)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Analysis Complete</h2>
             </div>
             
             <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
               <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>{analysisResult.summary}</p>
             </div>

             {analysisResult.biomarkers.filter((bm: any) => bm.status.toLowerCase() !== 'normal').length > 0 ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase' }}>Identified Deficiencies</h3>
                 {analysisResult.biomarkers.filter((bm: any) => bm.status.toLowerCase() !== 'normal').map((bm: any, idx: number) => (
                    <div key={'abn_'+idx} style={{ background: 'rgba(255, 69, 58, 0.05)', border: '1px solid rgba(255, 69, 58, 0.2)', padding: '16px', borderRadius: '12px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{bm.marker}</span>
                          <span style={{ fontSize: '0.8rem', background: 'var(--error)', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>{bm.status.toUpperCase()}</span>
                       </div>
                       {bm.value && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Recorded Value: {bm.value}</div>}
                       <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>💡 {bm.recommendation}</div>
                    </div>
                 ))}
               </div>
             ) : (
                <div style={{ padding: '16px', background: 'rgba(48, 209, 88, 0.1)', border: '1px solid rgba(48, 209, 88, 0.2)', borderRadius: '12px', color: 'var(--success)', fontWeight: 600 }}>
                  Excellent! We didn't detect any severe deficiencies in this panel.
                </div>
             )}
             
             {analysisResult.biomarkers.filter((bm: any) => bm.status.toLowerCase() === 'normal').length > 0 && (
                <details style={{ marginTop: '8px', background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <summary style={{ fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, outline: 'none' }}>
                     View Normal Markers ({analysisResult.biomarkers.filter((bm: any) => bm.status.toLowerCase() === 'normal').length})
                  </summary>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '16px' }}>
                     {analysisResult.biomarkers.filter((bm: any) => bm.status.toLowerCase() === 'normal').map((bm: any, idx: number) => (
                        <div key={'norm_'+idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                           <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{bm.marker}</span>
                           <span style={{ fontSize: '0.75rem', background: 'var(--success)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>NORMAL</span>
                        </div>
                     ))}
                  </div>
                </details>
             )}

             <button 
               onClick={saveToDashboard}
               disabled={loading}
               className="btn btn-primary"
               style={{ padding: '16px', fontSize: '1.1rem' }}
             >
               {loading ? "Saving..." : "Save to Dashboard"}
             </button>
          </div>
        )}

      </div>
    </div>
  );
}
