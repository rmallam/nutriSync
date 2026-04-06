"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BloodTestStorage, MealStorage } from '@/utils/storage';

interface UIFile {
  name: string;
  type: string;
  dataUrl: string;
}

export default function MenuScannerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startAnalysis = async () => {
    if (!selectedImage) return;
    setLoading(true);
    
    try {
      const bloodTests = await BloodTestStorage.getHistory();
      const profile = await MealStorage.getUserProfile();

      const res = await fetch('/api/analyze-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: selectedImage, bloodTests, profile })
      });
      const json = await res.json();
      
      if (json.success) {
        setAnalysisResult(json.data);
      } else {
        alert("Failed to analyze menu: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error contacting analysis API.");
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ paddingBottom: '100px', paddingTop: 'env(safe-area-inset-top, 24px)', background: 'var(--bg-tertiary)', minHeight: '100vh' }}>
      
      <header style={{ padding: 'var(--space-6) var(--space-6)', marginBottom: 'var(--space-2)' }}>
        <button 
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '16px', padding: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back Home
        </button>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '2.2rem' }}>🍽️</span> Menu Scanner
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Snap a photo of any restaurant menu to see what you should order based on your blood work.</p>
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
            
            {!selectedImage ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ height: '300px', border: '2px dashed var(--border-subtle)', borderRadius: '16px', background: 'transparent', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <div style={{ fontWeight: 600 }}>Snap Menu Photo</div>
                <div style={{ fontSize: '0.8rem' }}>Take a picture of the physical menu</div>
              </button>
            ) : (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                    <img src={selectedImage} alt="Menu" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
                    <button onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            )}
            
            <button 
              onClick={startAnalysis}
              disabled={!selectedImage || loading}
              className="btn btn-primary"
              style={{ padding: '16px', fontSize: '1.1rem', background: 'var(--accent-primary)' }}
            >
              {loading ? "Cross-referencing Deficiencies..." : "Find Best Dishes"}
            </button>
          </div>
        )}

        {/* Results View */}
        {analysisResult && (
          <div className="card animate-fade-in" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
             <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>Top Recommendations</h2>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {analysisResult.recommendations?.map((rec: any, idx: number) => (
                   <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                         <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{rec.dishName}</span>
                         <span style={{ fontSize: '0.8rem', background: rec.healthScore > 7 ? 'var(--success)' : 'var(--accent-primary)', color: '#fff', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>{rec.healthScore}/10</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>💡 {rec.whyToOrder}</div>
                   </div>
                ))}
             </div>

             <button 
               onClick={() => { setSelectedImage(null); setAnalysisResult(null); }}
               className="btn"
               style={{ border: '1px solid var(--border-subtle)', padding: '16px', fontSize: '1.1rem', background: 'transparent', color: 'var(--text-primary)' }}
             >
               Scan Another Menu
             </button>
          </div>
        )}

      </div>
    </div>
  );
}
