import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, UserPlus, LogIn, Eye, EyeOff } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSignUp, setIsSignUp] = React.useState(false);
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [fullName, setFullName] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const navigate = useNavigate();
    const client = getSupabaseClient();
    const { user, isLoading: authLoading } = useAuth();
    const isMounted = React.useRef(true);

    React.useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Reactive Navigation: if session appears, go to dashboard
    React.useEffect(() => {
        if (user && !authLoading) {
            console.log("LoginPage: Auth detected, navigating to root");
            navigate("/");
        }
    }, [user, authLoading, navigate]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client) {
            toast({ title: "Erro de Configuração", description: "Supabase não configurado.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            if (isSignUp) {
                const { error } = await client.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName
                        }
                    }
                });
                if (error) throw error;
                toast({ title: "Cadastro realizado!", description: "Verifique seu email (se aplicável) ou tente fazer login." });
                setIsSignUp(false);
            } else {
                const { data, error } = await client.auth.signInWithPassword({ email, password });
                if (error) throw error;

                const name = data.user?.user_metadata?.full_name || "";
                const greeting = name ? `Boas-vindas, ${name.split(" ")[0]}!` : "Boas-vindas!";

                toast({ title: greeting, description: "Login realizado com sucesso." });
                navigate("/");
            }
        } catch (error: any) {
            // Ignore AbortError
            if (error.name === 'AbortError' || String(error).includes('abort') || error.message?.includes('abort')) {
                return;
            }

            let msg = error.message;
            if (msg === "Invalid login credentials") {
                msg = "Email ou senha incorretos.";
            } else if (msg === "Email not confirmed") {
                msg = "Email não confirmado. Verifique sua caixa de entrada.";
            }

            toast({ title: "Erro na autenticação", description: msg, variant: "destructive" });
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    return (
        <div className="min-h-svh w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
            {/* Background elements for premium feel */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse delay-700" />

            <Card className="w-full max-w-[400px] border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative z-10 transition-all">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <img src="/university-logo.png" alt="Logo" className="h-16 w-auto object-contain brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-white">
                        {isSignUp ? "Criar conta" : "DashAds ULBRA"}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        {isSignUp ? "Preencha os dados para acessar o sistema" : "Entre com suas credenciais de acesso"}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleAuth}>
                    <CardContent className="space-y-4 pt-4">
                        {isSignUp && (
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-slate-200">Nome Completo</Label>
                                <div className="relative">
                                    <LogIn className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="fullName"
                                        type="text"
                                        placeholder="Seu Nome"
                                        required
                                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-200">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    required
                                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-slate-200">Senha</Label>
                                <Button
                                    variant="link"
                                    className="p-0 h-auto text-xs text-indigo-400 hover:text-indigo-300"
                                    onClick={() => navigate("/reset-password")}
                                    type="button"
                                >
                                    Esqueceu a senha?
                                </Button>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pt-2">
                        <Button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 font-semibold h-11"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : isSignUp ? (
                                <UserPlus className="mr-2 h-4 w-4" />
                            ) : (
                                <LogIn className="mr-2 h-4 w-4" />
                            )}
                            {isSignUp ? "Cadastrar" : "Acessar Dashboard"}
                        </Button>
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                {isSignUp
                                    ? "Já possui uma conta? Faça login"
                                    : "Não tem acesso? Solicite ou cadastre-se"}
                            </button>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
