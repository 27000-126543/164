import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Report } from '@/types';
import {
  FileText, Eye, Download, X, Filter, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const CITIES = ['北京', '上海', '广州', '成都', '武汉', '沈阳'];
const SEASONS = ['春', '夏', '秋', '冬'];
const SCENARIOS = ['基准情景', '减排情景', '极端天气'];
const SEASON_FULL: Record<string, string> = { '春': '春季', '夏': '夏季', '秋': '秋季', '冬': '冬季' };

const DIRECT_FORCING = [
  { region: '华北', value: -4.2 }, { region: '华东', value: -3.8 },
  { region: '华南', value: -2.9 }, { region: '西南', value: -2.1 },
  { region: '东北', value: -3.5 },
];
const INDIRECT_FORCING = [
  { region: '华北', value: -1.8 }, { region: '华东', value: -1.5 },
  { region: '华南', value: -0.9 }, { region: '西南', value: -0.6 },
  { region: '东北', value: -1.2 },
];
const CCN_DATA = [
  { ss: '0.1%', sulfate: 12, organic: 5 }, { ss: '0.2%', sulfate: 35, organic: 15 },
  { ss: '0.3%', sulfate: 55, organic: 28 }, { ss: '0.4%', sulfate: 70, organic: 40 },
  { ss: '0.5%', sulfate: 80, organic: 52 }, { ss: '0.6%', sulfate: 87, organic: 62 },
  { ss: '0.7%', sulfate: 91, organic: 70 }, { ss: '0.8%', sulfate: 94, organic: 77 },
  { ss: '0.9%', sulfate: 96, organic: 82 }, { ss: '1.0%', sulfate: 98, organic: 86 },
];
const SOA_DATA = [
  { region: '华北', aromatic: 3.2, terpene: 1.8, svoc: 2.1, other: 0.9 },
  { region: '华东', aromatic: 2.8, terpene: 1.5, svoc: 1.9, other: 0.7 },
  { region: '华南', aromatic: 2.1, terpene: 2.3, svoc: 1.4, other: 0.5 },
  { region: '西南', aromatic: 1.6, terpene: 2.6, svoc: 1.2, other: 0.4 },
  { region: '东北', aromatic: 2.5, terpene: 1.2, svoc: 1.7, other: 0.8 },
];

type TabKey = 'contour' | 'aerosol' | 'ccn' | 'soa';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'contour', label: '污染物浓度等值面' },
  { key: 'aerosol', label: '气溶胶辐射效应' },
  { key: 'ccn', label: 'CCN活化率' },
  { key: 'soa', label: 'SOA贡献分解' },
];

const CONTOUR_COLORS = [
  { threshold: 35, color: '#3B82F6' },
  { threshold: 75, color: '#10B981' },
  { threshold: 115, color: '#F59E0B' },
  { threshold: 150, color: '#EF4444' },
  { threshold: 250, color: '#991B1B' },
];
const LEGEND_ITEMS = [
  { label: '0-35 优', color: '#3B82F6' },
  { label: '35-75 良', color: '#10B981' },
  { label: '75-115 轻度', color: '#F59E0B' },
  { label: '115-150 中度', color: '#EF4444' },
  { label: '150-250 重度', color: '#991B1B' },
];
const CITY_POSITIONS: { name: string; rx: number; ry: number; concentration: number }[] = [
  { name: '北京', rx: 0.55, ry: 0.30, concentration: 185 },
  { name: '天津', rx: 0.60, ry: 0.35, concentration: 142 },
  { name: '石家庄', rx: 0.48, ry: 0.40, concentration: 168 },
  { name: '上海', rx: 0.72, ry: 0.50, concentration: 89 },
  { name: '南京', rx: 0.65, ry: 0.48, concentration: 105 },
  { name: '广州', rx: 0.58, ry: 0.72, concentration: 72 },
  { name: '成都', rx: 0.30, ry: 0.55, concentration: 112 },
  { name: '武汉', rx: 0.52, ry: 0.55, concentration: 135 },
  { name: '沈阳', rx: 0.62, ry: 0.18, concentration: 67 },
];

function getContourColor(value: number): string {
  for (const c of CONTOUR_COLORS) {
    if (value < c.threshold) return c.color;
  }
  return CONTOUR_COLORS[CONTOUR_COLORS.length - 1].color;
}

