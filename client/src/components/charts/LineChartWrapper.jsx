import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function LineChartWrapper({ data, xKey, lines = [], title, height = 300 }) {
  const { isDark } = useTheme();

  const tooltipStyle = {
    backgroundColor: isDark ? '#1E293B' : '#FFF',
    border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
    borderRadius: '8px',
    color: isDark ? '#F1F5F9' : '#1E293B',
  };

  const gridColor = isDark ? '#334155' : '#E2E8F0';
  const textColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <div>
      {title && (
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: textColor, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, color: textColor }} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
