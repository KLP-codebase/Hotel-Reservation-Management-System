import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { db } from '../config/db';
import { BranchRepository } from '../repositories/branch.repository';

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export class ConciergeService {
    private ai: GoogleGenAI | null = null;
    private branchRepo: BranchRepository;

    constructor() {
        this.branchRepo = new BranchRepository(db);

        if (env.GEMINI_API_KEY) {
            this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        }
    }

    /**
  * System instruction that gives the bot its natural Sri Lankan hospitality persona.
  */
    private getSystemInstruction(branchNames: string): string {
        return `
You are the Sky Nest Concierge, a warm, helpful, and polite digital host for "Sky Nest Hotels & Resorts" in Sri Lanka.

CORE PRINCIPLES:
1. Tone: Friendly, natural, authentic Sri Lankan hospitality. Speak politely and conversationally — avoid sounding stiff, theatrical, or overly complicated.
2. Natural Greetings: When a guest says "hi", "hello", "hey", or any simple greeting, respond naturally and briefly.
   - Always begin with: "Ayubowan! Welcome to Sky Nest..."
   - Follow with a simple, friendly question: "How can I help you today?" or "How may I assist with your stay today?"
   - Do NOT give long speeches or list all hotel locations unless the guest asks.
3. Concise: Keep answers natural, direct, and easy to read (1 to 2 sentences for simple questions).
4. Language: English. If greeted in Sinhala or Tamil, respond warmly and courteously.

HOTEL PORTFOLIO (Three Sanctuaries):
- Colombo City Sanctuary: Coastal city luxury, rooftop pool, ocean views (Galle Road, Colombo 03).
- Kandy Highland Sanctuary: Misted tea hills, slate architecture, wellness spa.
- Galle Coastline Sanctuary: Historic fortress coast, oceanfront suites, golden sands.
Active Branches: ${branchNames}

KEY POLICIES:
- Check-in: 2:00 PM | Check-out: 12:00 PM
- Breakfast: Complimentary Ceylon breakfast included with all suites.
- Cancellation: Full refund if cancelled 48 hours before check-in.
- Sri Lankan Tax Cascade on Final Bill: Service Charge (10%) → TDL (1%) → SSCL (2.5%) → VAT (18%).

HOW TO GUIDE THE USER:
- When guests want to book a room, invite them to visit the booking page (/book) to check dates and live rates.
- Be helpful, conversational, and direct.
`;
    }


    /**
     * Send a message to Gemini with conversation history.
     */
    async chat(userMessage: string, history: ChatMessage[] = []): Promise<string> {
        if (!this.ai) {
            throw new Error('Gemini API key is not configured on the server.');
        }

        // 1. Fetch live active branches from the database for ground truth
        let branchNames = 'Colombo, Kandy, Galle';
        try {
            const branches = await this.branchRepo.findAll();
            if (branches.length > 0) {
                branchNames = branches.map((b) => `${b.branch_name} (${b.city})`).join(', ');
            }
        } catch (err) {
            // Fallback gracefully if database is cold-starting
            console.warn('[ConciergeService] Using default branch names fallback:', err);
        }

        // 2. Format history into Gemini's multi-turn message format
        const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

        // Keep the last 8 messages to prevent context window bloat
        const recentHistory = history.slice(-8);
        for (const msg of recentHistory) {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }],
            });
        }

        // Append current user message
        contents.push({
            role: 'user',
            parts: [{ text: userMessage }],
        });

        // 3. Candidate model cascade (tries active models with fallback resilience)
        const candidateModels = [
            'gemini-3.5-flash',
            'gemini-3.1-flash-lite',
            'gemini-3.7-flash',
            'gemini-3.8-flash',
        ];

        let lastError: any = null;

        for (const modelName of candidateModels) {
            try {
                const response = await this.ai.models.generateContent({
                    model: modelName,
                    contents,
                    config: {
                        systemInstruction: this.getSystemInstruction(branchNames),
                        temperature: 0.7,
                    },
                });

                if (response.text) {
                    return response.text;
                }
            } catch (err: any) {
                lastError = err;
                console.warn(`[ConciergeService] Model ${modelName} failed, trying next fallback:`, err?.status || err?.message);
                // If quota exhausted (429) or temporary server spike (503), continue to next model in list
                continue;
            }
        }

        // If all models failed, throw the last error
        throw lastError;

    }
}

export const conciergeService = new ConciergeService();
