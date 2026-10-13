"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, X, Send, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface Message {
    id: string;
    role: "user" | "model";
    text: string;
}

const STARTER_PROMPTS = [
    "Which sanctuary offers ocean views?",
    "What are the check-in & cancellation policies?",
    "Explain the Sri Lankan tax cascade on bills",
    "How can I reserve a suite?",
];

/** Official Sky Nest Mountain Glyph Logo */
function MountainGlyph({ className = "" }: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 28 16"
            fill="none"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M1 15 L10 3 L14 8 L18 2 L27 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function SkyNestConcierge() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "model",
            text: "Ayubowan & Welcome to Sky Nest Hotels & Resorts. I am your Virtual Concierge. How may I assist your journey across our Sri Lankan sanctuaries today?",
        },
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of conversation
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen, isLoading]);

    const handleSend = async (textToSend?: string) => {
        const prompt = (textToSend ?? input).trim();
        if (!prompt || isLoading) return;

        const userMessageId = Date.now().toString();
        const newMessages: Message[] = [
            ...messages,
            { id: userMessageId, role: "user", text: prompt },
        ];

        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            // Build history for multi-turn conversational context
            const history = newMessages
                .filter((m) => m.id !== "welcome")
                .slice(-6)
                .map((m) => ({ role: m.role, text: m.text }));

            const res = await apiFetch<{ success: boolean; reply: string }>("/chat", {
                method: "POST",
                body: JSON.stringify({
                    message: prompt,
                    history,
                }),
            });

            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "model",
                    text: res.reply || "It is my pleasure to assist you.",
                },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "model",
                    text: "I apologize, but our concierge desk is momentarily delayed. Please feel free to explore our booking page or try again shortly.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([
            {
                id: "welcome",
                role: "model",
                text: "Conversation refreshed. How may I guide your stay with Sky Nest?",
            },
        ]);
    };

    // Helper to format text with clickable links
    const renderFormattedText = (text: string) => {
        // If the text mentions /book, render it as an interactive link
        if (text.includes("/book")) {
            const parts = text.split("/book");
            return (
                <span>
                    {parts[0]}
                    <Link
                        href="/book"
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-skynest-accent font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
                    >
                        Reservation Portal (/book)
                    </Link>
                    {parts[1]}
                </span>
            );
        }
        return text;
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 select-none">
            {/* ── 1. Floating Trigger Button ───────────────────────────── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    aria-label="Open Sky Nest Virtual Concierge"
                    className="group relative flex items-center gap-3 bg-ink text-white px-5 py-3.5 border border-skynest-hairline/30 shadow-[0_12px_36px_rgba(11,37,64,0.25)] hover:border-skynest-accent hover:shadow-[0_16px_44px_rgba(217,114,44,0.2)] transition-all duration-300 rounded-full"
                >
                    <div className="relative flex items-center justify-center">
                        <MountainGlyph className="w-4 h-auto text-skynest-accent" />
                    </div>
                    <span className="font-jakarta text-[12px] font-medium tracking-[0.15em] uppercase">
                        Virtual Concierge
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5" />
                </button>
            )}

            {/* ── 2. Chat Modal Window ─────────────────────────────────── */}
            {isOpen && (
                <div
                    role="dialog"
                    aria-label="Sky Nest Concierge Chat"
                    className="relative w-[92vw] sm:w-[410px] h-[580px] max-h-[82vh] flex flex-col bg-paper/95 backdrop-blur-2xl border border-skynest-hairline shadow-[0_24px_70px_rgba(11,37,64,0.22)] overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-ink px-5 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-skynest-accent/40 bg-ink/80 flex items-center justify-center shadow-inner">
                                <MountainGlyph className="w-4 h-auto text-skynest-accent" />
                            </div>
                            <div>
                                <h3 className="font-cinzel text-white text-[14px] uppercase tracking-[0.08em] font-medium">
                                    Sky Nest Concierge
                                </h3>
                                <span className="font-jakarta text-[10px] text-skynest-accent/80 tracking-widest uppercase block">
                                    Resort Host · Sanctuary Guide
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleReset}
                                title="Restart conversation"
                                className="p-1.5 text-white/60 hover:text-white transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                title="Close chat"
                                className="p-1.5 text-white/60 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Conversation Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"
                                    }`}
                            >
                                <span className="font-jakarta text-[9px] uppercase tracking-[0.2em] text-ink/35 mb-1 px-1">
                                    {m.role === "user" ? "You" : "Concierge"}
                                </span>
                                <div
                                    className={`px-4 py-3 text-[13px] leading-[1.75] font-jakarta ${m.role === "user"
                                        ? "bg-ink text-white rounded-none max-w-[85%] shadow-sm"
                                        : "bg-white border border-skynest-hairline text-ink rounded-none max-w-[90%] shadow-sm"
                                        }`}
                                >
                                    {renderFormattedText(m.text)}
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isLoading && (
                            <div className="flex flex-col items-start">
                                <span className="font-jakarta text-[9px] uppercase tracking-[0.2em] text-ink/35 mb-1 px-1">
                                    Concierge
                                </span>
                                <div className="bg-white border border-skynest-hairline px-4 py-3 text-[12px] text-ink/50 flex items-center gap-1.5 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-skynest-accent animate-bounce" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-skynest-accent animate-bounce [animation-delay:0.2s]" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-skynest-accent animate-bounce [animation-delay:0.4s]" />
                                    <span className="font-jakarta text-[11px] ml-1.5 text-ink/60 italic">
                                        Composing recommendation...
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Prompt Suggestions */}
                    {messages.length <= 2 && (
                        <div className="px-5 py-2.5 border-t border-skynest-hairline/60 bg-paper/60 shrink-0">
                            <span className="font-jakarta text-[9px] font-bold tracking-[0.2em] uppercase text-ink/40 block mb-2">
                                Suggested Inquiries:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {STARTER_PROMPTS.map((prompt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(prompt)}
                                        className="font-jakarta text-[11px] text-ink/75 hover:text-ink hover:border-skynest-accent bg-white border border-skynest-hairline px-2.5 py-1 text-left transition-colors duration-200"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Bar */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="p-3.5 bg-white border-t border-skynest-hairline flex items-center gap-2 shrink-0"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about sanctuaries, suites, or policies..."
                            className="flex-1 px-3 py-2 text-[13px] font-jakarta text-ink placeholder:text-ink/40 bg-transparent outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            aria-label="Send inquiry"
                            className="p-2.5 bg-ink text-white hover:bg-skynest-accent transition-colors duration-200 disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
