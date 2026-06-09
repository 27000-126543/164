import type {
  SimulationTask,
  SimulationStatus,
  WarningEvent,
  WarningLevel,
  AdjustmentLog,
  EmissionReductionPlan,
  Report,
  ApprovalRecord,
  Recommendation,
  DailyStats,
} from '@/types';

const REGIONS = ['北京', '上海', '广州', '成都', '武汉', '沈阳'];
const SCENARIOS = ['基准情景', '减排情景A', '减排情景B', '极端天气情景', '沙尘传输情景'];
const STATUSES: SimulationStatus[] = [
  'PENDING',
  'DATA_FUSION',
  'MESH_GENERATION',
  'GAS_CHEMISTRY',
  'AEROSOL_SIM',
  'CLOUD_MICROPHYSICS',
  'AQ_ASSESSMENT',
  'COMPLETED',
];
const POLLUTANTS = ['PM2.5', 'O3', 'PM10', 'NO2', 'SO2'];
const FILE_TYPES: ('emission' | 'meteorology' | 'aerosol_optics')[] = ['emission', 'meteorology', 'aerosol_optics'];
const PARSE_STATUSES: ('parsing' | 'success' | 'error')[] = ['parsing', 'success', 'error'];
const WARNING_LEVELS: WarningLevel[] = ['red', 'orange', 'yellow', 'blue'];
const WARNING_STATUSES: ('active' | 'reviewing' | 'adjusting' | 'closed')[] = ['active', 'reviewing', 'adjusting', 'closed'];
const SEASONS = ['春季', '夏季', '秋季', '冬季'];
const REPORT_STATUSES: ('generating' | 'ready')[] = ['generating', 'ready'];
const APPROVAL_LEVELS: ('scientist' | 'forecast_center')[] = ['scientist', 'forecast_center'];
const APPROVAL_STATUSES: ('pending' | 'approved' | 'rejected')[] = ['pending', 'approved', 'rejected'];
const APPROVERS = ['张伟', '李明', '王芳', '赵强', '陈静'];
const OPERATORS = ['系统自动', '张伟', '李明', '王芳'];
const PARAMETERS = ['排放源强度', '边界层高度', '化学转化率', '干沉降速度', '湿沉降系数', '光解速率'];
const STRATEGY_TYPES = ['工业限产', '机动车限行', '扬尘管控', '区域联防联控', '应急减排'];
const CONDITIONS = [
  '静稳天气条件下适用',
  '风速<3m/s时启动',
  '区域性传输为主时适用',
  '本地排放为主时适用',
  '持续高温天气下适用',
  '沙尘天气影响期间适用',
  '逆温层存在时加强管控',
  '降水概率<20%时适用',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 1): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function randomDate(startStr: string, endStr: string): string {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const ts = start + Math.random() * (end - start);
  return formatDate(new Date(ts));
}

