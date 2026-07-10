import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Bot, User, Upload, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useProfile } from "@/integrations/supabase/hooks/useProfile";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCredits } from "@/hooks/useCredits";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  source?: "ai" | "error";
  taskType?: string;
}

// Helper: convert File to base64 string
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const DashboardChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm the BloodstockAI assistant. I analyse horses using verified data from international sources. How can I assist you today?",
      timestamp: new Date(),
      source: "ai",
      taskType: "Assistant",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPaidPlan } = useCredits();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload only images (JPG, PNG) or PDFs",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 32 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload files under 32MB for chat analysis",
          variant: "destructive",
        });
        return;
      }

      setUploadedFile(file);
      toast({
        title: "File attached",
        description: `${file.name} is ready to send — AI will read the full document`,
      });
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedFile) || isLoading) return;

    if (!isPaidPlan) { setShowUpgrade(true); return; }

    const userMessage: Message = {
      role: "user",
      content: uploadedFile 
        ? `${input || "Analyze this file"} [📎 ${uploadedFile.name}]`
        : input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const body: any = {
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        current_message: input || "Analyze this document and provide your expert assessment.",
      };

      if (uploadedFile) {
        const base64Data = await fileToBase64(uploadedFile);
        body.file_data = base64Data;
        body.file_type = uploadedFile.type;
        body.file_name = uploadedFile.name;
      }

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body,
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || "Sorry, I couldn't process your request.",
        timestamp: new Date(),
        source: "ai",
        taskType: data.taskType || "Analysis",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Response received successfully
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Chat error",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setUploadedFile(null);
    }
  };

  const getSourceBadge = (source?: string, taskType?: string) => {
    if (!source || source === "error") return null;
    if (source === "ai") {
      return (
        <Badge variant="outline" className="text-[10px] border-secondary/30 text-secondary mt-1">
          <Sparkles className="w-3 h-3 mr-1" />
          🧠 {taskType || "Analysis"}
        </Badge>
      );
    }
    return null;
    return null;
  };

  return (
    <>
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
      />

      <Card className="flex flex-col h-[600px] lg:h-[calc(100vh-12rem)]">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">AI Chat Assistant</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Upload documents for AI analysis, or ask questions about bloodstock research
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <ScrollArea ref={scrollRef} className="flex-1 px-6">
            <div className="space-y-4 py-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-secondary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-xs opacity-60">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                      {message.role === "assistant" && getSourceBadge(message.source, message.taskType)}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs text-muted-foreground">
                        {uploadedFile ? "Reading document..." : "Analyzing..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4 bg-background flex-shrink-0">
            {uploadedFile && (
              <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs text-secondary">📎</span>
                  <span className="text-sm truncate">{uploadedFile.name}</span>
                  <span className="text-[10px] text-muted-foreground">→ AI Analysis</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedFile(null)}
                >
                  Remove
                </Button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex-shrink-0 h-10 w-10"
              >
                <Upload className="w-4 h-4" />
              </Button>
              <div className="flex-1 relative min-w-0">
                <textarea
                  placeholder="Ask about horses, or attach a PDF for analysis..."
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = '40px';
                    const newHeight = Math.min(e.target.scrollHeight, 100);
                    e.target.style.height = newHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                      e.currentTarget.style.height = '40px';
                    }
                  }}
                  disabled={isLoading}
                  className="w-full h-10 max-h-[100px] px-3 py-2 pr-11 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={(!input.trim() && !uploadedFile) || isLoading}
                  variant="premium"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
