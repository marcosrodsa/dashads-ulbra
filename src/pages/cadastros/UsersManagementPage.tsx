import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Shield, ShieldAlert, User, Search } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfile {
    id: string;
    email: string | null;
    full_name: string;
    role: "admin" | "viewer";
    approved: boolean;
    created_at: string;
}

export default function UsersManagementPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = getSupabaseClient();
    const [searchTerm, setSearchTerm] = useState("");

    const { data: users, isLoading } = useQuery({
        queryKey: ["admin-users-list"],
        queryFn: async () => {
            // Fetch profiles. Assuming we have RLS to read all profiles for admin.
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as UserProfile[];
        }
    });

    const mutationToggleApproval = useMutation({
        mutationFn: async ({ id, approved }: { id: string, approved: boolean }) => {
            const { error } = await supabase
                .from("profiles")
                .update({ approved })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
            toast({ title: "Status Atualizado", description: "A permissão do usuário foi alterada com sucesso." });
        },
        onError: (err) => {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        }
    });

    const mutationChangeRole = useMutation({
        mutationFn: async ({ id, role }: { id: string, role: string }) => {
            const { error } = await supabase
                .from("profiles")
                .update({ role })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
            toast({ title: "Função Atualizada", description: "O nível de acesso foi alterado." });
        },
        onError: (err) => {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        }
    });

    const filteredUsers = users?.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
                <p className="text-muted-foreground mt-2">
                    Aprovar novos cadastros e gerenciar níveis de acesso.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Usuários Cadastrados ({filteredUsers.length})</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Buscar usuários..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell>
                                </TableRow>
                            ) : filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`} />
                                                <AvatarFallback>{user.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{user.full_name || "Sem Nome"}</span>
                                                <span className="text-xs text-muted-foreground">{user.email || "Sem Email"}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                            {user.role === "admin" ? "Admin" : "Visualizador"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.approved ? "outline" : "destructive"} className={user.approved ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                            {user.approved ? "Aprovado" : "Pendente"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Prevent actions on Super Admin */}
                                            {user.email === 'marcos.rodsa@gmail.com' ? (
                                                <Badge variant="outline" className="ml-auto border-purple-200 text-purple-700 bg-purple-50">Super Admin</Badge>
                                            ) : (
                                                <>
                                                    {!user.approved ? (
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-500 text-white"
                                                            onClick={() => mutationToggleApproval.mutate({ id: user.id, approved: true })}
                                                        >
                                                            <Check className="mr-1 h-3 w-3" /> Aprovar
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-500 hover:bg-red-50"
                                                            onClick={() => {
                                                                if (confirm("Bloquear acesso deste usuário?"))
                                                                    mutationToggleApproval.mutate({ id: user.id, approved: false })
                                                            }}
                                                        >
                                                            <X className="mr-1 h-3 w-3" /> Bloquear
                                                        </Button>
                                                    )}

                                                    {user.role !== "admin" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                if (confirm("Tornar este usuário Administrador?"))
                                                                    mutationChangeRole.mutate({ id: user.id, role: "admin" })
                                                            }}
                                                        >
                                                            <Shield className="mr-1 h-3 w-3" /> Promover
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                if (confirm("Rebaixar para Visualizador?"))
                                                                    mutationChangeRole.mutate({ id: user.id, role: "viewer" })
                                                            }}
                                                        >
                                                            <User className="mr-1 h-3 w-3" /> Rebaixar
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