export function generateMockTasks(): SimulationTask[] {
  const tasks: SimulationTask[] = [];

  const taskConfigs: { region: string; status: SimulationStatus; scenario: string; pm25: number; o3: number; aod: number; anomaly: number }[] = [
    { region: '北京', status: 'COMPLETED', scenario: '减排情景A', pm25: 156, o3: 285, aod: 1.8, anomaly: 3 },
    { region: '上海', status: 'GAS_CHEMISTRY', scenario: '基准情景', pm25: 89, o3: 210, aod: 0.9, anomaly: 1 },
    { region: '广州', status: 'AEROSOL_SIM', scenario: '极端天气情景', pm25: 245, o3: 380, aod: 2.3, anomaly: 5 },
    { region: '成都', status: 'CLOUD_MICROPHYSICS', scenario: '减排情景B', pm25: 112, o3: 165, aod: 1.2, anomaly: 2 },
    { region: '武汉', status: 'DATA_FUSION', scenario: '沙尘传输情景', pm25: 198, o3: 142, aod: 2.1, anomaly: 4 },
    { region: '沈阳', status: 'MESH_GENERATION', scenario: '基准情景', pm25: 67, o3: 195, aod: 0.6, anomaly: 0 },
    { region: '北京', status: 'ROLLBACK', scenario: '极端天气情景', pm25: 278, o3: 410, aod: 2.4, anomaly: 7 },
    { region: '成都', status: 'COMPLETED', scenario: '减排情景A', pm25: 45, o3: 128, aod: 0.4, anomaly: 0 },
  ];

  taskConfigs.forEach((cfg, i) => {
    const id = `task-${String(i + 1).padStart(3, '0')}`;
    const createdAt = randomDate('2026-05-10', '2026-06-08');
    const updatedAt = randomDate(createdAt, '2026-06-09');

    const fileCount = randomInt(2, 5);
    const files = Array.from({ length: fileCount }, (_, fi) => {
      const fType = FILE_TYPES[fi % 3];
      const ext = fType === 'emission' ? 'csv' : fType === 'meteorology' ? 'nc' : 'h5';
      return {
        id: `${id}-file-${fi + 1}`,
        taskId: id,
        fileType: fType,
        fileName: `${cfg.region}_${fType}_${String(randomInt(1, 12)).padStart(2, '0')}.${ext}`,
        fileSize: randomInt(512000, 52428800),
        parseStatus: PARSE_STATUSES[randomInt(0, 2)],
        uploadedAt: randomDate('2026-05-09', createdAt),
      };
    });

    tasks.push({
      id,
      name: `${cfg.region}_${cfg.scenario}_${createdAt.slice(0, 10).replace(/-/g, '')}`,
      region: cfg.region,
      status: cfg.status,
      scenario: cfg.scenario,
      createdAt,
      updatedAt,
      pm25Peak: cfg.pm25,
      o3Peak: cfg.o3,
      aodValue: cfg.aod,
      anomalyCount: cfg.anomaly,
      files,
    });
  });

  return tasks;
}

export function generateMockWarnings(): WarningEvent[] {
  const warnings: WarningEvent[] = [];

  const warningConfigs: { region: string; level: WarningLevel; pollutant: string; value: number; threshold: number; status: WarningEvent['status'] }[] = [
    { region: '北京', level: 'red', pollutant: 'PM2.5', value: 278, threshold: 250, status: 'active' },
    { region: '广州', level: 'orange', pollutant: 'O3', value: 380, threshold: 320, status: 'reviewing' },
    { region: '武汉', level: 'orange', pollutant: 'PM2.5', value: 198, threshold: 150, status: 'adjusting' },
    { region: '上海', level: 'yellow', pollutant: 'O3', value: 210, threshold: 200, status: 'active' },
    { region: '成都', level: 'blue', pollutant: 'PM10', value: 165, threshold: 150, status: 'closed' },
    { region: '沈阳', level: 'yellow', pollutant: 'PM2.5', value: 142, threshold: 115, status: 'reviewing' },
  ];

  warningConfigs.forEach((cfg, i) => {
    const id = `warn-${String(i + 1).padStart(3, '0')}`;
    warnings.push({
      id,
      taskId: `task-${String(randomInt(1, 8)).padStart(3, '0')}`,
      region: cfg.region,
      level: cfg.level,
      pollutant: cfg.pollutant,
      value: cfg.value,
      threshold: cfg.threshold,
      status: cfg.status,
      triggeredAt: randomDate('2026-05-15', '2026-06-08'),
    });
  });

  return warnings;
}

