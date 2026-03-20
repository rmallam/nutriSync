import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

// Initialize the deterministic Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY as string,
});

/**
 * Phase 15.2: The Intelligent Planner Route
 * This endpoint accepts the user's bodily metrics, diet goals, and historical meal affinities,
 * and executes a deterministic zero-temperature prompt to generate a highly structured
 * 3-Day Meal Plan AND an exact calculated Smart Grocery List in JSON format.
 */
export async function POST(req: NextRequest) {
  try {
    const { meals, profile, culturalPrefs } = await req.json();

    const dietGoal = profile?.diet_goal || 'Maintain';
    const activityLevel = profile?.activity_level || 'Light';
    const targetWeight = profile?.target_weight_kg || 'Current Weight';
    
    const location = culturalPrefs?.location || 'General/Global';
    const rawDiets = culturalPrefs?.dietary_preferences || [];
    const dietaryRestrictions = rawDiets.length > 0 ? rawDiets.join(', ') : 'None specified';

    // Build the affinity string to make the AI personalized
    const recentMealsString = meals?.slice(0, 15).map((m: any) => m.name).join(", ");
    
    const userContext = `
      - Diet Goal: ${dietGoal}
      - Activity Level: ${activityLevel}
      - Target Weight: ${targetWeight} kg
      - Geographical Location: ${location}
      - Strict Dietary Restrictions: ${dietaryRestrictions}
      - Recently Enjoyed Meals: ${recentMealsString || 'Standard balanced diet'}
    `;

    const systemInstruction = `You are NutriSync's elite Clinical Dietician AI.
Your absolute only purpose is to generate exactly 3 days of highly effective, delicious, and extremely realistic meal plans (Breakfast, Lunch, Dinner).
Crucially, you must ALSO compute the precise exact Smart Grocery List required to cook ALL 9 of these meals over the 3 days.

CRITICAL DIRECTIVES:
1. You MUST absolutely respect the Geographical Location [${location}]. Suggest ingredients that are locally available, culturally appropriate, and affordable in that region. Do NOT suggest foreign or rare ingredients out of context.
2. You MUST strictly adhere to the Dietary Restrictions [${dietaryRestrictions}]. If the user is Vegan or Halal, absolutely NO ingredients that violate these rules can exist in the meal plan or grocery list.
3. Respect the user's diet goal. If 'Lose Weight', keep calories controlled and protein high.
4. Use their recently eaten foods as inspiration to ensure they actually like the grocery list.

You must reply with STRICT JSON adhering exactly to the requested schema. No conversational text.`;

    // Define the rigid JSON Schema for the Dual-Engine Output
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        meal_plan: {
          type: Type.ARRAY,
          description: "Exactly 3 days of meal plans.",
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER, description: "Day number (1, 2, or 3)" },
              breakfast: { type: Type.STRING, description: "Detailed breakfast suggestion" },
              lunch: { type: Type.STRING, description: "Detailed lunch suggestion" },
              dinner: { type: Type.STRING, description: "Detailed dinner suggestion" },
              daily_calories: { type: Type.INTEGER, description: "Estimated total daily calories" }
            },
            required: ["day", "breakfast", "lunch", "dinner", "daily_calories"]
          }
        },
        grocery_list: {
            type: Type.OBJECT,
            description: "Categorized shopping list covering all ingredients needed for the 3-day meal plan.",
            properties: {
                produce: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Fresh fruits and vegetables" },
                proteins: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Meats, tofu, dairy, eggs, etc." },
                pantry: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Grains, spices, oils, canned goods" }
            },
            required: ["produce", "proteins", "pantry"]
        }
      },
      required: ["meal_plan", "grocery_list"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        `Here is the user's biological context and past history: ${userContext}\n\nGenerate the 3-Day Meal Plan and Smart Grocery List now in JSON.`
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Slight deterministic variation for freshness week to week
        topK: 10
      }
    });

    const outputText = response.text;
    if (!outputText) throw new Error("Null output from Gemini API");
    
    // Parse the strict JSON directly
    const plannerJSON = JSON.parse(outputText);

    return NextResponse.json({ success: true, data: plannerJSON });

  } catch (error: any) {
    console.error("AI Planner Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
