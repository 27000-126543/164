import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Simulation from "@/pages/Simulation";
import Monitor from "@/pages/Monitor";
import Warning from "@/pages/Warning";
import Report from "@/pages/Report";
import Recommend from "@/pages/Recommend";
import Approval from "@/pages/Approval";
import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  generateMockTasks,
  generateMockWarnings,
  generateMockAdjustmentLogs,
  generateMockReductionPlans,
  generateMockReports,
  generateMockApprovals,
  generateMockRecommendations,
  generateMockDailyStats,
} from "@/data/mockData";

function DataInitializer({ children }: { children: React.ReactNode }) {
  const {
    setTasks,
    setWarnings,
    addAdjustmentLog,
    addReductionPlan,
    setReports,
    setApprovals,
    setRecommendations,
    setDailyStats,
  } = useAppStore();

  useEffect(() => {
    setTasks(generateMockTasks());
    setWarnings(generateMockWarnings());
    generateMockAdjustmentLogs().forEach((l) => addAdjustmentLog(l));
    generateMockReductionPlans().forEach((p) => addReductionPlan(p));
    setReports(generateMockReports());
    setApprovals(generateMockApprovals());
    setRecommendations(generateMockRecommendations());
    setDailyStats(generateMockDailyStats());
  }, []);

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <DataInitializer>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/warning" element={<Warning />} />
            <Route path="/report" element={<Report />} />
            <Route path="/recommend" element={<Recommend />} />
            <Route path="/approval" element={<Approval />} />
          </Route>
        </Routes>
      </DataInitializer>
    </Router>
  );
}
