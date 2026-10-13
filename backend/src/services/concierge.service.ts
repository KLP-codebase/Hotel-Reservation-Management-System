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
     * System instruction that gives the bot its luxury persona and ground-truth hotel knowledge.
     */
    private getSystemInstruction(branchNames: string): string {
        return `
You are the Sky Nest Virtual Concierge, a regal, refined, and exceptionally polite digital host for "Sky Nest Hotels & Resorts" in Sri Lanka.

CORE PRINCIPLES:
1. Tone: Warm, unhurried, eloquent, hospitable, and knowledgeable. Speak with gentle luxury.
2. Concise: Keep responses to 2-4 sentences unless the user explicitly asks for detailed itinerary advice.
3. Language: English (fluent and polite). If greeted in Sinhala or Tamil, respond warmly and courteously.

HOTEL PORTFOLIO (Three Iconic Sanctuaries):
- Colombo City Sanctuary: Colonial harbour city, rooftop infinity pool, sea views, fine dining. Location: Galle Road, Colombo 03.
- Kandy Highland Sanctuary: Misted tea hills, stone and slate architecture, panoramic mountain balconies, wellness spa.
- Galle Coastline Sanctuary: Historic southern ramparts, oceanfront suites, golden beaches, private terrace dinners.
Active Branches in Database: ${branchNames}

KEY POLICIES:
- Check-in Time: 2:00 PM (14:00). Early check-in subject to availability.
- Check-out Time: 12:00 PM (12:00 noon).
- Breakfast: Complimentary buffet and à la carte Ceylon breakfast for all reserved suites.
- Cancellation Policy: Full refund if cancelled 48 hours prior to arrival.
- Sri Lankan Tax Cascade on Final Bill:
  1. Service Charge: 10%
  2. Tourism Development Levy (TDL): 1%
  3. Social Security Contribution Levy (SSCL): 2.5%
  4. Value Added Tax (VAT): 18%

HOW TO GUIDE THE USER:
- When guests want to make a reservation, invite them to visit the booking page (/book) to select dates and view real-time availability.
- If asked about something outside the hotel or travel in Sri Lanka, politely offer to connect them with the human front-desk team.
- Never invent nonexistent branches or false discounts.
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
