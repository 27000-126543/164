import { Thermometer, Droplets, Wind, Layers, Factory, Car, Construction, ShieldAlert, Zap, Star } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useAppStore } from '@/store/useAppStore';

const STRATEGY_ICONS: Record<string, React.ElementType> = {
  '工业限产': Factory,
  '机动车限行': Car,
  '扬尘管控': Construction,
  '区域联防联控': ShieldAlert,
  '应急减排': Zap,
};

const comparisonData = [
  { metric: 'PM2.5下降率(%)', baseline: 0, planA: 23.5, planB: 41.2 },
  { metric: 'O3下降率(%)', baseline: 0, planA: 15.8, planB: 32.6 },
  { metric: 'AOD改善率(%)', baseline: 0, planA: 18.3, planB: 35.7 },
];

const radarData = [
  { axis: 'PM2.5控制效果', current: 62, recommended: 85 },
  { axis: 'O3控制效果', current: 48, recommended: 73 },
  { axis: '经济影响', current: 25, recommended: 45 },
  { axis: '实施难度', current: 35, recommended: 60 },
  { axis: '公众接受度', current: 72, recommended: 58 },
];

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score * 5);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < stars ? 'fill-amber-500 text-amber-500' : 'text-gray-600'}`}
        />
      ))}
    </div>
  );
}

export default function Recommend() {
  const { recommendations } = useAppStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glow-card p-5">
        <h2 className="section-title">当前气象条件</h2>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-3 rounded-lg bg-navy-700/40 px-4 py-3">
            <Thermometer className="h-8 w-8 text-coral-500" />
            <div>
              <div className="text-xs text-gray-400">温度</div>
              <div className="metric-value text-xl">28°C</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-navy-700/40 px-4 py-3">
            <Droplets className="h-8 w-8 text-cyber-400" />
            <div>
              <div className="text-xs text-gray-400">湿度</div>
              <div className="metric-value text-xl">65%</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-navy-700/40 px-4 py-3">
            <Wind className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-xs text-gray-400">风速</div>
              <div className="metric-value text-xl">3.2 m/s</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-navy-700/40 px-4 py-3">
            <Layers className="h-8 w-8 text-cyber-500" />
            <div>
              <div className="text-xs text-gray-400">大气稳定度</div>
              <div className="metric-value text-xl">D类 <span className="text-sm font-normal text-gray-400">(中等)</span></div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-cyber-500/10 px-4 py-2.5 border border-cyber-500/20">
          <Zap className="h-4 w-4 text-cyber-500 shrink-0" />
          <span className="text-sm text-cyber-400">基于当前气象条件，系统已为您匹配最优减排策略</span>
        </div>
      </div>

      <div>
        <h2 className="section-title">策略推荐</h2>
        <div className="grid grid-cols-2 gap-4">
          {recommendations.map((rec) => {
            const Icon = STRATEGY_ICONS[rec.strategyType] || Zap;
            const percentage = Math.round(rec.effectivenessScore * 100);
            return (
              <div key={rec.id} className="glow-card-hover p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyber-500/15">
                    <Icon className="h-5 w-5 text-cyber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-100">{rec.strategyType}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{rec.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">有效性评分</span>
                  <StarRating score={rec.effectivenessScore} />
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">有效性</span>
                    <span className="text-xs font-mono text-cyber-400">{percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-navy-700">
                    <div
                      className="h-full rounded-full bg-cyber-500 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
                  <span>适用时段: <span className="text-gray-300">{rec.timePeriod}</span></span>
                </div>
                <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
                  <span>匹配条件: <span className="text-gray-300">{rec.conditions}</span></span>
                </div>

                <div className="flex items-center gap-3">
                  <button className="cyber-btn text-xs">应用此策略</button>
                  <button className="text-xs text-cyber-400 hover:text-cyber-300 transition-colors">查看详情</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 glow-card p-5">
          <h2 className="section-title">情景对比分析</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData} barGap={4} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#243447" />
              <XAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1B2838',
                  border: '1px solid #243447',
                  borderRadius: '8px',
                  color: '#E5E7EB',
                }}
              />
              <Legend
                wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }}
                formatter={(value: string) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
              />
              <Bar dataKey="baseline" name="基准情景" fill="#6B7280" radius={[4, 4, 0, 0]} />
              <Bar dataKey="planA" name="减排方案A" fill="#00D4AA" radius={[4, 4, 0, 0]} />
              <Bar dataKey="planB" name="减排方案B" fill="#FF8C00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2 glow-card p-5">
          <h2 className="section-title">历史分析</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
              <PolarGrid stroke="#243447" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} />
              <Radar
                name="当前策略"
                dataKey="current"
                stroke="#00D4AA"
                fill="#00D4AA"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name="推荐策略"
                dataKey="recommended"
                stroke="#FF8C00"
                fill="#FF8C00"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Legend
                wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }}
                formatter={(value: string) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1B2838',
                  border: '1px solid #243447',
                  borderRadius: '8px',
                  color: '#E5E7EB',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
            <p className="text-xs text-amber-400 leading-relaxed">
              推荐策略预计可降低PM2.5峰值18.5%，同时经济影响可控
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
