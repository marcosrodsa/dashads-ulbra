import * as React from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Check } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModernCalendar } from "@/components/ui/modern-calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface ModernDateFilterProps {
    dateRange: DateRange | undefined;
    onSelect: (range: DateRange | undefined) => void;
    className?: string;
    placeholder?: string;
}

type PresetType = "yesterday" | "7d" | "15d" | "30d" | "90d" | "custom";

interface Preset {
    type: PresetType;
    label: string;
    getDates: () => DateRange;
}

const presets: Preset[] = [
    {
        type: "yesterday",
        label: "Ontem",
        getDates: () => {
            const yesterday = subDays(new Date(), 1);
            return { from: yesterday, to: yesterday };
        }
    },
    {
        type: "7d",
        label: "Últimos 7 dias",
        getDates: () => ({
            from: subDays(new Date(), 7),
            to: subDays(new Date(), 1)
        })
    },
    {
        type: "15d",
        label: "Últimos 15 dias",
        getDates: () => ({
            from: subDays(new Date(), 15),
            to: subDays(new Date(), 1)
        })
    },
    {
        type: "30d",
        label: "Últimos 30 dias",
        getDates: () => ({
            from: subDays(new Date(), 30),
            to: subDays(new Date(), 1)
        })
    },
    {
        type: "90d",
        label: "Últimos 90 dias",
        getDates: () => ({
            from: subDays(new Date(), 90),
            to: subDays(new Date(), 1)
        })
    }
];

function getPresetLabel(preset: Preset): string {
    const dates = preset.getDates();
    if (dates.from && dates.to) {
        const fromStr = format(dates.from, "dd/MM");
        const toStr = format(dates.to, "dd/MM");
        return `${preset.label} (${fromStr} - ${toStr})`;
    }
    return preset.label;
}

function detectActivePreset(dateRange: DateRange | undefined): PresetType | null {
    if (!dateRange?.from || !dateRange?.to) return null;

    const from = format(dateRange.from, "yyyy-MM-dd");
    const to = format(dateRange.to, "yyyy-MM-dd");

    for (const preset of presets) {
        const presetDates = preset.getDates();
        const presetFrom = format(presetDates.from!, "yyyy-MM-dd");
        const presetTo = format(presetDates.to!, "yyyy-MM-dd");

        if (from === presetFrom && to === presetTo) {
            return preset.type;
        }
    }

    return "custom";
}

export function ModernDateFilter({ dateRange, onSelect, className, placeholder = "Selecione o período" }: ModernDateFilterProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [showCalendar, setShowCalendar] = React.useState(false);

    const activePreset = detectActivePreset(dateRange);

    const handlePresetClick = (preset: Preset) => {
        const dates = preset.getDates();
        onSelect(dates);
        setShowCalendar(false);
        setIsOpen(false);
    };

    const handleCustomClick = () => {
        setShowCalendar(true);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal bg-background/50 border-input h-9",
                        !dateRange && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-violet-600" />
                    {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                                {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                                {format(dateRange.to, "dd/MM/yyyy")}
                            </>
                        ) : (
                            format(dateRange.from, "dd/MM/yyyy")
                        )
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-none bg-transparent" align="start">
                <div className="bg-white rounded-xl shadow-xl border border-border overflow-hidden">
                    {!showCalendar ? (
                        <div className="p-2 min-w-[220px]">
                            {presets.map((preset) => (
                                <button
                                    key={preset.type}
                                    onClick={() => handlePresetClick(preset)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between hover:bg-accent transition-colors",
                                        activePreset === preset.type && "bg-violet-50 text-violet-700 font-medium"
                                    )}
                                >
                                    <span>{getPresetLabel(preset)}</span>
                                    {activePreset === preset.type && (
                                        <Check className="h-4 w-4 text-violet-600" />
                                    )}
                                </button>
                            ))}
                            <div className="h-px bg-border my-2" />
                            <button
                                onClick={handleCustomClick}
                                className={cn(
                                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between hover:bg-accent transition-colors",
                                    activePreset === "custom" && "bg-violet-50 text-violet-700 font-medium"
                                )}
                            >
                                <span>Personalizado</span>
                                {activePreset === "custom" && (
                                    <Check className="h-4 w-4 text-violet-600" />
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="p-2">
                            <ModernCalendar
                                mode="range"
                                selected={dateRange}
                                onSelect={(range) => {
                                    onSelect(range);
                                    if (range?.from && range?.to) {
                                        setIsOpen(false);
                                        setShowCalendar(false);
                                    }
                                }}
                                initialFocus
                                numberOfMonths={2}
                            />
                            <div className="px-2 pb-2 pt-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowCalendar(false)}
                                    className="w-full"
                                >
                                    Voltar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
