import { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  AlertOctagon,
  Info,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  ClipboardCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { WarningEvent, WarningLevel } from '@/types';

const LEVEL_CONFIG: Record<WarningLevel, {
  label: string;
  sublabel: string;
  color: string;
  border: string;
  bg: string;
  badge: string;
  icon: typeof AlertTriangle;
  action: string;
}> = {
  red: {
    label: '红色预警',
    sublabel: '一级',
    color: 'text-warn-red',
    border: 'border-l-warn-red',
    bg: 'bg-warn-red/10',
    badge: 'bg-warn-red/20 text-warn-red',
    icon: AlertOctagon,
    action: '推送至应急指挥部',
  },
  orange: {
    label: '橙色预警',
    sublabel: '二级',
    color: 'text-warn-orange',
    border: 'border-l-warn-orange',
    bg: 'bg-warn-orange/10',
    badge: 'bg-warn-orange/20 text-warn-orange',
    icon: ShieldAlert,
    action: '推送至预测中心',
  },
  yellow: {
    label: '黄色预警',
    sublabel: '三级',
    color: 'text-warn-yellow',
    border: 'border-l-warn-yellow',
    bg: 'bg-warn-yellow/10',
    badge: 'bg-warn-yellow/20 text-warn-yellow',
    icon: AlertTriangle,
    action: '推送至监测中心',
  },
  blue: {
    label: '蓝色预警',
    sublabel: '四级',
    color: 'text-warn-blue',
    border: 'border-l-warn-blue',
    bg: 'bg-warn-blue/10',
    badge: 'bg-warn-blue/20 text-warn-blue',
    icon: Info,
    action: '记录备案',
  },
};

const STATUS_CONFIG: Record<WarningEvent['status'], { label: string; color: string; bg: string }> = {
  active: { label: '活跃', color: 'text-warn-red', bg: 'bg-warn-red/15' },
  reviewing: { label: '复核中', color: 'text-warn-orange', bg: 'bg-warn-orange/15' },
  adjusting: { label: '调整中', color: 'text-cyber-400', bg: 'bg-cyber-500/15' },
  closed: { label: '已关闭', color: 'text-gray-400', bg: 'bg-gray-500/15' },
};

const FILTER_TABS: { key: 'all' | WarningEvent['status']; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '活跃' },
  { key: 'reviewing', label: '复核中' },
  { key: 'adjusting', label: '调整中' },
  { key: 'closed', label: '已关闭' },
];

const TRAFFIC_OPTIONS = ['不限行', '单双号限行', '全员限行'];

