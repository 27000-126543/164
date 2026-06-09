import { TrendingUp, Clock, ShieldCheck, Target, ArrowUpRight, ArrowDownRight, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { WARNING_LEVEL_LABELS } from '@/types';
import type { WarningLevel } from '@/types';

const PIE_DATA = [
  { name: '工业排放', value: 35 },
  { name: '交通排放', value: 25 },
  { name: '扬尘', value: 18 },
  { name: '生活源', value: 12 },
  { name: '其他', value: 10 },
];

const PIE_COLORS = ['#00D4AA', '#FF8C00', '#FF4757', '#8B5CF6', '#6B7280'];

const WARNING_COLORS: Record<WarningLevel, string> = {
  red: '#FF4757',
  orange: '#FF8C00',
  yellow: '#FFC312',
  blue: '#3498DB',
};

export default function Dashboard() {
  const { tasks, warnings, dailyStats } = useAppStore();

  const latest = dailyStats.length > 0 ? dailyStats[dailyStats.length - 1] : null;
  const previous = dailyStats.length > 1 ? dailyStats[dailyStats.length - 2] : null;

  const completionRate = latest ? (latest.completionRate * 100).toFixed(1) : '--';
  const avgResponseTime = latest ? latest.avgResponseTime.toFixed(1) : '--';
  const complianceRate = latest ? (latest.complianceRate * 100).toFixed(1) : '--';
  const indirectEffectAccuracy = latest ? (latest.indirectEffectAccuracy * 100).toFixed(1) : '--';

  const completionTrend = latest && previous ? latest.completionRate - previous.completionRate : 0;
  const responseTrend = latest && previous ? latest.avgResponseTime - previous.avgResponseTime : 0;
  const complianceTrend = latest && previous ? latest.complianceRate - previous.complianceRate : 0;
  const accuracyTrend = latest && previous ? latest.indirectEffectAccuracy - previous.indirectEffectAccuracy : 0;

  const activeTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'ROLLBACK').length;
  const activeWarnings = warnings.filter((w) => w.status === 'active' || w.status === 'reviewing' || w.status === 'adjusting').length;

  const warningCountsByLevel = (['red', 'orange', 'yellow', 'blue'] as WarningLevel[]).map((level) => ({
    level: WARNING_LEVEL_LABELS[level],
    count: warnings.filter((w) => w.level === level).length,
    fill: WARNING_COLORS[level],
  }));

  const recentWarnings = warnings.slice(0, 3);

  const chartData = dailyStats.map((s) => ({
    date: s.date.slice(5),
    completionRate: +(s.completionRate * 100).toFixed(1),
    avgResponseTime: s.avgResponseTime,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="模拟完成率"
          value={completionRate}
          unit="%"
          icon={<TrendingUp className="w-5 h-5" />}
          accent="text-cyber-500"
          accentBg="bg-cyber-500/10"
          trend={completionTrend}
          trendInvert={false}
        />
        <MetricCard
          label="平均预警响应时间"
          value={avgResponseTime}
          unit="min"
          icon={<Clock className="w-5 h-5" />}
          accent="text-amber-500"
          accentBg="bg-amber-500/10"
          trend={responseTrend}
          trendInvert={true}
        />
        <MetricCard
          label="污染达标率"
          value={complianceRate}
          unit="%"
          icon={<ShieldCheck className="w-5 h-5" />}
          accent="text-cyber-500"
          accentBg="bg-cyber-500/10"
          trend={complianceTrend}
          trendInvert={false}
        />
        <MetricCard
          label="气溶胶间接效应精度"
          value={indirectEffectAccuracy}
          unit="%"
          icon={<Target className="w-5 h-5" />}
          accent="text-amber-500"
          accentBg="bg-amber-500/10"
          trend={accuracyTrend}
          trendInvert={false}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 glow-card p-5">
          <h3 className="section-title">性能趋势</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradCompletion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#243447" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#243447' }} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} domain={[60, 100]} unit="%" />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} domain={[10, 60]} unit="min" />
                <Tooltip
                  contentStyle={{ background: '#1B2838', border: '1px solid #243447', borderRadius: 8, color: '#E5E7EB', fontSize: 12 }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="completionRate" stroke="#00D4AA" fill="url(#gradCompletion)" strokeWidth={2} name="模拟完成率 (%)" />
                <Line yAxisId="right" type="monotone" dataKey="avgResponseTime" stroke="#FF8C00" strokeWidth={2} dot={false} name="响应时间 (min)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glow-card p-5">
          <h3 className="section-title">排放源贡献</h3>
          <div className="h-72 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {PIE_DATA.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1B2838', border: '1px solid #243447', borderRadius: 8, color: '#E5E7EB', fontSize: 12 }}
                  formatter={(value: number) => `${value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-100 font-mono">100%</div>
                <div className="text-xs text-gray-400 mt-0.5">总贡献</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
            {PIE_DATA.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PIE_COLORS[i] }} />
                {item.name} {item.value}%
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glow-card p-5">
          <h3 className="section-title">预警等级统计</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warningCountsByLevel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243447" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="level" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip
                  contentStyle={{ background: '#1B2838', border: '1px solid #243447', borderRadius: 8, color: '#E5E7EB', fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {warningCountsByLevel.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glow-card p-5">
          <h3 className="section-title">系统概览</h3>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-navy-700/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-cyber-400 font-mono">{activeTasks}</div>
                <div className="text-xs text-gray-400 mt-1">进行中任务</div>
              </div>
              <div className="bg-navy-700/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-coral-400 font-mono">{activeWarnings}</div>
                <div className="text-xs text-gray-400 mt-1">活跃预警</div>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-400 mb-3">最近预警</div>
              <div className="space-y-2.5">
                {recentWarnings.map((w) => (
                  <div key={w.id} className="flex items-center gap-3 bg-navy-700/20 rounded-lg px-3 py-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: `${WARNING_COLORS[w.level]}20`,
                        color: WARNING_COLORS[w.level],
                      }}
                    >
                      {WARNING_LEVEL_LABELS[w.level].replace('预警', '')}
                    </span>
                    <span className="text-sm text-gray-200 flex-1">{w.region}</span>
                    <span className="text-xs text-gray-500">{w.pollutant}</span>
                  </div>
                ))}
                {recentWarnings.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">暂无预警</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-navy-700/20 rounded-lg px-3 py-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyber-500 animate-pulse-glow" />
              <span className="text-sm text-gray-300">系统运行状态</span>
              <span className="ml-auto text-sm text-cyber-400 font-medium">全部正常</span>
              <CheckCircle2 className="w-4 h-4 text-cyber-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  accent,
  accentBg,
  trend,
  trendInvert,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
  trend: number;
  trendInvert: boolean;
}) {
  const isPositive = trendInvert ? trend < 0 : trend > 0;
  const trendAbs = Math.abs(trend);

  return (
    <div className="glow-card-hover p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`${accentBg} ${accent} p-2 rounded-lg`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="metric-value text-gray-100">{value}</span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
      <div className="flex items-center gap-1 mt-2">
        {isPositive ? (
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
        )}
        <span className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {trendAbs > 0 ? trendAbs.toFixed(1) : '0.0'}
        </span>
        <span className="text-xs text-gray-500 ml-0.5">较前日</span>
      </div>
    </div>
  );
}
