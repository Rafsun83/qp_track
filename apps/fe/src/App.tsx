import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { ApiKeysPage } from "./pages/api-keys/ApiKeysPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { SurveyResponsesPage } from "./pages/survey-responses/SurveyResponsesPage";
import { UsersPage } from "./pages/users/UsersPage";
import { WebhookTestPage } from "./pages/webhook-test/WebhookTestPage";

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/users" element={<UsersPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/webhook-test" element={<WebhookTestPage />} />
          <Route path="/survey-responses" element={<SurveyResponsesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/users" replace />} />
    </Routes>
  );
}

export default App;
