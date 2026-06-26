import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function SparklineWrapper({ data = [], color, height = 40 }) {
  const { isDark } = useTheme();
  const strokeColor = color || (isDark ? '#60A5FA' : '#4A90D9');
  const chartData = data.map((val, idx) => ({ v: val, i: idx }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={strokeColor}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
