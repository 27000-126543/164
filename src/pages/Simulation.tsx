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
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { STATUS_ORDER, STATUS_LABELS } from '@/types';
import type { SimulationStatus, SimulationTask } from '@/types';

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
  { key: 'emission' as const, label: '排放源清单', accept: '.csv,.xlsx' },
  { key: 'meteorology' as const, label: '气象场文件', accept: '.nc,.grb' },
  { key: 'aerosol_optics' as const, label: '气溶胶光学特性', accept: '.h5,.nc' },
];

function getStatusBadgeClasses(status: SimulationStatus): string {
  if (status === 'COMPLETED') return 'bg-green-500/20 text-green-400 border border-green-500/30';
  if (status === 'ROLLBACK') return 'bg-coral-500/20 text-coral-400 border border-coral-500/30';
  if (status === 'PENDING') return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  return 'bg-cyber-500/20 text-cyber-400 border border-cyber-500/30';
}

export default function Simulation() {
  const { tasks, addTask, updateTask } = useAppStore();

  const [taskName, setTaskName] = useState('');
  const [region, setRegion] = useState('北京');
  const [scenario, setScenario] = useState('基准情景');
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  const intervalRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const activeTask = tasks.length > 0 ? tasks[0] : null;
  const activeStepIndex = activeTask
    ? activeTask.status === 'ROLLBACK'
      ? STATUS_ORDER.indexOf('MESH_GENERATION')
      : STATUS_ORDER.indexOf(activeTask.status)
    : -1;

  const advanceStatus = useCallback(
    (taskId: string, currentStatus: SimulationStatus) => {
      if (currentStatus === 'COMPLETED' || currentStatus === 'ROLLBACK') return;
      const idx = STATUS_ORDER.indexOf(currentStatus);
      if (idx < 0) return;
      const next = STATUS_ORDER[idx + 1];
      if (next) {
        updateTask(taskId, { status: next, updatedAt: new Date().toLocaleString('zh-CN') });
      }
    },
    [updateTask],
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
        setUploadedFiles((prev) => ({ ...prev, [key]: file.name }));
      }
    };
    input.click();
  };

  const handleCreateTask = () => {
    if (!taskName.trim()) return;

    const id = `task-${Date.now()}`;
    const now = new Date().toLocaleString('zh-CN');

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
      files: [],
    };

    addTask(newTask);
    setTaskName('');
    setUploadedFiles({});
  };

  const handleDelete = (id: string) => {
    const ref = intervalRefs.current.get(id);
    if (ref) clearInterval(ref);
    intervalRefs.current.delete(id);
    const updated = useAppStore.getState().tasks.filter((t) => t.id !== id);
    useAppStore.setState({ tasks: updated });
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (regionFilter !== 'all' && t.region !== regionFilter) return false;
    return true;
  });

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
                <option key={r} value={r}>
                  {r}
                </option>
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
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {FILE_UPLOAD_CONFIG.map(({ key, label, accept }) => (
            <div
              key={key}
              onClick={() => handleFileUpload(key, accept)}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-navy-600 bg-navy-900/40 py-6 cursor-pointer hover:border-cyber-500/50 hover:bg-navy-900/60 transition-all"
            >
              <Upload className="h-8 w-8 text-gray-500" />
              <span className="text-sm text-gray-400">{label}</span>
              {uploadedFiles[key] ? (
                <span className="text-xs text-cyber-400 truncate max-w-full px-2">{uploadedFiles[key]}</span>
              ) : (
                <span className="text-xs text-gray-600">点击或拖拽上传</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button onClick={handleCreateTask} className="cyber-btn">
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
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="rounded-lg bg-navy-900 border border-navy-600 px-3 py-2 text-sm text-gray-100 focus:border-cyber-500 focus:outline-none transition-colors"
          >
            <option value="all">全部区域</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
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
                <th className="px-3 py-3 text-left text-gray-400 font-medium">创建时间</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-b border-navy-700/50 hover:bg-navy-800/40 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-100">{task.name}</span>
                      {task.anomalyCount >= 3 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-coral-500/20 px-2 py-0.5 text-xs font-medium text-coral-400 border border-coral-500/30">
                          <AlertTriangle className="h-3 w-3" />
                          异常暂停
                        </span>
                      )}
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
                      {task.pm25Peak > 0 ? task.pm25Peak : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-mono ${task.o3Peak > 160 ? 'text-coral-400' : 'text-gray-300'}`}>
                      {task.o3Peak > 0 ? task.o3Peak : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-gray-300">
                    {task.aodValue > 0 ? task.aodValue : '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{task.createdAt}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 rounded px-2 py-1 text-xs text-cyber-400 hover:bg-cyber-500/10 transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                        详情
                      </button>
                      {(task.status === 'COMPLETED' || task.status === 'ROLLBACK') && (
                        <button
                          onClick={() => handleDelete(task.id)}
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
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    暂无匹配的任务
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
