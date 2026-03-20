import React, { useState, useRef } from 'react';
import { MealStorage } from '@/utils/storage';

type AIAnalysisItem = {
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  label: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  health_score?: number;
  is_healthy?: boolean;
  clarification_needed?: boolean;
  clarification_question?: string;
  clarification_options?: string[];
};

export default function InteractiveFoodScanner({ onLogSuccess }: { onLogSuccess?: () => void }) {
  const [isScanning, setIsScanning] = useState(false);
  const [imageUploaded, setImageUploaded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [analysisItems, setAnalysisItems] = useState<AIAnalysisItem[]>([]);
  const [customMealName, setCustomMealName] = useState("");
  const [selectedClarification, setSelectedClarification] = useState<AIAnalysisItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      setAnalysisItems([]);
      setSelectedClarification(null);

      // Create a local preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setImageUploaded(true);
      setIsScanning(true);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64 = base64data.split(',')[1];
        
        try {
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, mimeType: file.type })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          setAnalysisItems(data.items || data);
          setCustomMealName(data.meal_name || "");
        } catch (err: any) {
          console.error("Analysis Failed", err);
          setError("Failed to analyze image. Ensure your GEMINI_API_KEY is correct and try again.");
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setIsScanning(true);
    setError(null);
    setAnalysisItems([]);
    setPreviewUrl(null);
    setImageUploaded(false);
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ textInput: textInput.trim() })
      });

      if (!res.ok) throw new Error('Failed to analyze text');

      const data = await res.json();
      setAnalysisItems(data.items || data);
      setCustomMealName(data.meal_name || "");
      setIsScanning(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze text');
      setIsScanning(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const resetScanner = () => {
    setImageUploaded(false);
    setPreviewUrl(null);
    setTextInput("");
    setIsScanning(false);
    setAnalysisItems([]);
    setSelectedClarification(null);
    setError(null);
    setLogSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const handleItemClick = (item: AIAnalysisItem) => {
    if (item.clarification_needed && item.clarification_question) {
      setSelectedClarification(item);
    } else {
      setSelectedClarification(null);
    }
  };

  const handleClarificationSelect = (opt: string) => {
    if (!selectedClarification) return;
    
    // Heuristic: Add some calories/macros based on typical hidden ingredients
    const isNone = opt.toLowerCase().includes('no ') || opt.toLowerCase().includes('none');
    const addedCalories = isNone ? 0 : 85;
    const addedFat = isNone ? 0 : 8;

    const updatedItems = analysisItems.map(item => {
      if (item === selectedClarification) {
        return {
          ...item,
          label: `${item.label} (${opt})`,
          calories: item.calories + addedCalories,
          fat_g: item.fat_g + addedFat,
          clarification_needed: false
        };
      }
      return item;
    });

    setAnalysisItems(updatedItems);
    setSelectedClarification(null);
  };

  const totalCalories = analysisItems.reduce((sum, item) => sum + (item.calories || 0), 0);
  const totalProtein = analysisItems.reduce((sum, item) => sum + (item.protein_g || 0), 0);
  const totalFat = analysisItems.reduce((sum, item) => sum + (item.fat_g || 0), 0);
  const totalCarbs = analysisItems.reduce((sum, item) => sum + (item.carbs_g || 0), 0);

  const handleLogMeal = async () => {
    if (analysisItems.length === 0) return;
    
    const mainItem = [...analysisItems].sort((a, b) => (b.calories || 0) - (a.calories || 0))[0];
    const defaultMealName = mainItem ? mainItem.label : "Custom Meal";
    const finalMealName = customMealName.trim() || defaultMealName;
    
    let publicImageUrl = null;
    if (previewUrl) {
       publicImageUrl = await MealStorage.uploadMealImage(previewUrl);
    }
    
    await MealStorage.saveMeal({
      name: finalMealName,
      total_calories: totalCalories,
      total_protein: totalProtein,
      total_fat: totalFat,
      total_carbs: totalCarbs,
      items: analysisItems,
      image_base64: null, // Wipe base64 payload to prevent PG database bloat
      image_url: publicImageUrl // Route to the Supabase CDN public link
    });
    
    setLogSuccess(true);
    setTimeout(() => {
      if (onLogSuccess) onLogSuccess();
    }, 1500);
  };

  const showInputs = !isScanning && analysisItems.length === 0 && !previewUrl;

  return (
    <div className="scanner-wrapper card glass-panel animate-fade-in" style={{ marginTop: 'var(--space-8)' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Interactive Scanner</h2>
        <span className="badge" style={{ 
          background: 'rgba(16, 185, 129, 0.2)', 
          color: 'var(--success)', 
          padding: '4px 12px', 
          borderRadius: 'var(--radius-full)',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          LIVE AI
        </span>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={cameraRef} 
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      {showInputs && (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-4)', width: '100%' }}>
            
            {/* Live Camera Button */}
            <div 
              className="upload-area flex flex-col items-center justify-center" 
              style={{ 
                flex: 1,
                border: '2px solid var(--accent-primary)',
                background: 'var(--accent-primary)',
                color: 'white',
                borderRadius: 'var(--radius-md)', 
                padding: 'var(--space-6) var(--space-4)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: 'var(--shadow-md)'
              }}
              onClick={() => cameraRef.current?.click()}
            >
              <div style={{ marginBottom: '12px' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', letterSpacing: '0' }}>Take Photo</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', textAlign: 'center' }}>Live Camera</p>
            </div>

            {/* Gallery Upload Button */}
            <div 
              className="upload-area flex flex-col items-center justify-center" 
              style={{ 
                flex: 1,
                border: '2px dashed var(--border-subtle)', 
                borderRadius: 'var(--radius-md)', 
                padding: 'var(--space-6) var(--space-4)',
                cursor: 'pointer',
                transition: 'border-color var(--transition-fast)'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ marginBottom: '12px', color: 'var(--accent-primary)' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', color: 'var(--text-primary)', letterSpacing: '0' }}>Gallery</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>Upload Image</p>
            </div>

          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--space-4) 0' }}>
             <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
             <span style={{ padding: '0 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>OR</span>
             <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
          </div>

          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
             <input 
               type="text" 
               placeholder="e.g. I had two scrambled eggs and a piece of toast"
               value={textInput}
               onChange={e => setTextInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
               style={{ 
                 flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-full)', 
                 border: '1px solid var(--border-subtle)', outline: 'none', background: 'var(--bg-secondary)',
                 color: 'var(--text-primary)'
               }}
             />
             <button 
               className="btn btn-primary" 
               onClick={handleTextSubmit}
               disabled={!textInput.trim() || isScanning}
             >
               Log Text
             </button>
          </div>
        </>
      )}

      {(!showInputs) && (
        <div className="result-area">
          {previewUrl && (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0 20px', marginBottom: 'var(--space-6)' }}>
              <div style={{ 
                position: 'relative', 
                width: '55%',
                maxWidth: '280px',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                lineHeight: 0
              }}>
                <img 
                  src={previewUrl} 
                  alt="Meal preview" 
                  style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'var(--radius-md)', opacity: isScanning ? 0.5 : 1, transition: 'opacity var(--transition-slow)' }} 
                />
              
              {/* Scanning Overlay */}
              {isScanning && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'var(--bg-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 30,
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{
                    width: '60px', height: '60px',
                    border: '3px solid var(--border-subtle)',
                    borderTopColor: 'var(--success)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <p className="animate-pulse" style={{ marginTop: 'var(--space-4)', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', textAlign: 'center' }}>
                    Gemini Vision is analyzing...
                  </p>
                </div>
              )}

              {/* Coordinate Overlay */}
              {!isScanning && analysisItems.length > 0 && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
                  
                  {/* Connective Lines */}
                  <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
                    <defs>
                      <marker id="dot-marker" markerWidth="6" markerHeight="6" refX="3" refY="3">
                         <circle cx="3" cy="3" r="3" fill="#ffffff" />
                      </marker>
                    </defs>
                    
                    {(() => {
                      const itemsWithPos = analysisItems.map(item => {
                        const box = item.box_2d?.length === 4 ? item.box_2d : [400, 400, 600, 600];
                        const [ymin, xmin, ymax, xmax] = box;
                        return { item, cx: (xmin + xmax) / 20, cy: (ymin + ymax) / 20 };
                      });
                      
                      const leftItems = itemsWithPos.filter(i => i.cx < 50).sort((a, b) => a.cy - b.cy);
                      const rightItems = itemsWithPos.filter(i => i.cx >= 50).sort((a, b) => a.cy - b.cy);

                      return itemsWithPos.map((itemObj, idx) => {
                        const { item, cx, cy } = itemObj;
                        const isLeft = cx < 50;
                        const list = isLeft ? leftItems : rightItems;
                        const listIdx = list.findIndex(i => i === itemObj);
                        
                        // Spread labels vertically across the container
                        const yAvail = 90; 
                        const yStep = yAvail / Math.max(1, list.length - 1);
                        const y1 = list.length === 1 ? 50 : 5 + (listIdx * yStep);
                          
                        // Lines start from outside the image boundary
                        const x1 = isLeft ? -10 : 110; 
                        
                        return (
                          <line 
                            key={`line-${idx}`}
                            x1={`${x1}%`} y1={`${y1}%`} x2={`${cx}%`} y2={`${cy}%`}
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            markerEnd="url(#dot-marker)"
                            className="animate-fade-in"
                            style={{ animationDelay: `${idx * 0.15}s`, transition: 'all var(--transition-normal)', filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.3))' }}
                          />
                        );
                      });
                    })()}
                  </svg>

                  {/* Floating Labels (Pills) */}
                  {(() => {
                    const itemsWithPos = analysisItems.map(item => {
                      const box = item.box_2d?.length === 4 ? item.box_2d : [400, 400, 600, 600];
                      const [ymin, xmin, ymax, xmax] = box;
                      return { item, cx: (xmin + xmax) / 20, cy: (ymin + ymax) / 20 };
                    });
                    
                    const leftItems = itemsWithPos.filter(i => i.cx < 50).sort((a, b) => a.cy - b.cy);
                    const rightItems = itemsWithPos.filter(i => i.cx >= 50).sort((a, b) => a.cy - b.cy);

                    return itemsWithPos.map((itemObj, idx) => {
                      const { item, cx } = itemObj;
                      const isLeft = cx < 50;
                      const list = isLeft ? leftItems : rightItems;
                      const listIdx = list.findIndex(i => i === itemObj);
                        
                      const yAvail = 90; 
                      const yStep = yAvail / Math.max(1, list.length - 1);
                      const y1 = list.length === 1 ? 50 : 5 + (listIdx * yStep);
                      
                      const needsClarification = item.clarification_needed;
                      const isSelected = selectedClarification === item;

                      return (
                        <div 
                          key={`label-${idx}`} 
                          className="animate-fade-in" 
                          style={{
                            position: 'absolute', 
                            top: `calc(${y1}% - 16px)`,
                            [isLeft ? 'right' : 'left']: '110%',
                            pointerEvents: 'auto',
                            background: '#ffffff',
                            color: '#0f172a', // Slate 900
                            padding: '6px 14px',
                            borderRadius: '24px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            justifyContent: 'center',
                            zIndex: isSelected ? 20 : 10,
                            boxShadow: isSelected ? '0 0 0 3px var(--accent-primary), 0 8px 16px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.15)',
                            animationDelay: `${idx * 0.15}s`,
                            whiteSpace: 'normal',
                            width: 'max-content',
                            maxWidth: '120px',
                            textAlign: 'center',
                            lineHeight: '1.2'
                          }}
                          onClick={() => handleItemClick(item)}
                        >
                          {needsClarification && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          )}
                          <span>{item.label}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Text/Loading State for Text Analysis */}
          {!previewUrl && isScanning && (
            <div style={{
              padding: 'var(--space-12)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-subtle)',
              marginBottom: 'var(--space-6)'
            }}>
              <div style={{
                width: '40px', height: '40px',
                border: '3px solid var(--border-subtle)',
                borderTopColor: 'var(--success)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p className="animate-pulse" style={{ marginTop: 'var(--space-4)', color: 'var(--success)', fontWeight: 600 }}>
                Gemini is analyzing text...
              </p>
            </div>
          )}

          {/* Interactive Clarification Loop */}
          {!isScanning && selectedClarification && selectedClarification.clarification_needed && (
            <div className="feedback-section glass-panel animate-fade-in" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
              <h4 style={{ color: 'var(--warning)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Help me be more accurate
              </h4>
              <p style={{ fontSize: '0.95rem', marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
                {selectedClarification.clarification_question || `Could you clarify some details about the ${selectedClarification.label}?`}
              </p>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {selectedClarification.clarification_options?.map((opt, idx) => (
                  <button key={idx} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => handleClarificationSelect(opt)}>
                    {opt}
                  </button>
                )) || (
                  <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => handleClarificationSelect("Confirmed")}>Okay</button>
                )}
              </div>
            </div>
          )}

          {/* Macro Breakdown Table and Logging */}
          {!isScanning && analysisItems.length > 0 && (
            <div className="macro-table-container animate-fade-in" style={{ 
              background: 'var(--bg-secondary)', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              marginBottom: 'var(--space-6)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Item</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Calories</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Protein</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Fat</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Carbs</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisItems.map((item, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid var(--border-subtle)',
                        background: selectedClarification === item ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                        cursor: item.clarification_needed ? 'pointer' : 'default',
                        transition: 'background var(--transition-fast)'
                      }}
                      onClick={() => handleItemClick(item)}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.clarification_needed && <span style={{ color: 'var(--warning)' }}>●</span>}
                        {item.label}
                        {item.health_score && (
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 6px', 
                            borderRadius: '12px', 
                            background: item.is_healthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: item.is_healthy ? 'var(--success)' : 'var(--error)'
                          }}>
                            {item.is_healthy ? 'Healthy' : 'Treat'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{item.calories}</td>
                      <td style={{ padding: '12px 16px' }}>{item.protein_g}g</td>
                      <td style={{ padding: '12px 16px' }}>{item.fat_g}g</td>
                      <td style={{ padding: '12px 16px' }}>{item.carbs_g}g</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 600 }}>
                    <td style={{ padding: '16px', color: 'var(--text-primary)' }}>Total</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{totalCalories}</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{totalProtein}g</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{totalFat}g</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{totalCarbs}g</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                {!logSuccess ? (
                  <>
                     <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: 'var(--space-4)' }}>
                       <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Meal Name</label>
                       <input 
                         type="text" 
                         value={customMealName}
                         onChange={(e) => setCustomMealName(e.target.value)}
                         placeholder="e.g. My Custom Meal"
                         style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }}
                       />
                     </div>
                     <button className="btn btn-primary" style={{ width: '100%', maxWidth: '300px' }} onClick={handleLogMeal}>
                       Log Meal
                     </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontWeight: 600, alignItems: 'center', gap: '8px', padding: '12px', borderRadius: 'var(--radius-full)' }}>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     Meal Logged Successfully!
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={resetScanner}>Log Another Meal</button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .upload-area:hover { border-color: var(--success) !important; background: rgba(16, 185, 129, 0.05); }
        .table-row-hover:hover { background: rgba(16, 185, 129, 0.02) !important; }
      `}</style>
    </div>
  );
}
