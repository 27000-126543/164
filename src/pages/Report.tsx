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

async function generatePDF(report: Report) {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;background:#0A1628;color:#C8D2DC;font-family:"Noto Sans SC",system-ui,sans-serif;padding:0;';

  const HEADER_H = 52;
  const FOOTER_H = 36;
  const PAGE_H = 1123;
  const CONTENT_H = PAGE_H - HEADER_H - FOOTER_H;

  function headerHTML(pageNum: number) {
    return `<div style="height:${HEADER_H}px;padding:10px 40px 8px;border-bottom:1px solid #1B2838;display:flex;align-items:center;justify-content:space-between;">
      <div><span style="color:#00D4AA;font-size:14px;font-weight:700;">大气化学-气溶胶-云相互作用模拟报告</span><span style="color:#6B7280;font-size:11px;margin-left:16px;">${report.city} · ${report.season} · ${report.scenario}</span></div>
      <span style="color:#6B7280;font-size:10px;">第 ${pageNum} 页</span>
    </div>`;
  }

  function footerHTML(pageNum: number, totalPages: number) {
    return `<div style="height:${FOOTER_H}px;padding:8px 40px;border-top:1px solid #1B2838;display:flex;align-items:center;justify-content:space-between;">
      <span style="color:#4B5563;font-size:9px;">全天候大气化学-气溶胶-云相互作用模拟与空气质量智能预警平台</span>
      <span style="color:#4B5563;font-size:9px;">生成时间: ${report.generatedAt}　${pageNum} / ${totalPages}</span>
    </div>`;
  }

  const sectionStyle = 'margin:0 0 20px;';
  const titleStyle = 'color:#00D4AA;font-size:15px;font-weight:600;margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid #1B2838;';
  const tableStyle = 'width:100%;border-collapse:collapse;font-size:12px;';
  const thStyle = 'background:#14233A;color:#00D4AA;padding:8px 12px;text-align:left;font-weight:500;border-bottom:1px solid #1B2838;';
  const tdStyle = 'padding:7px 12px;border-bottom:1px solid #111D2E;';
  const tdAltStyle = 'padding:7px 12px;border-bottom:1px solid #111D2E;background:#0D1725;';
  const overStyle = 'color:#FF4757;font-weight:600;';

  const sections: string[] = [];

  sections.push(`<div style="${sectionStyle}">
    <h2 style="${titleStyle}">基本信息</h2>
    <table style="${tableStyle}"><tbody>
      <tr><td style="${tdStyle};width:25%;color:#6B7280;">城市</td><td style="${tdStyle}">${report.city}</td><td style="${tdStyle};width:25%;color:#6B7280;">季节</td><td style="${tdStyle}">${report.season}</td></tr>
      <tr><td style="${tdAltStyle};color:#6B7280;">排放情景</td><td style="${tdAltStyle}">${report.scenario}</td><td style="${tdAltStyle};color:#6B7280;">生成时间</td><td style="${tdAltStyle}">${report.generatedAt}</td></tr>
      <tr><td style="${tdStyle};color:#6B7280;">报告编号</td><td style="${tdStyle}" colspan="3">${report.id}</td></tr>
    </tbody></table>
  </div>`);

  sections.push(`<div style="${sectionStyle}">
    <h2 style="${titleStyle}">一、污染物浓度时空分布</h2>
    <table style="${tableStyle}"><thead><tr>
      <th style="${thStyle}">城市</th><th style="${thStyle}">PM2.5 (μg/m³)</th><th style="${thStyle}">O₃ (μg/m³)</th><th style="${thStyle}">AOD</th><th style="${thStyle}">预警等级</th>
    </tr></thead><tbody>
    ${CONCENTRATION_DATA.map((r, i) => {
      const wl = getWarningLevel(r.pm25, r.o3, r.aod);
      const over = r.pm25 > 75 || r.o3 > 160;
      const s = i % 2 === 0 ? tdStyle : tdAltStyle;
      return `<tr><td style="${s}">${r.city}</td><td style="${s}${r.pm25 > 75 ? ';' + overStyle : ''}">${r.pm25}</td><td style="${s}${r.o3 > 160 ? ';' + overStyle : ''}">${r.o3}</td><td style="${s}">${r.aod}</td><td style="${s}${over ? ';' + overStyle : ''}">${wl}</td></tr>`;
    }).join('')}
    </tbody></table>
  </div>`);

  sections.push(`<div style="${sectionStyle}">
    <h2 style="${titleStyle}">二、国家二级标准参考</h2>
    <table style="${tableStyle}"><thead><tr>
      <th style="${thStyle}">污染物</th><th style="${thStyle}">标准限值</th><th style="${thStyle}">平均时间</th><th style="${thStyle}">说明</th>
    </tr></thead><tbody>
      <tr><td style="${tdStyle}">PM2.5</td><td style="${tdStyle}${overStyle}">75 μg/m³</td><td style="${tdStyle}">24小时平均</td><td style="${tdStyle}">超过即为超标</td></tr>
      <tr><td style="${tdAltStyle}">O₃</td><td style="${tdAltStyle}${overStyle}">160 μg/m³</td><td style="${tdAltStyle}">8小时平均</td><td style="${tdAltStyle}">超过即为超标</td></tr>
      <tr><td style="${tdStyle}">AOD</td><td style="${tdStyle}">0.6</td><td style="${tdStyle}">瞬时</td><td style="${tdStyle}">异常影响阈值</td></tr>
    </tbody></table>
    <div style="margin-top:10px;font-size:11px;color:#6B7280;">
      <div style="margin-bottom:4px;">预警分级标准：</div>
      <div>🔴 红色预警：PM2.5 &gt; 250，O₃ &gt; 400，AOD &gt; 2.0</div>
      <div>🟠 橙色预警：PM2.5 &gt; 150，O₃ &gt; 265，AOD &gt; 1.5</div>
      <div>🟡 黄色预警：PM2.5 &gt; 115，O₃ &gt; 215，AOD &gt; 1.0</div>
      <div>🔵 蓝色预警：PM2.5 &gt; 75，O₃ &gt; 160，AOD &gt; 0.6</div>
    </div>
  </div>`);

  sections.push(`<div style="${sectionStyle}">
    <h2 style="${titleStyle}">三、气溶胶辐射效应</h2>
    <table style="${tableStyle}"><thead><tr>
      <th style="${thStyle}">区域</th><th style="${thStyle}">直接辐射强迫 (W/m²)</th><th style="${thStyle}">间接辐射强迫 (W/m²)</th>
    </tr></thead><tbody>
    ${DIRECT_FORCING.map((r, i) => {
      const s = i % 2 === 0 ? tdStyle : tdAltStyle;
      return `<tr><td style="${s}">${r.region}</td><td style="${s}">${r.value}</td><td style="${s}">${INDIRECT_FORCING[i].value}</td></tr>`;
    }).join('')}
    </tbody></table>
  </div>`);

  sections.push(`<div style="${sectionStyle}">
    <h2 style="${titleStyle}">四、云凝结核(CCN)活化率</h2>
    <table style="${tableStyle}"><thead><tr>
      <th style="${thStyle}">过饱和度</th><th style="${thStyle}">硫酸盐气溶胶 (%)</th><th style="${thStyle}">有机气溶胶 (%)</th>
    </tr></thead><tbody>
    ${CCN_DATA.map((r, i) => {
      const s = i % 2 === 0 ? tdStyle : tdAltStyle;
      return `<tr><td style="${s}">${r.ss}</td><td style="${s}">${r.sulfate}</td><td style="${s}">${r.organic}</td></tr>`;
    }).join('')}
    </tbody></table>
  </div>`);

  sections.push(`<div style="${sectionStyle}">
    <h2 style="${titleStyle}">五、二次有机气溶胶(SOA)贡献分解 (μg/m³)</h2>
    <table style="${tableStyle}"><thead><tr>
      <th style="${thStyle}">区域</th><th style="${thStyle}">芳香烃</th><th style="${thStyle}">萜烯</th><th style="${thStyle}">半挥发性有机物</th><th style="${thStyle}">其他</th>
    </tr></thead><tbody>
    ${SOA_DATA.map((r, i) => {
      const s = i % 2 === 0 ? tdStyle : tdAltStyle;
      return `<tr><td style="${s}">${r.region}</td><td style="${s}">${r.aromatic}</td><td style="${s}">${r.terpene}</td><td style="${s}">${r.svoc}</td><td style="${s}">${r.other}</td></tr>`;
    }).join('')}
    </tbody></table>
  </div>`);

  const pages: string[] = [];
  let currentPage = '';
  let currentHeight = 0;

  for (const section of sections) {
    const measureDiv = document.createElement('div');
    measureDiv.style.cssText = `position:absolute;left:-9999px;top:0;width:714px;background:#0A1628;color:#C8D2DC;font-family:"Noto Sans SC",system-ui,sans-serif;padding:0;`;
    measureDiv.innerHTML = section;
    document.body.appendChild(measureDiv);
    const sectionHeight = measureDiv.offsetHeight;
    document.body.removeChild(measureDiv);

    if (currentHeight + sectionHeight > CONTENT_H && currentPage !== '') {
      pages.push(currentPage);
      currentPage = section;
      currentHeight = sectionHeight;
    } else {
      currentPage += section;
      currentHeight += sectionHeight;
    }
  }
  if (currentPage) pages.push(currentPage);

  const totalPages = pages.length;

  const fullHTML = pages.map((pageContent, i) => {
    return `<div style="width:794px;height:${PAGE_H}px;overflow:hidden;">
      ${headerHTML(i + 1)}
      <div style="padding:20px 40px;min-height:${CONTENT_H}px;">${pageContent}</div>
      ${footerHTML(i + 1, totalPages)}
    </div>`;
  }).join('');

  container.innerHTML = fullHTML;
  document.body.appendChild(container);

  try {
    await document.fonts.ready;

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0A1628',
      logging: false,
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;
    const singlePageImgH = imgH / totalPages;

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) doc.addPage();
      doc.addImage(
        canvas,
        'PNG',
        0,
        -i * singlePageImgH,
        imgW,
        imgH,
        undefined,
        'FAST'
      );
    }

    const fileName = `大气模拟报告_${report.city}_${report.season}_${report.scenario}.pdf`;
    doc.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}

function PreviewPanel({ report, onClose, onExport, exporting }: { report: Report; onClose: () => void; onExport: (r: Report) => void; exporting: boolean }) {
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
            <button onClick={() => onExport(report)} disabled={exporting} className="cyber-btn flex items-center gap-1.5 disabled:opacity-50">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export PDF
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
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async (rpt: Report) => {
    if (exporting) return;
    setExporting(true);
    try {
      await generatePDF(rpt);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

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
                        onClick={() => handleExport(report)}
                        disabled={exporting}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-gray-400 hover:bg-navy-700 transition-colors disabled:opacity-50"
                      >
                        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 导出PDF
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
        <PreviewPanel report={previewReport} onClose={() => setPreviewReport(null)} onExport={handleExport} exporting={exporting} />
      )}
    </div>
  );
}
