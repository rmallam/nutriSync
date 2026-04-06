"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BloodTestStorage } from '@/utils/storage';

export default function ReportsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startAnalysis = async () => {
    if (!previewUrl) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/analyze-blood-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: previewUrl })
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
    const success = await BloodTestStorage.save(analysisResult.biomarkers, analysisResult.summary);
    if (success) {
      router.push('/progress'); // Redirect back to Dashboard
    } else {
      alert("Failed to save to database. Check your connection or table schema.");
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '100px', paddingTop: 'env(safe-area-inset-top, 24px)', background: 'var(--bg-tertiary)', minHeight: '100vh' }}>
      
      <header style={{ padding: 'var(--space-6) var(--space-6)', marginBottom: 'var(--space-2)' }}>
        <button 
          onClick={() => router.push('/progress')}
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '16px', padding: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back to Dashboard
        </button>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '2.2rem' }}>🩸</span> Lab Reports
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Upload your latest blood panel to sync with your AI Meal Planner.</p>
      </header>

      <div style={{ padding: '0 var(--space-4)' }}>
        
        {/* Upload Container */}
        {!analysisResult && (
          <div className="card animate-fade-in" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
            
            {!previewUrl ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ height: '200px', border: '2px dashed var(--border-subtle)', borderRadius: '16px', background: 'transparent', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <div style={{ fontWeight: 600 }}>Tap to Select Image</div>
                <div style={{ fontSize: '0.8rem' }}>Take a picture of your blood work</div>
              </button>
            ) : (
              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative' }}>
                <img src={previewUrl} alt="Report Preview" style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'cover' }} />
                <button 
                  onClick={() => setPreviewUrl(null)}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            )}
            
            <button 
              onClick={startAnalysis}
              disabled={!previewUrl || loading}
              className="btn btn-primary"
              style={{ padding: '16px', fontSize: '1.1rem', background: 'var(--error)' }}
            >
              {loading ? "Analyzing Biomarkers..." : "Analyze the Results"}
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

             {analysisResult.biomarkers.length > 0 ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Identified Deficiencies</h3>
                 {analysisResult.biomarkers.map((bm: any, idx: number) => (
                    <div key={idx} style={{ background: 'rgba(255, 69, 58, 0.05)', border: '1px solid rgba(255, 69, 58, 0.2)', padding: '16px', borderRadius: '12px' }}>
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
