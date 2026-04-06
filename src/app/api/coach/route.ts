import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { profile, meals, weightLogs, wearables, bloodTests } = await req.json();

    if (!profile) {
      return NextResponse.json({ error: 'No profile provided' }, { status: 400 });
    }

    const instructions = `You are NutriSync's elite empathetic AI Health Coach. 
Analyze the following user profile, recent meals logged over the last 7 days, and their weight history to provide a short, highly personalized daily coaching snippet.

USER PROFILE:
- Name: ${profile.display_name || 'User'}
- Height: ${profile.height_cm || 'Unknown'} cm
- Current Goal: ${profile.diet_goal || 'Maintain'}
- Activity Level: ${profile.activity_level || 'Unknown'}

WEARABLE BIOMETRICS (Oura/Apple Health Integration):
${wearables ? `- Sleep Last Night: ${wearables.sleepHours} hours\n- Cortisol/Stress Level: ${wearables.stressLevel}\n- Menstrual Cycle Phase: ${wearables.cyclePhase}` : 'No biometric data provided.'}

BLOOD TEST HISTORY (FOR TREND ANALYSIS):
${JSON.stringify(bloodTests?.map((t: any) => ({ date: t.created_at, biomarkers: t.biomarkers })) || [])}

WEIGHT HISTORY (LATEST):
${JSON.stringify(weightLogs?.slice(-3) || [])}

RECENT MEALS (LAST 5):
${JSON.stringify(meals?.map((m: any) => ({ name: m.name, calories: m.total_calories, protein: m.total_protein })) || [])}

INSTRUCTIONS:
1. Provide a short greeting using their name.
2. Acknowledge their specific goal (${profile.diet_goal}) and current progress.
3. PREDICTIVE BLOOD TREND ANALYSIS: If blood test history is provided, analyze multiple timestamps. If a marker like glucose or cholesterol is rising over time, point out the mathematical trend and warn them, even if it is technically 'normal' right now.
4. MEAL ANALYSIS: Analyze their specific logged items. Point out nutrient gaps relative to their blood deficiencies.
5. BIOMETRIC INTEGRATION: Explicitly connect their wearable data (sleep, stress, cycle) to their metabolic state.
6. PROTOCOL: End with 1-2 concrete, data-driven, highly-actionable protocols for their next meal.
7. Format the response strictly in Markdown using headers (###), bullet points, bolding, and emojis. Provide deep, comprehensive advice!`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: instructions,
    });

    const text = response.text;

    return NextResponse.json({ coachResponse: text });
  } catch (error: any) {
    console.error('Coach API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error communicating with AI Coach' },
      { status: 500 }
    );
  }
}
