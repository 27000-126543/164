export type SimulationStatus =
  | 'PENDING'
  | 'DATA_FUSION'
  | 'MESH_GENERATION'
  | 'GAS_CHEMISTRY'
  | 'AEROSOL_SIM'
  | 'CLOUD_MICROPHYSICS'
  | 'AQ_ASSESSMENT'
  | 'COMPLETED'
  | 'ROLLBACK';

export const STATUS_LABELS: Record<SimulationStatus, string> = {
  PENDING: '待校验',
  DATA_FUSION: '数据融合',
  MESH_GENERATION: '网格生成',
  GAS_CHEMISTRY: '气相化学迭代',
  AEROSOL_SIM: '气溶胶模拟',
  CLOUD_MICROPHYSICS: '云微物理',
  AQ_ASSESSMENT: '空气质量评估',
  COMPLETED: '完成',
  ROLLBACK: '异常回退',
};

export const STATUS_ORDER: SimulationStatus[] = [
  'PENDING',
  'DATA_FUSION',
  'MESH_GENERATION',
  'GAS_CHEMISTRY',
  'AEROSOL_SIM',
  'CLOUD_MICROPHYSICS',
  'AQ_ASSESSMENT',
  'COMPLETED',
];

export type WarningLevel = 'red' | 'orange' | 'yellow' | 'blue';

export const WARNING_LEVEL_LABELS: Record<WarningLevel, string> = {
  red: '红色预警',
  orange: '橙色预警',
  yellow: '黄色预警',
  blue: '蓝色预警',
};

export interface UploadedFile {
  id: string;
  taskId: string;
  fileType: 'emission' | 'meteorology' | 'aerosol_optics';
  fileName: string;
  fileSize: number;
  parseStatus: 'parsing' | 'success' | 'error';
  uploadedAt: string;
}

export interface AdjustmentSource {
  warningId: string;
  productionLimitRatio: number;
  dustControlIntensity: number;
  trafficRestrictionLevel: number;
  adjustedAt: string;
}

export interface SimulationTask {
  id: string;
  name: string;
  region: string;
  status: SimulationStatus;
  scenario: string;
  createdAt: string;
  updatedAt: string;
  pm25Peak: number;
  o3Peak: number;
  aodValue: number;
  anomalyCount: number;
  files: UploadedFile[];
  adjustmentSource?: AdjustmentSource;
}

export interface WarningEvent {
  id: string;
  taskId: string;
  region: string;
  level: WarningLevel;
  pollutant: string;
  value: number;
  threshold: number;
  status: 'active' | 'reviewing' | 'adjusting' | 'closed';
  triggeredAt: string;
}

export interface AdjustmentLog {
  id: string;
  warningId: string;
  parameter: string;
  oldValue: number;
  newValue: number;
  operator: string;
  adjustedAt: string;
}

export interface EmissionReductionPlan {
  id: string;
  warningId: string;
  productionLimitRatio: number;
  dustControlIntensity: number;
  trafficRestrictionLevel: number;
  effectiveFrom: string;
}

export interface Report {
  id: string;
  taskId: string;
  city: string;
  season: string;
  scenario: string;
  generatedAt: string;
  status: 'generating' | 'ready';
}

export interface ApprovalRecord {
  id: string;
  taskId: string;
  level: 'scientist' | 'forecast_center';
  approver: string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string;
  approvedAt: string;
}

export interface Recommendation {
  id: string;
  strategyType: string;
  description: string;
  effectivenessScore: number;
  timePeriod: string;
  conditions: string;
}

export interface DailyStats {
  date: string;
  completionRate: number;
  avgResponseTime: number;
  complianceRate: number;
  indirectEffectAccuracy: number;
  totalSimulations: number;
  totalWarnings: number;
}
