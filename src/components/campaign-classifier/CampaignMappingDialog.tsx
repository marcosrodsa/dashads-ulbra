import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Loader2, Check, ChevronsUpDown, PlusCircle } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { toast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { getSupabaseClient } from "@/integrations/supabase/client";
import type { AggregatedCampaign, Unit, Course, CourseLine } from "@/integrations/supabase/campaignMappingSchema";

import { cn } from "@/lib/utils";

interface CampaignMappingDialogProps {
    campaign: AggregatedCampaign | null;
    bulkCampaigns?: AggregatedCampaign[];
    isBulkMode?: boolean;
    units: Unit[];
    courses: Course[];
    courseLines: CourseLine[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CampaignMappingDialog({
    campaign,
    bulkCampaigns = [],
    isBulkMode = false,
    units,
    courses,
    courseLines,
    open,
    onOpenChange,
    onSuccess,
}: CampaignMappingDialogProps) {
    const queryClient = useQueryClient();
    const client = getSupabaseClient();

    // Form state
    // 'no-change' is valid only in bulk mode to indicate partial update
    // 'null' is used to explicitly set a value to null (e.g., "Nenhuma / Geral")
    const [selectedUnit, setSelectedUnit] = React.useState<string>("no-change");
    const [selectedCourse, setSelectedCourse] = React.useState<string>("no-change");
    const [isIgnored, setIsIgnored] = React.useState(false);
    const [observation, setObservation] = React.useState("");

    // Quick Add Course state
    const [courseSearch, setCourseSearch] = React.useState("");
    const [isCoursePopoverOpen, setIsCoursePopoverOpen] = React.useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = React.useState(false);
    const [quickAddModality, setQuickAddModality] = React.useState("presencial");
    const [quickAddLineId, setQuickAddLineId] = React.useState("");

    // Sync state when open changes
    React.useEffect(() => {
        if (open) {
            if (isBulkMode) {
                // Bulk mode defaults: indicate no change for unit/course, clear observation
                setSelectedUnit("no-change");
                setSelectedCourse("no-change");
                setIsIgnored(false);
                setObservation(""); // Bulk mode starts empty
            } else if (campaign) {
                // Single mode: load campaign values
                setSelectedUnit(campaign.unit_id || "null"); // Use "null" for actual null values
                setSelectedCourse(campaign.course_id || "null"); // Use "null" for actual null values
                setIsIgnored(campaign.is_ignored ?? false);
                setObservation(campaign.observation || ""); // Load existing observation
            }
        }
    }, [open, isBulkMode, campaign]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (!client) throw new Error("Sem conexão");

            const targets = isBulkMode ? bulkCampaigns : (campaign ? [campaign] : []);
            if (targets.length === 0) throw new Error("Nenhuma campanha selecionada");

            const updates = targets.map((target) => {
                // Merge logic:
                // If IS BULK and value is 'no-change', use existing value from target.
                // If value is 'null', explicitly set to null.
                // Otherwise use the new form value.
                const finalUnitId = (isBulkMode && selectedUnit === "no-change")
                    ? target.unit_id
                    : (selectedUnit === "null" ? null : selectedUnit);

                const finalCourseId = (isBulkMode && selectedCourse === "no-change")
                    ? target.course_id
                    : (selectedCourse === "null" ? null : selectedCourse);

                // For bulk mode, observation is applied to all if provided, otherwise it's kept as is.
                // For single mode, observation is always updated.
                const finalObservation = isBulkMode && observation === ""
                    ? target.observation
                    : observation;

                return {
                    platform: target.platform,
                    campaign_id: target.campaign_id,
                    campaign_name: target.campaign_name,
                    unit_id: finalUnitId,
                    course_id: finalCourseId,
                    is_ignored: isIgnored, // For now, ignore flag is applied to all in bulk
                    observation: finalObservation,
                    updated_at: new Date().toISOString(),
                };
            });

            const { error } = await (client as SupabaseClient)
                .from("dim_campaign_mapping")
                .upsert(updates, { onConflict: "platform,campaign_id" });

            if (error) throw error;
        },
        onSuccess: () => {
            toast({
                title: isBulkMode ? "Classificação em massa salva!" : "Classificação salva!",
                description: isBulkMode
                    ? `${bulkCampaigns.length} campanhas atualizadas.`
                    : "A campanha foi classificada com sucesso.",
            });
            queryClient.invalidateQueries({ queryKey: ["campaigns-aggregated"] });
            if (onSuccess) onSuccess();
            onOpenChange(false);
        },
        onError: (err: Error) => {
            toast({
                title: "Erro ao salvar",
                description: err.message,
                variant: "destructive",
            });
        },
    });

    const createCourseMutation = useMutation({
        mutationFn: async (name: string) => {
            if (!client) throw new Error("Sem conexão");
            const { data, error } = await (client as SupabaseClient)
                .from("courses")
                .insert([{
                    name,
                    modality: quickAddModality,
                    course_line_id: quickAddLineId,
                    status: "active"
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (newCourse) => {
            toast({ title: "Curso criado!", description: `O curso ${newCourse.name} foi cadastrado.` });
            queryClient.invalidateQueries({ queryKey: ["courses"] }); // For global list
            setSelectedCourse(newCourse.id);
            setCourseSearch("");
            setIsQuickAddOpen(false);
            setIsCoursePopoverOpen(false);
        },
        onError: (err: Error) => {
            toast({ title: "Erro ao criar curso", description: err.message, variant: "destructive" });
        }
    });

    const currentSelectedUnit = units.find((u) => u.id === selectedUnit);
    const currentSelectedCourse = courses.find((c) => c.id === selectedCourse);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isBulkMode ? `Classificar ${bulkCampaigns.length} Campanhas` : "Classificar Campanha"}
                    </DialogTitle>
                    <DialogDescription className="space-y-1">
                        {isBulkMode ? (
                            <span>Selecione os campos que deseja atualizar. Mantenha em "Inalterado" para preservar valores atuais.</span>
                        ) : (
                            <>
                                <span className="block font-medium text-foreground">
                                    {campaign?.campaign_name || "Sem nome"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    ID: {campaign?.campaign_id} | Plataforma: {campaign?.platform}
                                </span>
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Unidade Select */}
                    <div className="grid gap-2">
                        <Label htmlFor="unit">Unidade (Business Unit)</Label>
                        <Select
                            value={selectedUnit}
                            onValueChange={setSelectedUnit}
                        >
                            <SelectTrigger id="unit">
                                <SelectValue placeholder="Selecione uma unidade" />
                            </SelectTrigger>
                            <SelectContent>
                                {isBulkMode && (
                                    <SelectItem value="no-change" className="font-semibold text-muted-foreground">
                                        [ Manter inalterado ]
                                    </SelectItem>
                                )}
                                <SelectItem value="null">Nenhuma / Geral</SelectItem>
                                {units.map((unit) => (
                                    <SelectItem key={unit.id} value={unit.id}>
                                        {unit.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Curso Select -> Combobox */}
                    <div className="grid gap-2">
                        <Label htmlFor="course">Curso</Label>
                        <Popover open={isCoursePopoverOpen} onOpenChange={setIsCoursePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isCoursePopoverOpen}
                                    className="justify-between font-normal"
                                >
                                    {selectedCourse === "no-change"
                                        ? "[ Manter inalterado ]"
                                        : selectedCourse === "null"
                                            ? "Geral / Institucional"
                                            : courses.find((c) => c.id === selectedCourse)?.name || "Selecionar curso..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[450px] p-0" align="start">
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Buscar curso..."
                                        value={courseSearch}
                                        onValueChange={setCourseSearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty className="p-2">
                                            <div className="flex flex-col gap-2">
                                                <p className="text-sm text-muted-foreground text-center">Nenhum curso encontrado.</p>
                                                {!isBulkMode && courseSearch && (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="flex items-center gap-2"
                                                        onClick={() => setIsQuickAddOpen(true)}
                                                    >
                                                        <PlusCircle className="h-4 w-4" />
                                                        Cadastrar "{courseSearch}"
                                                    </Button>
                                                )}
                                            </div>
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {isBulkMode && (
                                                <CommandItem
                                                    value="no-change"
                                                    onSelect={() => {
                                                        setSelectedCourse("no-change");
                                                        setIsCoursePopoverOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", selectedCourse === "no-change" ? "opacity-100" : "opacity-0")} />
                                                    [ Manter inalterado ]
                                                </CommandItem>
                                            )}
                                            <CommandItem
                                                value="null"
                                                onSelect={() => {
                                                    setSelectedCourse("null");
                                                    setIsCoursePopoverOpen(false);
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedCourse === "null" ? "opacity-100" : "opacity-0")} />
                                                Geral / Institucional
                                            </CommandItem>
                                            {courses
                                                .filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()))
                                                .slice(0, 10)
                                                .map((c) => (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={c.id}
                                                        onSelect={() => {
                                                            setSelectedCourse(c.id);
                                                            setIsCoursePopoverOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedCourse === c.id ? "opacity-100" : "opacity-0")} />
                                                        {c.name}
                                                    </CommandItem>
                                                ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Quick Add Dialog (Nested) */}
                    <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
                        <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle>Novo Curso</DialogTitle>
                                <DialogDescription>
                                    Você está cadastrando o curso <strong>"{courseSearch}"</strong>.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="q-line">Linha do Curso</Label>
                                    <Select value={quickAddLineId} onValueChange={setQuickAddLineId}>
                                        <SelectTrigger id="q-line">
                                            <SelectValue placeholder="Selecione a linha..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courseLines.map(line => (
                                                <SelectItem key={line.id} value={line.id}>{line.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="q-modality">Modalidade</Label>
                                    <Select value={quickAddModality} onValueChange={setQuickAddModality}>
                                        <SelectTrigger id="q-modality">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="presencial">Presencial</SelectItem>
                                            <SelectItem value="ead">EAD</SelectItem>
                                            <SelectItem value="hibrido">Híbrido</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsQuickAddOpen(false)}>Cancelar</Button>
                                <Button
                                    onClick={() => createCourseMutation.mutate(courseSearch)}
                                    disabled={createCourseMutation.isPending || !quickAddLineId}
                                >
                                    {createCourseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Criar e Selecionar
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Observação Input */}
                    <div className="grid gap-2">
                        <Label htmlFor="observation">Observação</Label>
                        <Textarea
                            id="observation"
                            placeholder="Adicione detalhes sobre essa classificação..."
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            className="resize-none"
                        />
                    </div>

                    {/* Ignorar Switch */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="ignored">Ignorar Campanha nos Relatórios</Label>
                            <p className="text-xs text-muted-foreground">
                                Ativar para campanhas de teste ou erro.
                            </p>
                        </div>
                        <Switch
                            id="ignored"
                            checked={isIgnored}
                            onCheckedChange={setIsIgnored}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isBulkMode ? "Salvar (Em Massa)" : "Salvar Classificação"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
