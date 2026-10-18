import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function NenChartPlot({ data, themeColor }: {
    data: { subject: string; A: number; fullMark: number }[];
    themeColor: string;
}) {
    return (
        <ResponsiveContainer width="100%" height={180}>
            <RadarChart cx="50%" cy="50%" outerRadius="45%" data={data}>
                <PolarGrid stroke="var(--color-border)" strokeOpacity={0.5} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text)', fontSize: 10, fontWeight: 900 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Stats" dataKey="A" stroke={themeColor} strokeWidth={3} fill={themeColor} fillOpacity={0.6} />
            </RadarChart>
        </ResponsiveContainer>
    );
}
