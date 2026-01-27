import * as React from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { SupabaseDebugBanner } from "@/components/debug/SupabaseDebugBanner";

export const AppConfiguration = React.forwardRef<HTMLDivElement>((props, ref) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div ref={ref}>
                    <Button variant="ghost" size="icon" className="ml-auto text-muted-foreground hover:text-foreground">
                        <Settings className="size-4" />
                        <span className="sr-only">Configurações</span>
                    </Button>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Diagnóstico e Configurações</DialogTitle>
                    <DialogDescription>
                        Gerencie a conexão com o Supabase e visualize o estado do sistema.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    <SupabaseDebugBanner />
                </div>
            </DialogContent>
        </Dialog>
    );
}
