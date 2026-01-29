import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, ArrowLeft, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { getSupabaseClient, getEnv } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

export default function ResetPasswordPage() {
    const [isLoading, setIsLoading] = React.useState(false);
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [token, setToken] = React.useState<string | null>(null);
    const [tokenType, setTokenType] = React.useState<"session" | "hash" | "query" | null>(null);
    const [passwordChanged, setPasswordChanged] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const navigate = useNavigate();
    const client = getSupabaseClient();
    const isMounted = React.useRef(true);

    // Configurações para fallback manual se o SDK falhar
    const { url, anonKey } = getEnv();
    const supabaseUrl = url.trimmed;
    const supabaseAnonKey = anonKey.trimmed;

    React.useEffect(() => {
        isMounted.current = true;
        const extractToken = async () => {
            const searchParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.substring(1));

            // 1. access_token no hash (Implicit Flow)
            const accessToken = hashParams.get('access_token');
            if (accessToken) {
                console.log("ResetPassword: Fluxo Implícito detectado (#access_token)");
                setTokenType("session");
                // Limpa o hash para evitar re-processamento
                if (window.history.replaceState) {
                    window.history.replaceState(null, "", window.location.pathname + window.location.search);
                }
                return accessToken;
            }

            // 2. token_hash na query (PKCE Flow - Recomendado pelo Supabase)
            const tokenHash = searchParams.get('token_hash');
            if (tokenHash) {
                console.log("ResetPassword: Fluxo PKCE detectado (?token_hash)");
                setTokenType("hash");

                // Verifica se já temos sessão ativa antes de chamar verifyOtp
                const { data: { session: existingSession } } = await client!.auth.getSession();
                if (existingSession) {
                    console.log("ResetPassword: Já existe sessão ativa, pulando verifyOtp");
                } else if (client) {
                    try {
                        const { error } = await client.auth.verifyOtp({
                            token_hash: tokenHash,
                            type: 'recovery'
                        });
                        if (error) console.error("Erro verifyOtp:", error);
                    } catch (e) {
                        console.error("Erro fatal verifyOtp:", e);
                    }
                }

                // Limpa o token da URL para estabilidade
                if (window.history.replaceState) {
                    const params = new URLSearchParams(window.location.search);
                    params.delete('token_hash');
                    params.delete('type');
                    const newQuery = params.toString();
                    window.history.replaceState(null, "", window.location.pathname + (newQuery ? "?" + newQuery : ""));
                }
                return tokenHash;
            }

            // 3. token na query (Manual / Legado)
            const queryToken = searchParams.get('token');
            if (queryToken) {
                console.log("ResetPassword: Fluxo Manual detectado (?token)");
                setTokenType("query");
                return queryToken;
            }

            return null;
        };

        extractToken().then(t => {
            if (isMounted.current) setToken(t);
        });

        return () => { isMounted.current = false; };
    }, [client]);

    const validate = () => {
        if (password.length < 8) {
            toast({ title: "Senha muito curta", description: "A senha deve ter ao menos 8 caracteres.", variant: "destructive" });
            return false;
        }
        if (password !== confirmPassword) {
            toast({ title: "Senhas divergentes", description: "As senhas não conferem.", variant: "destructive" });
            return false;
        }
        return true;
    };

    const handleUpdateManual = async () => {
        const res = await fetch(`${supabaseUrl}/auth/v1/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
                grant_type: 'recovery',
                recovery_token: token,
                password: password,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.error_description || data?.error || "Erro 400: Requisição inválida.");
        }
        return data;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        try {
            // Verifica se já temos uma sessão (seja pelo hash ou verifyOtp)
            const currentSession = (await client?.auth.getSession())?.data.session;

            if (currentSession || tokenType === "session") {
                console.log("ResetPassword: Executando updateUser (Sessão Detectada)");
                const { error } = await client!.auth.updateUser({ password });
                if (error) throw error;

                // Se updateUser funcionou, continuamos logados/com sessão
                // Nenhuma ação extra necessária aqui além do toast e redirect
            } else {
                console.log("ResetPassword: Executando Manual Recovery");
                const data = await handleUpdateManual();

                // Se retornou tokens, vamos setar a sessão explicitamente
                if (data?.access_token && data?.refresh_token) {
                    console.log("ResetPassword: Tokens recebidos, salvando sessão...");
                    const { error } = await client.auth.setSession({
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                    });
                    if (error) console.error("Erro ao salvar sessão:", error);
                }
            }

            if (isMounted.current) {
                setPasswordChanged(true);
                toast({ title: "Senha alterada!", description: "Sua senha foi redefinida com sucesso." });

                // Verifica novamente sessão final para decidir redirect
                const finalSession = (await client?.auth.getSession())?.data.session;

                // User requested explicit redirect to Login
                const nextPath = "/login";

                if (finalSession) {
                    // Safe practice: sign out if we want to force re-login
                    await client.auth.signOut();
                }

                toast({ title: "Senha atualizada", description: "Faça login com sua nova senha.", duration: 5000 });

                setTimeout(() => navigate(nextPath), 1500);
            }
        } catch (error: any) {
            console.error("ResetPassword Final Error:", error);

            // Se o erro for abort, provavelmente é o próprio navigate limpando a cena
            if (error.message === "signal is aborted without reason") {
                navigate("/");
                return;
            }

            toast({
                title: "Falha na redefinição",
                description: error.message || "Erro desconhecido. Verifique o console.",
                variant: "destructive"
            });
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    return (
        <div className="min-h-svh w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950 text-white">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse delay-700" />

            <Card className="w-full max-w-[400px] border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative z-10">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <img src="/university-logo.png" alt="Logo" className="h-16 w-auto object-contain brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-white border-none bg-transparent shadow-none">
                        Redefinir Senha
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Insira sua nova senha abaixo para recuperar o acesso
                    </CardDescription>
                </CardHeader>

                {!token && !passwordChanged ? (
                    <CardContent className="pt-4 pb-8 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-3 rounded-full bg-destructive/10 border border-destructive/20">
                                <ArrowLeft className="size-6 text-destructive" />
                            </div>
                        </div>
                        <p className="text-sm text-slate-300 px-4">
                            Link inválido ou expirado. Por favor, solicite um novo e-mail de recuperação.
                        </p>
                        <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => navigate("/login")}>
                            Voltar ao login
                        </Button>
                    </CardContent>
                ) : passwordChanged ? (
                    <CardContent className="pt-4 pb-8 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <ShieldCheck className="size-6 text-emerald-500" />
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-white">Tudo pronto!</h3>
                        <p className="text-sm text-slate-300 px-4">
                            Sua senha foi atualizada. Você será redirecionado para o dashboard em instantes...
                        </p>
                        <div className="flex justify-center pt-2">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        </div>
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Nova Senha</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="No mínimo 8 caracteres"
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
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showConfirmPassword ? (
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
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                )}
                                Alterar Senha
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-sm text-slate-400 hover:text-white"
                                onClick={() => navigate("/login")}
                            >
                                Cancelar
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    );
}
