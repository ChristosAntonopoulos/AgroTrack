import React, { useMemo } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getChartSeriesColors } from '../../styles/colorTokens';
import './Chart.css';

interface PieChartProps {
  data: { name: string; value: number }[];
  title?: string;
  colors?: string[];
}

const PieChart: React.FC<PieChartProps> = ({ data, title, colors }) => {
  const palette = useMemo(() => colors ?? getChartSeriesColors(), [colors]);

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill={palette[0]}
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;
