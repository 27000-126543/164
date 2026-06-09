import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  Activity,
  AlertTriangle,
  FileText,
  Lightbulb,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
  CloudSun,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "综合看板", path: "/dashboard" },
  { icon: FlaskConical, label: "模拟任务", path: "/simulation" },
  { icon: Activity, label: "实时监控", path: "/monitor" },
  { icon: AlertTriangle, label: "预警中心", path: "/warning" },
  { icon: FileText, label: "报告中心", path: "/report" },
  { icon: Lightbulb, label: "智能推荐", path: "/recommend" },
  { icon: ShieldCheck, label: "审批中心", path: "/approval" },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-navy-900 border-r border-navy-700 transition-all duration-300",
        sidebarCollapsed ? "w-[72px]" : "w-[240px]"
      )}
      onMouseEnter={() => sidebarCollapsed && useAppStore.setState({ sidebarCollapsed: false })}
      onMouseLeave={() => !sidebarCollapsed && useAppStore.getState().sidebarCollapsed === false && undefined}
    >
      <div className="flex h-[56px] items-center justify-between px-4 border-b border-navy-700">
        <div className={cn("flex items-center gap-3 overflow-hidden", sidebarCollapsed && "justify-center")}>
          <CloudSun className="h-7 w-7 shrink-0 text-cyber-500" />
          {!sidebarCollapsed && (
            <span className="whitespace-nowrap text-sm font-semibold text-gray-100">
              大气化学模拟预警平台
            </span>
          )}
        </div>
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-gray-200 hover:bg-navy-700 transition-colors"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-5 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 border border-navy-600 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ChevronsRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    sidebarCollapsed && "justify-center px-0",
                    isActive
                      ? "border-l-[3px] border-cyber-500 bg-cyber-500/10 text-cyber-400"
                      : "text-gray-400 hover:bg-navy-800 hover:text-gray-200"
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-cyber-400")} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-navy-700 p-3">
        <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyber-500/20 text-xs font-bold text-cyber-400">
            陈
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm text-gray-200">陈志远</span>
              <span className="truncate text-xs text-gray-500">环境科学家</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
