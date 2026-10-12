import { Router, Request, Response } from 'express';
import { conciergeService, ChatMessage } from '../services/concierge.service';

const router = Router();

/**
 * POST /api/v1/chat
 * Public endpoint for guests and users to interact with the AI Concierge.
 */
router.post('/', async (req: Request, res: Response) => {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid message.',
        });
    }

    // Validate history array format if provided
    const safeHistory: ChatMessage[] = Array.isArray(history)
        ? history.filter((h) => (h.role === 'user' || h.role === 'model') && typeof h.text === 'string')
        : [];

    try {
        const reply = await conciergeService.chat(message.trim(), safeHistory);

        return res.json({
            success: true,
            reply,
        });
    } catch (error: any) {
        console.error('[ChatRoutes] Concierge error:', error.message || error);
        return res.status(500).json({
            success: false,
            message: 'The concierge is temporarily indisposed. Please try again in a moment.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});

export default router;
