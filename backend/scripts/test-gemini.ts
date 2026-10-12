import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

// Load backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function main() {
  console.log('🔍 Checking GEMINI_API_KEY...');

  if (!apiKey || apiKey === 'Gemini_api_key_here' || apiKey === 'your_gemini_api_key_here') {
    console.error('❌ Error: GEMINI_API_KEY is missing in backend/.env!');
    process.exit(1);
  }

  console.log('🔑 Key detected! Connecting to Google Gemini API...');

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Give a 1-sentence welcome greeting as the luxury Sky Nest Hotel concierge.',
    });

    console.log('\n===========================================');
    console.log("🎉 SUCCESS! Gemini API ('gemini-3.8-flash') responded:");
    console.log('===========================================');
    console.log(response.text);
    console.log('===========================================\n');
  } catch (error: any) {
    console.error('\n❌ Gemini API Request Failed:', error.message || error);
  }
}

main();
