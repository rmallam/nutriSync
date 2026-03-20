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
3. Suggest one single, incredibly specific, actionable diet or lifestyle tip for TODAY based exclusively on the meals they have recently logged, their weight trend, and biological wearbles.
4. SYNTHETIC WEARABLE INTEGRATION: If Biometric Wearable data is provided (like poor sleep < 6h, high stress, or specific menstrual phases like Luteal/Menstrual), you MUST aggressively tailor the dietary tip to directly address that biological state (e.g. suggesting magnesium for stress, stabilizing blood sugar after poor sleep, or slightly higher carbs/iron during menstruation). Give the actual biological reason! 
5. Format the response strictly in Markdown using bullet points, bolding, and active emojis. Keep it under 150 words. Do not wrap the response in a markdown code block.`;

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
