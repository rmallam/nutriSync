import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY as string });
    const { imageBase64, bloodTests, profile } = await req.json();

    if (!imageBase64) return NextResponse.json({ success: false, error: "Missing menu image" }, { status: 400 });

    const base64Str = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const mimeType = imageBase64.includes(';') ? imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';')) : 'image/jpeg';

    const latestTest = (bloodTests && bloodTests.length > 0) ? bloodTests[0] : null;
    const abnormalMarkers = latestTest?.biomarkers?.filter((b:any) => b.status.toLowerCase() !== 'normal') || [];
    const deficiencyString = abnormalMarkers.length > 0 
      ? abnormalMarkers.map((b: any) => `${b.marker} (${b.status})`).join(', ') 
      : 'None known';
    
    const dietaryRestrictions = profile?.dietary_restrictions || 'None';

    const systemInstruction = `You are a strict, highly analytical dietician.
You are given a photo of a restaurant menu.
Context:
- User Dietary Restrictions: ${dietaryRestrictions}
- User Blood Test Deficiencies: ${deficiencyString}

Analyze the menu items. Cross-reference them against the user's deficiencies and restrictions.
Pick the 3 best, healthiest items on the menu that specifically address their deficiencies or goals.
Return strict JSON.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dishName: { type: Type.STRING },
              whyToOrder: { type: Type.STRING, description: "Explains how it fits their blood profile or restrictions. Very concise." },
              healthScore: { type: Type.INTEGER, description: "Score out of 10" }
            },
            required: ["dishName", "whyToOrder", "healthScore"]
          }
        }
      },
      required: ["recommendations"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { inlineData: { data: base64Str, mimeType } },
        { text: "Analyze this menu." }
      ],
      config: { systemInstruction, responseMimeType: "application/json", responseSchema, temperature: 0.1 }
    });

    const outputText = response.text;
    if (!outputText) throw new Error("Null output from Gemini API");
    return NextResponse.json({ success: true, data: JSON.parse(outputText) });
  } catch (error: any) {
    console.error("AI Menu Analyzer Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
