import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY as string });
    const { meals, profile, bloodTests } = await req.json();

    const dietGoal = profile?.diet_goal || 'Maintain';
    const location = profile?.location || 'Unknown';
    const dietaryRestrictions = profile?.dietary_restrictions || 'None';
    
    // Perform deep analysis on all uploaded meals (historical logs)
    const recentMealsString = meals?.length > 0 
      ? meals.slice(0, 15).map((m: any) => `${m.name} (${m.total_calories} kcal, ${m.total_protein}g Protein)`).join(" | ")
      : 'No prior meals explicitly logged';
    
    const latestTest = (bloodTests && bloodTests.length > 0) ? bloodTests[0] : null;
    const abnormalMarkers = latestTest?.biomarkers?.filter((b:any) => b.status.toLowerCase() !== 'normal' && b.status !== 'META') || [];
    const deficiencyString = abnormalMarkers.length > 0 
      ? abnormalMarkers.map((b: any) => `${b.marker} (${b.status})`).join(', ') 
      : 'None known';

    const systemInstruction = `You are an elite Clinical Dietician AI. 
The user is requesting their ONE highly optimized "Daily Smart Meal" for today.
Context:
- Location: ${location}
- Restrictions/Preferences: ${dietaryRestrictions}
- Primary Goal: ${dietGoal}
- Target Weight Focus: ${profile?.target_weight_kg ? profile.target_weight_kg + 'kg' : 'General Maintenance'}
- Known Blood Test Deficiencies: ${deficiencyString}
- Full Historical Meal Log: ${recentMealsString}

CRITICAL DIRECTIVES:
1. Analyze their historical "Full Historical Meal Log" to understand their real eating patterns. Suggest a NEW meal that firmly complements this style, avoiding boring repetitiveness but staying realistic.
2. It MUST act as a hyper-targeted nutritional supplement for any known blood test deficiencies.
3. The macros MUST align tightly with their ${dietGoal} goal.
4. Provide a localized, delicious recipe title.
5. Return STRICT JSON matching the schema precisely.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the meal" },
        description: { type: Type.STRING, description: "Short, appetizing description" },
        prepTime: { type: Type.STRING, description: "E.g., '15 mins'" },
        whyItWorks: { type: Type.STRING, description: "1-2 sentences explaining exactly how this meal addresses their specific blood work deficiencies or goals." },
        macros: {
            type: Type.OBJECT,
            properties: {
                calories: { type: Type.INTEGER },
                protein: { type: Type.INTEGER },
                carbs: { type: Type.INTEGER },
                fats: { type: Type.INTEGER }
            }
        }
      },
      required: ["name", "description", "prepTime", "whyItWorks", "macros"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: "Generate my daily smart meal." }],
      config: { systemInstruction, responseMimeType: "application/json", responseSchema, temperature: 0.7 }
    });

    const outputText = response.text;
    if (!outputText) throw new Error("Null output from Gemini API");
    return NextResponse.json({ success: true, data: JSON.parse(outputText) });
  } catch (error: any) {
    console.error("AI Daily Meal Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
