import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { meals } = await req.json();

    if (!meals || meals.length === 0) {
      return NextResponse.json({ groceryList: "You haven't logged any meals yet! Scan some food before generating a tailored grocery list." });
    }

    // Pass the last 30 meals to Gemini to find patterns
    const mealContext = meals.slice(0, 30).map((m: any) => {
      const parts = m.items?.map((i: any) => i.label).join(', ');
      return `${m.name} (${parts})`;
    }).join(' | ');

    const prompt = `You are a world-class Clinical Nutritionist and Dietitian.
The user has been eating the following meals over the last week:
${mealContext}

Analyze their dietary patterns. Your task is to generate a highly pragmatic, organized Weekly Grocery Shopping List designed to allow the user to easily recreate their favorite meals, while proactively substituting in healthier, high-fiber, and micronutrient-dense alternatives.

Format the response strictly as valid Markdown with the following categories as H3 headers (###):
- 🥬 Produce
- 🥩 Proteins & Fish
- 🥛 Dairy & Alternatives
- 🌾 Pantry & Complex Carbs

Use markdown checkboxes (- [ ]) for each item. Next to each item, add a very brief (2-5 word) italicized reason why you added it (e.g. "*For the avocado toast*"). 
Keep the list highly pragmatic, skipping basic commodities like salt/water. Maximum 20 total items. Start the message with a single supportive 1-sentence remark.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ groceryList: response.text });
  } catch (error: any) {
    console.error('Error generating grocery list:', error);
    return NextResponse.json({ groceryList: "Failed to generate grocery list. Please verify your GEMINI_API_KEY." });
  }
}
