import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
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

export function ModernDateFilter({ dateRange, onSelect, className, placeholder = "Selecione o período" }: ModernDateFilterProps) {
    const [isOpen, setIsOpen] = React.useState(false);

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
                <div className="bg-white rounded-2xl shadow-xl border border-border overflow-hidden p-2">
                    <ModernCalendar
                        mode="range"
                        selected={dateRange}
                        onSelect={onSelect}
                        initialFocus
                        numberOfMonths={2}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
