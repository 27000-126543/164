import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, Bell } from "lucide-react";

const pageNames: Record<string, string> = {
  "/dashboard": "综合看板",
  "/simulation": "模拟任务",
  "/monitor": "实时监控",
  "/warning": "预警中心",
  "/report": "报告中心",
  "/recommend": "智能推荐",
  "/approval": "审批中心",
};

function formatTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

export default function TopBar() {
  const [time, setTime] = useState(formatTime(new Date()));
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const base = "/" + location.pathname.split("/")[1];
  const pageName = pageNames[base] || "首页";

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-[56px] items-center justify-between bg-navy-900/80 backdrop-blur border-b border-navy-700 px-6">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="text-gray-500">首页</span>
        <span className="text-gray-600">/</span>
        <span className="text-gray-200">{pageName}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="搜索..."
            className="h-8 w-48 rounded-lg bg-gray-800 pl-9 pr-3 text-sm text-gray-300 placeholder-gray-500 outline-none focus:ring-1 focus:ring-cyber-500/50 transition"
          />
        </div>

        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-navy-700 hover:text-gray-200 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        <span className="font-mono text-xs text-gray-500">{time}</span>
      </div>
    </header>
  );
}
