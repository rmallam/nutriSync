"use client";
import React, { useEffect, useState } from 'react';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export default function BiometricWall({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setStyle({ style: Style.Dark });
        } catch (e) {
             console.log('Status bar overlay error', e);
        }
      }

      if (!Capacitor.isNativePlatform()) {
        setAuthenticated(true);
        return;
      }
      
      try {
        const info = await BiometricAuth.checkBiometry();
        if (info.isAvailable) {
          try {
            await BiometricAuth.authenticate({
               reason: 'Unlock NutriSync',
               cancelTitle: 'Cancel',
               allowDeviceCredential: true
            });
            setAuthenticated(true);
          } catch(err) {
             console.log(err);
          }
        } else {
           setAuthenticated(true); 
        }
      } catch (e) {
        console.error('Biometric init error', e);
        setAuthenticated(true);
      }
    };
    initApp();
  }, []);

  if (!authenticated) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', flexDirection: 'column' }}>
         <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</div>
         <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>NutriSync Locked</h2>
         <p style={{ color: '#888', marginTop: '10px' }}>Please authenticate using FaceID or Fingerprint.</p>
         <button onClick={() => window.location.reload()} style={{ marginTop: '30px', padding: '12px 24px', borderRadius: '12px', background: '#333', color: '#fff', border: 'none' }}>Try Again</button>
      </div>
    );
  }

  return <>{children}</>;
}
