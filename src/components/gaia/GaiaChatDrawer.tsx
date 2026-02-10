import { format } from "date-fns";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Send, Loader2, MessageCircle, Trash2, Lightbulb } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFilters } from "@/contexts/filters-context";

const supabase = getSupabaseClient();

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
}

export function GaiaChatDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { filters } = useFilters();
    const { businessUnit, course, dateRange, hideBranding, excludeEad } = filters;

    // Sugestões de perguntas rápidas
    // Sugestões de perguntas estratégicas
    const quickQuestions = [
        "Como está a performance dos últimos 7 dias?",
        "Qual a previsão de tendências para a próxima semana?",
        "Quais criativos estão performando acima da média?",
        "Existe alguma anomalia de custo ou conversão hoje?",
        "Como está o consumo do orçamento desta semana?",
        "Qual o melhor dia e horário para conversões?",
        "Onde devo investir mais para reduzir o CPL?"
    ];

    // Scroll para última mensagem
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Reset ao fechar
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            // Mantém histórico da sessão
        }
    };

    const sendMessage = async (messageText?: string) => {
        const text = messageText || input.trim();
        if (!text || isLoading) return;

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            createdAt: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // --- DEBUG: FRONTEND REQUEST ---
            const session = await supabase.auth.getSession();
            console.log("--- DEBUG: SENDING REQUEST ---");
            console.log("Target Supabase URL:", (supabase as any)['supabaseUrl'] || "Unknown");
            console.log("Active Session Token:", session.data.session?.access_token
                ? `Present (starts with ${session.data.session.access_token.substring(0, 10)}...)`
                : "MISSING (Anon?)");
            // -------------------------------

            const { data, error } = await supabase.functions.invoke("gaia-chat", {
                body: {
                    sessionId,
                    message: text,
                    context: {
                        dateRange: dateRange?.from && dateRange?.to ? {
                            start: format(dateRange.from, "yyyy-MM-dd"),
                            end: format(dateRange.to, "yyyy-MM-dd")
                        } : undefined,
                        unidade: businessUnit,
                        curso: course,
                        hideBranding,
                        excludeEad
                    }
                }
            });

            if (error) throw error;

            if (data.sessionId && !sessionId) {
                setSessionId(data.sessionId);
            }

            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: data.message,
                createdAt: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);

        } catch (error) {
            console.error("Chat error:", error);
            toast({
                title: "Erro ao enviar mensagem",
                description: "Não foi possível processar sua pergunta. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
        setSessionId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Debug helper
    const stateDebugInfo = () => {
        if (process.env.NODE_ENV === 'development') {
            return (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-xs text-gray-300"
                    onClick={async () => {
                        const { data } = await supabase.auth.getSession();
                        console.log("--- DEBUG INFO ---");
                        console.log("Supabase URL:", (supabase as any).supabaseUrl);
                        console.log("Session User:", data.session?.user?.id || "No User");
                        console.log("Session Token (First 10):", data.session?.access_token?.substring(0, 10));
                        console.log("Headers will likely use:", data.session?.access_token ? "User Token" : "Anon Key");
                        console.log("------------------");
                        toast({ title: "Debug", description: "Verifique o console (F12)" });
                    }}
                >
                    ?
                </Button>
            );
        }
        return null;
    };

    return (
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-200 hover:border-purple-400 dark:border-purple-800"
                >
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="hidden sm:inline">Gaia</span>
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[440px] flex flex-col p-0">
                {/* Header */}
                <SheetHeader className="p-4 border-b bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                                <Sparkles className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <SheetTitle className="text-lg">Gaia</SheetTitle>
                                <SheetDescription className="sr-only">
                                    Assistente de inteligência artificial para análise de dados de mídia.
                                </SheetDescription>
                                <p className="text-xs text-muted-foreground">Especialista em análise de mídia</p>
                            </div>
                        </div>
                        {stateDebugInfo()}
                        {messages.length > 0 && (
                            <Button variant="ghost" size="icon" onClick={clearChat} title="Limpar conversa">
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                    {messages.length === 0 ? (
                        <div className="space-y-4">
                            <div className="text-center py-8">
                                <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                                    <MessageCircle className="h-6 w-6 text-purple-500" />
                                </div>
                                <h3 className="font-semibold mb-1">Olá! Sou a Gaia 👋</h3>
                                <p className="text-sm text-muted-foreground">
                                    Posso analisar seus dados de mídia e responder suas dúvidas.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">Perguntas sugeridas:</p>
                                {quickQuestions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(q)}
                                        className="w-full text-left text-sm p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === "user"
                                            ? "bg-purple-500 text-white rounded-br-md"
                                            : "bg-muted rounded-bl-md"
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                                            <span className="text-sm text-muted-foreground">Analisando...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t bg-background">
                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" title="Sugestões de Perguntas">
                                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-2" align="start" side="top">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">O que você gostaria de saber?</p>
                                    {quickQuestions.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(q)}
                                            className="w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Faça uma pergunta..."
                            disabled={isLoading}
                            className="flex-1"
                        />
                        <Button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className="bg-purple-500 hover:bg-purple-600"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        Gaia analisa dados dos últimos 30 dias por padrão
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
