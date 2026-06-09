import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { MapPin, RefreshCw, Activity, Wind, Sun, AlertTriangle, Radio } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { generateMonitorData } from '@/data/mockData';
import { WARNING_LEVEL_LABELS } from '@/types';
import type { WarningLevel } from '@/types';

const REGIONS = ['北京', '上海', '广州', '成都', '武汉', '沈阳'];

const WARNING_COLORS: Record<WarningLevel, string> = {
  red: '#FF4757',
  orange: '#FF8C00',
  yellow: '#FFC312',
  blue: '#3498DB',
};

const AOD_COLOR_STOPS = [
  { pos: 0.0, color: [0, 0, 255] },
  { pos: 0.2, color: [0, 255, 255] },
  { pos: 0.4, color: [0, 255, 0] },
  { pos: 0.6, color: [255, 255, 0] },
  { pos: 0.8, color: [255, 165, 0] },
  { pos: 1.0, color: [255, 0, 0] },
];

function getAodColor(value: number): string {
  const t = Math.min(Math.max(value / 2.5, 0), 1);
  let lower = AOD_COLOR_STOPS[0];
  let upper = AOD_COLOR_STOPS[AOD_COLOR_STOPS.length - 1];
  for (let i = 0; i < AOD_COLOR_STOPS.length - 1; i++) {
    if (t >= AOD_COLOR_STOPS[i].pos && t <= AOD_COLOR_STOPS[i + 1].pos) {
      lower = AOD_COLOR_STOPS[i];
      upper = AOD_COLOR_STOPS[i + 1];
      break;
    }
  }
  const range = upper.pos - lower.pos;
  const frac = range === 0 ? 0 : (t - lower.pos) / range;
  const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * frac);
  const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * frac);
  const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * frac);
  return `rgb(${r},${g},${b})`;
}

interface Pm25TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function Pm25Tooltip({ active, payload, label }: Pm25TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-navy-600 bg-navy-900 px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400">{label}</p>
      <p className="font-mono text-cyber-400">
        PM2.5: {payload[0].value} μg/m³
      </p>
    </div>
  );
}

interface O3TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function O3Tooltip({ active, payload, label }: O3TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-navy-600 bg-navy-900 px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400">{label}</p>
      <p className="font-mono text-amber-500">
        O3: {payload[0].value} μg/m³
      </p>
    </div>
  );
}

