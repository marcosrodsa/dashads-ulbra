import * as React from "react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ModernCalendar } from "@/components/ui/modern-calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface ModernDateFilterProps {
    date: Date;
    onSelect: (date: Date) => void;
    className?: string;
    placeholder?: string;
}

export function ModernDateFilter({ date, onSelect, className, placeholder = "Selecione a data" }: ModernDateFilterProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            onSelect(selectedDate);
            setIsOpen(false);
        }
    };

    const handleToday = () => {
        const today = new Date();
        onSelect(today);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal bg-background/50 border-input h-9",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-violet-600" />
                    {date ? (
                        <span className="capitalize">{format(date, "MMMM yyyy", { locale: ptBR })}</span>
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-none bg-transparent" align="start">
                <div className="bg-white rounded-2xl shadow-xl border border-border overflow-hidden p-2">
                    <ModernCalendar
                        mode="single"
                        selected={date}
                        onSelect={handleSelect}
                        initialFocus
                        fixedWeeks
                    />
                    <div className="p-2 border-t mt-2 flex justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleToday}
                            className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 font-medium rounded-full px-6"
                        >
                            Hoje
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
