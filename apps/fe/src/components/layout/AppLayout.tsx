import { Outlet } from "react-router-dom";
import { NotificationProvider } from "../../notifications/NotificationContext";
import { NotificationToasts } from "../notifications/NotificationToasts";
import { Header } from "./Header";
import { SideNav } from "./SideNav";
import "./AppLayout.css";

export function AppLayout() {
  return (
    <NotificationProvider>
      <div className="app-layout">
        <Header />
        <div className="app-layout__body">
          <SideNav />
          <main className="app-layout__content">
            <Outlet />
          </main>
        </div>
      </div>
      <NotificationToasts />
    </NotificationProvider>
  );
}
