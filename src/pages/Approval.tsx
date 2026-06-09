import { useState } from 'react';
import { Microscope, ShieldCheck, Send, Check, AlertTriangle, ChevronDown, ChevronUp, Clock, Bell } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { ApprovalRecord } from '@/types';

const PIPELINE_STEPS = [
  { icon: Microscope, label: '环境科学家验证模型合理性', key: 'scientist' as const },
  { icon: ShieldCheck, label: '空气质量预测中心确认预警级别', key: 'forecast_center' as const },
  { icon: Send, label: '自动推送至应急指挥部', key: 'command' as const },
];

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审批' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
];

const LEVEL_LABELS: Record<ApprovalRecord['level'], string> = {
  scientist: '科学家验证',
  forecast_center: '预测中心确认',
};

const STATUS_CONFIG: Record<ApprovalRecord['status'], { dot: string; label: string }> = {
  pending: { dot: 'bg-amber-500', label: '待审批' },
  approved: { dot: 'bg-cyber-500', label: '已通过' },
  rejected: { dot: 'bg-coral-500', label: '已驳回' },
};

function getPipelineStepStatus(approvals: ApprovalRecord[]) {
  const scientistApproved = approvals.some((a) => a.level === 'scientist' && a.status === 'approved');
  const fcApproved = approvals.some((a) => a.level === 'forecast_center' && a.status === 'approved');
  const hasFc = approvals.some((a) => a.level === 'forecast_center');
  const anyPending = approvals.some((a) => a.status === 'pending');

  if (fcApproved) return [2, 2, 2] as const;
  if (hasFc && anyPending) return [2, 2, 1] as const;
  if (scientistApproved) return [2, 1, 0] as const;
  if (anyPending) return [1, 0, 0] as const;
  return [0, 0, 0] as const;
}

