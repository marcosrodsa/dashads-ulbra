import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function ModernCalendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
    return (
        <DayPicker
            locale={ptBR}
            showOutsideDays={showOutsideDays}
            className={cn("p-4 bg-white rounded-2xl shadow-sm border border-border/50 font-sans", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-between pt-1 relative items-center px-2",
                caption_label: "text-lg font-semibold text-foreground capitalize",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-7 w-7 bg-transparent p-0 text-muted-foreground hover:bg-muted rounded-full"
                ),
                nav_button_previous: "",
                nav_button_next: "",
                table: "w-full border-collapse space-y-1",
                head_row: "flex justify-between mb-2",
                head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.8rem] capitalize text-center",
                row: "flex w-full mt-2 justify-between",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full hover:bg-violet-100 hover:text-violet-900 transition-colors"
                ),
                day_range_end: "day-range-end",
                day_selected:
                    "bg-violet-600 text-white hover:bg-violet-700 hover:text-white focus:bg-violet-700 focus:text-white shadow-md shadow-violet-200",
                day_today: "bg-accent text-accent-foreground font-semibold border border-violet-200 text-violet-700",
                day_outside:
                    "day-outside text-muted-foreground opacity-30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
                IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
            }}
            formatters={{
                formatCaption: (date, options) => {
                    const month = format(date, "MMMM", options);
                    const year = format(date, "yyyy", options);
                    // Capitalize month
                    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
                }
            }}
            {...props}
        />
    );
}
ModernCalendar.displayName = "ModernCalendar";

import { format } from "date-fns";

export { ModernCalendar };
