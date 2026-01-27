import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

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
import { toast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/integrations/supabase/client";
import type { AggregatedCampaign, Unit, Course } from "@/integrations/supabase/campaignMappingSchema";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignMappingDialogProps {
    campaign: AggregatedCampaign | null;
    bulkCampaigns?: AggregatedCampaign[];
    isBulkMode?: boolean;
    units: Unit[];
    courses: Course[];
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
    open,
    onOpenChange,
    onSuccess,
}: CampaignMappingDialogProps) {
    const queryClient = useQueryClient();
    const client = getSupabaseClient();

    // Form state
    // '__keep__' is valid only in bulk mode to indicate partial update
    const [unitId, setUnitId] = React.useState<string | null>(null);
    const [courseId, setCourseId] = React.useState<string | null>(null);
    const [isIgnored, setIsIgnored] = React.useState(false);
    const [courseOpen, setCourseOpen] = React.useState(false);

    // Constants
    const KEEP_VALUE = "__keep__";

    // Sync state when open changes
    React.useEffect(() => {
        if (open) {
            if (isBulkMode) {
                // Bulk mode defaults: keep existing values
                setUnitId(KEEP_VALUE);
                setCourseId(KEEP_VALUE);
                setIsIgnored(false);
            } else if (campaign) {
                // Single mode: load campaign values
                setUnitId(campaign.unit_id);
                setCourseId(campaign.course_id);
                setIsIgnored(campaign.is_ignored ?? false);
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
                // If IS BULK and value is KEEP, use existing value from target.
                // Otherwise use the new form value.
                const finalUnitId = (isBulkMode && unitId === KEEP_VALUE) ? target.unit_id : unitId;
                const finalCourseId = (isBulkMode && courseId === KEEP_VALUE) ? target.course_id : courseId;

                // Handling special case where unitId/courseId might be explicitly set to null (cleared) vs kept
                // In our form: null means "None/General", KEEP_VALUE means "Keep existing".

                return {
                    platform: target.platform,
                    campaign_id: target.campaign_id,
                    campaign_name: target.campaign_name,
                    unit_id: finalUnitId,
                    course_id: finalCourseId,
                    is_ignored: isIgnored, // For now, ignore flag is applied to all in bulk
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

    const selectedUnit = units.find((u) => u.id === unitId);
    const selectedCourse = courses.find((c) => c.id === courseId);

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
                            value={unitId ?? "__none__"} // internally we use null for 'none', but Select needs string default
                            onValueChange={(v) => setUnitId(v === "__none__" ? null : v)}
                        >
                            <SelectTrigger id="unit">
                                <SelectValue placeholder="Selecione uma unidade" />
                            </SelectTrigger>
                            <SelectContent>
                                {isBulkMode && (
                                    <SelectItem value={KEEP_VALUE} className="font-semibold text-muted-foreground">
                                        [ Manter inalterado ]
                                    </SelectItem>
                                )}
                                <SelectItem value="__none__">Nenhuma / Geral</SelectItem>
                                {units.map((unit) => (
                                    <SelectItem key={unit.id} value={unit.id}>
                                        {unit.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Curso Combobox */}
                    <div className="grid gap-2">
                        <Label>Curso</Label>
                        <Popover open={courseOpen} onOpenChange={setCourseOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={courseOpen}
                                    className="w-full justify-between"
                                >
                                    {isBulkMode && courseId === KEEP_VALUE
                                        ? "[ Manter inalterado ]"
                                        : selectedCourse?.name ?? "Selecione um curso..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar curso..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum curso encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {isBulkMode && (
                                                <CommandItem
                                                    value={KEEP_VALUE}
                                                    onSelect={() => {
                                                        setCourseId(KEEP_VALUE);
                                                        setCourseOpen(false);
                                                    }}
                                                    className="font-semibold text-muted-foreground"
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            courseId === KEEP_VALUE ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    [ Manter inalterado ]
                                                </CommandItem>
                                            )}

                                            <CommandItem
                                                value=""
                                                onSelect={() => {
                                                    setCourseId(null);
                                                    setCourseOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        (courseId === null && (!isBulkMode || courseId !== KEEP_VALUE)) ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                Geral / Institucional
                                            </CommandItem>

                                            {courses.map((course) => (
                                                <CommandItem
                                                    key={course.id}
                                                    value={course.name}
                                                    onSelect={() => {
                                                        setCourseId(course.id);
                                                        setCourseOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            courseId === course.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {course.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Ignorar Switch - Only show in single mode or assume override in bulk */}
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
        </Dialog>
    );
}
