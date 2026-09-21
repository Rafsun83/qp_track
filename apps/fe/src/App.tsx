import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { OrganizationDetailPage } from "./pages/organizations/OrganizationDetailPage";
import { OrganizationsPage } from "./pages/organizations/OrganizationsPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { ProjectDetailPage } from "./pages/projects/ProjectDetailPage";
import { SprintTicketsPage } from "./pages/tickets/SprintTicketsPage";

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route
            path="/organizations/:id"
            element={<OrganizationDetailPage />}
          />
          <Route
            path="/organizations/:organizationId/projects/:projectId"
            element={<ProjectDetailPage />}
          />
          <Route
            path="/organizations/:organizationId/projects/:projectId/sprints/:sprintId"
            element={<SprintTicketsPage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
