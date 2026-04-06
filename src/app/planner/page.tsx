"use client";

import { useState, useEffect } from 'react';
import BottomNav from "@/components/BottomNav";
import { MealStorage, BloodTestStorage } from "@/utils/storage";

export default function PlannerPage() {
  const [loading, setLoading] = useState(false);
  const [plannerData, setPlannerData] = useState<any>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'plan' | 'groceries'>('plan');
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    // Load persisted planner state on mount
    const loadState = async () => {
      const state = await MealStorage.getPlannerState();
      if (state) {
        setPlannerData(state.data);
        if (state.checkedItems) setCheckedItems(state.checkedItems);
      }
    };
    loadState();
  }, []);

  const persistState = (data: any, checked: Record<string, boolean>) => {
    MealStorage.savePlannerState({ data, checkedItems: checked });
  };

  const generateNewPlan = async () => {
    setLoading(true);
    try {
      const profile = await MealStorage.getUserProfile();
      const meals = await MealStorage.getMeals();
      const culturalPrefs = await MealStorage.getCulturalPreferences();
      const bloodTests = await BloodTestStorage.getHistory();
      
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, meals, culturalPrefs, bloodTests })
      });
      const json = await res.json();
      
      if (json.success) {
        setPlannerData(json.data);
        setCheckedItems({});
        persistState(json.data, {});
        setActiveTab('plan');
      } else {
        alert("Failed to generate plan");
      }
    } catch (e) {
      console.error(e);
      alert("Error contacting AI Planner");
    }
    setLoading(false);
  };

  const toggleCheck = (item: string) => {
    const newChecked = { ...checkedItems, [item]: !checkedItems[item] };
    setCheckedItems(newChecked);
    persistState(plannerData, newChecked);
  };

  const logPlannedMeal = async (mealObj: any, mealType: string) => {
    if (typeof mealObj === 'string') return;
    try {
      setLoading(true);
      const newMeal = {
        image_url: null,
        name: mealObj.name,
        items: [{
          label: mealObj.name,
          calories: mealObj.calories,
          protein_g: mealObj.protein,
          carbs_g: mealObj.carbs,
          fat_g: mealObj.fat,
          health_score: 8,
          is_healthy: true
        }],
        total_calories: mealObj.calories,
        total_protein: mealObj.protein,
        total_carbs: mealObj.carbs,
        total_fat: mealObj.fat
      };
      await MealStorage.saveMeal(newMeal);
      alert(`Logged ${mealObj.name} to your Diary!`);
    } catch (e) {
      console.error(e);
      alert("Failed to log meal");
    } finally {
      setLoading(false);
    }
  };

  const handleSwapMeal = (mealData: any, mealType: string) => {
    // Visually interactive ghost button hook for future AI implementation
    alert(`The AI is analyzing your bio-data to find a perfect alternative to ${mealData.name}... (Feature coming soon!)`);
  };

  const renderMeal = (mealData: any, mealType: string, isLast: boolean) => {
    if (typeof mealData === 'string' || !mealData) {
       return (
          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px dashed var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{mealType}</div>
            <div style={{ fontSize: '1.05rem', color: 'var(--text-muted)' }}>{mealData || 'No planned data'}</div>
          </div>
       );
    }
    
    // Abstract Cinematic Backgrounds
    const meshColors = {
      Breakfast: 'radial-gradient(ellipse at top left, rgba(255, 214, 10, 0.15) 0%, rgba(0,0,0,0) 70%), radial-gradient(ellipse at bottom right, rgba(255, 149, 0, 0.1) 0%, rgba(0,0,0,0) 70%)',
      Lunch: 'radial-gradient(ellipse at top right, rgba(52, 199, 89, 0.12) 0%, rgba(0,0,0,0) 70%), radial-gradient(ellipse at bottom left, rgba(0, 122, 255, 0.08) 0%, rgba(0,0,0,0) 70%)',
      Dinner: 'radial-gradient(ellipse at bottom left, rgba(88, 86, 214, 0.15) 0%, rgba(0,0,0,0) 70%), radial-gradient(ellipse at top right, rgba(10, 132, 255, 0.1) 0%, rgba(0,0,0,0) 70%)'
    };
    const bgMesh = meshColors[mealType as keyof typeof meshColors] || meshColors.Lunch;

    return (
      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Timeline Node & Line */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px', flexShrink: 0 }}>
          <div style={{ 
            width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-secondary)', 
            border: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(255,255,255,0.2)', zIndex: 2
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
          </div>
          {!isLast && (
            <div style={{ width: '2px', height: '100%', background: 'linear-gradient(to bottom, var(--accent-primary) 0%, var(--border-subtle) 100%)', opacity: 0.5, margin: '4px 0', minHeight: '60px' }}></div>
          )}
        </div>

        {/* Cinematic Card */}
        <div style={{ flex: 1, position: 'relative', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '24px', marginBottom: isLast ? '0' : '24px', border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }}>
          <div style={{ position: 'absolute', inset: 0, background: bgMesh, pointerEvents: 'none' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{ paddingRight: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{mealType === 'Breakfast' ? '🌅' : mealType === 'Lunch' ? '☀️' : '🌙'}</span>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{mealType}</div>
              </div>
              <div style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{mealData.name}</div>
            </div>
            {mealData.nutri_score && (
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: mealData.nutri_score >= 8 ? 'var(--success)' : mealData.nutri_score >= 5 ? 'var(--macro-fat)' : 'var(--macro-calories)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', flexShrink: 0 }} title={`NutriScore: ${mealData.nutri_score}/10`}>
                {mealData.nutri_score}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', position: 'relative', zIndex: 1, marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.4)', padding: '10px 14px', borderRadius: '16px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>🔥 {mealData.calories} <span style={{fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)'}}>kcal</span></span>
              <div style={{ width: '1px', height: '14px', background: 'var(--border-subtle)' }}></div>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700, display: 'flex', gap: '10px' }}>
                <span><span style={{color:'var(--macro-protein)'}}>{mealData.protein}g</span> P</span>
                <span><span style={{color:'var(--macro-carbs)'}}>{mealData.carbs}g</span> C</span>
                <span><span style={{color:'var(--macro-fat)'}}>{mealData.fat}g</span> F</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', position: 'relative', zIndex: 1 }}>
            <button 
              onClick={() => logPlannedMeal(mealData, mealType)}
              disabled={loading}
              style={{ flex: 1, background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 16px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 16px rgba(255,255,255,0.15)', transition: 'transform 0.2s' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Log to Diary
            </button>
            <button 
              onClick={() => handleSwapMeal(mealData, mealType)}
              disabled={loading}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)', padding: '10px 16px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.2s' }}
              title="Regenerate this specific meal"
            >
              <span style={{ fontSize: '1.1rem' }}>🪄</span> Swap
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ paddingBottom: '100px', paddingTop: 'env(safe-area-inset-top, 24px)', background: 'var(--bg-tertiary)', minHeight: '100vh' }}>
      
      <header style={{ padding: 'var(--space-6) var(--space-6)', marginBottom: 'var(--space-2)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '2.2rem' }}>🗓️</span> Planner
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Your 3-Day Meal Matrix & Smart Cart.</p>
      </header>

      <div style={{ padding: '0 var(--space-4)' }}>
        
        {/* Glowing Generate Button Card */}
        <div className="card" style={{ padding: 'var(--space-8)', marginBottom: 'var(--space-8)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid var(--border-subtle)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', borderRadius: '32px' }}>
           <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF9500 0%, #FF2D55 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '16px', boxShadow: '0 0 30px rgba(255, 45, 85, 0.4)' }}>✨</div>
           <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>The Nutrition Matrix</h2>
           <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
             We use your logged meals, health biometric data, and cultural preferences to generate a mathematically perfect 3-day trajectory.
           </p>
           <button 
             onClick={generateNewPlan} 
             disabled={loading}
             className={loading ? "animate-pulse" : ""}
             style={{ 
               background: loading ? 'rgba(255,255,255,0.1)' : '#fff', 
               color: loading ? '#fff' : '#000', 
               padding: '16px 32px', borderRadius: 'var(--radius-full)', 
               fontSize: '1.1rem', fontWeight: 800, border: loading ? '1px solid rgba(255,255,255,0.2)' : 'none', 
               boxShadow: loading ? 'none' : '0 12px 32px rgba(255, 255, 255, 0.25)', 
               cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', 
               gap: '12px', transition: 'all 0.3s ease', width: '100%', justifyContent: 'center' 
             }}
           >
             {loading ? (
               <>
                 <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                 Computing Bio-Matrix...
               </>
             ) : (
               <>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                 Generate Future Plan
               </>
             )}
           </button>
        </div>

        {/* Results Container */}
        {plannerData && !loading && (
          <div className="animate-fade-in">
            
            {/* Tab Selector */}
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', padding: '4px', marginBottom: 'var(--space-6)' }}>
              <button 
                onClick={() => setActiveTab('plan')}
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-full)', background: activeTab === 'plan' ? 'var(--bg-primary)' : 'transparent', border: 'none', fontWeight: 700, fontSize: '0.9rem', color: activeTab === 'plan' ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: activeTab === 'plan' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Meal Plan
              </button>
              <button 
                onClick={() => setActiveTab('groceries')}
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-full)', background: activeTab === 'groceries' ? 'var(--bg-primary)' : 'transparent', border: 'none', fontWeight: 700, fontSize: '0.9rem', color: activeTab === 'groceries' ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: activeTab === 'groceries' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Grocery List
              </button>
            </div>

            {/* Meal Plan View */}
            {activeTab === 'plan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Horizontal Day Selector */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                  {plannerData.meal_plan?.map((day: any) => (
                     <button
                       key={day.day}
                       onClick={() => setSelectedDay(day.day)}
                       style={{ minWidth: '80px', padding: '12px', borderRadius: '16px', background: selectedDay === day.day ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedDay === day.day ? '#000' : 'var(--text-primary)', border: 'none', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: selectedDay === day.day ? '0 4px 16px rgba(255, 255, 255, 0.4)' : 'none' }}
                     >
                       Day {day.day}
                     </button>
                  ))}
                </div>

                {plannerData.meal_plan?.filter((d: any) => d.day === selectedDay).map((day: any, idx: number) => {
                  
                  // Compute day macros for the forecast
                  const totalProtein = (day.breakfast?.protein || 0) + (day.lunch?.protein || 0) + (day.dinner?.protein || 0);
                  const totalCarbs = (day.breakfast?.carbs || 0) + (day.lunch?.carbs || 0) + (day.dinner?.carbs || 0);
                  const totalFat = (day.breakfast?.fat || 0) + (day.lunch?.fat || 0) + (day.dinner?.fat || 0);
                  
                  return (
                    <div key={idx} className="animate-fade-in" style={{ padding: 'var(--space-2)' }}>
                      
                      {/* Daily Mathematical Forecast Dashboard */}
                      <div className="card" style={{ background: 'var(--bg-primary)', padding: 'var(--space-6)', borderRadius: '24px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Forecast</h3>
                          <div style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                            {day.daily_calories} kcal
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', width: '100%', height: '12px', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '16px' }}>
                          <div style={{ flex: totalProtein, background: 'var(--macro-protein)' }}></div>
                          <div style={{ flex: totalCarbs, background: 'var(--macro-carbs)' }}></div>
                          <div style={{ flex: totalFat, background: 'var(--macro-fat)' }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}><span style={{display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--macro-protein)', marginRight: '6px'}}></span>{totalProtein}g Pro</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}><span style={{display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--macro-carbs)', marginRight: '6px'}}></span>{totalCarbs}g Crb</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}><span style={{display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--macro-fat)', marginRight: '6px'}}></span>{totalFat}g Fat</span>
                        </div>
                      </div>

                      {/* Vertical Timeline View */}
                      <div style={{ position: 'relative', paddingLeft: '8px' }}>
                        {renderMeal(day.breakfast, 'Breakfast', false)}
                        {renderMeal(day.lunch, 'Lunch', false)}
                        {renderMeal(day.dinner, 'Dinner', true)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Smart Grocery List View */}
            {activeTab === 'groceries' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {Object.entries(plannerData.grocery_list || {}).map(([category, items]: [string, any], idx) => (
                  <div key={idx} className="card" style={{ padding: 'var(--space-5)', background: 'var(--bg-primary)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', textTransform: 'capitalize', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {category === 'produce' ? '🥦' : category === 'proteins' ? '🥩' : '🥫'} {category}
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {(items as string[]).map((item, itemIdx) => {
                        const isChecked = checkedItems[item] || false;
                        return (
                          <label key={itemIdx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: itemIdx !== items.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: isChecked ? 'none' : '2px solid var(--border-subtle)', background: isChecked ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               {isChecked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => toggleCheck(item)}
                              style={{ display: 'none' }}
                            />
                            <span style={{ fontSize: '1.05rem', color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isChecked ? 'line-through' : 'none', fontWeight: isChecked ? 400 : 500 }}>
                              {item}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      <BottomNav />
    </div>
  );
}
