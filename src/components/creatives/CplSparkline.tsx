import * as React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface CplSparklineProps {
    data: { date: string; cpl: number }[];
    width?: number;
    height?: number;
}

export function CplSparkline({ data, width = 80, height = 24 }: CplSparklineProps) {
    if (!data || data.length < 2) {
        return <span className="text-xs text-muted-foreground">-</span>;
    }

    // Calculate trend: compare first half avg vs second half avg
    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.cpl, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.cpl, 0) / secondHalf.length;

    // Determine color: green if CPL is decreasing (good), red if increasing (bad)
    const isImproving = secondAvg < firstAvg * 0.95; // 5% threshold
    const isDeclining = secondAvg > firstAvg * 1.05;

    const lineColor = isImproving
        ? "#10b981" // emerald-500
        : isDeclining
            ? "#ef4444" // red-500
            : "#f59e0b"; // amber-500

    return (
        <div style={{ width, height }} className="inline-block">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <Line
                        type="monotone"
                        dataKey="cpl"
                        stroke={lineColor}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
