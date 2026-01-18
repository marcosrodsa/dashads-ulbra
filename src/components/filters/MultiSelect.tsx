import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type MultiSelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string[];
  options: MultiSelectOption[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
};

export function MultiSelect({
  value,
  options,
  onChange,
  placeholder = "Selecionar...",
  emptyLabel = "Nada encontrado",
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return value.map((v) => ({ value: v, label: map.get(v) ?? v }));
  }, [options, value]);

  const toggle = (v: string) => {
    const exists = value.includes(v);
    const next = exists ? value.filter((x) => x !== v) : [...value, v];
    onChange(next);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate text-left">
            {selected.length ? `${selected.length} selecionado(s)` : placeholder}
          </span>
          <span className="flex items-center gap-1">
            {selected.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Limpar seleção"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[280px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50",
                      )}
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="flex-1 truncate">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        {selected.length > 0 && (
          <div className="border-t p-2">
            <div className="flex flex-wrap gap-1">
              {selected.slice(0, 6).map((s) => (
                <Badge key={s.value} variant="secondary" className="max-w-full">
                  <span className="truncate">{s.label}</span>
                </Badge>
              ))}
              {selected.length > 6 && (
                <Badge variant="secondary">+{selected.length - 6}</Badge>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
