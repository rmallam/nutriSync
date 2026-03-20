"use client";

import { useState, useEffect } from 'react';
import BottomNav from "@/components/BottomNav";
import { MealStorage, UserProfile } from "@/utils/storage";
import { supabase } from '@/utils/supabase';
import Auth from '@/components/Auth';

export default function ProfilePage() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [profile, setProfile] = useState<UserProfile>({
    display_name: '',
    height_cm: null,
    target_weight_kg: null,
    activity_level: 'Light',
    diet_goal: 'Maintain',
  });
  
  const [currentWeight, setCurrentWeight] = useState<number | ''>('');
  const [initialWeight, setInitialWeight] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [culturalPrefs, setCulturalPrefs] = useState<{location: string, dietary_preferences: string[]}>({ location: '', dietary_preferences: [] });

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
    const fetchProfile = async () => {
      if (session) {
        const data = await MealStorage.getUserProfile();
        if (data) {
          setProfile({
            display_name: data.display_name || '',
            height_cm: data.height_cm || null,
            target_weight_kg: data.target_weight_kg || null,
            activity_level: data.activity_level || 'Light',
            diet_goal: data.diet_goal || 'Maintain',
          });
        }
        
        const logs = await MealStorage.getWeightLogs();
        if (logs.length > 0) {
           const latest = logs[logs.length - 1].weight_kg;
           setCurrentWeight(latest);
           setInitialWeight(latest);
        }
      }
    };
    
    const fetchCultural = async () => {
       const prefs = await MealStorage.getCulturalPreferences();
       if (prefs) setCulturalPrefs(prefs);
    };

    fetchProfile();
    fetchCultural();
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    
    // Save profile metadata
    const success = await MealStorage.upsertUserProfile(profile);
    
    // Save new weight log if they modified the Current Weight Box
    if (currentWeight !== '' && currentWeight !== initialWeight) {
       await MealStorage.addWeightLog(Number(currentWeight));
       setInitialWeight(Number(currentWeight));
    }

    await MealStorage.saveCulturalPreferences(culturalPrefs);

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSaving(false);
  };

  if (loadingSession) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-tertiary)' }}><div style={{ width: '40px', height: '40px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></div>;
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />;
  }

  return (
    <div className="container" style={{ paddingBottom: '90px', paddingTop: 'env(safe-area-inset-top, 24px)', background: 'var(--bg-tertiary)', minHeight: '100vh' }}>
      <header style={{ padding: 'var(--space-6) var(--space-6)', marginBottom: 'var(--space-2)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
          Settings
        </h1>
      </header>

      <div style={{ padding: '0 var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        
        {saveSuccess && (
          <div className="animate-fade-in" style={{ background: 'var(--success)', color: '#fff', padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: 600, textAlign: 'center', boxShadow: '0 8px 16px rgba(52, 199, 89, 0.2)' }}>
            Profile Updated
          </div>
        )}

        {/* Section 1: Account Profile */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', paddingLeft: '8px' }}>Account</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
              {profile.display_name ? profile.display_name.charAt(0).toUpperCase() : session?.user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <input 
                type="text" 
                value={profile.display_name || ''}
                onChange={(e) => setProfile({...profile, display_name: e.target.value})}
                placeholder="Your Name"
                style={{ width: '100%', fontSize: '1.25rem', fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
              />
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '2px' }}>{session?.user?.email}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Body Metrics */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '8px' }}>Body Metrics</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 500 }}>Height (cm)</span>
              <input type="number" value={profile.height_cm || ''} onChange={(e) => setProfile({...profile, height_cm: Number(e.target.value) || null})} placeholder="175" style={{ width: '80px', textAlign: 'right', fontSize: '1.05rem', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-secondary)' }}/>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 500 }}>Current Weight</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="number" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value === '' ? '' : Number(e.target.value))} placeholder="75" style={{ width: '60px', textAlign: 'right', fontSize: '1.05rem', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-secondary)' }}/>
                <span style={{ color: 'var(--text-muted)' }}>kg</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 8px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 500 }}>Target Weight</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="number" value={profile.target_weight_kg || ''} onChange={(e) => setProfile({...profile, target_weight_kg: Number(e.target.value) || null})} placeholder="70" style={{ width: '60px', textAlign: 'right', fontSize: '1.05rem', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-secondary)' }}/>
                <span style={{ color: 'var(--text-muted)' }}>kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Nutritional Goals */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '8px' }}>Goals & Activity</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 500, display: 'block', marginBottom: '12px' }}>Primary Goal</span>
              <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                {['Lose Weight', 'Maintain', 'Build Muscle'].map(goal => (
                  <button key={goal} type="button" onClick={() => setProfile({...profile, diet_goal: goal})} style={{ flex: 1, padding: '8px 4px', fontSize: '0.8rem', fontWeight: 600, border: 'none', borderRadius: '8px', background: profile.diet_goal === goal ? '#fff' : 'transparent', color: profile.diet_goal === goal ? '#000' : 'var(--text-secondary)', boxShadow: profile.diet_goal === goal ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {goal}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 8px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 500 }}>Activity Level</span>
              <select value={profile.activity_level || 'Light'} onChange={(e) => setProfile({...profile, activity_level: e.target.value})} style={{ textAlign: 'right', fontSize: '1.05rem', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-secondary)', WebkitAppearance: 'none' }}>
                <option value="Sedentary">Sedentary</option>
                <option value="Light">Light (1-3 days)</option>
                <option value="Moderate">Moderate (3-5 days)</option>
                <option value="Very Active">Very Active</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Cultural & Dietary Context */}
        <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '8px' }}>Context & Restrictions</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Location / Region</span>
              <input 
                type="text" 
                value={culturalPrefs.location} 
                onChange={(e) => setCulturalPrefs({...culturalPrefs, location: e.target.value})} 
                placeholder="e.g. South India, Mediterranean, UK" 
                style={{ width: '100%', fontSize: '1.05rem', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', borderRadius: '8px', outline: 'none', color: 'var(--text-primary)', padding: '12px' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Helps the AI suggest locally available ingredients.</p>
            </div>
            
            <div style={{ padding: '16px 8px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 500, display: 'block', marginBottom: '12px' }}>Dietary Preferences</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'Halal'].map(diet => {
                  const isChecked = culturalPrefs.dietary_preferences.includes(diet);
                  return (
                    <button 
                      key={diet} 
                      type="button" 
                      onClick={() => {
                        const newPrefs = isChecked 
                          ? culturalPrefs.dietary_preferences.filter(d => d !== diet)
                          : [...culturalPrefs.dietary_preferences, diet];
                        setCulturalPrefs({...culturalPrefs, dietary_preferences: newPrefs});
                      }} 
                      style={{ padding: '8px 12px', fontSize: '0.85rem', fontWeight: 600, border: isChecked ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)', borderRadius: 'var(--radius-full)', background: isChecked ? 'rgba(0, 122, 255, 0.1)' : 'var(--bg-tertiary)', color: isChecked ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {diet} {isChecked && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave} disabled={saving} style={{ background: '#000', color: '#fff', padding: '16px', borderRadius: 'var(--radius-lg)', fontSize: '1.05rem', fontWeight: 700, border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {saving ? <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> : 'Save Settings'}
        </button>

        {/* Destructive Action */}
        <button onClick={() => supabase.auth.signOut()} style={{ background: 'var(--bg-primary)', color: 'var(--error)', padding: '16px', borderRadius: 'var(--radius-lg)', fontSize: '1.05rem', fontWeight: 600, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', cursor: 'pointer', marginTop: 'var(--space-4)' }}>
          Sign Out
        </button>

      </div>

      <BottomNav />
    </div>
  );
}