export default function Warning() {
  const { warnings, updateWarning, adjustmentLogs, addAdjustmentLog, addReductionPlan } = useAppStore();
  const [filter, setFilter] = useState<'all' | WarningEvent['status']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [productionLimit, setProductionLimit] = useState(30);
  const [dustControl, setDustControl] = useState(60);
  const [trafficLevel, setTrafficLevel] = useState(0);

  const selected = warnings.find((w) => w.id === selectedId) ?? null;

  const filtered = filter === 'all' ? warnings : warnings.filter((w) => w.status === filter);

  const levelCounts: Record<WarningLevel, number> = {
    red: warnings.filter((w) => w.level === 'red').length,
    orange: warnings.filter((w) => w.level === 'orange').length,
    yellow: warnings.filter((w) => w.level === 'yellow').length,
    blue: warnings.filter((w) => w.level === 'blue').length,
  };

  const handleStartReview = (id: string) => {
    updateWarning(id, { status: 'reviewing' });
    setSelectedId(id);
  };

  const handleApprove = (warning: WarningEvent) => {
    updateWarning(warning.id, { status: 'adjusting' });
    addAdjustmentLog({
      id: `adj-${Date.now()}`,
      warningId: warning.id,
      parameter: '复核通过',
      oldValue: 0,
      newValue: 1,
      operator: '陈志远',
      adjustedAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/\//g, '-'),
    });
    addReductionPlan({
      id: `plan-${Date.now()}`,
      warningId: warning.id,
      productionLimitRatio: productionLimit / 100,
      dustControlIntensity: dustControl / 100,
      trafficRestrictionLevel: trafficLevel,
      effectiveFrom: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).replace(/\//g, '-'),
    });
    setProductionLimit(30);
    setDustControl(60);
    setTrafficLevel(0);
    setReviewComment('');
  };

  const handleReject = (id: string) => {
    updateWarning(id, { status: 'active' });
    setReviewComment('');
  };

  const sortedLogs = [...adjustmentLogs].sort((a, b) =>
    b.adjustedAt.localeCompare(a.adjustedAt)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glow-card p-5">
        <h2 className="section-title flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warn-orange" />
          预警等级统计
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {(Object.keys(LEVEL_CONFIG) as WarningLevel[]).map((level) => {
            const cfg = LEVEL_CONFIG[level];
            const Icon = cfg.icon;
            return (
              <div
                key={level}
                className={cn(
                  'border-l-4 rounded-lg p-4 transition-all duration-200 hover:scale-[1.02]',
                  cfg.border,
                  cfg.bg
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-5 w-5', cfg.color)} />
                    <span className={cn('font-semibold text-sm', cfg.color)}>{cfg.label}</span>
                  </div>
                  <span className="text-xs text-gray-400">{cfg.sublabel}</span>
                </div>
                <div className={cn('metric-value text-2xl mb-1', cfg.color)}>
                  {levelCounts[level]}
                </div>
                <div className="text-xs text-gray-400">{cfg.action}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 glow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-cyber-500" />
              预警事件列表
            </h2>
            <div className="flex gap-1 bg-navy-900 rounded-lg p-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    filter === tab.key
                      ? 'bg-navy-700 text-cyber-400'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {filtered.map((warning) => {
              const lcfg = LEVEL_CONFIG[warning.level];
              const scfg = STATUS_CONFIG[warning.status];
              return (
                <div
                  key={warning.id}
                  onClick={() => setSelectedId(warning.id)}
                  className={cn(
                    'flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all duration-200',
                    selectedId === warning.id
                      ? 'border-cyber-500/40 bg-cyber-500/5'
                      : 'border-navy-700/50 bg-navy-900/40 hover:border-navy-600'
                  )}
                >
                  <div className={cn('w-1 self-stretch rounded-full shrink-0', lcfg.bg.replace('/10', '/60'))} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('status-badge', lcfg.badge)}>
                        {lcfg.label}
                      </span>
                      <span className="text-sm font-medium text-gray-100">
                        {warning.region}
                      </span>
                      <span className="text-sm text-gray-300">
                        {warning.pollutant}{' '}
                        <span className="font-mono text-warn-red">{warning.value}</span>
                        <span className="text-gray-500"> vs </span>
                        <span className="font-mono text-gray-400">{warning.threshold}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span className="font-mono">{warning.triggeredAt}</span>
                      </span>
                      <span className={cn('status-badge', scfg.bg, scfg.color)}>
                        {scfg.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {warning.status === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartReview(warning.id);
                        }}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-navy-700 text-gray-200 hover:bg-navy-600 transition-colors"
                      >
                        开始复核
                      </button>
                    )}
                    {warning.status === 'reviewing' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(warning);
                          }}
                          className="cyber-btn !px-3 !py-1.5 !text-xs"
                        >
                          通过
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(warning.id);
                          }}
                          className="danger-btn !px-3 !py-1.5 !text-xs"
                        >
                          驳回
                        </button>
                      </>
                    )}
                    {warning.status === 'adjusting' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(warning.id);
                        }}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-cyber-500/10 text-cyber-400 hover:bg-cyber-500/20 transition-colors"
                      >
                        查看方案
                      </button>
                    )}
                    {warning.status === 'closed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(warning.id);
                        }}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-navy-700 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        查看日志
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
                <span className="text-sm">暂无预警事件</span>
              </div>
            )}
          </div>
        </div>

        <div className="glow-card p-5">
          <h2 className="section-title flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-cyber-500" />
            复核与调整
          </h2>

          {!selected && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <ChevronRight className="h-8 w-8 mb-2 opacity-30" />
              <span className="text-sm">请从左侧选择预警事件</span>
            </div>
          )}

          {selected && selected.status === 'reviewing' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-navy-900/60 p-4 border border-navy-700/50">
                <h3 className="text-sm font-medium text-gray-200 mb-3">复核清单</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-cyber-400" />
                    <span className="text-gray-300">数据校验</span>
                    <span className="ml-auto text-cyber-400 text-xs">通过</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-cyber-400" />
                    <span className="text-gray-300">模型合理性</span>
                    <span className="ml-auto text-cyber-400 text-xs">通过</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-warn-yellow" />
                    <span className="text-gray-300">阈值验证</span>
                    <span className="ml-auto text-warn-yellow text-xs">待验证</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">复核意见</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="请输入复核意见..."
                  className="w-full rounded-lg bg-navy-900 border border-navy-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-cyber-500/50 focus:outline-none resize-none h-20"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(selected)}
                  className="cyber-btn flex-1 !text-sm"
                >
                  通过
                </button>
                <button
                  onClick={() => handleReject(selected.id)}
                  className="danger-btn flex-1 !text-sm"
                >
                  驳回
                </button>
              </div>
            </div>
          )}

          {selected && selected.status === 'adjusting' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-navy-900/60 p-4 border border-navy-700/50">
                <h3 className="text-sm font-medium text-gray-200 mb-3">减排方案</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-gray-400">限产比例</label>
                      <span className="text-sm font-mono text-cyber-400">{productionLimit}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={productionLimit}
                      onChange={(e) => setProductionLimit(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-navy-700 cursor-pointer accent-cyber-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-gray-400">扬尘控制强度</label>
                      <span className="text-sm font-mono text-cyber-400">{dustControl}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={dustControl}
                      onChange={(e) => setDustControl(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-navy-700 cursor-pointer accent-cyber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">交通限行等级</label>
                    <select
                      value={trafficLevel}
                      onChange={(e) => setTrafficLevel(Number(e.target.value))}
                      className="w-full rounded-lg bg-navy-900 border border-navy-700 px-3 py-2 text-sm text-gray-200 focus:border-cyber-500/50 focus:outline-none"
                    >
                      {TRAFFIC_OPTIONS.map((opt, i) => (
                        <option key={i} value={i}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button className="cyber-btn w-full !text-sm">
                确认调整并重新模拟
              </button>
              <button className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-navy-600 text-gray-300 hover:bg-navy-700 transition-colors">
                保存方案
              </button>
            </div>
          )}

          {selected && (selected.status === 'active' || selected.status === 'closed') && (
            <div className="space-y-4">
              <div className="rounded-lg bg-navy-900/60 p-4 border border-navy-700/50">
                <h3 className="text-sm font-medium text-gray-200 mb-3">预警详情</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">预警编号</span>
                    <span className="text-gray-200 font-mono">{selected.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">预警等级</span>
                    <span className={cn(LEVEL_CONFIG[selected.level].color)}>
                      {LEVEL_CONFIG[selected.level].label}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">区域</span>
                    <span className="text-gray-200">{selected.region}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">污染物</span>
                    <span className="text-gray-200">{selected.pollutant}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">监测值</span>
                    <span className="font-mono text-warn-red">{selected.value}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">阈值</span>
                    <span className="font-mono text-gray-300">{selected.threshold}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">触发时间</span>
                    <span className="font-mono text-gray-200">{selected.triggeredAt}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">当前状态</span>
                    <span className={cn('status-badge', STATUS_CONFIG[selected.status].bg, STATUS_CONFIG[selected.status].color)}>
                      {STATUS_CONFIG[selected.status].label}
                    </span>
                  </div>
                </div>
              </div>
              {selected.status === 'active' && (
                <button
                  onClick={() => handleStartReview(selected.id)}
                  className="cyber-btn w-full !text-sm"
                >
                  开始复核
                </button>
              )}
              {selected.status === 'closed' && (
                <div className="flex items-center justify-center gap-2 py-4 text-gray-500 text-sm">
                  <FileText className="h-4 w-4" />
                  该预警已关闭，可查看下方调整日志
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="glow-card p-5">
        <h2 className="section-title flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyber-500" />
          调整日志
        </h2>
        <div className="relative ml-4">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-navy-700" />
          <div className="space-y-4">
            {sortedLogs.map((log) => (
              <div key={log.id} className="relative pl-6">
                <div className="absolute left-0 top-2 h-2 w-2 -translate-x-[3.5px] rounded-full bg-cyber-500" />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-200">{log.operator}</span>
                      <span className="text-xs text-gray-500">调整了</span>
                      <span className="text-sm text-cyber-400">{log.parameter}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="font-mono text-warn-red">{log.oldValue}</span>
                      <span className="text-gray-600">&rarr;</span>
                      <span className="font-mono text-cyber-400">{log.newValue}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-gray-500 shrink-0">{log.adjustedAt}</span>
                </div>
              </div>
            ))}
            {sortedLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <FileText className="h-6 w-6 mb-2 opacity-30" />
                <span className="text-sm">暂无调整记录</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
