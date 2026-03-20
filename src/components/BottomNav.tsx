import React from 'react';
import Link from 'next/link';

export default function BottomNav() {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '80px',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom, 16px)', // Support for iOS home indicator
      zIndex: 50
    }}>
      {/* Home Button */}
      <Link href="/" style={{ textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>Home</span>
        </div>
      </Link>

      <Link href="/planner" style={{ textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>Planner</span>
        </div>
      </Link>

      {/* Progress Button */}
      <Link href="/progress" style={{ textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>Progress</span>
        </div>
      </Link>

      {/* Profile Button */}
      <Link href="/profile" style={{ textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>Profile</span>
        </div>
      </Link>

      <style>{`
        .fab-btn:active { transform: translateY(-16px) scale(0.95) !important; }
      `}</style>
    </div>
  );
}
