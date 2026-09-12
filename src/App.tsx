import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Forecast } from "./pages/Forecast";
import { Simulator } from "./pages/Simulator";
import { Decisions } from "./pages/Decisions";
import { Site } from "./pages/Site";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="simulator" element={<Simulator />} />
        <Route path="decisions" element={<Decisions />} />
        <Route path="site" element={<Site />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
