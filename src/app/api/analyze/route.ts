import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the SDK. It automatically picks up GEMINI_API_KEY from environment variables.
const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType, textInput } = await req.json();

    if (!imageBase64 && !textInput) {
      return NextResponse.json({ error: 'No image or text provided' }, { status: 400 });
    }

    const instructions = `Analyze this ${imageBase64 ? 'image' : 'text description'} of a meal. Identify the distinct food items on the plate, and also provide an overall name for the meal.

CRITICAL EXPERTISE REQUIRED: You MUST act as an expert in global cuisines.
- STRICT USDA AVERAGES: Provide standard, extremely consistent calorie estimates based ONLY on median USDA nutritional database averages. 
- ZERO VARIANCE: If the exact same items are scanned again, you MUST mathematically return identical macros. Do not guess or hallucinate different weights. Assume standard single-serving restaurant portions.
When analyzing Indian dishes:
- Accurately differentiate between lentil types (e.g., moong dal vs. toor dal vs. masoor dal).
- Estimate hidden calories from cooking techniques like 'tadka' (tempering) or the heavy use of ghee/oil in curries.
- Recognize regional breads (roti, naan, paratha, dosa) and their typical fat contents.
- Account for complex gravies, identifying if they are nut-based (cashew/makhani) vs. onion-tomato based.

Provide the output STRICTLY as a JSON object, with no markdown formatting or backticks around it.
The JSON object must have the following structure:
{
  "meal_name": "A descriptive, overall name for the entire dish or plate (e.g., 'South Indian Thali', 'Avocado Toast with Eggs', 'Paneer Butter Masala')",
  "items": [
    {
      "box_2d": [ymin, xmin, ymax, xmax], // Array of 4 integers between 0 and 1000 representing the bounding box. If text input, just return [0,0,0,0].
      "label": "Name of the food item (e.g., Paneer Butter Masala, Masala Dosa)",
      "calories": 250, // Number, estimated calories
      "protein_g": 20, // Number, estimated protein in grams
      "fat_g": 10, // Number, estimated fat in grams
      "carbs_g": 5, // Number, estimated carbohydrates in grams
      "fiber_g": 3, // Number, estimated dietary fiber in grams
      "sugar_g": 2, // Number, estimated sugar in grams
      "sodium_mg": 400, // Number, estimated sodium in milligrams
      "iron_mg": 1, // Number, estimated iron in milligrams
      "health_score": 8, // Number between 1-10 rating nutritional density
      "is_healthy": true, // Boolean, true if health_score is >= 6.
      "clarification_needed": boolean, // true if there are likely hidden ingredients (like oils, ghee, dressings) that impact calories.
      "clarification_question": "String asking the user to clarify the hidden ingredient - null if clarification_needed is false.",
      "clarification_options": ["Option 1", "Option 2"] // Array of up to 3 likely strings for the user to choose from - null if not needed.
    }
  ]
}`;

    let contents: any[] = [];
    if (imageBase64) {
      contents = [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType || 'image/jpeg',
              }
            },
            { text: instructions }
          ]
        }
      ];
    } else {
      contents = [
        {
          role: 'user',
          parts: [
            { text: `Meal described as: "${textInput}"\n\n` + instructions }
          ]
        }
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.0,
        topK: 1,
      }
    });

    const textOutput = response.text || "";
    console.log("Gemini Output:", textOutput);

    // Clean any potential markdown wrapper if model ignores responseMimeType
    let cleanJsonStr = textOutput || "{}";
    cleanJsonStr = cleanJsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.error("Failed to parse JSON:", cleanJsonStr);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Default structural fallback
    if (!parsedData.items && Array.isArray(parsedData)) {
       parsedData = { meal_name: "Unnamed Meal", items: parsedData };
    }

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Error analyzing meal:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