export function generateMockAdjustmentLogs(): AdjustmentLog[] {
  const logs: AdjustmentLog[] = [
    {
      id: 'adj-001',
      warningId: 'warn-001',
      parameter: '排放源强度',
      oldValue: 1.0,
      newValue: 0.7,
      operator: '系统自动',
      adjustedAt: '2026-06-07 14:23',
    },
    {
      id: 'adj-002',
      warningId: 'warn-001',
      parameter: '边界层高度',
      oldValue: 800,
      newValue: 600,
      operator: '张伟',
      adjustedAt: '2026-06-07 15:10',
    },
    {
      id: 'adj-003',
      warningId: 'warn-003',
      parameter: '化学转化率',
      oldValue: 0.85,
      newValue: 0.72,
      operator: '李明',
      adjustedAt: '2026-06-06 09:45',
    },
    {
      id: 'adj-004',
      warningId: 'warn-002',
      parameter: '光解速率',
      oldValue: 0.0034,
      newValue: 0.0041,
      operator: '系统自动',
      adjustedAt: '2026-06-08 11:30',
    },
  ];

  return logs;
}

export function generateMockReductionPlans(): EmissionReductionPlan[] {
  return [
    {
      id: 'plan-001',
      warningId: 'warn-001',
      productionLimitRatio: 0.3,
      dustControlIntensity: 0.8,
      trafficRestrictionLevel: 2,
      effectiveFrom: '2026-06-07 16:00',
    },
    {
      id: 'plan-002',
      warningId: 'warn-003',
      productionLimitRatio: 0.2,
      dustControlIntensity: 0.6,
      trafficRestrictionLevel: 1,
      effectiveFrom: '2026-06-06 12:00',
    },
    {
      id: 'plan-003',
      warningId: 'warn-002',
      productionLimitRatio: 0.15,
      dustControlIntensity: 0.5,
      trafficRestrictionLevel: 1,
      effectiveFrom: '2026-06-08 14:00',
    },
  ];
}

export function generateMockReports(): Report[] {
  return [
    {
      id: 'rpt-001',
      taskId: 'task-001',
      city: '北京',
      season: '夏季',
      scenario: '减排情景A',
      generatedAt: '2026-06-08 10:30',
      status: 'ready',
    },
    {
      id: 'rpt-002',
      taskId: 'task-008',
      city: '成都',
      season: '夏季',
      scenario: '减排情景A',
      generatedAt: '2026-06-07 16:45',
      status: 'ready',
    },
    {
      id: 'rpt-003',
      taskId: 'task-003',
      city: '广州',
      season: '夏季',
      scenario: '极端天气情景',
      generatedAt: '2026-06-08 22:10',
      status: 'generating',
    },
    {
      id: 'rpt-004',
      taskId: 'task-004',
      city: '成都',
      season: '夏季',
      scenario: '减排情景B',
      generatedAt: '2026-06-09 08:00',
      status: 'generating',
    },
    {
      id: 'rpt-005',
      taskId: 'task-001',
      city: '北京',
      season: '春季',
      scenario: '基准情景',
      generatedAt: '2026-05-30 14:20',
      status: 'ready',
    },
  ];
}

export function generateMockApprovals(): ApprovalRecord[] {
  return [
    {
      id: 'apr-001',
      taskId: 'task-001',
      level: 'scientist',
      approver: '张伟',
      status: 'approved',
      comment: '模拟参数合理，结果可信',
      approvedAt: '2026-06-08 11:00',
    },
    {
      id: 'apr-002',
      taskId: 'task-001',
      level: 'forecast_center',
      approver: '李明',
      status: 'approved',
      comment: '预报中心审核通过，可发布',
      approvedAt: '2026-06-08 14:30',
    },
    {
      id: 'apr-003',
      taskId: 'task-003',
      level: 'scientist',
      approver: '王芳',
      status: 'pending',
      comment: '',
      approvedAt: '',
    },
    {
      id: 'apr-004',
      taskId: 'task-007',
      level: 'scientist',
      approver: '赵强',
      status: 'rejected',
      comment: '异常回退需补充原因分析后重新提交',
      approvedAt: '2026-06-08 09:15',
    },
  ];
}

