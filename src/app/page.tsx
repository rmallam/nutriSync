"use client";

import { useState, useEffect } from 'react';
import InteractiveFoodScanner from "@/components/InteractiveFoodScanner";
import BarcodeScanner from "@/components/BarcodeScanner";
import MacroRing from "@/components/MacroRing";
import BottomNav from "@/components/BottomNav";
import { MealStorage, LoggedMeal } from "@/utils/storage";
import { supabase } from '@/utils/supabase';
import Auth from '@/components/Auth';
import OnboardingQuiz from '@/components/OnboardingQuiz';
import { HealthSync } from '@/utils/health';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [showScanner, setShowScanner] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [recentMeals, setRecentMeals] = useState<LoggedMeal[]>([]);
  const [dailyTotals, setDailyTotals] = useState<any>({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0, potassium: 0, iron: 0, calcium: 0, vit_c: 0, zinc: 0 });
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [symptomLogged, setSymptomLogged] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);
  
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
    
    // Check if onboarding is needed
    if (!p || (!p.diet_goal && !p.target_weight_kg)) {
      setNeedsOnboarding(true);
      return;
    }
    
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
  }, [showScanner, showBarcode, selectedDate, session]); // Reload data when returning from scanner or changing date

  if (loadingSession) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-tertiary)' }}><div style={{ width: '40px', height: '40px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></div>;
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />;
  }

  if (needsOnboarding) {
    return <OnboardingQuiz onComplete={() => {
      setNeedsOnboarding(false);
      loadData();
    }} />;
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
        {!showScanner && !showBarcode ? (
          <div className="animate-fade-in">
            
            {/* Premium Thick Ring Dashboard Widget */}
            <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)', border: 'none', background: 'var(--bg-secondary)', borderRadius: '32px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                 <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Today's counts</h2>
                 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Finished 🙌</span>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                   <MacroRing percentage={getPercentage(dailyTotals.calories, effectiveCalorieTarget)} colorHex="var(--success)" size={75} strokeWidth={8} value={dailyTotals.calories.toString()} />
                   <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Calories</span>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                   <MacroRing percentage={getPercentage(dailyTotals.protein, dailyTargets.protein)} colorHex="#FFFFFF" size={75} strokeWidth={8} value={`${dailyTotals.protein}g`} />
                   <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Protein</span>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                   <MacroRing percentage={getPercentage(dailyTotals.carbs, dailyTargets.carbs)} colorHex="#FF3B30" size={75} strokeWidth={8} value={`${dailyTotals.carbs}g`} />
                   <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Carbs</span>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                   <MacroRing percentage={getPercentage(dailyTotals.fat, dailyTargets.fats)} colorHex="#0A84FF" size={75} strokeWidth={8} value={`${dailyTotals.fat}g`} />
                   <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fat</span>
                 </div>
               </div>

               {/* Detailed Breakdown Grid */}
               <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px 8px' }}>
                     {[
                       { label: 'Fiber', value: `${Math.round(dailyTotals.fiber || 0)}g` },
                       { label: 'Sugar', value: `${Math.round(dailyTotals.sugar || 0)}g` },
                       { label: 'Sodium', value: `${Math.round(dailyTotals.sodium || 0)}mg` },
                       { label: 'Potassium', value: `${Math.round(dailyTotals.potassium || 0)}mg` },
                       { label: 'Iron', value: `${Math.round(dailyTotals.iron || 0)}mg` },
                       { label: 'Calcium', value: `${Math.round(dailyTotals.calcium || 0)}mg` },
                       { label: 'Vitamin C', value: `${Math.round(dailyTotals.vit_c || 0)}mg` },
                       { label: 'Zinc', value: `${Math.round(dailyTotals.zinc || 0)}mg` }
                     ].map((item, i) => (
                       <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.2px' }}>{item.label}</span>
                          <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 800 }}>{item.value}</span>
                       </div>
                     ))}
                  </div>
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

            {/* Cinematic Meal Feed */}
            <h3 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-4)', fontWeight: 800 }}>Today</h3>
            {recentMeals.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                <p>No meals logged on this date yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentMeals.map((meal) => (
                  <div 
                    key={meal.id} 
                    className="animate-fade-in" 
                    style={{ position: 'relative', borderRadius: '32px', overflow: 'hidden', height: meal.image_url ? '250px' : '100px', background: 'var(--bg-secondary)', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }} 
                    onClick={() => meal.image_url && setSelectedImage(meal.image_url)}
                  >
                    {meal.image_url && <img src={meal.image_url} alt={meal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <div style={{ position: 'absolute', inset: 0, background: meal.image_url ? 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 60%)' : 'transparent', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '1.2rem' }}>🍞</span>
                            <span style={{ color: meal.image_url ? '#fff' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{new Date(meal.created_at || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: meal.image_url ? '#fff' : 'var(--text-primary)', letterSpacing: '-0.02em', textShadow: meal.image_url ? '0 2px 8px rgba(0,0,0,0.5)' : 'none' }}>{meal.name}</h4>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: 'var(--radius-full)', color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>
                          {meal.total_calories} kcal
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        ) : showScanner ? (
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
        ) : (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <button 
                onClick={() => setShowBarcode(false)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Back to Dashboard
              </button>
            </div>
            <BarcodeScanner 
              onLogSuccess={() => setShowBarcode(false)} 
              onBack={() => { setShowBarcode(false); setShowScanner(true); }} 
            />
          </div>
        )}

      </div>

      {/* Animated Expanding FAB */}
      {!showScanner && !showBarcode && selectedDate.toDateString() === new Date().toDateString() && (
        <div className="animate-fade-in" style={{ position: 'fixed', bottom: '100px', right: '24px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: fabExpanded ? 1 : 0, transform: `translateY(${fabExpanded ? '0' : '20px'})`, pointerEvents: fabExpanded ? 'auto' : 'none', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
             <button onClick={() => { setFabExpanded(false); setShowBarcode(true); }} style={{ width: '48px', height: '48px', borderRadius: '24px', background: '#333333', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 16px rgba(0,0,0,0.3)', cursor: 'pointer' }} title="Scan Barcode">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="8" x2="13" y2="8"></line><line x1="7" y1="16" x2="15" y2="16"></line></svg>
             </button>
             <button style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'var(--success)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.3)', cursor: 'pointer' }} title="Call Nutritionist">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
             </button>
          </div>

          <button 
            onClick={() => { if (fabExpanded) setShowScanner(true); setFabExpanded(!fabExpanded); }}
            style={{ 
              width: '56px', height: '56px', borderRadius: '28px',
              background: '#0A84FF', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 28px rgba(10,132,255,0.4)', cursor: 'pointer', border: 'none',
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            {fabExpanded ? (
               <svg style={{ position: 'absolute' }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            ) : (
               <svg style={{ position: 'absolute' }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            )}
          </button>
        </div>
      )}

      {/* Global Bottom Navigation */}
      <BottomNav onHomeClick={() => {
        setShowScanner(false);
        setShowBarcode(false);
        setSelectedImage(null);
      }} />
      
    </main>
  );
}
