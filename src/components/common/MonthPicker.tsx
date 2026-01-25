import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface MonthPickerProps {
    date?: Date;
    onSelect: (date: Date | undefined) => void;
}

export function MonthPicker({ date, onSelect }: MonthPickerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal bg-background/50 border-input",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                        format(date, "MMMM yyyy", { locale: ptBR })
                    ) : (
                        <span>Selecione o mês</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                        onSelect(d);
                        setOpen(false);
                    }}
                    initialFocus
                    locale={ptBR}
                    disabled={(date) => date > new Date() || date < new Date("2024-01-01")} // Optional limits
                />
            </PopoverContent>
        </Popover>
    );
}