function drawContourMap(canvas: HTMLCanvasElement, cityName: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#0D1B2A';
  ctx.fillRect(0, 0, W, H);

  const primary = CITY_POSITIONS.find((c) => c.name === cityName) || CITY_POSITIONS[0];
  const centerX = primary.rx * W;
  const centerY = primary.ry * H;
  const maxRadius = Math.min(W, H) * 0.42;

  const rings = [
    { radius: maxRadius, value: 35 },
    { radius: maxRadius * 0.78, value: 75 },
    { radius: maxRadius * 0.58, value: 115 },
    { radius: maxRadius * 0.38, value: 150 },
    { radius: maxRadius * 0.18, value: 250 },
  ];
  for (const ring of rings) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, ring.radius, 0, Math.PI * 2);
    ctx.fillStyle = getContourColor(ring.value) + '40';
    ctx.fill();
    ctx.strokeStyle = getContourColor(ring.value) + '80';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (const city of CITY_POSITIONS) {
    const cx = city.rx * W;
    const cy = city.ry * H;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#E5E7EB';
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#E5E7EB';
    ctx.font = '12px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(city.name, cx, cy - 10);
    ctx.fillStyle = getContourColor(city.concentration);
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`${city.concentration}μg/m³`, cx, cy + 18);
  }
}

const CHART_STYLE = {
  axisLine: { stroke: '#243447' },
  tick: { fill: '#9CA3AF', fontSize: 11 },
  tooltipStyle: {
    contentStyle: { backgroundColor: '#1B2838', border: '1px solid #243447', borderRadius: 8, color: '#E5E7EB' },
    labelStyle: { color: '#9CA3AF' },
  } as const,
};