export default function Approval() {
  const { approvals, updateApproval, addApproval, tasks, updateTask, addChiefNotification, chiefNotifications } = useAppStore();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const filteredApprovals = approvals.filter((a) => {
    if (activeTab === 'all') return true;
    return a.status === activeTab;
  });

  const anomalyTasks = tasks.filter((t) => t.anomalyCount >= 3);
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;
  const selectedApprovals = selectedTaskId ? approvals.filter((a) => a.taskId === selectedTaskId) : [];
  const pipelineStatus = getPipelineStepStatus(approvals);

  const completedApprovals = approvals
    .filter((a) => a.status !== 'pending')
    .sort((a, b) => (a.approvedAt > b.approvedAt ? -1 : 1));

  const toggleComment = (id: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApprove = (approval: ApprovalRecord) => {
    const comment = commentInputs[approval.id] || '';
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    updateApproval(approval.id, {
      status: 'approved',
      comment: comment || approval.comment,
      approvedAt: ts,
    });

    if (approval.level === 'scientist') {
      const newId = `apr-${Date.now()}`;
      addApproval({
        id: newId,
        taskId: approval.taskId,
        level: 'forecast_center',
        approver: '李主任',
        status: 'pending',
        comment: '',
        approvedAt: '',
      });
    }

    if (approval.level === 'forecast_center') {
      setSuccessMsg('已自动推送至应急指挥部，生成公众健康防护建议');
      setTimeout(() => setSuccessMsg(null), 4000);
    }

    setCommentInputs((prev) => {
      const next = { ...prev };
      delete next[approval.id];
      return next;
    });
  };

  const handleReject = (approval: ApprovalRecord) => {
    const comment = commentInputs[approval.id] || '';
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    updateApproval(approval.id, {
      status: 'rejected',
      comment: comment || '未通过审批',
      approvedAt: ts,
    });

    setCommentInputs((prev) => {
      const next = { ...prev };
      delete next[approval.id];
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {successMsg && (
        <div className="fixed top-20 right-6 z-50 bg-cyber-500/20 border border-cyber-500/50 text-cyber-400 px-6 py-3 rounded-lg shadow-lg animate-slide-up">
          {successMsg}
        </div>
      )}
      {notifyMsg && (
        <div className="fixed top-32 right-6 z-50 bg-amber-500/20 border border-amber-500/50 text-amber-400 px-6 py-3 rounded-lg shadow-lg animate-slide-up">
          {notifyMsg}
        </div>
      )}

      <div className="glow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">审批流程</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm text-gray-400">
              当前有 <span className="text-amber-500 font-semibold">{pendingCount}</span> 项待审批
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {PIPELINE_STEPS.map((step, i) => {
            const status = pipelineStatus[i];
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-500',
                      status === 2 && 'bg-cyber-500/20 border-cyber-500 shadow-[0_0_20px_rgba(0,212,170,0.4)]',
                      status === 1 && 'bg-amber-500/15 border-amber-500 shadow-[0_0_15px_rgba(255,140,0,0.3)] animate-pulse-glow',
                      status === 0 && 'bg-navy-700/50 border-navy-600'
                    )}
                  >
                    {status === 2 ? (
                      <Check className="w-6 h-6 text-cyber-400" />
                    ) : (
                      <Icon className={cn('w-6 h-6', status === 1 ? 'text-amber-500' : 'text-gray-500')} />
                    )}
                  </div>
                  <span className={cn('text-xs mt-2 text-center max-w-[120px]', status > 0 ? 'text-gray-300' : 'text-gray-500')}>
                    {step.label}
                  </span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="flex-1 mx-3 mt-[-20px]">
                    <div className="h-0.5 bg-navy-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          pipelineStatus[i] === 2 ? 'bg-cyber-500 w-full' : pipelineStatus[i + 1] !== undefined && pipelineStatus[i] === 1 ? 'bg-amber-500 w-1/2' : 'w-0'
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="glow-card p-4">
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeTab === tab.key
                      ? 'bg-cyber-500/20 text-cyber-400 border border-cyber-500/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-navy-700/50'
                  )}
                >
                  {tab.label}
                  {tab.key !== 'all' && (
                    <span className="ml-1.5 text-xs opacity-70">
                      ({approvals.filter((a) => a.status === tab.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredApprovals.length === 0 && (
              <div className="glow-card p-8 text-center text-gray-500">暂无审批记录</div>
            )}
            {filteredApprovals.map((approval) => {
              const task = tasks.find((t) => t.id === approval.taskId);
              const statusCfg = STATUS_CONFIG[approval.status];
              const isExpanded = expandedComments.has(approval.id);

              return (
                <div
                  key={approval.id}
                  onClick={() => setSelectedTaskId(approval.taskId)}
                  className={cn(
                    'glow-card-hover p-5 cursor-pointer',
                    selectedTaskId === approval.taskId && 'border-cyber-500/30 shadow-[0_0_20px_rgba(0,212,170,0.1)]'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-gray-100">
                          {task?.name || approval.taskId}
                        </h3>
                        <span className="text-xs text-gray-500">{task?.region}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={cn(
                            'status-badge',
                            approval.level === 'scientist'
                              ? 'bg-cyber-500/15 text-cyber-400 border border-cyber-500/20'
                              : 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                          )}
                        >
                          {LEVEL_LABELS[approval.level]}
                        </span>
                        <span className="text-xs text-gray-400">审批人: {approval.approver}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', statusCfg.dot)} />
                        <span className={cn('text-sm', approval.status === 'approved' ? 'text-cyber-400' : approval.status === 'rejected' ? 'text-coral-400' : 'text-amber-400')}>
                          {statusCfg.label}
                        </span>
                        {approval.approvedAt && (
                          <span className="text-xs text-gray-500 ml-2">{approval.approvedAt}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {approval.comment && (
                    <div className="mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleComment(approval.id); }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        审批意见
                      </button>
                      {isExpanded && (
                        <p className="mt-1 text-xs text-gray-300 bg-navy-700/50 rounded-lg px-3 py-2">
                          {approval.comment}
                        </p>
                      )}
                    </div>
                  )}

                  {approval.status === 'pending' && (
                    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        placeholder="输入审批意见（可选）"
                        value={commentInputs[approval.id] || ''}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [approval.id]: e.target.value }))}
                        className="w-full bg-navy-700/50 border border-navy-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyber-500/50 transition-colors"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(approval)} className="cyber-btn text-xs">
                          通过
                        </button>
                        <button onClick={() => handleReject(approval)} className="danger-btn text-xs">
                          驳回
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glow-card p-5">
            <h3 className="text-sm font-semibold text-gray-100 mb-4">任务详情</h3>
            {selectedTask ? (
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500">任务名称</span>
                  <p className="text-sm text-gray-200">{selectedTask.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-500">区域</span>
                    <p className="text-sm text-gray-200">{selectedTask.region}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">情景</span>
                    <p className="text-sm text-gray-200">{selectedTask.scenario}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-navy-700/50 rounded-lg p-2 text-center">
                    <span className="text-[10px] text-gray-500 block">PM2.5</span>
                    <span className="text-sm font-mono font-semibold text-coral-400">{selectedTask.pm25Peak}</span>
                  </div>
                  <div className="bg-navy-700/50 rounded-lg p-2 text-center">
                    <span className="text-[10px] text-gray-500 block">O₃</span>
                    <span className="text-sm font-mono font-semibold text-amber-500">{selectedTask.o3Peak}</span>
                  </div>
                  <div className="bg-navy-700/50 rounded-lg p-2 text-center">
                    <span className="text-[10px] text-gray-500 block">AOD</span>
                    <span className="text-sm font-mono font-semibold text-cyber-400">{selectedTask.aodValue}</span>
                  </div>
                </div>

                <div className="border-t border-navy-700 pt-3">
                  <span className="text-xs text-gray-500 block mb-2">模型验证清单</span>
                  <div className="space-y-1.5">
                    {[
                      { label: '化学机制完整性', ok: true },
                      { label: '气溶胶模块校验', ok: true },
                      { label: '云微物理参数验证', ok: true },
                      { label: '边界条件合理性', ok: true },
                      { label: '数值稳定性', ok: !selectedApprovals.some((a) => a.status === 'pending') },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">{item.label}</span>
                        {item.ok ? (
                          <span className="text-cyber-400">✓</span>
                        ) : (
                          <span className="text-amber-500 animate-pulse">⏳</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">点击左侧审批记录查看详情</p>
            )}
          </div>

          <div className={cn('glow-card p-5', anomalyTasks.length > 0 && 'border-coral-500/50')}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className={cn('w-4 h-4', anomalyTasks.length > 0 ? 'text-coral-500' : 'text-gray-500')} />
              <h3 className="text-sm font-semibold text-gray-100">异常区域暂停通知</h3>
            </div>
            {anomalyTasks.length > 0 ? (
              <div className="space-y-3">
                {anomalyTasks.map((task) => {
                  const regionNotifs = chiefNotifications.filter((n) => n.region === task.region);
                  const lastNotif = regionNotifs[0];
                  return (
                    <div key={task.id} className="bg-coral-500/10 border border-coral-500/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-coral-400">{task.region}</span>
                        <span className="text-xs bg-coral-500/20 text-coral-400 px-2 py-0.5 rounded-full">
                          异常 {task.anomalyCount} 次
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">该区域已暂停新任务</p>
                      {lastNotif ? (
                        <div className="mt-2 flex items-center gap-1.5 bg-cyber-500/10 border border-cyber-500/20 rounded px-2 py-1">
                          <Bell className="h-3 w-3 text-cyber-400" />
                          <span className="text-xs text-cyber-400">已通知首席科学家</span>
                          <span className="text-xs text-gray-500 font-mono">{lastNotif.notifiedAt}</span>
                          {regionNotifs.length > 1 && (
                            <span className="text-xs text-gray-500">({regionNotifs.length}次)</span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          尚未通知首席科学家
                        </div>
                      )}
                      {regionNotifs.length > 1 && (
                        <div className="mt-1.5 space-y-0.5">
                          {regionNotifs.slice(1, 3).map((n) => (
                            <div key={n.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span className="font-mono">{n.notifiedAt}</span>
                              <span>{n.message.slice(0, 20)}...</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      const now = new Date();
                      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                      anomalyTasks.forEach((task) => {
                        addChiefNotification({
                          id: `notify-${Date.now()}-${task.id}`,
                          region: task.region,
                          message: `${task.region}区域连续${task.anomalyCount}次模拟PM2.5峰值偏差超过30%，已暂停新任务，请核查。`,
                          notifiedAt: ts,
                        });
                      });
                      setNotifyMsg('已通知首席科学家');
                      setTimeout(() => setNotifyMsg(null), 4000);
                    }}
                    className="danger-btn text-xs flex-1"
                  >
                    通知首席科学家
                  </button>
                  <button
                    onClick={() => {
                      anomalyTasks.forEach((task) => {
                        updateTask(task.id, { anomalyCount: 0 });
                      });
                      setNotifyMsg('已恢复异常区域，新任务可正常创建');
                      setTimeout(() => setNotifyMsg(null), 4000);
                    }}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border border-cyber-500/50 text-cyber-400 hover:bg-cyber-500/10 text-xs flex-1"
                  >
                    恢复该区域
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">当前无异常区域</p>
            )}
          </div>
        </div>
      </div>

      <div className="glow-card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-6">审批历史</h3>
        {completedApprovals.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">暂无审批历史</p>
        ) : (
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-navy-700 -translate-x-1/2" />
            <div className="space-y-6">
              {completedApprovals.map((approval, i) => {
                const task = tasks.find((t) => t.id === approval.taskId);
                const isLeft = i % 2 === 0;
                return (
                  <div key={approval.id} className="relative flex items-center">
                    <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 z-10 bg-navy-800 border-navy-600" />
                    <div className={cn('w-1/2', isLeft ? 'pr-8 text-right' : 'pl-8 ml-auto')}>
                      <div className="glow-card p-4 inline-block text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-xs', approval.status === 'approved' ? 'text-cyber-400' : 'text-coral-400')}>
                            {approval.status === 'approved' ? '通过' : '驳回'}
                          </span>
                          <span className="text-xs text-gray-500">{approval.approvedAt}</span>
                        </div>
                        <p className="text-sm text-gray-200 mb-1">
                          <span className="text-gray-400">{approval.approver}</span> · {task?.name || approval.taskId}
                        </p>
                        {approval.comment && (
                          <p className="text-xs text-gray-400">"{approval.comment}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
