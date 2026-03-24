import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { profile, meals, weightLogs, wearables } = await req.json();

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

WEIGHT HISTORY (LATEST):
${JSON.stringify(weightLogs?.slice(-3) || [])}

RECENT MEALS (LAST 5):
${JSON.stringify(meals?.map((m: any) => ({ name: m.name, calories: m.total_calories, protein: m.total_protein })) || [])}

INSTRUCTIONS:
1. Provide a short greeting using their name.
2. Acknowledge their specific goal (${profile.diet_goal}) and current progress.
3. Provide a structured, multi-paragraph Premium Health Analysis.
4. MEAL ANALYSIS: Analyze their specific logged items. Point out nutrient gaps, caloric density, and comment on their overall dietary quality. Talk about the specific foods they logged!
5. BIOMETRIC INTEGRATION: Explicitly connect their wearable data (sleep, stress, cycle) to their metabolic state. Explain how their biology dictates what they should eat today.
6. PROTOCOL: End with 1-2 concrete, data-driven, highly-actionable protocols for their next meal.
7. Format the response strictly in Markdown using headers (###), bullet points, bolding, and emojis. Do not wrap the response in a markdown code block. Provide deep, comprehensive advice!`;

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
