import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoadingState from "./components/LoadingState";
import { useAuth } from "./context/AuthContext";
import AppLayout from "./layouts/AppLayout";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProblemsPage = lazy(() => import("./pages/ProblemsPage"));
const ProblemFormPage = lazy(() => import("./pages/ProblemFormPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const RoadmapPage = lazy(() => import("./pages/RoadmapPage"));
const RevisionPlanPage = lazy(() => import("./pages/RevisionPlanPage"));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PlatformSyncPage = lazy(() => import("./pages/PlatformSyncPage"));
const MockInterviewPage = lazy(() => import("./pages/MockInterviewPage"));

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/app" element={<Protected><AppLayout /></Protected>}>
          <Route index element={<DashboardPage />} />
          <Route path="problems" element={<ProblemsPage />} />
          <Route path="problems/new" element={<ProblemFormPage />} />
          <Route path="problems/:id/edit" element={<ProblemFormPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="roadmap" element={<RoadmapPage />} />
          <Route path="revision" element={<RevisionPlanPage />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="mock-interview" element={<MockInterviewPage />} />
          <Route path="sync" element={<PlatformSyncPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
