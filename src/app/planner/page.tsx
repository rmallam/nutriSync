"use client";

import { useState, useEffect } from 'react';
import BottomNav from "@/components/BottomNav";
import { MealStorage } from "@/utils/storage";

export default function PlannerPage() {
  const [loading, setLoading] = useState(false);
  const [plannerData, setPlannerData] = useState<any>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'plan' | 'groceries'>('plan');

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
      
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, meals, culturalPrefs })
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

  return (
    <div className="container" style={{ paddingBottom: '100px', paddingTop: 'env(safe-area-inset-top, 24px)', background: 'var(--bg-tertiary)', minHeight: '100vh' }}>
      
      <header style={{ padding: 'var(--space-6) var(--space-6)', marginBottom: 'var(--space-2)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '2.2rem' }}>🗓️</span> Planner
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Your 3-Day Meal Matrix & Smart Cart.</p>
      </header>

      <div style={{ padding: '0 var(--space-4)' }}>
        
        {/* Generate Button Card */}
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
           <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Generate a highly optimized, personalized 3-day meal plan and exact grocery list based on your diet goals.</p>
           <button 
             onClick={generateNewPlan} 
             disabled={loading}
             style={{ background: 'var(--accent-primary)', color: '#fff', padding: '14px 24px', borderRadius: 'var(--radius-full)', fontSize: '1.05rem', fontWeight: 700, border: 'none', boxShadow: '0 8px 16px rgba(0, 122, 255, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s', width: '100%', justifyContent: 'center' }}
           >
             {loading ? <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> : 'Generate New Week'}
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
                {plannerData.meal_plan?.map((day: any, idx: number) => (
                  <div key={idx} className="card" style={{ padding: 'var(--space-6)', background: 'var(--bg-primary)', borderLeft: '4px solid var(--accent-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Day {day.day}</h3>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--macro-calories)', background: 'rgba(255, 59, 48, 0.1)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>{day.daily_calories} kcal</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Breakfast</div>
                        <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{day.breakfast}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Lunch</div>
                        <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{day.lunch}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Dinner</div>
                        <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{day.dinner}</div>
                      </div>
                    </div>
                  </div>
                ))}
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
