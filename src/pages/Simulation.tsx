import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileCheck,
  Merge,
  Grid3x3,
  FlaskConical,
  Cloud,
  CloudRain,
  Wind,
  CheckCircle2,
  RotateCcw,
  Upload,
  Eye,
  Trash2,
  AlertTriangle,
  FileText,
  X,
  Link2,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { STATUS_ORDER, STATUS_LABELS } from '@/types';
import type { SimulationStatus, SimulationTask, UploadedFile, WarningLevel, AdjustmentSource } from '@/types';

const REGIONS = ['北京', '上海', '广州', '成都', '武汉', '沈阳'];
const SCENARIOS = ['基准情景', '减排情景', '极端天气'];

const STEP_ICONS: Record<SimulationStatus, React.ElementType> = {
  PENDING: FileCheck,
  DATA_FUSION: Merge,
  MESH_GENERATION: Grid3x3,
  GAS_CHEMISTRY: FlaskConical,
  AEROSOL_SIM: Cloud,
  CLOUD_MICROPHYSICS: CloudRain,
  AQ_ASSESSMENT: Wind,
  COMPLETED: CheckCircle2,
  ROLLBACK: RotateCcw,
};

const FILE_UPLOAD_CONFIG = [
  { key: 'emission' as const, label: '排放源清单', accept: '.csv,.xlsx', icon: FileText },
  { key: 'meteorology' as const, label: '气象场文件', accept: '.nc,.grb', icon: Cloud },
  { key: 'aerosol_optics' as const, label: '气溶胶光学特性', accept: '.h5,.nc', icon: Eye },
];

function getStatusBadgeClasses(status: SimulationStatus): string {
  if (status === 'COMPLETED') return 'bg-green-500/20 text-green-400 border border-green-500/30';
  if (status === 'ROLLBACK') return 'bg-coral-500/20 text-coral-400 border border-coral-500/30';
  if (status === 'PENDING') return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  return 'bg-cyber-500/20 text-cyber-400 border border-cyber-500/30';
}

function generateSimResults(scenario: string, region: string) {
  const base: Record<string, { pm25: number; o3: number; aod: number }> = {
    '基准情景': { pm25: 85 + Math.random() * 120, o3: 140 + Math.random() * 160, aod: 0.6 + Math.random() * 1.2 },
    '减排情景': { pm25: 45 + Math.random() * 60, o3: 100 + Math.random() * 80, aod: 0.3 + Math.random() * 0.6 },
    '极端天气': { pm25: 120 + Math.random() * 160, o3: 180 + Math.random() * 240, aod: 0.9 + Math.random() * 1.6 },
  };
  const regionFactor: Record<string, number> = { '北京': 1.3, '上海': 1.1, '广州': 0.9, '成都': 1.0, '武汉': 1.15, '沈阳': 1.2 };
  const f = regionFactor[region] || 1.0;
  const b = base[scenario] || base['基准情景'];
  return {
    pm25Peak: Math.round(b.pm25 * f),
    o3Peak: Math.round(b.o3 * f),
    aodValue: Math.round(b.aod * f * 100) / 100,
  };
}

function determineWarningLevel(pm25: number, o3: number, aod: number): { pollutant: string; value: number; threshold: number; level: WarningLevel }[] {
  const results: { pollutant: string; value: number; threshold: number; level: WarningLevel }[] = [];
  if (pm25 > 250) results.push({ pollutant: 'PM2.5', value: pm25, threshold: 250, level: 'red' });
  else if (pm25 > 150) results.push({ pollutant: 'PM2.5', value: pm25, threshold: 150, level: 'orange' });
  else if (pm25 > 115) results.push({ pollutant: 'PM2.5', value: pm25, threshold: 115, level: 'yellow' });
  else if (pm25 > 75) results.push({ pollutant: 'PM2.5', value: pm25, threshold: 75, level: 'blue' });
  if (o3 > 400) results.push({ pollutant: 'O₃', value: o3, threshold: 400, level: 'red' });
  else if (o3 > 265) results.push({ pollutant: 'O₃', value: o3, threshold: 265, level: 'orange' });
  else if (o3 > 215) results.push({ pollutant: 'O₃', value: o3, threshold: 215, level: 'yellow' });
  else if (o3 > 160) results.push({ pollutant: 'O₃', value: o3, threshold: 160, level: 'blue' });
  if (aod > 2.0) results.push({ pollutant: 'AOD', value: aod, threshold: 2.0, level: 'red' });
  else if (aod > 1.5) results.push({ pollutant: 'AOD', value: aod, threshold: 1.5, level: 'orange' });
  else if (aod > 1.0) results.push({ pollutant: 'AOD', value: aod, threshold: 1.0, level: 'yellow' });
  else if (aod > 0.6) results.push({ pollutant: 'AOD', value: aod, threshold: 0.6, level: 'blue' });
  return results;
}

function formatNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Simulation() {
  const { tasks, addTask, updateTask, removeTask, addWarning } = useAppStore();

  const [taskName, setTaskName] = useState('');
  const [region, setRegion] = useState('北京');
  const [scenario, setScenario] = useState('基准情景');
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; size: number }>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const allFilesUploaded = FILE_UPLOAD_CONFIG.every(({ key }) => uploadedFiles[key]);
  const canCreate = taskName.trim() !== '' && allFilesUploaded;

  const activeTask = tasks.length > 0 ? tasks[0] : null;
  const activeStepIndex = activeTask
    ? activeTask.status === 'ROLLBACK'
      ? STATUS_ORDER.indexOf('MESH_GENERATION')
      : STATUS_ORDER.indexOf(activeTask.status)
    : -1;

  const detailTask = detailTaskId ? tasks.find((t) => t.id === detailTaskId) : null;

  const advanceStatus = useCallback(
    (taskId: string, currentStatus: SimulationStatus) => {
      if (currentStatus === 'COMPLETED' || currentStatus === 'ROLLBACK') return;
      const idx = STATUS_ORDER.indexOf(currentStatus);
      if (idx < 0) return;
      const next = STATUS_ORDER[idx + 1];
      if (!next) return;

      const task = useAppStore.getState().tasks.find((t) => t.id === taskId);
      if (!task) return;

      const updates: Partial<SimulationTask> = { status: next, updatedAt: formatNow() };

      if (next === 'GAS_CHEMISTRY') {
        const sim = generateSimResults(task.scenario, task.region);
        updates.pm25Peak = sim.pm25Peak;
        updates.o3Peak = sim.o3Peak;
        updates.aodValue = sim.aodValue;
      }

      if (next === 'COMPLETED') {
        const sim = generateSimResults(task.scenario, task.region);
        if (!task.pm25Peak) updates.pm25Peak = sim.pm25Peak;
        if (!task.o3Peak) updates.o3Peak = sim.o3Peak;
        if (!task.aodValue) updates.aodValue = sim.aodValue;

        const finalPm25 = updates.pm25Peak ?? task.pm25Peak;
        const finalO3 = updates.o3Peak ?? task.o3Peak;
        const finalAod = updates.aodValue ?? task.aodValue;

        const warnings = determineWarningLevel(finalPm25, finalO3, finalAod);
        warnings.forEach((w) => {
          addWarning({
            id: `warn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            taskId: task.id,
            region: task.region,
            level: w.level,
            pollutant: w.pollutant,
            value: w.value,
            threshold: w.threshold,
            status: 'active',
            triggeredAt: formatNow(),
          });
        });
      }

      updateTask(taskId, updates);
    },
    [updateTask, addWarning],
  );

  useEffect(() => {
    const running = new Map<string, ReturnType<typeof setInterval>>();

    tasks.forEach((t) => {
      if (t.status !== 'COMPLETED' && t.status !== 'ROLLBACK') {
        running.set(
          t.id,
          setInterval(() => {
            const current = useAppStore.getState().tasks.find((x) => x.id === t.id);
            if (current && current.status !== 'COMPLETED' && current.status !== 'ROLLBACK') {
              advanceStatus(t.id, current.status);
            } else {
              const ref = running.get(t.id);
              if (ref) clearInterval(ref);
              running.delete(t.id);
            }
          }, 4000),
        );
      }
    });

    return () => {
      running.forEach((ref) => clearInterval(ref));
    };
  }, [tasks.length, advanceStatus]);

  const handleFileUpload = (key: string, accept: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setUploadedFiles((prev) => ({ ...prev, [key]: { name: file.name, size: file.size } }));
      }
    };
    input.click();
  };

  const handleRemoveFile = (key: string) => {
    setUploadedFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleCreateTask = () => {
    if (!canCreate) return;

    const id = `task-${Date.now()}`;
    const now = formatNow();

    const files: UploadedFile[] = FILE_UPLOAD_CONFIG.map(({ key }, i) => ({
      id: `file-${Date.now()}-${i}`,
      taskId: id,
      fileType: key,
      fileName: uploadedFiles[key]?.name || '',
      fileSize: uploadedFiles[key]?.size || 0,
      parseStatus: 'success' as const,
      uploadedAt: now,
    }));

    const newTask: SimulationTask = {
      id,
      name: taskName.trim(),
      region,
      status: 'PENDING',
      scenario,
      createdAt: now,
      updatedAt: now,
      pm25Peak: 0,
      o3Peak: 0,
      aodValue: 0,
      anomalyCount: 0,
      files,
    };

    addTask(newTask);
    setTaskName('');
    setUploadedFiles({});
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (regionFilter !== 'all' && t.region !== regionFilter) return false;
    return true;
  });

  const FILE_TYPE_LABELS: Record<string, string> = {
  emission: '排放源清单',
  meteorology: '气象场文件',
  aerosol_optics: '气溶胶光学特性',
};

const TRAFFIC_LABELS = ['不限行', '单双号限行', '全员限行'];

function AdjustmentBadge({ source }: { source: AdjustmentSource }) {
  return (
    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
      <Link2 className="h-3 w-3 text-amber-400" />
      <span className="text-xs text-amber-400">
        限产{Math.round(source.productionLimitRatio * 100)}% · 扬尘{Math.round(source.dustControlIntensity * 100)}% · {TRAFFIC_LABELS[source.trafficRestrictionLevel] || '不限行'}
      </span>
    </div>
  );
}

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glow-card p-6">
        <h2 className="section-title">创建模拟任务</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">任务名称</label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="输入模拟任务名称"
              className="w-full rounded-lg bg-navy-900 border border-navy-600 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-cyber-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">区域</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg bg-navy-900 border border-navy-600 px-3 py-2 text-sm text-gray-100 focus:border-cyber-500 focus:outline-none transition-colors"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">场景</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full rounded-lg bg-navy-900 border border-navy-600 px-3 py-2 text-sm text-gray-100 focus:border-cyber-500 focus:outline-none transition-colors"
            >
              {SCENARIOS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-2">
          {FILE_UPLOAD_CONFIG.map(({ key, label, accept, icon: FIcon }) => {
            const file = uploadedFiles[key];
            return (
              <div
                key={key}
                onClick={() => handleFileUpload(key, accept)}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 cursor-pointer transition-all ${
                  file
                    ? 'border-cyber-500/50 bg-cyber-500/5'
                    : 'border-navy-600 bg-navy-900/40 hover:border-cyber-500/30 hover:bg-navy-900/60'
                }`}
              >
                {file ? (
                  <>
                    <FIcon className="h-8 w-8 text-cyber-400" />
                    <span className="text-sm text-cyber-400 font-medium truncate max-w-full px-4">{file.name}</span>
                    <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(key); }}
                      className="mt-1 flex items-center gap-1 text-xs text-coral-400 hover:text-coral-300"
                    >
                      <X className="h-3 w-3" /> 移除
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-500" />
                    <span className="text-sm text-gray-400">{label}</span>
                    <span className="text-xs text-gray-600">点击或拖拽上传</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {!allFilesUploaded && (
          <p className="text-xs text-amber-500 mb-4">
            请上传全部三类文件后方可创建任务（已上传 {Object.keys(uploadedFiles).length}/3）
          </p>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleCreateTask}
            disabled={!canCreate}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              canCreate
                ? 'bg-gradient-to-r from-cyber-500 to-cyber-700 text-navy-950 shadow-[0_2px_8px_rgba(0,212,170,0.3)] hover:shadow-[0_4px_16px_rgba(0,212,170,0.5)] hover:-translate-y-0.5'
                : 'bg-navy-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            创建模拟任务
          </button>
        </div>
      </div>

      <div className="glow-card p-6">
        <h2 className="section-title">模拟流程状态</h2>
        <div className="relative py-6">
          <div className="flex items-center justify-between">
            {STATUS_ORDER.map((status, idx) => {
              const Icon = STEP_ICONS[status];
              const isCompleted = idx < activeStepIndex;
              const isActive = idx === activeStepIndex;
              const isFuture = idx > activeStepIndex;

              return (
                <div key={status} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`
                        relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all
                        ${isCompleted ? 'border-cyber-600 bg-cyber-600/20' : ''}
                        ${isActive ? 'border-cyber-500 bg-cyber-500/20 animate-pulse-glow' : ''}
                        ${isFuture ? 'border-gray-600 bg-navy-900/60' : ''}
                      `}
                    >
                      <Icon
                        className={`h-5 w-5 ${isCompleted ? 'text-cyber-400' : ''} ${isActive ? 'text-cyber-500' : ''} ${isFuture ? 'text-gray-500' : ''}`}
                      />
                      {isCompleted && (
                        <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyber-600">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-xs whitespace-nowrap ${isCompleted ? 'text-cyber-400' : ''} ${isActive ? 'text-cyber-500 font-semibold' : ''} ${isFuture ? 'text-gray-500' : ''}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  {idx < STATUS_ORDER.length - 1 && (
                    <div className="flex-1 mx-2 mt-[-20px]">
                      <div
                        className={`h-0.5 ${idx < activeStepIndex ? 'bg-cyber-600' : 'bg-navy-700'}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-coral-500 bg-coral-500/20">
              <RotateCcw className="h-4 w-4 text-coral-400" />
            </div>
            <span className="text-sm text-coral-400 font-medium">异常回退</span>
            <div
              className="border-l-2 border-dashed border-coral-500/50"
              style={{ height: '24px', marginLeft: '4px', marginTop: '-40px', transform: 'rotate(-60deg)', transformOrigin: 'bottom left' }}
            />
            <span className="text-xs text-coral-500/70 mt-[-20px]">→ 网格生成</span>
          </div>
        </div>
      </div>

      <div className="glow-card p-6">
        <h2 className="section-title">任务列表</h2>

        <div className="flex gap-4 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg bg-navy-900 border border-navy-600 px-3 py-2 text-sm text-gray-100 focus:border-cyber-500 focus:outline-none transition-colors"
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="rounded-lg bg-navy-900 border border-navy-600 px-3 py-2 text-sm text-gray-100 focus:border-cyber-500 focus:outline-none transition-colors"
          >
            <option value="all">全部区域</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700">
                <th className="px-3 py-3 text-left text-gray-400 font-medium">任务名称</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">区域</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">场景</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">状态</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">PM2.5峰值</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">O3峰值</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">AOD值</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">输入文件</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">创建时间</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-b border-navy-700/50 hover:bg-navy-800/40 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-100">{task.name}</span>
                        {task.anomalyCount >= 3 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-coral-500/20 px-2 py-0.5 text-xs font-medium text-coral-400 border border-coral-500/30">
                            <AlertTriangle className="h-3 w-3" />
                            异常暂停
                          </span>
                        )}
                      </div>
                      {task.adjustmentSource && <AdjustmentBadge source={task.adjustmentSource} />}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-300">{task.region}</td>
                  <td className="px-3 py-3 text-gray-300">{task.scenario}</td>
                  <td className="px-3 py-3">
                    <span className={`status-badge ${getStatusBadgeClasses(task.status)}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-mono ${task.pm25Peak > 75 ? 'text-coral-400' : 'text-gray-300'}`}>
                      {task.pm25Peak > 0 ? `${task.pm25Peak} μg/m³` : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-mono ${task.o3Peak > 160 ? 'text-coral-400' : 'text-gray-300'}`}>
                      {task.o3Peak > 0 ? `${task.o3Peak} μg/m³` : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-gray-300">
                    {task.aodValue > 0 ? task.aodValue : '-'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      {task.files.length > 0 ? task.files.map((f) => (
                        <span key={f.id} className="text-xs text-cyber-400/80 truncate max-w-[120px]" title={f.fileName}>
                          {f.fileName}
                        </span>
                      )) : <span className="text-xs text-gray-600">-</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{task.createdAt}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDetailTaskId(detailTaskId === task.id ? null : task.id)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-cyber-400 hover:bg-cyber-500/10 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        详情
                      </button>
                      {(task.status === 'COMPLETED' || task.status === 'ROLLBACK') && (
                        <button
                          onClick={() => removeTask(task.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-coral-400 hover:bg-coral-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                    暂无匹配的任务
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {detailTask && (
          <div className="mt-4 rounded-lg bg-navy-900/60 border border-navy-700/50 p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-200">任务详情 - {detailTask.name}</h3>
              <button onClick={() => setDetailTaskId(null)} className="text-gray-400 hover:text-gray-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="text-xs text-gray-500">区域</span>
                <p className="text-sm text-gray-200">{detailTask.region}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">场景</span>
                <p className="text-sm text-gray-200">{detailTask.scenario}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">PM2.5峰值</span>
                <p className={`text-sm font-mono ${detailTask.pm25Peak > 75 ? 'text-coral-400' : 'text-gray-200'}`}>
                  {detailTask.pm25Peak > 0 ? `${detailTask.pm25Peak} μg/m³` : '计算中...'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">O3峰值</span>
                <p className={`text-sm font-mono ${detailTask.o3Peak > 160 ? 'text-coral-400' : 'text-gray-200'}`}>
                  {detailTask.o3Peak > 0 ? `${detailTask.o3Peak} μg/m³` : '计算中...'}
                </p>
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-2">输入文件</span>
              <div className="flex gap-3">
                {detailTask.files.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 bg-navy-800/60 rounded-lg px-3 py-2 border border-navy-700/50">
                    <FileText className="h-4 w-4 text-cyber-400" />
                    <div>
                      <p className="text-xs text-gray-200">{f.fileName}</p>
                      <p className="text-[10px] text-gray-500">{FILE_TYPE_LABELS[f.fileType] || f.fileType} · {(f.fileSize / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {detailTask.adjustmentSource && (
              <div className="border-t border-navy-700 pt-3">
                <span className="text-xs text-gray-500 block mb-2">调整方案摘要</span>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">来源预警调整</span>
                    <span className="text-xs text-gray-500 font-mono">{detailTask.adjustmentSource.warningId}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-navy-800/60 rounded-lg p-2 text-center">
                      <span className="text-[10px] text-gray-500 block">限产比例</span>
                      <span className="text-sm font-mono font-semibold text-amber-400">{Math.round(detailTask.adjustmentSource.productionLimitRatio * 100)}%</span>
                    </div>
                    <div className="bg-navy-800/60 rounded-lg p-2 text-center">
                      <span className="text-[10px] text-gray-500 block">扬尘控制强度</span>
                      <span className="text-sm font-mono font-semibold text-amber-400">{Math.round(detailTask.adjustmentSource.dustControlIntensity * 100)}%</span>
                    </div>
                    <div className="bg-navy-800/60 rounded-lg p-2 text-center">
                      <span className="text-[10px] text-gray-500 block">交通限行等级</span>
                      <span className="text-sm font-semibold text-amber-400">{TRAFFIC_LABELS[detailTask.adjustmentSource.trafficRestrictionLevel] || '不限行'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">调整时间: {detailTask.adjustmentSource.adjustedAt}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
