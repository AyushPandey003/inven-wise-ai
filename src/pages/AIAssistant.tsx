import { useState, useRef, useEffect } from "react";
import { useInventory } from "@/context/InventoryContext";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, Loader2, Sparkles, RotateCcw, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  { label: "🔍 Restock Check", text: "Which items need restocking this week?" },
  { label: "📊 Value by Category", text: "What's my total inventory value by category?" },
  { label: "📦 Reorder Quantities", text: "Suggest optimal reorder quantities for low-stock items" },
  { label: "⚠️ Stagnant Products", text: "Which products have been stagnant for 30+ days?" },
  { label: "📈 Health Summary", text: "Give me a summary of current inventory health" },
  { label: "💡 Optimization Tips", text: "What optimization tips can you suggest for my inventory?" },
];

export default function AIAssistant() {
  const { products } = useInventory();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = location.state as { prefill?: string } | null;
    if (state?.prefill) setInput(state.prefill);
  }, [location.state]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    const userMsg: Message = { role: "user", content: content.trim(), timestamp: new Date() };
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
          system: `You are an expert inventory analyst assistant for a warehouse management system. You help with stock analysis, reorder recommendations, demand forecasting, and optimization tips. Be concise and use markdown formatting including tables when appropriate. Current inventory data:\n${JSON.stringify(products, null, 2)}`,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const text = data.content?.[0]?.text || "Sorry, I couldn't generate a response.";
      setMessages((prev) => [...prev, { role: "assistant", content: text, timestamp: new Date() }]);
    catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Unable to reach the AI service. This feature requires a backend proxy to the Anthropic API.\n\n**Error:** ${err.message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Conversation cleared");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-bold text-primary">AI Assistant</h1>
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
            <Sparkles className="h-3 w-3 mr-1" />
            Powered by Claude
          </Badge>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs text-muted-foreground">
            <RotateCcw className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Card className="bg-card border-border flex-1 flex flex-col min-h-0">
        <CardContent ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 rounded-2xl bg-primary/10 mb-4">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h2 className="font-mono text-lg font-bold mb-1">Inventory Intelligence</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Ask about stock levels, reorder suggestions, demand forecasting, and optimization strategies.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => sendMessage(s.text)}
                    className="text-left p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary hover:border-primary/30 transition-all text-xs group"
                  >
                    <span className="block text-[11px] font-medium mb-0.5 group-hover:text-primary transition-colors">{s.label}</span>
                    <span className="text-muted-foreground line-clamp-2">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              {msg.role === "assistant" && (
                <div className="shrink-0 h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm relative group ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary rounded-bl-sm"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_table]:text-xs [&_th]:px-2 [&_td]:px-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
                {msg.role === "assistant" && (
                  <button
                    onClick={() => copyMessage(msg.content, i)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background/20"
                  >
                    {copiedIdx === i ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                  </button>
                )}
                <p className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 h-8 w-8 rounded-xl bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 animate-in fade-in duration-300">
              <div className="shrink-0 h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-secondary rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Analyzing inventory...</span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Quick suggestions when chatting */}
        {messages.length > 0 && !loading && (
          <div className="border-t border-border px-3 py-2 flex gap-1.5 overflow-x-auto">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <Button key={s.text} variant="outline" size="sm" className="text-[10px] shrink-0 h-6" onClick={() => sendMessage(s.text)}>
                {s.label}
              </Button>
            ))}
          </div>
        )}

        <div className="border-t border-border p-3">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inventory, reorders, trends..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