export default function Monitor() {
  const { warnings } = useAppStore();
  const [selectedRegion, setSelectedRegion] = useState('北京');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [monitorData, setMonitorData] = useState(() => generateMonitorData());
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const legendCanvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshData = useCallback(() => {
    setMonitorData(generateMonitorData());
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refreshData, 3000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshData]);

  useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / 20;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grid: number[][] = Array.from({ length: 20 }, () => Array(20).fill(0));
    monitorData.aodHeatmap.forEach((p) => {
      if (p.x >= 0 && p.x < 20 && p.y >= 0 && p.y < 20) {
        grid[p.y][p.x] = p.value;
      }
    });

    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        ctx.fillStyle = grid[y][x] > 0 ? getAodColor(grid[y][x]) : 'rgba(10,22,40,0.8)';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }, [monitorData.aodHeatmap]);

  useEffect(() => {
    const canvas = legendCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    AOD_COLOR_STOPS.forEach((stop) => {
      const [r, g, b] = stop.color;
      gradient.addColorStop(stop.pos, `rgb(${r},${g},${b})`);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    [0, 0.5, 1.0, 1.5, 2.0, 2.5].forEach((val, i) => {
      const yPos = (i / 5) * canvas.height;
      ctx.fillText(val.toFixed(1), canvas.width + 4, yPos + 4);
    });
  }, []);

  const regionWarnings = REGIONS.map((region) => {
    const activeWarning = warnings.find(
      (w) => w.region === region && w.status !== 'closed'
    );
    return { region, warning: activeWarning ?? null };
  });

  const avgPm25 =
    monitorData.pm25Data.reduce((sum, d) => sum + d.value, 0) /
    monitorData.pm25Data.length;
  const avgO3 =
    monitorData.o3Data.reduce((sum, d) => sum + d.value, 0) /
    monitorData.o3Data.length;
  const maxAod = Math.max(
    ...monitorData.aodHeatmap.map((d) => d.value),
    0
  );
  const activeWarningCount = warnings.filter(
    (w) => w.status !== 'closed'
  ).length;
  const stationCount = 128;

  const pm25ChartData = monitorData.pm25Data.map((d) => ({
    time: d.time,
    value: d.value,
    overStandard: d.value > 75 ? d.value - 75 : 0,
    standard: 75,
  }));

  const o3ChartData = monitorData.o3Data.map((d) => ({
    time: d.time,
    value: d.value,
    overStandard: d.value > 160 ? d.value - 160 : 0,
    standard: 160,
  }));

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-cyber-500" />
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="rounded-md border border-navy-600 bg-navy-800 px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-cyber-500 transition-colors"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-400">— {selectedRegion}监测站</span>
        </div>
        <div className="flex items-center gap-3">
          <RefreshCw
            className={`h-4 w-4 ${autoRefresh ? 'animate-spin text-cyber-400' : 'text-gray-500'}`}
          />
          <span className="text-sm text-gray-400">自动刷新</span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoRefresh ? 'bg-cyber-500' : 'bg-navy-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoRefresh ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-4">
          <div className="glow-card rounded-lg border border-navy-700 bg-navy-800/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-300">
              PM2.5 浓度变化 (μg/m³)
            </h3>
            <ComposedChart
              width={700}
              height={280}
              data={pm25ChartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#243447" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                stroke="#243447"
                interval={2}
              />
              <YAxis
                domain={[0, 300]}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                stroke="#243447"
              />
              <Tooltip content={<Pm25Tooltip />} />
              <ReferenceLine
                y={75}
                stroke="#FF4757"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: '国标二级 (75μg/m³)',
                  position: 'insideTopRight',
                  fill: '#FF4757',
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="overStandard"
                fill="rgba(255,71,87,0.15)"
                stroke="none"
                yAxisId={0}
                baseValue={75}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00D4AA"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#00D4AA' }}
              />
            </ComposedChart>
          </div>

          <div className="glow-card rounded-lg border border-navy-700 bg-navy-800/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-300">
              O3 浓度变化 (μg/m³)
            </h3>
            <ComposedChart
              width={700}
              height={280}
              data={o3ChartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#243447" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                stroke="#243447"
                interval={2}
              />
              <YAxis
                domain={[0, 450]}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                stroke="#243447"
              />
              <Tooltip content={<O3Tooltip />} />
              <ReferenceLine
                y={160}
                stroke="#FF4757"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: '国标二级 (160μg/m³)',
                  position: 'insideTopRight',
                  fill: '#FF4757',
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="overStandard"
                fill="rgba(255,71,87,0.15)"
                stroke="none"
                yAxisId={0}
                baseValue={160}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#FF8C00"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#FF8C00' }}
              />
            </ComposedChart>
          </div>
        </div>

        <div className="col-span-1 flex flex-col gap-4">
          <div className="glow-card rounded-lg border border-navy-700 bg-navy-800/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-300">
              气溶胶光学厚度 (AOD) 空间分布
            </h3>
            <div className="flex gap-2">
              <canvas
                ref={heatmapCanvasRef}
                width={280}
                height={280}
                className="rounded"
              />
              <canvas
                ref={legendCanvasRef}
                width={14}
                height={280}
                className="rounded"
              />
            </div>
          </div>

          <div className="glow-card rounded-lg border border-navy-700 bg-navy-800/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-300">
              预警状态
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {regionWarnings.map(({ region, warning }) => {
                const borderColor = warning
                  ? WARNING_COLORS[warning.level]
                  : '#243447';
                const pulseClass = warning
                  ? 'animate-pulse-glow'
                  : '';
                return (
                  <div
                    key={region}
                    className={`rounded-lg border p-2.5 ${pulseClass}`}
                    style={{
                      borderColor,
                      boxShadow: warning
                        ? `0 0 8px ${WARNING_COLORS[warning.level]}40`
                        : 'none',
                      backgroundColor: 'rgba(27,40,56,0.6)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-200">
                        {region}
                      </span>
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: warning ? WARNING_COLORS[warning.level] : '#6B7280' }}
                      >
                        {warning
                          ? WARNING_LEVEL_LABELS[warning.level]
                          : '正常'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex gap-2 text-[10px] text-gray-400">
                      <span>
                        PM2.5:{' '}
                        <span className="font-mono text-gray-300">
                          {warning && warning.pollutant === 'PM2.5'
                            ? warning.value
                            : '--'}
                        </span>
                      </span>
                      <span>
                        O3:{' '}
                        <span className="font-mono text-gray-300">
                          {warning && warning.pollutant === 'O3'
                            ? warning.value
                            : '--'}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="glow-card flex items-center gap-3 rounded-lg border border-navy-700 bg-navy-800/50 px-4 py-3">
          <Activity className="h-5 w-5 text-cyber-500" />
          <div>
            <p className="text-[10px] text-gray-500">平均PM2.5</p>
            <p className="font-mono text-sm text-gray-200">
              {avgPm25.toFixed(1)}{' '}
              <span className="text-[10px] text-gray-500">μg/m³</span>
            </p>
          </div>
        </div>
        <div className="glow-card flex items-center gap-3 rounded-lg border border-navy-700 bg-navy-800/50 px-4 py-3">
          <Wind className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-[10px] text-gray-500">平均O3</p>
            <p className="font-mono text-sm text-gray-200">
              {avgO3.toFixed(1)}{' '}
              <span className="text-[10px] text-gray-500">μg/m³</span>
            </p>
          </div>
        </div>
        <div className="glow-card flex items-center gap-3 rounded-lg border border-navy-700 bg-navy-800/50 px-4 py-3">
          <Sun className="h-5 w-5 text-yellow-400" />
          <div>
            <p className="text-[10px] text-gray-500">最大AOD</p>
            <p className="font-mono text-sm text-gray-200">
              {maxAod.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="glow-card flex items-center gap-3 rounded-lg border border-navy-700 bg-navy-800/50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-coral-500" />
          <div>
            <p className="text-[10px] text-gray-500">活跃预警数</p>
            <p className="font-mono text-sm text-gray-200">
              {activeWarningCount}
            </p>
          </div>
        </div>
        <div className="glow-card flex items-center gap-3 rounded-lg border border-navy-700 bg-navy-800/50 px-4 py-3">
          <Radio className="h-5 w-5 text-cyber-400" />
          <div>
            <p className="text-[10px] text-gray-500">监测站点数</p>
            <p className="font-mono text-sm text-gray-200">{stationCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
