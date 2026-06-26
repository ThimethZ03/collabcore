import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function RadarChartWrapper({ data = [], title, height = 300 }) {
  const { isDark } = useTheme();

  const tooltipStyle = {
    backgroundColor: isDark ? '#1E293B' : '#FFF',
    border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
    borderRadius: '8px',
    color: isDark ? '#F1F5F9' : '#1E293B',
  };

  const gridColor = isDark ? '#334155' : '#E2E8F0';
  const textColor = isDark ? '#94A3B8' : '#64748B';
  const fillColor = isDark ? '#60A5FA' : '#4A90D9';

  return (
    <div>
      {title && (
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: textColor, fontSize: 11 }}
          />
          <PolarRadiusAxis
            tick={{ fill: textColor, fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke={fillColor}
            fill={fillColor}
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip contentStyle={tooltipStyle} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
