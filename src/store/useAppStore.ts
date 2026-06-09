import { create } from 'zustand';
import type { SimulationTask, WarningEvent, AdjustmentLog, EmissionReductionPlan, Report, ApprovalRecord, Recommendation, DailyStats } from '@/types';

interface AppState {
  tasks: SimulationTask[];
  warnings: WarningEvent[];
  adjustmentLogs: AdjustmentLog[];
  reductionPlans: EmissionReductionPlan[];
  reports: Report[];
  approvals: ApprovalRecord[];
  recommendations: Recommendation[];
  dailyStats: DailyStats[];
  sidebarCollapsed: boolean;

  setTasks: (tasks: SimulationTask[]) => void;
  addTask: (task: SimulationTask) => void;
  updateTask: (id: string, updates: Partial<SimulationTask>) => void;
  setWarnings: (warnings: WarningEvent[]) => void;
  addWarning: (warning: WarningEvent) => void;
  updateWarning: (id: string, updates: Partial<WarningEvent>) => void;
  addAdjustmentLog: (log: AdjustmentLog) => void;
  addReductionPlan: (plan: EmissionReductionPlan) => void;
  updateReductionPlan: (id: string, updates: Partial<EmissionReductionPlan>) => void;
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  setApprovals: (approvals: ApprovalRecord[]) => void;
  addApproval: (approval: ApprovalRecord) => void;
  updateApproval: (id: string, updates: Partial<ApprovalRecord>) => void;
  setRecommendations: (recommendations: Recommendation[]) => void;
  setDailyStats: (stats: DailyStats[]) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  tasks: [],
  warnings: [],
  adjustmentLogs: [],
  reductionPlans: [],
  reports: [],
  approvals: [],
  recommendations: [],
  dailyStats: [],
  sidebarCollapsed: false,

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (id, updates) => set((s) => ({
    tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t),
  })),
  setWarnings: (warnings) => set({ warnings }),
  addWarning: (warning) => set((s) => ({ warnings: [warning, ...s.warnings] })),
  updateWarning: (id, updates) => set((s) => ({
    warnings: s.warnings.map((w) => w.id === id ? { ...w, ...updates } : w),
  })),
  addAdjustmentLog: (log) => set((s) => ({ adjustmentLogs: [log, ...s.adjustmentLogs] })),
  addReductionPlan: (plan) => set((s) => ({ reductionPlans: [plan, ...s.reductionPlans] })),
  updateReductionPlan: (id, updates) => set((s) => ({
    reductionPlans: s.reductionPlans.map((p) => p.id === id ? { ...p, ...updates } : p),
  })),
  setReports: (reports) => set({ reports }),
  addReport: (report) => set((s) => ({ reports: [report, ...s.reports] })),
  updateReport: (id, updates) => set((s) => ({
    reports: s.reports.map((r) => r.id === id ? { ...r, ...updates } : r),
  })),
  setApprovals: (approvals) => set({ approvals }),
  addApproval: (approval) => set((s) => ({ approvals: [approval, ...s.approvals] })),
  updateApproval: (id, updates) => set((s) => ({
    approvals: s.approvals.map((a) => a.id === id ? { ...a, ...updates } : a),
  })),
  setRecommendations: (recommendations) => set({ recommendations }),
  setDailyStats: (dailyStats) => set({ dailyStats }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
