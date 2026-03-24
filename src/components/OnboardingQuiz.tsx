"use client";

import { useState } from 'react';
import { MealStorage } from '@/utils/storage';

interface OnboardingQuizProps {
  onComplete: () => void;
}

export default function OnboardingQuiz({ onComplete }: OnboardingQuizProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [goal, setGoal] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [heightStr, setHeightStr] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [activity, setActivity] = useState('');
  const [dietPref, setDietPref] = useState('');

  const handleComplete = async () => {
    setLoading(true);
    // Build user profile
    const profile = {
      display_name: null,
      height_cm: Number(heightStr) || 170,
      target_weight_kg: Number(weightStr) || 70,
      activity_level: activity || 'Moderate', // Light, Moderate, Very Active
      diet_goal: goal || 'Maintain',
    };
    
    await MealStorage.upsertUserProfile(profile);
    
    // Auto log their first weight
    if (Number(weightStr)) {
       await MealStorage.addWeightLog(Number(weightStr));
    }
    
    // Also save a custom cultural pref if they chose one
    if (dietPref && dietPref !== 'None') {
       await MealStorage.saveCulturalPreferences({
           location: dietPref,
           dietary_preferences: [dietPref]
       });
    }

    setLoading(false);
    onComplete();
  };

  const renderStep1 = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-6)' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>What is your primary goal?</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-8)' }}>We'll tailor your macros and AI meal plans exactly to this.</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {[
          { icon: '🔥', title: 'Lose Weight', desc: 'Shed body fat and tone up' },
          { icon: '⚖️', title: 'Maintain', desc: 'Keep current weight, optimize health' },
          { icon: '💪', title: 'Build Muscle', desc: 'Gain healthy mass and strength' }
        ].map((g) => (
          <button
            key={g.title}
            onClick={() => setGoal(g.title)}
            style={{
              padding: '24px', borderRadius: '16px', textAlign: 'left',
              border: goal === g.title ? '2px solid var(--accent-primary)' : '2px solid var(--border-subtle)',
              background: goal === g.title ? 'rgba(0, 122, 255, 0.05)' : 'var(--bg-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '2rem' }}>{g.icon}</div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{g.title}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{g.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <button 
        className="btn btn-primary" 
        style={{ width: '100%', padding: '16px', fontSize: '1.1rem', marginTop: '16px' }}
        disabled={!goal}
        onClick={() => setStep(2)}
      >
        Continue
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-6)' }}>
      <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', marginBottom: '24px', textAlign: 'left', padding: 0, fontSize: '1rem', cursor: 'pointer' }}>← Back</button>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Let's talk biology.</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-8)' }}>To calculate your exact basal metabolic rate (BMR).</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Biological Sex</label>
           <div style={{ display: 'flex', gap: '12px' }}>
              {['Male', 'Female'].map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  style={{ flex: 1, padding: '16px', borderRadius: '12px', border: gender === g ? '2px solid var(--accent-primary)' : '2px solid var(--border-subtle)', background: gender === g ? 'rgba(0, 122, 255, 0.05)' : 'var(--bg-secondary)', fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}
                >{g}</button>
              ))}
           </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Age</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="years" style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1.1rem', outline: 'none' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Height (cm)</label>
            <input type="number" value={heightStr} onChange={e => setHeightStr(e.target.value)} placeholder="cm" style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1.1rem', outline: 'none' }} />
          </div>
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Current Weight (kg)</label>
          <input type="number" value={weightStr} onChange={e => setWeightStr(e.target.value)} placeholder="kg" style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1.1rem', outline: 'none' }} />
        </div>
      </div>

      <button 
        className="btn btn-primary" 
        style={{ width: '100%', padding: '16px', fontSize: '1.1rem', marginTop: '16px' }}
        disabled={!gender || !age || !heightStr || !weightStr}
        onClick={() => setStep(3)}
      >
        Continue
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-6)' }}>
      <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', marginBottom: '24px', textAlign: 'left', padding: 0, fontSize: '1rem', cursor: 'pointer' }}>← Back</button>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>How active are you?</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-8)' }}>Not including workouts.</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {[
          { title: 'Light', desc: 'Desk job, mostly sitting.' },
          { title: 'Moderate', desc: 'On feet sometimes, light movement.' },
          { title: 'Very Active', desc: 'Physical job, walking all day.' }
        ].map((a) => (
          <button
            key={a.title}
            onClick={() => setActivity(a.title)}
            style={{
              padding: '24px', borderRadius: '16px', textAlign: 'left',
              border: activity === a.title ? '2px solid var(--accent-primary)' : '2px solid var(--border-subtle)',
              background: activity === a.title ? 'rgba(0, 122, 255, 0.05)' : 'var(--bg-secondary)',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{a.title}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{a.desc}</div>
          </button>
        ))}
      </div>

      <button 
        className="btn btn-primary" 
        style={{ width: '100%', padding: '16px', fontSize: '1.1rem', marginTop: '16px' }}
        disabled={!activity}
        onClick={() => setStep(4)}
      >
        Continue
      </button>
    </div>
  );

  const renderStep4 = () => (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-6)' }}>
      <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', marginBottom: '24px', textAlign: 'left', padding: 0, fontSize: '1rem', cursor: 'pointer' }}>← Back</button>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Any dietary preferences?</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-8)' }}>We'll instruct the AI Planner to respect these boundaries.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1, alignContent: 'start' }}>
        {['None', 'Vegan', 'Vegetarian', 'Pescatarian', 'Keto', 'Paleo', 'Mediterranean', 'Indian'].map((pref) => (
          <button
            key={pref}
            onClick={() => setDietPref(pref)}
            style={{
              padding: '16px 12px', borderRadius: '12px', textAlign: 'center',
              border: dietPref === pref ? '2px solid var(--accent-primary)' : '2px solid var(--border-subtle)',
              background: dietPref === pref ? 'rgba(0, 122, 255, 0.05)' : 'var(--bg-secondary)',
              color: dietPref === pref ? '#007AFF' : 'var(--text-primary)',
              fontWeight: 600, fontSize: '1rem', cursor: 'pointer'
            }}
          >
            {pref}
          </button>
        ))}
      </div>

      <button 
        className="btn btn-primary" 
        style={{ width: '100%', padding: '16px', fontSize: '1.1rem', marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        disabled={!dietPref || loading}
        onClick={handleComplete}
      >
        {loading ? <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> : 'Complete Setup'}
      </button>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-primary)', overflowY: 'auto', paddingTop: 'env(safe-area-inset-top, 24px)', paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}>
       {/* Progress Bar */}
       <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)' }}>
         <div style={{ width: `${(step / 4) * 100}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.3s ease' }}></div>
       </div>
       
       {step === 1 && renderStep1()}
       {step === 2 && renderStep2()}
       {step === 3 && renderStep3()}
       {step === 4 && renderStep4()}
    </div>
  );
}
