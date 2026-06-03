import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

/**
 * Shell layout: fixed sidebar + scrollable main column with routed pages.
 */
export function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
}
