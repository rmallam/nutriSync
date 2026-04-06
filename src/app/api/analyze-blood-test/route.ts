import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY as string });
    
    // Support either a single image/pdf or multiple
    const { imageBase64, files } = await req.json();
    
    let fileArray = files || [];
    if (imageBase64 && fileArray.length === 0) {
      fileArray = [imageBase64];
    }

    if (!fileArray || fileArray.length === 0) {
      return NextResponse.json({ success: false, error: "Missing files" }, { status: 400 });
    }

    // Prepare Base64 payload for each file
    const inlineDataParts = fileArray.map((fileBase64: string) => {
      const base64Str = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      const mimeType = fileBase64.includes(';') ? fileBase64.substring(fileBase64.indexOf(':') + 1, fileBase64.indexOf(';')) : 'image/jpeg';
      return {
        inlineData: {
          data: base64Str,
          mimeType: mimeType
        }
      };
    });

    const systemInstruction = `You are a clinical blood test analyzer AI. 
Analyze the provided blood test report documents, which may span multiple pages or files. 
Identify ANY biomarkers that are listed as Low, High, Out of Range, or Deficient. Ignore normal markers to keep the payload clean unless specified explicitly.

Respond STRICTLY with JSON adhering to the provided schema.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "A brief, 1-2 sentence medical summary of the out-of-range findings." },
        biomarkers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              marker: { type: Type.STRING, description: "Name of the biomarker (e.g., Iron, Vitamin D, Cholesterol)" },
              status: { type: Type.STRING, description: "Status: 'Low', 'High', or 'Deficient'" },
              value: { type: Type.STRING, description: "The actual numeric value read from the chart if available" },
              recommendation: { type: Type.STRING, description: "One-sentence dietary recommendation (e.g., 'Increase intake of leafy greens and red meat.')" }
            },
            required: ["marker", "status", "recommendation"]
          }
        }
      },
      required: ["summary", "biomarkers"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...inlineDataParts,
        { text: "Analyze these lab reports and return the json payload representing all out of range biomarkers." }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      }
    });

    const outputText = response.text;
    if (!outputText) throw new Error("Null output from Gemini API");
    
    const analysisJSON = JSON.parse(outputText);

    return NextResponse.json({ success: true, data: analysisJSON });

  } catch (error: any) {
    console.error("AI Analyzer Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