export function generateMockRecommendations(): Recommendation[] {
  return [
    {
      id: 'rec-001',
      strategyType: '工业限产',
      description: '对重点区域钢铁、水泥行业实施30%限产，降低工业排放负荷',
      effectivenessScore: 0.78,
      timePeriod: '即时-72小时',
      conditions: '静稳天气条件下适用',
    },
    {
      id: 'rec-002',
      strategyType: '机动车限行',
      description: '启动二级交通管制，限行国三及以下排放标准车辆',
      effectivenessScore: 0.45,
      timePeriod: '即时-48小时',
      conditions: '本地排放为主时适用',
    },
    {
      id: 'rec-003',
      strategyType: '扬尘管控',
      description: '加强建筑工地扬尘治理，露天作业全面停工，增加道路洒水频次',
      effectivenessScore: 0.62,
      timePeriod: '即时-24小时',
      conditions: '风速<3m/s时启动',
    },
    {
      id: 'rec-004',
      strategyType: '区域联防联控',
      description: '协调周边省市同步实施减排措施，控制区域传输影响',
      effectivenessScore: 0.85,
      timePeriod: '24-96小时',
      conditions: '区域性传输为主时适用',
    },
    {
      id: 'rec-005',
      strategyType: '应急减排',
      description: '启动红色预警应急减排清单，重点企业执行50%减排目标',
      effectivenessScore: 0.91,
      timePeriod: '即时-48小时',
      conditions: '持续高温天气下适用',
    },
  ];
}

export function generateMockDailyStats(): DailyStats[] {
  const stats: DailyStats[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date('2026-06-09');
    d.setDate(d.getDate() - i);

    const baseCompletion = 0.72 + (29 - i) * 0.004 + Math.random() * 0.08;
    const baseResponse = 42 - (29 - i) * 0.3 + Math.random() * 15;
    const baseCompliance = 0.85 + Math.random() * 0.12;
    const baseAccuracy = 0.68 + (29 - i) * 0.005 + Math.random() * 0.1;

    stats.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      completionRate: parseFloat(Math.min(baseCompletion, 0.98).toFixed(2)),
      avgResponseTime: parseFloat(Math.max(baseResponse, 18).toFixed(1)),
      complianceRate: parseFloat(Math.min(baseCompliance, 0.99).toFixed(2)),
      indirectEffectAccuracy: parseFloat(Math.min(baseAccuracy, 0.96).toFixed(2)),
      totalSimulations: randomInt(8, 25),
      totalWarnings: randomInt(0, 6),
    });
  }

  return stats;
}

export function generateMonitorData() {
  const pm25Data: { time: string; value: number; standard: number }[] = [];
  const o3Data: { time: string; value: number; standard: number }[] = [];

  for (let h = 0; h < 24; h++) {
    const timeStr = `${String(h).padStart(2, '0')}:00`;

    let pm25Base: number;
    if (h >= 7 && h <= 9) pm25Base = 120 + Math.random() * 80;
    else if (h >= 17 && h <= 20) pm25Base = 140 + Math.random() * 100;
    else if (h >= 0 && h <= 5) pm25Base = 60 + Math.random() * 40;
    else pm25Base = 80 + Math.random() * 60;

    pm25Data.push({
      time: timeStr,
      value: parseFloat(pm25Base.toFixed(1)),
      standard: 75,
    });

    let o3Base: number;
    if (h >= 11 && h <= 15) o3Base = 260 + Math.random() * 120;
    else if (h >= 8 && h <= 18) o3Base = 180 + Math.random() * 80;
    else o3Base = 80 + Math.random() * 60;

    o3Data.push({
      time: timeStr,
      value: parseFloat(o3Base.toFixed(1)),
      standard: 200,
    });
  }

  const aodHeatmap: { x: number; y: number; value: number }[] = [];
  for (let x = 0; x < 20; x++) {
    for (let y = 0; y < 20; y++) {
      const cx = 10;
      const cy = 10;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const val = 2.2 * Math.exp(-dist * 0.25) + Math.random() * 0.3;
      if (val > 0.15) {
        aodHeatmap.push({
          x,
          y,
          value: parseFloat(val.toFixed(2)),
        });
      }
    }
  }

  return { pm25Data, o3Data, aodHeatmap };
}
