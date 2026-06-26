import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function DonutChartWrapper({ data = [], title, innerLabel, height = 250 }) {
  const { isDark } = useTheme();

  const tooltipStyle = {
    backgroundColor: isDark ? '#1E293B' : '#FFF',
    border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
    borderRadius: '8px',
    color: isDark ? '#F1F5F9' : '#1E293B',
  };

  return (
    <div>
      {title && (
        <h3 className="text-sm font-semibold text-text-primary dark:text-text-inverted mb-4">
          {title}
        </h3>
      )}
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        {innerLabel && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary dark:text-text-inverted">
                {innerLabel.value}
              </p>
              <p className="text-xs text-text-muted dark:text-text-muted">{innerLabel.label}</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {data.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-text-secondary dark:text-text-muted">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
