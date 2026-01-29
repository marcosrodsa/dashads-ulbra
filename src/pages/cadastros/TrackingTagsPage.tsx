import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash, Check, X, Code, Tag } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

interface TrackingScript {
    id: string;
    name: string;
    script_location: "HEAD" | "BODY";
    script_code: string;
    is_active: boolean;
    created_at: string;
}

export default function TrackingTagsPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingScript, setEditingScript] = useState<TrackingScript | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const supabase = getSupabaseClient();

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        script_location: "HEAD",
        script_code: "",
        is_active: true
    });

    const { data: scripts, isLoading } = useQuery({
        queryKey: ["admin-tracking-scripts"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tracking_scripts")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as TrackingScript[];
        }
    });

    const mutationList = {
        upsert: useMutation({
            mutationFn: async (data: any) => {
                if (editingScript) {
                    const { error } = await supabase
                        .from("tracking_scripts")
                        .update(data)
                        .eq("id", editingScript.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from("tracking_scripts").insert(data);
                    if (error) throw error;
                }
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["admin-tracking-scripts"] });
                queryClient.invalidateQueries({ queryKey: ["tracking-scripts"] }); // Refresh global cache
                toast({ title: "Sucesso", description: "Script salvo com sucesso." });
                closeDialog();
            },
            onError: (err) => {
                toast({ title: "Erro", description: err.message, variant: "destructive" });
            }
        }),
        delete: useMutation({
            mutationFn: async (id: string) => {
                const { error } = await supabase
                    .from("tracking_scripts")
                    .delete()
                    .eq("id", id);
                if (error) throw error;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["admin-tracking-scripts"] });
                queryClient.invalidateQueries({ queryKey: ["tracking-scripts"] });
                toast({ title: "Script removido", description: "O script foi excluí­do permanentemente." });
            }
        }),
        toggle: useMutation({
            mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
                const { error } = await supabase
                    .from("tracking_scripts")
                    .update({ is_active })
                    .eq("id", id);
                if (error) throw error;
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["admin-tracking-scripts"] });
                queryClient.invalidateQueries({ queryKey: ["tracking-scripts"] });
            }
        })
    };

    const openDialog = (script?: TrackingScript) => {
        if (script) {
            setEditingScript(script);
            setFormData({
                name: script.name,
                script_location: script.script_location as any,
                script_code: script.script_code,
                is_active: script.is_active
            });
        } else {
            setEditingScript(null);
            setFormData({ name: "", script_location: "HEAD", script_code: "", is_active: true });
        }
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingScript(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutationList.upsert.mutate(formData);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gerenciador de Tags & Pixels</h1>
                    <p className="text-muted-foreground mt-2">
                        Configure scripts de rastreamento (GTM, Analytics, Hotjar) globalmente.
                    </p>
                </div>
                <Button onClick={() => openDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Script
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div className="col-span-full text-center py-10">Carregando...</div>
                ) : scripts?.map((script) => (
                    <Card key={script.id} className="relative overflow-hidden transition-all hover:shadow-md">
                        <div className={`absolute top-0 left-0 w-1 h-full ${script.is_active ? "bg-green-500" : "bg-slate-200"}`} />
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-indigo-500" />
                                    {script.name}
                                </CardTitle>
                                <Switch
                                    checked={script.is_active}
                                    onCheckedChange={(c) => mutationList.toggle.mutate({ id: script.id, is_active: c })}
                                />
                            </div>
                            <CardDescription className="flex items-center gap-2 text-xs">
                                <Badge variant="outline">{script.script_location}</Badge>
                                <span className="text-slate-400">Criado em {new Date(script.created_at).toLocaleDateString()}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-slate-950 rounded-md p-3 mb-4 h-24 overflow-hidden relative group">
                                <code className="text-xs text-slate-300 font-mono break-all opacity-70">
                                    {script.script_code.slice(0, 150)}...
                                </code>
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60 pointer-events-none" />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openDialog(script)}>
                                    Editar
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                        if (confirm("Tem certeza que deseja excluir este script?")) {
                                            mutationList.delete.mutate(script.id);
                                        }
                                    }}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {!isLoading && scripts?.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-slate-50/50">
                        <Code className="h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">NNenhum script configurado</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-4">Adicione GTM, Pixel do Facebook ou outros scripts personalizados.</p>
                        <Button variant="outline" onClick={() => openDialog()}>Adicionar Script</Button>
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingScript ? "Editar Script" : "Novo Script de Rastreamento"}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome de Identificação</Label>
                                <Input
                                    placeholder="Ex: Google Tag Manager"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Local de Injeção</Label>
                                <Select
                                    value={formData.script_location}
                                    onValueChange={(v: any) => setFormData({ ...formData, script_location: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="HEAD">HEAD (Cabeçalho)</SelectItem>
                                        <SelectItem value="BODY">BODY (Corpo)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Código do Script</Label>
                            <Textarea
                                placeholder="<script>...</script>"
                                className="font-mono text-xs min-h-[200px]"
                                value={formData.script_code}
                                onChange={(e) => setFormData({ ...formData, script_code: e.target.value })}
                                required
                            />
                            <p className="text-[10px] text-slate-500">
                                Cole o código completo fornecido pela plataforma (incluindo as tags &lt;script&gt;).
                            </p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="active-mode"
                                checked={formData.is_active}
                                onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                            />
                            <Label htmlFor="active-mode">Script Ativo</Label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                            <Button type="submit">Salvar Script</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
