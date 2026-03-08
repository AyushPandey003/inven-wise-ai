import { useState, useRef, useEffect } from "react";
import { useInventory } from "@/context/InventoryContext";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Which items need restocking this week?",
  "What's my total inventory value by category?",
  "Suggest optimal reorder quantities for low-stock items",
  "Which products have been stagnant for 30+ days?",
  "Give me a summary of current inventory health",
];

export default function AIAssistant() {
  const { products } = useInventory();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle prefill from alerts
  useEffect(() => {
    const state = location.state as { prefill?: string } | null;
    if (state?.prefill) {
      setInput(state.prefill);
    }
  }, [location.state]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    const userMsg: Message = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are an expert inventory analyst assistant for a warehouse management system. You help with stock analysis, reorder recommendations, demand forecasting, and optimization tips. Be concise and use markdown formatting. Current inventory data:\n${JSON.stringify(products, null, 2)}`,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || "Sorry, I couldn't generate a response.";
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Unable to reach the AI service. This feature requires a backend proxy to the Anthropic API.\n\nTo enable this, you'll need to set up Lovable Cloud with an edge function that proxies requests to Anthropic.\n\n**Error:** ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <h1 className="font-mono text-2xl font-bold text-primary mb-4">AI Assistant</h1>

      {/* Chat area */}
      <Card className="bg-card border-border flex-1 flex flex-col min-h-0">
        <CardContent ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-12 w-12 text-primary mb-4 opacity-50" />
              <p className="text-muted-foreground mb-6">Ask me anything about your inventory</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="shrink-0 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 h-7 w-7 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="shrink-0 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-secondary rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
        </CardContent>

        {/* Input */}
        <div className="border-t border-border p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inventory, reorders, trends..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
