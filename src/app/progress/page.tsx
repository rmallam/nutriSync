"use client";

import { useState, useEffect } from 'react';
import BottomNav from "@/components/BottomNav";
import { MealStorage, LoggedMeal, WeightLog, BloodTestStorage } from "@/utils/storage";
import { supabase } from '@/utils/supabase';
import Auth from '@/components/Auth';

export default function ProgressPage() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [bloodTests, setBloodTests] = useState<any[]>([]);
  const [newWeight, setNewWeight] = useState<number | ''>('');
  const [savingWeight, setSavingWeight] = useState(false);
  
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(false);
  
  const [groceryList, setGroceryList] = useState<string | null>(null);
  const [loadingGrocery, setLoadingGrocery] = useState(false);

  // Synthetic Wearable / Biometric Mocks
  const [mockSleep, setMockSleep] = useState<number>(7);
  const [mockStress, setMockStress] = useState<string>('Low');
  const [mockCycle, setMockCycle] = useState<string>('None (or Male)');
  const [showMockPanel, setShowMockPanel] = useState(false);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  useEffect(() => {
    const fetchStorage = async () => {
      if (session) {
        const fetchedMeals = await MealStorage.getMeals();
        const fetchedWeight = await MealStorage.getWeightLogs();
        const fetchedBloodTests = await BloodTestStorage.getHistory();
        
        // Deduplicate tests for the frontend display by parsed date
        const uniqueTestsMap = new Map();
        const displayTests: any[] = [];
        fetchedBloodTests.forEach(test => {
           const match = test.summary?.match(/^\[Date:\s*(.*?)\]\s*/);
           const displayDate = match ? match[1] : (test.created_at ? new Date(test.created_at).toISOString().split('T')[0] : 'unknown');
           if (!uniqueTestsMap.has(displayDate)) {
               uniqueTestsMap.set(displayDate, true);
               displayTests.push(test);
           }
        });
        
        setMeals(fetchedMeals);
        setWeightLogs(fetchedWeight);
        setBloodTests(displayTests);
        
        // Load coaching tip
        if (!coachMessage) {
          setLoadingCoach(true);
          try {
            const profile = await MealStorage.getUserProfile();
            if (profile) {
              const res = await fetch('/api/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  profile, 
                  meals: fetchedMeals, 
                  weightLogs: fetchedWeight,
                  wearables: {
                    sleepHours: mockSleep,
                    stressLevel: mockStress,
                    cyclePhase: mockCycle
                  }
                })
              });
              const data = await res.json();
              if (data.coachResponse) {
                setCoachMessage(data.coachResponse);
              } else {
                setCoachMessage("Please fill out your whole profile in the Profile tab for customized coaching!");
              }
            } else {
              setCoachMessage("Go to the Profile tab and tell us your goals so the AI Coach can help you!");
            }
          } catch (e) {
            console.error("Coach fetch failed", e);
          }
          setLoadingCoach(false);
        }
      }
    };
    fetchStorage();
  }, [session]); // Removed mock dependencies to prevent continuous flickering on mount and changes

  const regenerateCoachInsight = async () => {
    setLoadingCoach(true);
    try {
      const profile = await MealStorage.getUserProfile();
      if (profile) {
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            profile, 
            meals, 
            weightLogs,
            wearables: {
              sleepHours: mockSleep,
              stressLevel: mockStress,
              cyclePhase: mockCycle
            }
          })
        });
        const data = await res.json();
        if (data.coachResponse) setCoachMessage(data.coachResponse);
      }
    } catch (e) {
      console.error("Coach regeneration failed", e);
    }
    setLoadingCoach(false);
  };

  const handleLogWeight = async () => {
    if (!newWeight) return;
    setSavingWeight(true);
    const success = await MealStorage.addWeightLog(Number(newWeight));
    if (success) {
      setWeightLogs(await MealStorage.getWeightLogs());
      setNewWeight('');
    }
    setSavingWeight(false);
  };

  const generateGroceryList = async () => {
    if (meals.length === 0) {
      setGroceryList("You need to log a few meals first before the AI can predict your grocery needs!");
      return;
    }
    setLoadingGrocery(true);
    try {
      const res = await fetch('/api/grocery_list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meals })
      });
      const data = await res.json();
      setGroceryList(data.groceryList);
    } catch (e) {
      setGroceryList("Failed to generate your list. Try again later.");
    }
    setLoadingGrocery(false);
  };

  if (loadingSession) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-tertiary)' }}><div style={{ width: '40px', height: '40px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></div>;
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />;
  }

  // Compute "Healthy vs Unhealthy" from the items
  const healthStats = meals.reduce((acc, meal) => {
    meal.items.forEach(item => {
      // Use the AI's is_healthy flag, default to assuming unhealthy if mostly fat/sugar, but true for now
      if (item.is_healthy === true || item.is_healthy === 'true') {
        acc.healthy += item.calories || 0;
      } else {
        acc.unhealthy += item.calories || 0;
      }
    });
    return acc;
  }, { healthy: 0, unhealthy: 0 });

  const totalHealthCals = healthStats.healthy + healthStats.unhealthy;
  const healthyPercent = totalHealthCals ? Math.round((healthStats.healthy / totalHealthCals) * 100) : 0;
  const unhealthyPercent = totalHealthCals ? Math.round((healthStats.unhealthy / totalHealthCals) * 100) : 0;

  // Compute Frequent Foods (simple frequency map of item labels)
  const itemFrequencies = meals.reduce((acc, meal) => {
    meal.items.forEach(item => {
      acc[item.label] = (acc[item.label] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  const frequentFoods = Object.entries(itemFrequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);

  // Mock Weekly Bar Chart Data (In a real app, group the last 7 days from `meals`)
  const weeklyData = [
    { day: 'M', height: 60, status: 'good' },
    { day: 'T', height: 80, status: 'good' },
    { day: 'W', height: 100, status: 'over' },
    { day: 'T', height: 70, status: 'good' },
    { day: 'F', height: 40, status: 'good' },
    { day: 'S', height: 95, status: 'over' },
    { day: 'S', height: 50, status: 'good' },
  ];

  return (
    <div className="container" style={{ paddingBottom: '90px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Progress & Insights
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>You have a <span style={{fontWeight: 700, color: '#FFFFFF'}}>3 day</span> logging streak! 🔥</p>
        </div>
      </header>

      {/* AI Health Coach & Wearables Integration */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
           <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ fontSize: '1.5rem' }}>✨</span> AI Health Coach
           </h3>
           <button 
             onClick={() => setShowMockPanel(!showMockPanel)}
             style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}
           >
             <span style={{color: 'var(--macro-calories)'}}>⌚️</span> Wearables {showMockPanel ? '▼' : '▶'}
           </button>
        </div>

        {/* Wearables Mock Panel */}
        {showMockPanel && (
          <div className="card animate-fade-in" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
             <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-primary)' }}>Simulate Hardware Biometrics</h4>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SLEEP (HRS)</label>
                 <select value={mockSleep} onChange={e => setMockSleep(Number(e.target.value))} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                   <option value={4}>4h (Severe Deprivation)</option>
                   <option value={6}>6h (Suboptimal)</option>
                   <option value={7}>7h (Normal)</option>
                   <option value={9}>9h (Optimal)</option>
                 </select>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CORTISOL / STRESS</label>
                 <select value={mockStress} onChange={e => setMockStress(e.target.value)} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                   <option value="Low">Low (Relaxed)</option>
                   <option value="Medium">Medium</option>
                   <option value="High">High (Spiking)</option>
                 </select>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                 <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CYCLE PHASE</label>
                 <select value={mockCycle} onChange={e => setMockCycle(e.target.value)} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                   <option value="None / Male">N/A (Male / None)</option>
                   <option value="Follicular">Follicular Phase</option>
                   <option value="Ovulatory">Ovulatory Phase</option>
                   <option value="Luteal">Luteal Phase</option>
                   <option value="Menstrual">Menstrual Phase</option>
                 </select>
               </div>

             </div>
             <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
               <button 
                 onClick={regenerateCoachInsight} 
                 className="btn btn-primary" 
                 style={{ padding: '8px 16px', fontSize: '0.85rem' }}
               >
                 🔄 Regenerate Insights
               </button>
             </div>
          </div>
        )}

        <div className="card" style={{ padding: 'var(--space-6)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          {loadingCoach ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
               <div style={{ width: '20px', height: '20px', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--success)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
               Analysing your hormonal data & 7-day history...
            </div>
          ) : (
            <div className="markdown-body" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: 'var(--text-primary)', fontSize: '0.95rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }} dangerouslySetInnerHTML={{ __html: coachMessage ? coachMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/- (.*?)\n/g, '<li>$1</li>') : '' }}>
            </div>
          )}
        </div>
      </section>

      {/* Biomarkers & Lab Results Dashboard */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
           <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ fontSize: '1.5rem' }}>🩸</span> Biomarkers & Labs
           </h3>
           <a href="/reports" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', textDecoration: 'none' }}>
             + Upload New Report
           </a>
         </div>
         <div className="card" style={{ padding: 'var(--space-6)' }}>
            {bloodTests.length === 0 ? (
               <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '16px' }}>
                 No blood tests uploaded yet. Analyze a report to supercharge your meal planner.
               </div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                 {bloodTests.map((test: any, testIdx: number) => {
                   const match = test.summary?.match(/^\[Date:\s*(.*?)\]\s*/);
                   const displayDate = match ? match[1] : new Date(test.created_at).toLocaleDateString();
                   const displaySummary = match ? test.summary.replace(/^\[Date:\s*.*?\]\s*/, '') : test.summary;

                   return (
                     <div key={testIdx} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: testIdx === 0 ? 'var(--bg-secondary)' : 'transparent', padding: testIdx === 0 ? '16px' : '0', borderRadius: '12px', border: testIdx === 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                       <div style={{ fontSize: '0.9rem', color: testIdx === 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: testIdx === 0 ? 700 : 500, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                         <span>Test Date: {displayDate}</span>
                         {testIdx === 0 && <span style={{ color: 'var(--accent-primary)', fontSize: '0.8rem' }}>LATEST</span>}
                       </div>
                       
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                         {test.biomarkers?.filter((bm: any) => bm.status.toLowerCase() !== 'normal').map((bm: any, idx: number) => {
                            let diffNote = '';
                            let isImproved = false;
                            if (testIdx < bloodTests.length - 1) {
                               const olderTest = bloodTests[testIdx + 1];
                               const olderBm = olderTest.biomarkers?.find((o: any) => o.marker === bm.marker);
                               if (olderBm) {
                                  if (olderBm.status !== bm.status) {
                                     diffNote = `(Was ${olderBm.status})`;
                                     isImproved = (olderBm.status.toLowerCase() === 'deficient' && bm.status.toLowerCase() === 'low');
                                  } else {
                                     diffNote = `(Unchanged)`;
                                  }
                               } else {
                                  diffNote = `(New Finding)`;
                               }
                            }

                            return (
                              <div key={'abn_'+idx} className="card animate-fade-in" style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                                 <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--error)' }}></div>
                                 
                                 <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '8px', lineHeight: 1.2 }}>
                                   {bm.marker}
                                 </div>
                                 
                                 <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '12px', flexWrap: 'wrap' }}>
                                   {bm.value ? (
                                     <span style={{ color: 'var(--error)', fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{bm.value}</span>
                                   ) : (
                                     <span style={{ color: 'var(--error)', fontSize: '1.35rem', fontWeight: 800 }}>--</span>
                                   )}
                                 </div>
                                 
                                 <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                   <div style={{ alignSelf: 'flex-start', fontSize: '0.65rem', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', color: 'var(--error)', padding: '4px 6px', borderRadius: '4px', fontWeight: 800, letterSpacing: '0.5px' }}>
                                     {bm.status.toUpperCase()}
                                   </div>
                                   {diffNote && (
                                      <div style={{ fontSize: '0.7rem', color: isImproved ? 'var(--success)' : 'var(--text-muted)', fontWeight: isImproved ? 800 : 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {isImproved ? '📈' : '📉'} {diffNote}
                                      </div>
                                   )}
                                 </div>
                              </div>
                            );
                         })}
                       </div>
                       
                       {test.biomarkers?.filter((bm: any) => bm.status.toLowerCase() === 'normal').length > 0 && (
                         <details style={{ marginTop: '8px' }}>
                            <summary style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, outline: 'none' }}>
                               View Normal Markers ({test.biomarkers.filter((bm: any) => bm.status.toLowerCase() === 'normal').length})
                            </summary>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', paddingLeft: '8px', borderLeft: '2px solid var(--border-subtle)' }}>
                               {test.biomarkers.filter((bm: any) => bm.status.toLowerCase() === 'normal').map((bm: any, idx: number) => {
                                  let becameNormal = false;
                                  if (testIdx < bloodTests.length - 1) {
                                     const olderTest = bloodTests[testIdx + 1];
                                     const olderBm = olderTest.biomarkers?.find((o: any) => o.marker === bm.marker);
                                     if (olderBm && olderBm.status.toLowerCase() !== 'normal') {
                                        becameNormal = true;
                                     }
                                  }
                                  
                                  return (
                                    <div key={'norm_'+idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                       <div>
                                         <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                                           {bm.marker}
                                           {bm.value && <span style={{ color: 'var(--success)', marginLeft: '8px', fontSize: '0.85rem', fontWeight: 700 }}>{bm.value}</span>}
                                         </div>
                                         {becameNormal && <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>🎉 Improved from Abnormal!</div>}
                                       </div>
                                       <div style={{ fontSize: '0.75rem', background: 'var(--success)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                         NORMAL
                                       </div>
                                    </div>
                                  );
                               })}
                            </div>
                         </details>
                       )}
                       <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                         {displaySummary}
                       </p>
                     </div>
                   );
                 })}
               </div>
            )}
         </div>
      </section>

      {/* Week in Review */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
         <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>Weekly Tracking</h3>
         <div className="card" style={{ padding: 'var(--space-6)', minHeight: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
            {weeklyData.map((d, i) => (
               <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ 
                    width: '100%', 
                    height: `${d.height}px`, 
                    background: d.status === 'over' ? 'var(--error)' : 'rgba(255,255,255,0.15)',
                    borderRadius: 'var(--radius-sm)',
                    opacity: d.status === 'over' ? 0.8 : 1
                  }}></div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600 }}>{d.day}</span>
               </div>
            ))}
         </div>
      </section>

      {/* Healthy vs Unhealthy Filter */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>Diet Quality</h3>
        <div className="card" style={{ padding: 'var(--space-6)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nutritious</p>
                 <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{healthyPercent}%</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Treats / Empty Cals</p>
                 <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--error)' }}>{unhealthyPercent}%</span>
              </div>
           </div>
           
           {/* Progress Bar Splitter */}
           <div style={{ width: '100%', height: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${healthyPercent}%`, height: '100%', background: 'var(--success)' }}></div>
              <div style={{ width: `${unhealthyPercent}%`, height: '100%', background: 'var(--error)' }}></div>
           </div>
           {meals.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px' }}>Awaiting initial logs to calculate health score based on AI item analysis.</p>}
        </div>
      </section>

      {/* Frequent & Favorites */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>Top Foods</h3>
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {frequentFoods.length === 0 ? (
             <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>Scan some meals to discover your top foods!</div>
          ) : (
             frequentFoods.map((food, i) => (
                <div key={i} style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i !== frequentFoods.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.25rem' }}>⭐️</span>
                      <span style={{ fontWeight: 500 }}>{food}</span>
                   </div>
                   <button style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                   </button>
                </div>
             ))
          )}
        </div>
      </section>

      {/* Weight Tracker Modal/Form */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>Weight Tracking</h3>
        <div className="card" style={{ padding: 'var(--space-6)' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Latest Recorded Weight</p>
                 <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800 }}>{weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : '--'}</span>
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>kg</span>
                 </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                 <input 
                   type="number" 
                   value={newWeight} 
                   onChange={e => setNewWeight(e.target.value === '' ? '' : Number(e.target.value))} 
                   placeholder="e.g. 70.5"
                   style={{ width: '80px', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
                 />
                 <button className="btn btn-primary" onClick={handleLogWeight} disabled={savingWeight || !newWeight}>Log</button>
              </div>
           </div>

           {weightLogs.length > 1 && (
             <div style={{ marginTop: 'var(--space-4)', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                 <span>Previous Weigh-in</span>
                 <span>{weightLogs[weightLogs.length - 2].weight_kg} kg</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                 <span>Date</span>
                 <span>{new Date(weightLogs[weightLogs.length - 2].created_at || '').toLocaleDateString()}</span>
               </div>
             </div>
           )}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
