import React from 'react';

interface MacroRingProps {
  percentage: number; // 0-100
  colorHex: string;
  size?: number; // width/height in px
  strokeWidth?: number;
  label?: string;
  value?: string;
  subValue?: string;
}

export default function MacroRing({ 
  percentage, 
  colorHex, 
  size = 100, 
  strokeWidth = 8,
  label,
  value,
  subValue
}: MacroRingProps) {
  // SVG Circle math
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, percentage) / 100) * circumference;

  return (
    <div style={{ 
      position: 'relative', 
      width: size, 
      height: size,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <svg 
        width={size} 
        height={size} 
        style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={colorHex}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      
      {/* Inner Content */}
      <div style={{ textAlign: 'center', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         {value && (
            <span style={{ fontSize: size > 100 ? '2rem' : '1.25rem', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}>
              {value}
            </span>
         )}
         {subValue && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {subValue}
            </span>
         )}
         {label && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
              {label}
            </span>
         )}
      </div>
    </div>
  );
}
