# 🍏 NutriSync

NutriSync is a next-generation AI Nutrition platform that uses the Google Gemini Multimodal Vision API to instantly visually dissect and calculate caloric intake from structural food photographs.

---

## 🏗 System Architecture

NutriSync heavily utilizes an **Over-The-Air (OTA) Native Shell Architecture**, decoupling the heavy frontend logic from the physical mobile binary.

### 1. The Compute & Hosting Layer (Vercel)
- **Framework:** Next.js (App Router) + React.
- **Deployment:** Hosted securely on **Vercel Edge Networks** (`https://nutri-sync-rho.vercel.app`).
- **Serverless APIs:** The Vercel runtime safely executes all backend logic within the `/api/` directory (e.g., executing the strict `gemini-2.5-flash` logit prompts away from client vulnerabilities).

### 2. The Database & Authentication Stack (Supabase)
- **Database:** Supabase PostgreSQL handles all persistent state (`user_profiles`, `meals`, `weight_logs`).
- **Identity (Auth):** Supabase Auth generates highly secure JWT sessions.
- **Image Storage:** Supabase Storage (S3-compatible) securely archives uploaded meal pictures.
- **Security:** Strict Row-Level Security (RLS) mathematically guarantees users can only access their personal database rows and S3 image buckets.

### 3. The Native Mobile Application (Ionic Capacitor)
- **Design:** The Android `.apk` (and iOS counterpart) is an ultra-lightweight **Native Shell**.
- **Bridging:** It contains physical hardware bridges for **Biometric Securty (FaceID/Fingerprint)** and **Apple HealthKit / Google Fit** step synchronization.
- **The Magic (OTA Updates):** Capacitor is configured (`capacitor.config.ts`) to completely ignore local assets. Upon boot, the mobile application's embedded WebView instantly resolves to the live Vercel URL. This guarantees that CSS and React updates pushed to Github instantly appear on all user devices across the world without App Store update reviews.

---

## 🔐 Advanced Device Security
1. **Zero-Trust Boot (Biometrics):** NutriSync immediately interrogates the hardware Keystore upon launch. The React Render Tree remains permanently locked until native FaceID or Fingerprint authentication resolves.
2. **Key Masking:** Crucial tokens (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE`) are physically ignored by `.gitignore` and must be securely injected through the Vercel Dashboard Environment settings for production access.

---

## 🚀 Local Developer Setup

```bash
# 1. Clone the repository
git clone https://github.com/rmallam/nutriSync.git
cd nutriSync

# 2. Install dependencies
npm install

# 3. Securely hook up your local environment file
# (Create a .env.local file with your Supabase and Gemini keys)

# 4. Boot the Next.js runtime environment (loads http://localhost:3000)
npm run dev
```

### 📱 Android Native Compilation
If you add or alter physical hardware plugins (e.g., adding Bluetooth or GPS plugins), you MUST manually re-compile the physical `apk` so it can absorb the new Native java packages.

```bash
# Force Capacitor to ingest the newly installed plugins
npx cap sync android

# Open Android Studio to build and push the new Native APK
npx cap open android
```
