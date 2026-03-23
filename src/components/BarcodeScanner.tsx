"use client";

import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { MealStorage } from '@/utils/storage';

type NutritionData = {
  name: string;
  brand: string;
  serving_size: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  image_url: string | null;
};

type BarcodeScannerProps = {
  onLogSuccess?: () => void;
  onBack?: () => void;
};

export default function BarcodeScanner({ onLogSuccess, onBack }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<NutritionData | null>(null);
  const [servings, setServings] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState(false);
  const [customMealName, setCustomMealName] = useState('');

  const lookupBarcode = async (barcode: string) => {
    setLoading(true);
    setError(null);
    setProduct(null);

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await res.json();

      if (data.status !== 1 || !data.product) {
        setError(`Product not found for barcode: ${barcode}. Try logging this meal manually with the AI scanner instead.`);
        return;
      }

      const p = data.product;
      const n = p.nutriments || {};

      setProduct({
        name: p.product_name || p.product_name_en || 'Unknown Product',
        brand: p.brands || 'Unknown Brand',
        serving_size: p.serving_size || p.quantity || '100g',
        calories: Math.round(Number(n['energy-kcal_serving'] || n['energy-kcal_100g']) || 0),
        protein_g: Math.round(Number(n.proteins_serving || n.proteins_100g) || 0),
        fat_g: Math.round(Number(n.fat_serving || n.fat_100g) || 0),
        carbs_g: Math.round(Number(n.carbohydrates_serving || n.carbohydrates_100g) || 0),
        fiber_g: Math.round(Number(n.fiber_serving || n.fiber_100g) || 0),
        sugar_g: Math.round(Number(n.sugars_serving || n.sugars_100g) || 0),
        sodium_mg: Math.round(Number(n.sodium_serving || n.sodium_100g) * 1000 || 0),
        image_url: p.image_front_url || p.image_url || null,
      });
      setCustomMealName(p.product_name || p.product_name_en || '');
    } catch (err) {
      console.error('Barcode lookup failed', err);
      setError('Failed to look up product. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNativeScan = async () => {
    if (!Capacitor.isNativePlatform()) {
      setError('Camera barcode scanning is only available on native devices. Use manual entry below.');
      return;
    }

    setScanning(true);
    setError(null);

    try {
      // Dynamic import to avoid SSR/web build errors - only loaded on native
      const mlkit = await import('@capacitor-mlkit/barcode-scanning');
      const NativeScanner = mlkit.BarcodeScanner;
      const Format = mlkit.BarcodeFormat;

      // Request camera permission
      const { camera } = await NativeScanner.checkPermissions();
      if (camera !== 'granted') {
        const perm = await NativeScanner.requestPermissions();
        if (perm.camera !== 'granted') {
          setError('Camera permission is required to scan barcodes.');
          setScanning(false);
          return;
        }
      }

      const { barcodes } = await NativeScanner.scan({
        formats: [Format.Ean13, Format.Ean8, Format.UpcA, Format.UpcE, Format.Code128, Format.Code39],
      });

      if (barcodes.length > 0 && barcodes[0].rawValue) {
        await lookupBarcode(barcodes[0].rawValue);
      } else {
        setError('No barcode detected. Try again or enter the number manually.');
      }
    } catch (err) {
      console.error('Native barcode scan error', err);
      setError('Scanner failed. Try entering the barcode manually.');
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = async () => {
    const code = manualBarcode.trim();
    if (!code) return;
    await lookupBarcode(code);
  };

  const handleLogMeal = async () => {
    if (!product) return;

    const finalName = customMealName.trim() || product.name;

    await MealStorage.saveMeal({
      name: `${finalName}${servings > 1 ? ` (x${servings})` : ''}`,
      total_calories: Math.round(product.calories * servings),
      total_protein: Math.round(product.protein_g * servings),
      total_fat: Math.round(product.fat_g * servings),
      total_carbs: Math.round(product.carbs_g * servings),
      items: [{
        label: finalName,
        calories: Math.round(product.calories * servings),
        protein_g: Math.round(product.protein_g * servings),
        fat_g: Math.round(product.fat_g * servings),
        carbs_g: Math.round(product.carbs_g * servings),
        fiber_g: Math.round(product.fiber_g * servings),
        sugar_g: Math.round(product.sugar_g * servings),
        sodium_mg: Math.round(product.sodium_mg * servings),
        health_score: null,
        is_healthy: null,
      }],
      image_base64: null,
      image_url: product.image_url,
    });

    setLogSuccess(true);
    setTimeout(() => {
      if (onLogSuccess) onLogSuccess();
    }, 1500);
  };

  const resetScanner = () => {
    setProduct(null);
    setError(null);
    setManualBarcode('');
    setServings(1);
    setLogSuccess(false);
    setCustomMealName('');
  };

  return (
    <div className="scanner-wrapper card glass-panel animate-fade-in" style={{ marginTop: 'var(--space-8)' }}>
      
      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Barcode Scanner</h2>
        <span className="badge" style={{
          background: 'rgba(0, 122, 255, 0.15)',
          color: '#007AFF',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          INSTANT
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--error)',
          color: 'var(--error)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      {/* Input Area - visible when no product loaded */}
      {!product && !loading && (
        <>
          {/* Native Camera Scan Button */}
          <div
            style={{
              border: '2px solid var(--accent-primary)',
              background: 'var(--accent-primary)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6) var(--space-4)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-md)',
              textAlign: 'center',
              marginBottom: 'var(--space-4)',
              opacity: scanning ? 0.6 : 1,
            }}
            onClick={!scanning ? handleNativeScan : undefined}
          >
            <div style={{ marginBottom: '8px' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                <line x1="7" y1="12" x2="17" y2="12"></line>
                <line x1="7" y1="8" x2="13" y2="8"></line>
                <line x1="7" y1="16" x2="15" y2="16"></line>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', letterSpacing: '0' }}>
              {scanning ? 'Opening Scanner...' : 'Scan Barcode'}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>
              Point camera at product barcode
            </p>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--space-4) 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
            <span style={{ padding: '0 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
          </div>

          {/* Manual Barcode Entry */}
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter barcode number (e.g. 5000159459228)"
              value={manualBarcode}
              onChange={e => setManualBarcode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)', outline: 'none',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)'
              }}
            />
            <button
              className="btn btn-primary"
              onClick={handleManualSubmit}
              disabled={!manualBarcode.trim()}
            >
              Look Up
            </button>
          </div>
        </>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{
          padding: 'var(--space-12)',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            width: '40px', height: '40px',
            border: '3px solid var(--border-subtle)',
            borderTopColor: '#007AFF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p className="animate-pulse" style={{ marginTop: 'var(--space-4)', color: '#007AFF', fontWeight: 600 }}>
            Looking up product...
          </p>
        </div>
      )}

      {/* Product Result Card */}
      {product && !logSuccess && (
        <div className="animate-fade-in">
          
          {/* Product Info */}
          <div style={{
            display: 'flex', gap: 'var(--space-4)', alignItems: 'center',
            marginBottom: 'var(--space-6)', padding: 'var(--space-4)',
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                style={{ width: '72px', height: '72px', borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '72px', height: '72px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '2rem', flexShrink: 0
              }}>
                📦
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2px', color: 'var(--text-primary)' }}>
                {product.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {product.brand}
              </p>
              <span style={{
                fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px',
                background: 'rgba(0, 122, 255, 0.1)', color: '#007AFF', fontWeight: 600
              }}>
                Per serving: {product.serving_size}
              </span>
            </div>
          </div>

          {/* Serving Size Adjuster */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 'var(--space-4)', marginBottom: 'var(--space-6)'
          }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>Servings:</span>
            <button
              className="btn btn-secondary"
              style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', fontSize: '1.1rem' }}
              onClick={() => setServings(Math.max(0.5, servings - 0.5))}
            >
              -
            </button>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '40px', textAlign: 'center' }}>
              {servings}
            </span>
            <button
              className="btn btn-secondary"
              style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', fontSize: '1.1rem' }}
              onClick={() => setServings(servings + 0.5)}
            >
              +
            </button>
          </div>

          {/* Macro Breakdown Table */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            marginBottom: 'var(--space-6)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Nutrient</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Calories', value: `${Math.round(product.calories * servings)} kcal`, color: 'var(--macro-calories)' },
                  { label: 'Protein', value: `${Math.round(product.protein_g * servings)}g`, color: 'var(--macro-protein)' },
                  { label: 'Carbs', value: `${Math.round(product.carbs_g * servings)}g`, color: 'var(--macro-carbs)' },
                  { label: 'Fat', value: `${Math.round(product.fat_g * servings)}g`, color: 'var(--macro-fat)' },
                  { label: 'Fiber', value: `${Math.round(product.fiber_g * servings)}g`, color: 'var(--success)' },
                  { label: 'Sugar', value: `${Math.round(product.sugar_g * servings)}g`, color: 'var(--text-muted)' },
                  { label: 'Sodium', value: `${Math.round(product.sodium_mg * servings)}mg`, color: 'var(--text-muted)' },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: row.color, marginRight: '8px' }}></span>
                      {row.label}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Meal Name + Log Button */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 'var(--space-4)'
          }}>
            <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Meal Name</label>
              <input
                type="text"
                value={customMealName}
                onChange={e => setCustomMealName(e.target.value)}
                placeholder="e.g. Afternoon Snack"
                style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', maxWidth: '300px' }} onClick={handleLogMeal}>
              Log Meal
            </button>
          </div>
        </div>
      )}

      {/* Success State */}
      {logSuccess && (
        <div className="animate-fade-in" style={{
          display: 'flex', justifyContent: 'center',
          background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)',
          fontWeight: 600, alignItems: 'center', gap: '8px',
          padding: '12px', borderRadius: 'var(--radius-full)'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Meal Logged Successfully!
        </div>
      )}

      {/* Bottom Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: 'var(--space-6)' }}>
        {product && !logSuccess && (
          <button className="btn btn-secondary" onClick={resetScanner}>Scan Another</button>
        )}
        {onBack && (
          <button className="btn btn-secondary" onClick={onBack}>Back to Scanner</button>
        )}
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
