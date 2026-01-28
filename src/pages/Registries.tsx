import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, GraduationCap, MapPin, Trash2, Edit } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const BRAZIL_STATES = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const MODALITIES = [
    { value: "presencial", label: "Presencial" },
    { value: "ead", label: "EAD" },
    { value: "hibrido", label: "Híbrido" },
];

export default function RegistriesPage() {
    const client = getSupabaseClient();
    const queryClient = useQueryClient();

    // --- Queries ---
    const unitsQuery = useQuery({
        queryKey: ["registries", "units"],
        queryFn: async () => {
            const { data, error } = await (client as SupabaseClient)
                .from("units")
                .select("*")
                .order("name");
            if (error) throw error;
            return data;
        },
        enabled: !!client,
    });

    const coursesQuery = useQuery({
        queryKey: ["registries", "courses"],
        queryFn: async () => {
            const { data, error } = await (client as SupabaseClient)
                .from("vw_courses_with_lines") // I'll assume there might be a view or just join below
                .select("*, course_lines(name)")
                .order("name");

            // If the view doesn't exist, fallback to plain courses
            if (error) {
                const { data: plainData, error: plainError } = await (client as SupabaseClient)
                    .from("courses")
                    .select("*")
                    .order("name");
                if (plainError) throw plainError;
                return plainData;
            }
            return data;
        },
        enabled: !!client,
    });

    const courseLinesQuery = useQuery({
        queryKey: ["registries", "course-lines"],
        queryFn: async () => {
            const { data, error } = await (client as SupabaseClient)
                .from("course_lines")
                .select("*")
                .eq("status", "active")
                .order("name");
            if (error) throw error;
            return data;
        },
        enabled: !!client,
    });

    // --- Mutations ---
    const createUnitMutation = useMutation({
        mutationFn: async (vars: any) => {
            const { error } = await (client as SupabaseClient)
                .from("units")
                .insert([{ ...vars, status: "active" }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["registries", "units"] });
            toast({ title: "Unidade cadastrada", description: "A unidade foi salva com sucesso." });
        },
        onError: (e: any) => toast({ title: "Erro ao cadastrar", description: e.message, variant: "destructive" }),
    });

    const updateUnitMutation = useMutation({
        mutationFn: async ({ id, ...vars }: any) => {
            const { error } = await (client as SupabaseClient)
                .from("units")
                .update(vars)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["registries", "units"] });
            toast({ title: "Unidade atualizada", description: "As alterações foram salvas." });
        },
        onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
    });

    const deleteUnitMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (client as SupabaseClient)
                .from("units")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["registries", "units"] });
            toast({ title: "Unidade removida", description: "A unidade foi excluída permanentemente." });
        },
        onError: (e: any) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
    });

    const createCourseMutation = useMutation({
        mutationFn: async (vars: any) => {
            const { error } = await (client as SupabaseClient)
                .from("courses")
                .insert([{ ...vars, status: "active" }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["registries", "courses"] });
            toast({ title: "Curso cadastrado", description: "O curso foi salvo com sucesso." });
        },
        onError: (e: any) => toast({ title: "Erro ao cadastrar", description: e.message, variant: "destructive" }),
    });

    const updateCourseMutation = useMutation({
        mutationFn: async ({ id, ...vars }: any) => {
            const { error } = await (client as SupabaseClient)
                .from("courses")
                .update(vars)
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["registries", "courses"] });
            toast({ title: "Curso atualizado", description: "As alterações foram salvas." });
        },
        onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
    });

    const deleteCourseMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (client as SupabaseClient)
                .from("courses")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["registries", "courses"] });
            toast({ title: "Curso removido", description: "O curso foi excluído permanentemente." });
        },
        onError: (e: any) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
    });

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 p-6 pb-20">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Gestão de Cadastros</h1>
                <p className="text-muted-foreground text-sm">Gerencie unidades e cursos para a correta classificação das campanhas.</p>
            </header>

            <Tabs defaultValue="units" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="units" className="flex items-center gap-2">
                        <Building2 className="size-4" />
                        Unidades
                    </TabsTrigger>
                    <TabsTrigger value="courses" className="flex items-center gap-2">
                        <GraduationCap className="size-4" />
                        Cursos
                    </TabsTrigger>
                </TabsList>

                {/* --- TAB: UNIDADES --- */}
                <TabsContent value="units" className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Unidades Cadastradas</h2>
                        <UnitFormDialog onSubmit={(v: any) => createUnitMutation.mutate(v)} isPending={createUnitMutation.isPending} />
                    </div>

                    <div className="rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Cidade/UF</TableHead>
                                    <TableHead className="w-[120px] text-center">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {unitsQuery.isLoading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : unitsQuery.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            Nenhuma unidade cadastrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    unitsQuery.data?.map((u: any) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">{u.name}</TableCell>
                                            <TableCell className="font-mono text-xs">{u.code}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <MapPin className="size-3 text-muted-foreground" />
                                                    {u.city} - {u.state}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2">
                                                    <UnitFormDialog
                                                        unit={u}
                                                        onSubmit={(v: any) => updateUnitMutation.mutate({ id: u.id, ...v })}
                                                        isPending={updateUnitMutation.isPending}
                                                    />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Remover unidade?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Tem certeza que deseja excluir a unidade <strong>{u.name}</strong>?
                                                                    Esta ação é permanente e pode afetar o histórico de campanhas vinculadas.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    onClick={() => deleteUnitMutation.mutate(u.id)}
                                                                >
                                                                    Sim, Excluir
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* --- TAB: CURSOS --- */}
                <TabsContent value="courses" className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Cursos Cadastrados</h2>
                        <CourseFormDialog
                            courseLines={courseLinesQuery.data || []}
                            onSubmit={(v: any) => createCourseMutation.mutate(v)}
                            isPending={createCourseMutation.isPending}
                        />
                    </div>

                    <div className="rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Linha</TableHead>
                                    <TableHead>Modalidade</TableHead>
                                    <TableHead className="w-[120px] text-center">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {coursesQuery.isLoading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-[250px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : coursesQuery.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                            Nenhum curso cadastrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    coursesQuery.data?.map((c: any) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] uppercase">
                                                    {c.course_lines?.name || "Sem Linha"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize">
                                                    {c.modality}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2">
                                                    <CourseFormDialog
                                                        course={c}
                                                        courseLines={courseLinesQuery.data || []}
                                                        onSubmit={(v: any) => updateCourseMutation.mutate({ id: c.id, ...v })}
                                                        isPending={updateCourseMutation.isPending}
                                                    />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Remover curso?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Tem certeza que deseja excluir o curso <strong>{c.name}</strong>?
                                                                    Esta ação é permanente e pode afetar o histórico de campanhas vinculadas.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    onClick={() => deleteCourseMutation.mutate(c.id)}
                                                                >
                                                                    Sim, Excluir
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- Modals ---

function UnitFormDialog({ unit, onSubmit, isPending }: { unit?: any, onSubmit: (v: any) => void, isPending: boolean }) {
    const [open, setOpen] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: unit?.name || "",
        code: unit?.code || "",
        city: unit?.city || "",
        state: unit?.state || ""
    });

    const isEdit = !!unit;

    // Reset form when opening/editing
    React.useEffect(() => {
        if (open) {
            setFormData({
                name: unit?.name || "",
                code: unit?.code || "",
                city: unit?.city || "",
                state: unit?.state || ""
            });
        }
    }, [open, unit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isEdit ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="size-4" />
                    </Button>
                ) : (
                    <Button className="flex items-center gap-2">
                        <Plus className="size-4" />
                        Nova Unidade
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? "Editar Unidade" : "Cadastrar Unidade"}</DialogTitle>
                        <DialogDescription>
                            {isEdit ? `Editando informações de ${unit.name}` : "Adicione uma nova unidade organizacional ao sistema."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 text-sm">
                        <div className="grid gap-1.5">
                            <Label htmlFor="name">Nome da Unidade</Label>
                            <Input id="name" placeholder="Ex: Ulbra Canoas" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="code">Código (Slug)</Label>
                            <Input id="code" placeholder="Ex: canoas-rs" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="city">Cidade</Label>
                                <Input id="city" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="state">UF</Label>
                                <Select value={formData.state} onValueChange={v => setFormData({ ...formData, state: v })}>
                                    <SelectTrigger id="state">
                                        <SelectValue placeholder="UF" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BRAZIL_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isPending}>{isEdit ? "Salvar Alterações" : "Salvar Unidade"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function CourseFormDialog({ course, courseLines, onSubmit, isPending }: { course?: any, courseLines: any[], onSubmit: (v: any) => void, isPending: boolean }) {
    const [open, setOpen] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: course?.name || "",
        modality: course?.modality || "presencial",
        course_line_id: course?.course_line_id || ""
    });

    const isEdit = !!course;

    // Reset form when opening/editing
    React.useEffect(() => {
        if (open) {
            setFormData({
                name: course?.name || "",
                modality: course?.modality || "presencial",
                course_line_id: course?.course_line_id || ""
            });
        }
    }, [open, course]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isEdit ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="size-4" />
                    </Button>
                ) : (
                    <Button className="flex items-center gap-2">
                        <Plus className="size-4" />
                        Novo Curso
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? "Editar Curso" : "Cadastrar Curso"}</DialogTitle>
                        <DialogDescription>
                            {isEdit ? `Editando informações de ${course.name}` : "Adicione um novo curso ao catálogo."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 text-sm">
                        <div className="grid gap-1.5">
                            <Label htmlFor="c-name">Nome do Curso</Label>
                            <Input id="c-name" placeholder="Ex: Biomedicina" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="line">Linha do Curso</Label>
                            <Select value={formData.course_line_id} onValueChange={v => setFormData({ ...formData, course_line_id: v })}>
                                <SelectTrigger id="line">
                                    <SelectValue placeholder="Selecione a linha (EAD, Branding...)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courseLines.map(line => (
                                        <SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="modality">Modalidade</Label>
                            <Select value={formData.modality} onValueChange={v => setFormData({ ...formData, modality: v })}>
                                <SelectTrigger id="modality">
                                    <SelectValue placeholder="Selecione a modalidade" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MODALITIES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isPending || !formData.course_line_id}>{isEdit ? "Salvar Alterações" : "Salvar Curso"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
