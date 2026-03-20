"use client";

import { useState, useEffect } from 'react';
import InteractiveFoodScanner from "@/components/InteractiveFoodScanner";
import MacroRing from "@/components/MacroRing";
import BottomNav from "@/components/BottomNav";
import { MealStorage, LoggedMeal } from "@/utils/storage";
import { supabase } from '@/utils/supabase';
import Auth from '@/components/Auth';
import { HealthSync } from '@/utils/health';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [showScanner, setShowScanner] = useState(false);
  const [recentMeals, setRecentMeals] = useState<LoggedMeal[]>([]);
  const [dailyTotals, setDailyTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0 });
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [symptomLogged, setSymptomLogged] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [currentWeight, setCurrentWeight] = useState(70);

  // Phase 13 Native Wearables State
  const [nativeHealth, setNativeHealth] = useState({ steps: 0, activeCalories: 0, isSynced: false });

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

  const loadData = async () => {
    if (!session) return;
    const targetDateString = selectedDate.toISOString().split('T')[0];
    const allMeals = await MealStorage.getMeals();
    const dayMeals = allMeals.filter(m => {
      const ts = m.created_at || new Date().toISOString();
      return ts.startsWith(targetDateString);
    });
    
    setRecentMeals(dayMeals.slice(0, 5)); // Get top 5 meals for selected day
    setDailyTotals(await MealStorage.getDailyTotals(selectedDate));
    setWaterGlasses(await MealStorage.getDailyWater(selectedDate));
    
    // Fetch Profile for Dynamic Macros
    const p = await MealStorage.getUserProfile();
    setProfile(p);
    const weightLogs = await MealStorage.getWeightLogs();
    if (weightLogs.length > 0) {
      setCurrentWeight(weightLogs[weightLogs.length - 1].weight_kg);
    } else if (p?.target_weight_kg) {
      setCurrentWeight(p.target_weight_kg);
    }

    // Load native health data for today
    if (selectedDate.toDateString() === new Date().toDateString()) {
      const metrics = await HealthSync.getDailyMetrics();
      setNativeHealth(metrics);
    } else {
      setNativeHealth({ steps: 0, activeCalories: 0, isSynced: false }); // Reset for past days
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [showScanner, selectedDate, session]); // Reload data when returning from scanner or changing date

  if (loadingSession) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-tertiary)' }}><div style={{ width: '40px', height: '40px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></div>;
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />;
  }

  // Dynamic Macro Calculator based on Profile!
  let baseCals = 2000;
  let tdeeMultiplier = 1.2; // Sedentary
  if (profile?.activity_level === 'Light') tdeeMultiplier = 1.375;
  if (profile?.activity_level === 'Moderate') tdeeMultiplier = 1.55;
  if (profile?.activity_level === 'Very Active') tdeeMultiplier = 1.725;

  // Simple Harris-Benedict proxy
  baseCals = currentWeight * 24 * tdeeMultiplier;
  
  if (profile?.diet_goal === 'Lose Weight') baseCals -= 500;
  if (profile?.diet_goal === 'Build Muscle') baseCals += 300;

  const dailyTargets = {
    calories: Math.max(1200, Math.round(baseCals)),
    protein: Math.round(currentWeight * 2), // ~2g per kg for active goals
    fats: Math.round((baseCals * 0.25) / 9), 
    carbs: Math.max(50, Math.round((baseCals - (currentWeight * 2 * 4) - (baseCals * 0.25)) / 4)),
    fiber: 30, // Default optimal gut health
    sodium: 2300 // Standard max sodium
  };

  // Compute dynamic caloric requirements incorporating active burn
  const effectiveCalorieTarget = dailyTargets.calories + nativeHealth.activeCalories;

  const getPercentage = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100)) || 0;
  };

  const handleSymptom = async (symptom: string, intensity: number) => {
    const mealId = recentMeals.length > 0 ? recentMeals[0].id : undefined;
    await MealStorage.logSymptom(symptom, intensity, mealId);
    setSymptomLogged(true);
    setTimeout(() => setSymptomLogged(false), 3000);
  };

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '100px', background: 'var(--bg-tertiary)' }}>
      
      {/* Fullscreen Image Lightbox */}
      {selectedImage && (
        <div 
          className="animate-fade-in" 
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={() => setSelectedImage(null)}
        >
          <img 
             src={selectedImage} 
             alt="Meal Preview" 
             style={{ maxWidth: '90%', maxHeight: '80%', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', objectFit: 'contain' }} 
             onClick={(e) => e.stopPropagation()}
          />
          <button 
             onClick={() => setSelectedImage(null)}
             style={{ position: 'absolute', top: '40px', right: '24px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
          >
             ✕
          </button>
        </div>
      )}

      {/* Top Header / Calendar Mock */}
      <header className="glass-panel" style={{ 
        position: 'sticky', top: 0, zIndex: 40, padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--border-subtle)', borderRadius: 0 
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span style={{ fontSize: '1.5rem' }}>🍏</span> NutriSync
            </h1>
          </div>
          <div style={{ background: 'var(--macro-carbs)', color: '#fff', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            🔥 {dailyTotals.calories} kcal
          </div>
        </div>

        {/* Horizontal Calendar Scroll */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const loopDate = new Date();
            loopDate.setDate(loopDate.getDate() - (6 - i)); // 6 days ago up to today
            
            const isSelected = loopDate.toDateString() === selectedDate.toDateString();
            const isActuallyToday = loopDate.toDateString() === new Date().toDateString();
            const dayNum = loopDate.getDate();
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][loopDate.getDay()];
            
            return (
              <div 
                key={i} 
                onClick={() => setSelectedDate(loopDate)}
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '48px',
                  background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                  padding: '8px 4px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                  border: isSelected ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  transition: 'all var(--transition-fast)'
                }}>
                <span style={{ fontSize: '0.75rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isSelected ? 700 : 500, marginBottom: '4px' }}>
                  {isActuallyToday ? 'Today' : dayName}
                </span>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  background: isSelected ? 'var(--accent-primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', fontWeight: 600,
                  color: isSelected ? '#fff' : 'var(--text-primary)'
                }}>
                  {dayNum}
                </div>
              </div>
            );
          })}
        </div>
      </header>

      <div className="container" style={{ paddingTop: 'var(--space-6)' }}>
        
        {/* Main Macro Dashboard */}
        {!showScanner ? (
          <div className="animate-fade-in">
            
            {/* Main Calorie Hero Card */}
            <div className="card" style={{ display: 'flex',alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', padding: 'var(--space-8)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em' }}>{dailyTotals.calories}</span>
                  <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>/{effectiveCalorieTarget}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Calories eaten</p>
              </div>
              
              <MacroRing 
                percentage={getPercentage(dailyTotals.calories, effectiveCalorieTarget)}
                colorHex="var(--macro-calories)"
                size={110}
                strokeWidth={10}
                value="🔥"
              />
            </div>

            {/* Sub Macros Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-8)' }}>
              {/* Protein */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px' }}>
                <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{dailyTotals.protein}<span style={{fontSize:'0.65rem', color:'var(--text-muted)'}}>/{dailyTargets.protein}g</span></div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Protein</div>
                </div>
                <MacroRing 
                  percentage={getPercentage(dailyTotals.protein, dailyTargets.protein)}
                  colorHex="var(--macro-protein)"
                  size={50}
                  strokeWidth={5}
                  value="🍗"
                />
              </div>
              
              {/* Carbs */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px' }}>
                <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{dailyTotals.carbs}<span style={{fontSize:'0.65rem', color:'var(--text-muted)'}}>/{dailyTargets.carbs}g</span></div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Carbs</div>
                </div>
                <MacroRing 
                  percentage={getPercentage(dailyTotals.carbs, dailyTargets.carbs)}
                  colorHex="var(--macro-carbs)"
                  size={50}
                  strokeWidth={5}
                  value="🌾"
                />
              </div>

              {/* Fats */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px' }}>
                <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{dailyTotals.fat}<span style={{fontSize:'0.65rem', color:'var(--text-muted)'}}>/{dailyTargets.fats}g</span></div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fats</div>
                </div>
                <MacroRing 
                  percentage={getPercentage(dailyTotals.fat, dailyTargets.fats)}
                  colorHex="var(--macro-fat)"
                  size={50}
                  strokeWidth={5}
                  value="🥑"
                />
              </div>

              {/* Fiber (New) */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--success)' }}>{dailyTotals.fiber}<span style={{fontSize:'0.65rem', color:'var(--success)', opacity: 0.7}}>/{dailyTargets.fiber}g</span></div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>Fiber</div>
                </div>
                <MacroRing 
                  percentage={getPercentage(dailyTotals.fiber, dailyTargets.fiber)}
                  colorHex="var(--success)"
                  size={50}
                  strokeWidth={5}
                  value="🥬"
                />
              </div>
            </div>

            {/* Phase 13 - Native Wearables UI Block */}
            <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-8)', padding: 'var(--space-6)', backgroundImage: 'linear-gradient(135deg, rgba(52, 199, 89, 0.08) 0%, rgba(0, 122, 255, 0.05) 100%)', border: '1px solid rgba(52, 199, 89, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>⌚️</span> Activity & Workouts
                </h3>
                {!nativeHealth.isSynced ? (
                  <button 
                    onClick={async () => {
                      const granted = await HealthSync.requestPermissions();
                      if (granted) {
                        const metrics = await HealthSync.getDailyMetrics();
                        setNativeHealth(metrics);
                      }
                    }} 
                    style={{ background: '#000', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 12.5-13.31l-4.22 3.16"></path></svg>
                    Sync Apple Health / Fit
                  </button>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Hardware Synced
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', letterSpacing: '0.5px' }}>STEPS</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{nativeHealth.steps.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', letterSpacing: '0.5px' }}>ACTIVE BURN</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--macro-carbs)', letterSpacing: '-0.02em' }}>+{nativeHealth.activeCalories} <span style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>kcal</span></div>
                </div>
              </div>
              {nativeHealth.activeCalories > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-4)', fontStyle: 'italic', lineHeight: 1.4 }}>
                  Your daily calorie allowance has increased by <span style={{fontWeight: 700, color: 'var(--text-primary)'}}>{nativeHealth.activeCalories} kcal</span> to account for metabolic burnout.
                </p>
              )}
            </div>

            {/* Water Tracking */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Hydration</h3>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800 }}>{waterGlasses}</span>
                  <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 8 glasses</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Daily goal (2 Liters)</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%' }}
                  onClick={async () => setWaterGlasses(await MealStorage.logWater(-1, selectedDate))}
                >
                  -
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '48px', height: '48px', padding: 0, borderRadius: '50%', background: '#3b82f6' }}
                  onClick={async () => setWaterGlasses(await MealStorage.logWater(1, selectedDate))}
                >
                  +💧
                </button>
              </div>
            </div>

            {/* Fasting & Circadian Clock */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Circadian Fasting
            </h3>
            <div className="card" style={{ marginBottom: 'var(--space-8)' }}>
              {(() => {
                const now = new Date();
                const lastMealTime = recentMeals.length > 0 ? new Date(recentMeals[0].created_at || now) : null;
                
                let hoursSinceLastMeal = 0;
                if (lastMealTime) {
                  hoursSinceLastMeal = (now.getTime() - lastMealTime.getTime()) / (1000 * 60 * 60);
                }

                const isFasting = hoursSinceLastMeal > 12;
                const activeColor = isFasting ? 'var(--macro-calories)' : 'var(--success)';

                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Status</div>
                        <div style={{ fontWeight: 800, color: activeColor }}>
                          {lastMealTime ? (isFasting ? 'Fasting State' : 'Eating Window') : 'No meals logged'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Elapsed</div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>
                          {lastMealTime ? `${Math.floor(hoursSinceLastMeal)}h ${Math.floor((hoursSinceLastMeal % 1) * 60)}m` : '--'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar Mock */}
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: '100%', 
                        background: isFasting ? `linear-gradient(90deg, var(--macro-calories), #60a5fa)` : `linear-gradient(90deg, var(--success), #34d399)`,
                        transform: `translateX(-${lastMealTime ? Math.max(0, 100 - (hoursSinceLastMeal / 16) * 100) : 100}%)`,
                        transition: 'transform 1s ease-out'
                      }}></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Post-Meal Gut Health Logger */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>🧠</span> Gut Health & Energy
            </h3>
            <div className="card" style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
              {symptomLogged ? (
                <div className="animate-fade-in" style={{ padding: 'var(--space-4) 0', color: 'var(--success)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                  <h4 style={{ fontWeight: 600 }}>Symptom Logged!</h4>
                  <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>The AI Coach will analyze this trend.</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                    How do you feel after your last meal?
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button 
                      className="btn" 
                      style={{ flex: 1, padding: '12px 0', flexDirection: 'column', gap: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                      onClick={() => handleSymptom('Bloated', 8)}
                    >
                      <span style={{ fontSize: '1.8rem' }}>🤢</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Bloated</span>
                    </button>
                    <button 
                      className="btn" 
                      style={{ flex: 1, padding: '12px 0', flexDirection: 'column', gap: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                      onClick={() => handleSymptom('Sluggish', 7)}
                    >
                      <span style={{ fontSize: '1.8rem' }}>😴</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Sluggish</span>
                    </button>
                    <button 
                      className="btn" 
                      style={{ flex: 1, padding: '12px 0', flexDirection: 'column', gap: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                      onClick={() => handleSymptom('Energized', 2)}
                    >
                      <span style={{ fontSize: '1.8rem' }}>⚡</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Energized</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Recently Uploaded Feed */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Recently Uploaded</h3>
            {recentMeals.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                <p>No meals logged on this date yet.</p>
              </div>
            ) : (
              <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
                {recentMeals.map((meal, index) => (
                  <div 
                    key={meal.id} 
                    onClick={() => meal.image_url && setSelectedImage(meal.image_url)}
                    style={{ cursor: meal.image_url ? 'pointer' : 'default', display: 'flex', gap: 'var(--space-4)', alignItems: 'center', padding: '16px', borderBottom: index < recentMeals.length - 1 ? '1px solid var(--border-subtle)' : 'none', transition: 'background-color 0.2s ease' }}
                    onMouseOver={(e) => { if (meal.image_url) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                     <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--bg-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', boxShadow: 'inset 0 0 0 1px var(--border-subtle)', overflow: 'hidden' }}>
                       {meal.image_url ? (
                         <img src={meal.image_url} alt={meal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       ) : '🥗'}
                     </div>
                     <div style={{ flex: 1 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                         <h4 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{meal.name}</h4>
                         <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                           {new Date(meal.created_at || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                         <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{meal.total_calories} kcal</span>
                         <span style={{ color: 'var(--text-muted)' }}>•</span>
                         <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                           <span style={{color:'var(--macro-protein)'}}>{meal.total_protein}g</span> / 
                           <span style={{color:'var(--macro-carbs)'}}> {meal.total_carbs}g</span> / 
                           <span style={{color:'var(--macro-fat)'}}> {meal.total_fat}g</span>
                         </span>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        ) : (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <button 
                onClick={() => setShowScanner(false)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Back to Dashboard
              </button>
            </div>
            <InteractiveFoodScanner onLogSuccess={() => setShowScanner(false)} />
          </div>
        )}

      </div>

      {/* Dynamic Floating Action Button */}
      {!showScanner && selectedDate.toDateString() === new Date().toDateString() && (
        <div className="animate-fade-in" style={{ position: 'fixed', bottom: '100px', right: '24px', zIndex: 50 }}>
          <button 
            onClick={() => setShowScanner(true)}
            style={{ 
              width: '64px', height: '64px', borderRadius: '32px',
              background: '#000000', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 28px rgba(0,0,0,0.25)', cursor: 'pointer', border: 'none',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.25)'; }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      )}

      {/* Global Bottom Navigation */}
      <BottomNav />
      
    </main>
  );
}
