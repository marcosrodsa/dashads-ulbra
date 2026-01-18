import React, { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Informe um email válido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;

type Mode = "login" | "signup";

export default function AuthPage() {
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!initializing && user) navigate("/");
  }, [initializing, user, navigate]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        toast({ title: "Login realizado", description: "Bem-vindo!" });
        navigate("/");
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast({
          title: "Conta criada",
          description: "Se a confirmação estiver habilitada, verifique seu email.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Não foi possível autenticar",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{mode === "login" ? "Entrar" : "Criar conta"}</CardTitle>
            <CardDescription>
              {mode === "login" ? "Acesse seu painel com email e senha." : "Crie uma conta para acessar o painel."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full">
                {mode === "login" ? "Entrar" : "Cadastrar"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
                >
                  {mode === "login" ? "Cadastre-se" : "Entrar"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
