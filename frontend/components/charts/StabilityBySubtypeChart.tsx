'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface StabilityBySubtypeChartProps {
  data: Array<{ predicted_class: string; avg_confidence: number; count: number }>;
}

const COLORS = ['#0ea5e9', '#6366f1', '#22d3ee', '#10b981'];

export default function StabilityBySubtypeChart({ data }: StabilityBySubtypeChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="predicted_class"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
          dy={15}
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
        />
        <Tooltip
          formatter={(value: number) => `${value.toFixed(2)}%`}
          contentStyle={{
            backgroundColor: '#020617',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          }}
          itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
        />
        <Bar dataKey="avg_confidence" radius={[6, 6, 0, 0]} barSize={40}>
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
