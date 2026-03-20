import { supabase } from './supabase';

export interface LoggedMeal {
  id: string;
  created_at?: string; // Supabase ISO date string
  name: string;      
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  items: any[];      
  image_base64?: string | null;
  image_url?: string | null;
}

export interface UserProfile {
  id?: string;
  display_name: string | null;
  height_cm: number | null;
  target_weight_kg: number | null;
  activity_level: string | null;
  diet_goal: string | null;
}

export interface CulturalPreferences {
  location: string;
  dietary_preferences: string[];
}

export interface WeightLog {
  id?: string;
  weight_kg: number;
  created_at?: string;
}

export interface SymptomLog {
  id?: string;
  user_id?: string;
  meal_id?: string | null;
  symptom: string; // 'bloating', 'energy_crash', 'acid_reflux'
  intensity: number; // 1 to 10
  created_at?: string;
}

const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
};

export const MealStorage = {
  // Get all logged meals, sorted newest first
  getMeals: async (): Promise<LoggedMeal[]> => {
    try {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Failed to fetch meals from Supabase", e);
      return [];
    }
  },

  // Save a new meal
  saveMeal: async (meal: Omit<LoggedMeal, 'id' | 'created_at'>): Promise<LoggedMeal | null> => {
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('meals')
        .insert([{
          user_id: userId,
          name: meal.name || 'Unknown Meal',
          total_calories: Math.round(Number(meal.total_calories)) || 0,
          total_protein: Math.round(Number(meal.total_protein)) || 0,
          total_fat: Math.round(Number(meal.total_fat)) || 0,
          total_carbs: Math.round(Number(meal.total_carbs)) || 0,
          items: meal.items || [],
          image_base64: meal.image_base64 || null,
          image_url: meal.image_url || null
        }])
        .select()
        .single();

      if (error) {
         console.error("Supabase API Error Object:", JSON.stringify(error, null, 2));
         throw error;
      }
      return data;
    } catch (e: any) {
      console.error("Failed to save meal to Supabase:", e.message || JSON.stringify(e, null, 2));
      return null;
    }
  },

  // Get totals for a specific Date (defaults to today)
  getDailyTotals: async (date: Date = new Date()) => {
    try {
      const userId = await getUserId();
      if (!userId) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

      const targetDateString = date.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', `${targetDateString}T00:00:00Z`)
        .lte('created_at', `${targetDateString}T23:59:59Z`);

      if (error) throw error;

      const meals = data || [];
      return meals.reduce((totals, meal) => {
        let fiber = 0;
        let sodium = 0;
        let sugar = 0;
        
        // Accumulate embedded micronutrients dynamically from the raw JSON items array
        if (meal.items && Array.isArray(meal.items)) {
          meal.items.forEach((i: any) => {
            fiber += (Number(i.fiber_g) || 0);
            sodium += (Number(i.sodium_mg) || 0);
            sugar += (Number(i.sugar_g) || 0);
          });
        }

        return {
          calories: totals.calories + (meal.total_calories || 0),
          protein: totals.protein + (meal.total_protein || 0),
          carbs: totals.carbs + (meal.total_carbs || 0),
          fat: totals.fat + (meal.total_fat || 0),
          fiber: totals.fiber + fiber,
          sodium: totals.sodium + sodium,
          sugar: totals.sugar + sugar
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0 });
    } catch (e) {
      console.error("Failed to fetch daily totals", e);
      return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0 };
    }
  },

  // --- Water Tracking ---
  
  getDailyWater: async (date: Date = new Date()): Promise<number> => {
    try {
      const userId = await getUserId();
      if (!userId) return 0;

      const targetDateString = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', userId)
        .eq('date', targetDateString);

      if (error) throw error;
      
      const logs = data || [];
      return logs.reduce((sum, log) => sum + (log.amount_ml || 0), 0);
    } catch (e) {
      console.error("Failed to fetch water", e);
      return 0;
    }
  },

  logWater: async (amount: number, date: Date = new Date()): Promise<number> => {
    try {
      const userId = await getUserId();
      if (!userId) return 0;

      const targetDateString = date.toISOString().split('T')[0];
      
      // Since we just want simple tracking, we insert a new log entry for the amount added
      const { error } = await supabase
        .from('water_logs')
        .insert([{
            user_id: userId,
            date: targetDateString,
            amount_ml: amount
        }]);

      if (error) throw error;
      
      // Return the new total for the day
      return await MealStorage.getDailyWater(date);
    } catch (e) {
      console.error("Failed to save water", e);
      return await MealStorage.getDailyWater(date); 
    }
  },

  // Delete a specific meal
  deleteMeal: async (id: string) => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
    } catch (e) {
      console.error("Failed to delete meal", e);
    }
  },

  // --- Profile Tracking ---
  getUserProfile: async (): Promise<UserProfile | null> => {
    try {
      const userId = await getUserId();
      if (!userId) return null;
      const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
      if (error && error.code !== 'PGRST116') {
         console.error("Supabase API Error Object:", JSON.stringify(error, null, 2));
         throw error;
      }
      return data;
    } catch (e: any) {
      console.error("Failed to fetch profile:", e.message || JSON.stringify(e, null, 2));
      return null;
    }
  },

  // --- Image Storage (Phase 11) ---
  uploadMealImage: async (base64Data: string): Promise<string | null> => {
    try {
      const userId = await getUserId();
      if (!userId) return null;

      // Safe, native conversion from Data URI to Blob (avoids atob Invalid Character Errors)
      const res = await fetch(base64Data);
      const blob = await res.blob();

      // Generate unique S3 Key
      const fileName = `${userId}/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;

      const { data, error } = await supabase.storage
        .from('meal-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) {
         console.error("Supabase Storage Error:", error);
         return null;
      }

      // Retrieve immutable public CDN url
      const { data: publicUrlData } = supabase.storage
        .from('meal-photos')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (e) {
      console.error("Failed to upload image to bucket", e);
      return null;
    }
  },

  // --- End of Image Storage ---

  upsertUserProfile: async (profile: UserProfile): Promise<boolean> => {
    try {
      const userId = await getUserId();
      if (!userId) return false;
      const { error } = await supabase.from('user_profiles').upsert({
        id: userId,
        display_name: profile.display_name,
        height_cm: profile.height_cm,
        target_weight_kg: profile.target_weight_kg,
        activity_level: profile.activity_level,
        diet_goal: profile.diet_goal
      });
      if (error) {
        console.error("Supabase API Error Object:", JSON.stringify(error, null, 2));
        throw error;
      }
      return true;
    } catch (e: any) {
      console.error("Failed to upsert profile:", e.message || JSON.stringify(e, null, 2));
      return false;
    }
  },

  // --- Weight Tracking ---
  getWeightLogs: async (): Promise<WeightLog[]> => {
    try {
      const userId = await getUserId();
      if (!userId) return [];
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error("Supabase API Error Object:", JSON.stringify(error, null, 2));
        throw error;
      }
      return data || [];
    } catch (e: any) {
      console.error("Failed to fetch weight logs:", e.message || JSON.stringify(e, null, 2));
      return [];
    }
  },

  addWeightLog: async (weight_kg: number): Promise<boolean> => {
    try {
      const userId = await getUserId();
      if (!userId) return false;
      const { error } = await supabase.from('weight_logs').insert([{ 
        user_id: userId, 
        weight_kg,
        date: new Date().toISOString().split('T')[0]
      }]);
      if (error) {
         console.error("Supabase API Error Object:", JSON.stringify(error, null, 2));
         throw error;
      }
      return true;
    } catch (e: any) {
      console.error("Failed to log weight:", e.message || JSON.stringify(e, null, 2));
      return false;
    }
  },

  // --- Symptom Tracking (Gut Health) ---
  logSymptom: async (symptom: string, intensity: number, meal_id?: string): Promise<boolean> => {
    try {
      const userId = await getUserId();
      if (!userId) return false;

      const { error } = await supabase.from('symptom_logs').insert([{ 
        user_id: userId, 
        symptom, 
        intensity, 
        meal_id: meal_id || null 
      }]);
      
      if (error) {
         console.error("Supabase API Error Object:", JSON.stringify(error, null, 2));
         throw error;
      }
      return true;
    } catch (e) {
      console.error("Failed to log symptom", e);
      return false;
    }
  },

  getRecentSymptoms: async (): Promise<SymptomLog[]> => {
    try {
      const userId = await getUserId();
      if (!userId) return [];

      const { data, error } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Failed to fetch symptoms", e);
      return [];
    }
  },

  // --- PHASE 15: PLANNER PERSISTENCE ---
  getPlannerState: async (): Promise<any | null> => {
    try {
      if (typeof window === 'undefined') return null;
      const data = localStorage.getItem('nutrisync_planner_state');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  savePlannerState: async (state: any): Promise<void> => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem('nutrisync_planner_state', JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save planner state", e);
    }
  },

  // --- PHASE 16: CULTURAL CONTEXT ---
  getCulturalPreferences: async (): Promise<CulturalPreferences | null> => {
    try {
      if (typeof window === 'undefined') return null;
      const data = localStorage.getItem('nutrisync_cultural_prefs');
      return data ? JSON.parse(data) : { location: '', dietary_preferences: [] };
    } catch {
      return { location: '', dietary_preferences: [] };
    }
  },

  saveCulturalPreferences: async (prefs: CulturalPreferences): Promise<void> => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem('nutrisync_cultural_prefs', JSON.stringify(prefs));
    } catch (e) {
      console.error("Failed to save cultural prefs", e);
    }
  }
};
