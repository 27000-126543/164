import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

export default function Layout() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-navy-950">
      <Sidebar />
      <TopBar />
      <main
        className={cn(
          "min-h-screen pt-[56px] transition-all duration-300",
          sidebarCollapsed ? "pl-[72px]" : "pl-[240px]"
        )}
      >
        <div className="h-full overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
