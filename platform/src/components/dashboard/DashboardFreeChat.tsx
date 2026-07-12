import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { formatAgentText } from "@/lib/formatAgentText";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  taskType?: string;
}

export function DashboardFreeChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ask me anything about July sales, pedigree research, stallion trends, or lot shortlists. Free for all users.",
      timestamp: new Date(),
      taskType: "Assistant",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const data = await invokeEdgeFunction<{ response?: string; taskType?: string }>("ai-chat", {
        requireSession: true,
        body: {
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          current_message: userMessage.content,
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: formatAgentText(data.response || "Sorry, I couldn't process your request."),
          timestamp: new Date(),
          taskType: data.taskType || "Analysis",
        },
      ]);
    } catch {
      toast({
        title: "Chat error",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-[#0F172A] to-[#111827]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
            <p className="text-xs text-white/55">Free for all users · ask about sales, pedigrees & lots</p>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/15">
            Free
          </Badge>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="h-[280px] px-4">
        <div className="space-y-3 py-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-secondary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  message.role === "user"
                    ? "bg-[#0F172A] text-white"
                    : "bg-muted/60 text-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {message.role === "assistant" && message.taskType && (
                  <Badge variant="outline" className="text-[10px] border-secondary/30 text-secondary mt-2">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {message.taskType}
                  </Badge>
                )}
              </div>
              {message.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-secondary/15 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-secondary animate-spin" />
              </div>
              <div className="rounded-2xl px-3.5 py-2.5 bg-muted/60">
                <p className="text-sm text-muted-foreground">Analysing...</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border/50 bg-muted/20">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about Tattersalls July, black-type lots, stallion trends..."
            className="flex-1 h-10 rounded-xl border border-border/60 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="h-10 px-4 bg-[#0F172A] hover:bg-[#111827] text-white shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