function ContourTab({ city }: { city: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) drawContourMap(canvasRef.current, city);
  }, [city]);
  return (
    <div className="flex gap-4">
      <canvas ref={canvasRef} width={680} height={480} className="rounded-lg border border-navy-700/50" />
      <div className="flex flex-col gap-2 pt-2 min-w-[120px]">
        <span className="text-xs text-gray-400 mb-1">PM2.5 (μg/m³)</span>
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AerosolTab() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm text-gray-400 mb-2 text-center">直接辐射效应 (W/m²)</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={DIRECT_FORCING}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="region" tick={CHART_STYLE.tick} />
            <YAxis tick={CHART_STYLE.tick} domain={[-6, 0]} />
            <Tooltip contentStyle={CHART_STYLE.tooltipStyle.contentStyle} labelStyle={CHART_STYLE.tooltipStyle.labelStyle} />
            <Bar dataKey="value" fill="#FF8C00" radius={[4, 4, 0, 0]} name="直接辐射强迫" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-sm text-gray-400 mb-2 text-center">间接辐射效应 (W/m²)</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={INDIRECT_FORCING}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="region" tick={CHART_STYLE.tick} />
            <YAxis tick={CHART_STYLE.tick} domain={[-3, 0]} />
            <Tooltip contentStyle={CHART_STYLE.tooltipStyle.contentStyle} labelStyle={CHART_STYLE.tooltipStyle.labelStyle} />
            <Bar dataKey="value" fill="#00D4AA" radius={[4, 4, 0, 0]} name="间接辐射强迫" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CcnTab() {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart data={CCN_DATA}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="ss" tick={CHART_STYLE.tick} label={{ value: '过饱和度', position: 'insideBottom', offset: -4, fill: '#9CA3AF', fontSize: 12 }} />
        <YAxis tick={CHART_STYLE.tick} domain={[0, 100]} label={{ value: '活化率 (%)', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }} />
        <Tooltip contentStyle={CHART_STYLE.tooltipStyle.contentStyle} labelStyle={CHART_STYLE.tooltipStyle.labelStyle} />
        <Legend wrapperStyle={{ color: '#9CA3AF' }} />
        <Line type="monotone" dataKey="sulfate" stroke="#00D4AA" strokeWidth={2} dot={{ r: 3 }} name="硫酸盐气溶胶" />
        <Line type="monotone" dataKey="organic" stroke="#FF8C00" strokeWidth={2} dot={{ r: 3 }} name="有机气溶胶" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SoaTab() {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={SOA_DATA}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="region" tick={CHART_STYLE.tick} />
        <YAxis tick={CHART_STYLE.tick} label={{ value: '贡献量 (μg/m³)', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }} />
        <Tooltip contentStyle={CHART_STYLE.tooltipStyle.contentStyle} labelStyle={CHART_STYLE.tooltipStyle.labelStyle} />
        <Legend wrapperStyle={{ color: '#9CA3AF' }} />
        <Bar dataKey="aromatic" stackId="a" fill="#00D4AA" name="芳香烃" />
        <Bar dataKey="terpene" stackId="a" fill="#3B82F6" name="萜烯" />
        <Bar dataKey="svoc" stackId="a" fill="#FF8C00" name="半挥发性有机物" />
        <Bar dataKey="other" stackId="a" fill="#8B5CF6" name="其他" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PreviewPanel({ report, onClose }: { report: Report; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>('contour');
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[860px] max-w-[90vw] h-full bg-navy-900 border-l border-navy-700 shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-navy-900/95 backdrop-blur border-b border-navy-700">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-cyber-500" />
            <h2 className="text-lg font-semibold text-gray-100">
              {report.city} · {report.season} · {report.scenario}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="cyber-btn flex items-center gap-1.5">
              <Download className="w-4 h-4" /> 导出PDF
            </button>
            <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-navy-700 text-gray-400 hover:text-gray-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-6 pt-4">
          <div className="flex gap-1 border-b border-navy-700 mb-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-cyber-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyber-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
          <div className="pb-8">
            {activeTab === 'contour' && <ContourTab city={report.city} />}
            {activeTab === 'aerosol' && <AerosolTab />}
            {activeTab === 'ccn' && <CcnTab />}
            {activeTab === 'soa' && <SoaTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { reports, addReport, updateReport } = useAppStore();
  const [city, setCity] = useState('北京');
  const [season, setSeason] = useState('夏');
  const [scenario, setScenario] = useState('基准情景');
  const [previewReport, setPreviewReport] = useState<Report | null>(null);

  const handleGenerate = useCallback(() => {
    const id = `rpt-${Date.now()}`;
    const now = new Date();
    const generatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    addReport({
      id,
      taskId: '',
      city,
      season: SEASON_FULL[season],
      scenario,
      generatedAt,
      status: 'generating',
    });
    setTimeout(() => {
      updateReport(id, { status: 'ready' });
    }, 3000);
  }, [city, season, scenario, addReport, updateReport]);

  return (
    <div className="space-y-6">
      <div className="glow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-cyber-500" />
          <span className="text-sm font-medium text-gray-200">报告生成</span>
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">城市</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyber-500/50"
            >
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">季节</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyber-500/50"
            >
              {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400">情景</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyber-500/50"
            >
              {SCENARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={handleGenerate} className="cyber-btn flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> 生成报告
          </button>
        </div>
      </div>

      <div>
        <h2 className="section-title">报告列表</h2>
        {reports.length === 0 ? (
          <div className="glow-card p-12 text-center text-gray-500">暂无报告</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {reports.map((report) => (
              <div key={report.id} className="glow-card-hover p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="status-badge bg-cyber-500/15 text-cyber-400">{report.city}</span>
                  <span className="status-badge bg-navy-700/80 text-gray-300">{report.season}</span>
                  <span className="status-badge bg-navy-700/80 text-gray-300">{report.scenario}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{report.generatedAt}</p>
                <div className="flex items-center justify-between">
                  <span
                    className={`status-badge ${
                      report.status === 'generating'
                        ? 'bg-amber-500/15 text-amber-500 pulse-warning'
                        : 'bg-cyber-500/15 text-cyber-500'
                    }`}
                  >
                    {report.status === 'generating' ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> 生成中
                      </span>
                    ) : '已就绪'}
                  </span>
                  {report.status === 'ready' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewReport(report)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-cyber-400 hover:bg-cyber-500/10 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> 预览
                      </button>
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-gray-400 hover:bg-navy-700 transition-colors">
                        <Download className="w-3.5 h-3.5" /> 导出PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewReport && (
        <PreviewPanel report={previewReport} onClose={() => setPreviewReport(null)} />
      )}
    </div>
  );
}
