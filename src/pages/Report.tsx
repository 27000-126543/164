import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Report } from '@/types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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

const CONCENTRATION_DATA: { city: string; pm25: number; o3: number; aod: number }[] = [
  { city: '北京', pm25: 185, o3: 268, aod: 1.82 },
  { city: '上海', pm25: 89, o3: 195, aod: 0.95 },
  { city: '广州', pm25: 72, o3: 152, aod: 0.68 },
  { city: '成都', pm25: 112, o3: 178, aod: 1.15 },
  { city: '武汉', pm25: 135, o3: 215, aod: 1.38 },
  { city: '沈阳', pm25: 67, o3: 145, aod: 0.72 },
  { city: '天津', pm25: 142, o3: 232, aod: 1.45 },
  { city: '南京', pm25: 105, o3: 188, aod: 1.08 },
  { city: '石家庄', pm25: 168, o3: 256, aod: 1.68 },
];

function getWarningLevel(pm25: number, o3: number, aod: number): string {
  if (pm25 > 250 || o3 > 400 || aod > 2.0) return '红色预警 (一级)';
  if (pm25 > 150 || o3 > 265 || aod > 1.5) return '橙色预警 (二级)';
  if (pm25 > 115 || o3 > 215 || aod > 1.0) return '黄色预警 (三级)';
  if (pm25 > 75 || o3 > 160 || aod > 0.6) return '蓝色预警 (四级)';
  return '正常 (达标)';
}

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
    ctx.fillText(`${city.concentration}ug/m3`, cx, cy + 18);
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
        <span className="text-xs text-gray-400 mb-1">PM2.5 (ug/m3)</span>
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
        <p className="text-sm text-gray-400 mb-2 text-center">Direct Radiative Forcing (W/m2)</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={DIRECT_FORCING}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="region" tick={CHART_STYLE.tick} />
            <YAxis tick={CHART_STYLE.tick} domain={[-6, 0]} />
            <Tooltip contentStyle={CHART_STYLE.tooltipStyle.contentStyle} labelStyle={CHART_STYLE.tooltipStyle.labelStyle} />
            <Bar dataKey="value" fill="#FF8C00" radius={[4, 4, 0, 0]} name="Direct" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-sm text-gray-400 mb-2 text-center">Indirect Radiative Forcing (W/m2)</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={INDIRECT_FORCING}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="region" tick={CHART_STYLE.tick} />
            <YAxis tick={CHART_STYLE.tick} domain={[-3, 0]} />
            <Tooltip contentStyle={CHART_STYLE.tooltipStyle.contentStyle} labelStyle={CHART_STYLE.tooltipStyle.labelStyle} />
            <Bar dataKey="value" fill="#00D4AA" radius={[4, 4, 0, 0]} name="Indirect" />
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
        <XAxis dataKey="ss" tick={CHART_STYLE.tick} />
        <YAxis tick={CHART_STYLE.tick} domain={[0, 100]} />
        <Tooltip contentStyle={CHART_STYLE.tooltipStyle.contentStyle} labelStyle={CHART_STYLE.tooltipStyle.labelStyle} />
        <Legend wrapperStyle={{ color: '#9CA3AF' }} />
        <Line type="monotone" dataKey="sulfate" stroke="#00D4AA" strokeWidth={2} dot={{ r: 3 }} name="Sulfate" />
        <Line type="monotone" dataKey="organic" stroke="#FF8C00" strokeWidth={2} dot={{ r: 3 }} name="Organic" />
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
        <YAxis tick={CHART_STYLE.tick} />
        <Tooltip contentStyle={CHART_STYLE.tooltipStyle.contentStyle} labelStyle={CHART_STYLE.tooltipStyle.labelStyle} />
        <Legend wrapperStyle={{ color: '#9CA3AF' }} />
        <Bar dataKey="aromatic" stackId="a" fill="#00D4AA" name="Aromatic" />
        <Bar dataKey="terpene" stackId="a" fill="#3B82F6" name="Terpene" />
        <Bar dataKey="svoc" stackId="a" fill="#FF8C00" name="SVOC" />
        <Bar dataKey="other" stackId="a" fill="#8B5CF6" name="Other" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function generatePDF(report: Report) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 20;

  doc.setFillColor(10, 22, 40);
  doc.rect(0, 0, pageW, 297, 'F');

  doc.setTextColor(0, 212, 170);
  doc.setFontSize(20);
  doc.text('Atmospheric Chemistry-Aerosol-Cloud Simulation Report', margin, y);
  y += 12;

  doc.setTextColor(150, 160, 180);
  doc.setFontSize(10);
  doc.text('All-Weather Atmospheric Chemistry-Aerosol-Cloud Interaction Simulation', margin, y);
  doc.text('& Air Quality Intelligent Early Warning Platform', margin, y + 5);
  y += 15;

  doc.setDrawColor(0, 212, 170);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  doc.setTextColor(200, 210, 220);
  doc.setFontSize(12);
  doc.text('Basic Information', margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(160, 170, 185);
  const infoLines = [
    `City: ${report.city}`,
    `Season: ${report.season}`,
    `Scenario: ${report.scenario}`,
    `Generated At: ${report.generatedAt}`,
    `Report ID: ${report.id}`,
  ];
  infoLines.forEach((line) => {
    doc.text(line, margin + 4, y);
    y += 6;
  });
  y += 6;

  doc.setTextColor(200, 210, 220);
  doc.setFontSize(12);
  doc.text('1. Pollutant Concentration Distribution', margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(160, 170, 185);

  const headerCols = ['City', 'PM2.5 (ug/m3)', 'O3 (ug/m3)', 'AOD', 'Warning Level'];
  const colWidths = [25, 30, 30, 25, 55];
  let cx = margin + 2;
  doc.setFillColor(20, 35, 55);
  doc.rect(margin, y - 4, contentW, 7, 'F');
  doc.setTextColor(0, 212, 170);
  headerCols.forEach((h, i) => {
    doc.text(h, cx, y);
    cx += colWidths[i];
  });
  y += 7;

  CONCENTRATION_DATA.forEach((row, ri) => {
    cx = margin + 2;
    if (ri % 2 === 0) {
      doc.setFillColor(15, 27, 42);
      doc.rect(margin, y - 4, contentW, 6, 'F');
    }
    const wl = getWarningLevel(row.pm25, row.o3, row.aod);
    const isOverLimit = row.pm25 > 75 || row.o3 > 160;
    doc.setTextColor(isOverLimit ? 255 : 200, isOverLimit ? 71 : 210, isOverLimit ? 87 : 220);
    const rowVals = [row.city, String(row.pm25), String(row.o3), String(row.aod), wl];
    rowVals.forEach((v, i) => {
      doc.text(v, cx, y);
      cx += colWidths[i];
    });
    y += 6;
  });

  y += 4;
  doc.setDrawColor(36, 52, 71);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setTextColor(200, 210, 220);
  doc.setFontSize(12);
  doc.text('2. National Standards Reference', margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(160, 170, 185);
  const standards = [
    'PM2.5 Grade II: 75 ug/m3 (24h average)',
    'O3 Grade II: 160 ug/m3 (8h average)',
    'AOD Anomaly Threshold: 0.6 (visible impact)',
    'Red: PM2.5>250, O3>400, AOD>2.0',
    'Orange: PM2.5>150, O3>265, AOD>1.5',
    'Yellow: PM2.5>115, O3>215, AOD>1.0',
    'Blue: PM2.5>75, O3>160, AOD>0.6',
  ];
  standards.forEach((s) => {
    doc.text(s, margin + 4, y);
    y += 5.5;
  });
  y += 6;

  doc.setDrawColor(36, 52, 71);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setTextColor(200, 210, 220);
  doc.setFontSize(12);
  doc.text('3. Aerosol Radiative Effects', margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(160, 170, 185);

  cx = margin + 2;
  doc.setFillColor(20, 35, 55);
  doc.rect(margin, y - 4, contentW, 7, 'F');
  doc.setTextColor(0, 212, 170);
  doc.text('Region', cx, y); cx += 30;
  doc.text('Direct (W/m2)', cx, y); cx += 35;
  doc.text('Indirect (W/m2)', cx, y);
  y += 7;

  for (let i = 0; i < DIRECT_FORCING.length; i++) {
    cx = margin + 2;
    if (i % 2 === 0) {
      doc.setFillColor(15, 27, 42);
      doc.rect(margin, y - 4, contentW, 6, 'F');
    }
    doc.setTextColor(200, 210, 220);
    doc.text(DIRECT_FORCING[i].region, cx, y); cx += 30;
    doc.text(String(DIRECT_FORCING[i].value), cx, y); cx += 35;
    doc.text(String(INDIRECT_FORCING[i].value), cx, y);
    y += 6;
  }
  y += 6;

  doc.setDrawColor(36, 52, 71);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setTextColor(200, 210, 220);
  doc.setFontSize(12);
  doc.text('4. CCN Activation Rate', margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(160, 170, 185);

  cx = margin + 2;
  doc.setFillColor(20, 35, 55);
  doc.rect(margin, y - 4, contentW, 7, 'F');
  doc.setTextColor(0, 212, 170);
  doc.text('Supersaturation', cx, y); cx += 35;
  doc.text('Sulfate (%)', cx, y); cx += 30;
  doc.text('Organic (%)', cx, y);
  y += 7;

  CCN_DATA.forEach((row, ri) => {
    cx = margin + 2;
    if (ri % 2 === 0) {
      doc.setFillColor(15, 27, 42);
      doc.rect(margin, y - 4, contentW, 6, 'F');
    }
    doc.setTextColor(200, 210, 220);
    doc.text(row.ss, cx, y); cx += 35;
    doc.text(String(row.sulfate), cx, y); cx += 30;
    doc.text(String(row.organic), cx, y);
    y += 6;
  });
  y += 6;

  if (y > 240) {
    doc.addPage();
    doc.setFillColor(10, 22, 40);
    doc.rect(0, 0, pageW, 297, 'F');
    y = 20;
  }

  doc.setDrawColor(36, 52, 71);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setTextColor(200, 210, 220);
  doc.setFontSize(12);
  doc.text('5. SOA Contribution Decomposition (ug/m3)', margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(160, 170, 185);

  cx = margin + 2;
  doc.setFillColor(20, 35, 55);
  doc.rect(margin, y - 4, contentW, 7, 'F');
  doc.setTextColor(0, 212, 170);
  doc.text('Region', cx, y); cx += 25;
  doc.text('Aromatic', cx, y); cx += 25;
  doc.text('Terpene', cx, y); cx += 22;
  doc.text('SVOC', cx, y); cx += 22;
  doc.text('Other', cx, y);
  y += 7;

  SOA_DATA.forEach((row, ri) => {
    cx = margin + 2;
    if (ri % 2 === 0) {
      doc.setFillColor(15, 27, 42);
      doc.rect(margin, y - 4, contentW, 6, 'F');
    }
    doc.setTextColor(200, 210, 220);
    doc.text(row.region, cx, y); cx += 25;
    doc.text(String(row.aromatic), cx, y); cx += 25;
    doc.text(String(row.terpene), cx, y); cx += 22;
    doc.text(String(row.svoc), cx, y); cx += 22;
    doc.text(String(row.other), cx, y);
    y += 6;
  });
  y += 10;

  doc.setDrawColor(0, 212, 170);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setTextColor(100, 110, 125);
  doc.setFontSize(8);
  doc.text('Report generated by All-Weather Atmospheric Chemistry-Aerosol-Cloud', margin, y);
  doc.text('Interaction Simulation & Air Quality Intelligent Early Warning Platform', margin, y + 4);
  doc.text(`Generation time: ${report.generatedAt}`, margin, y + 10);

  const fileName = `Atmospheric_Report_${report.city}_${report.season}_${report.scenario}.pdf`;
  doc.save(fileName);
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
              {report.city} / {report.season} / {report.scenario}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => generatePDF(report)} className="cyber-btn flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Export PDF
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
                      <button
                        onClick={() => generatePDF(report)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-gray-400 hover:bg-navy-700 transition-colors"
                      >
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
