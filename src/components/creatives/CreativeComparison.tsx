import * as React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRightLeft } from "lucide-react";

interface ComparisonData {
    name: string;
    A: number;
    B: number;
    fullMark: number;
}

interface CreativeMinimal {
    ad_id: string;
    ad_name: string;
    conversoes: number;
    cpl: number | null;
    ctr: number;
    image_url?: string;
    hook_rate?: number;
    hold_rate?: number;
}

interface CreativeComparisonProps {
    adA: CreativeMinimal;
    adB: CreativeMinimal;
}

export function CreativeComparison({ adA, adB }: CreativeComparisonProps) {
    const data: ComparisonData[] = [
        {
            name: "Conversões",
            A: Math.min(100, (adA.conversoes / Math.max(adA.conversoes, adB.conversoes, 1)) * 100),
            B: Math.min(100, (adB.conversoes / Math.max(adA.conversoes, adB.conversoes, 1)) * 100),
            fullMark: 100,
        },
        {
            name: "Baixo CPL",
            A: adA.cpl && adA.cpl > 0 ? Math.min(100, (1 / adA.cpl) / (1 / Math.min(adA.cpl || 1, adB.cpl || 1)) * 100) : 0,
            B: adB.cpl && adB.cpl > 0 ? Math.min(100, (1 / adB.cpl) / (1 / Math.min(adA.cpl || 1, adB.cpl || 1)) * 100) : 0,
            fullMark: 100,
        },
        {
            name: "CTR",
            A: Math.min(100, (adA.ctr / Math.max(adA.ctr, adB.ctr, 0.1)) * 100),
            B: Math.min(100, (adB.ctr / Math.max(adA.ctr, adB.ctr, 0.1)) * 100),
            fullMark: 100,
        },
        {
            name: "Hook Rate",
            A: adA.hook_rate || 0,
            B: adB.hook_rate || 0,
            fullMark: 100,
        },
        {
            name: "Hold Rate",
            A: adA.hold_rate || 0,
            B: adB.hold_rate || 0,
            fullMark: 100,
        },
    ];

    return (
        <Card className="border-purple-100 dark:border-purple-900 shadow-lg bg-gradient-to-b from-white to-purple-50/20 dark:from-slate-950 dark:to-purple-950/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-purple-500" />
                    Comparador A/B
                </CardTitle>
                <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" /> Visual vs Performance
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* Visual Previews */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                <div className="h-40 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-purple-200">
                                    {adA.image_url ? (
                                        <img src={adA.image_url} alt="A" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Ad A</div>
                                    )}
                                </div>
                                <p className="text-xs font-bold truncate text-center uppercase tracking-tighter">Criativo A</p>
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="h-40 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-slate-200">
                                    {adB.image_url ? (
                                        <img src={adB.image_url} alt="B" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Ad B</div>
                                    )}
                                </div>
                                <p className="text-xs font-bold truncate text-center uppercase tracking-tighter">Criativo B</p>
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Performance Liderada por:</span>
                                <span className="font-bold text-purple-600">
                                    {adA.conversoes > adB.conversoes ? "Criativo A" : "Criativo B"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Criativo A"
                                    dataKey="A"
                                    stroke="#8b5cf6"
                                    fill="#8b5cf6"
                                    fillOpacity={0.6}
                                />
                                <Radar
                                    name="Criativo B"
                                    dataKey="B"
                                    stroke="#64748b"
                                    fill="#64748b"
                                    fillOpacity={0.4}
                                />
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
