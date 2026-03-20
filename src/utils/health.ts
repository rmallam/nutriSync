import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';

export const HealthSync = {
  isAvailable: async () => {
    return Capacitor.isNativePlatform();
  },

  requestPermissions: async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log("Mocking Health Permissions Request on Web");
      return true; // Auto-pass for Web emulation
    }
    try {
      // @ts-ignore: Next.js types don't strictly align with specialized capacitor mobile interfaces
      await Health.requestAuthorization([
        { read: ['steps', 'calories', 'workouts'] }
      ]);
      return true;
    } catch (e) {
      console.error("Health Permissions Denied", e);
      return false;
    }
  },

  getDailyMetrics: async () => {
    // If testing via npm run dev on Chrome, securely return robust mock data
    if (!Capacitor.isNativePlatform()) {
      console.log("Mocking Native Health Data Fetch for Next.js Web Environment");
      return { steps: 8432, activeCalories: 450, isSynced: true };
    }
    
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      // Compute steps natively using the cross-platform aggregated method
      const stepsData = await Health.queryAggregated({
        dataType: 'steps',
        startDate: today.toISOString(),
        endDate: new Date().toISOString(),
        bucket: 'day',
        aggregation: 'sum'
      });

      // Compute active calories natively
      const caloriesData = await Health.queryAggregated({
        dataType: 'calories',
        startDate: today.toISOString(),
        endDate: new Date().toISOString(),
        bucket: 'day',
        aggregation: 'sum'
      });

      const totalSteps = (stepsData.samples || []).reduce((sum: number, s: any) => sum + s.value, 0);
      const totalCalories = (caloriesData.samples || []).reduce((sum: number, c: any) => sum + c.value, 0);

      return { steps: Math.round(totalSteps), activeCalories: Math.round(totalCalories), isSynced: true };
    } catch (e) {
      console.error("Failed to fetch native health data (Apple HealthKit / Google Fit)", e);
      return { steps: 0, activeCalories: 0, isSynced: false };
    }
  }
};
