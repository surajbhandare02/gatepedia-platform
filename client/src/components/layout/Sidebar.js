import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: "D" },
  { to: "/planner", label: "AI Planner", icon: "AI" },
  { to: "/subjects", label: "Syllabus", icon: "S" },
  { to: "/revision", label: "Revision", icon: "R" },
  { to: "/productivity", label: "Productivity", icon: "P" },
  { to: "/analytics", label: "Analytics", icon: "A" },
  { to: "/assistant", label: "Assistant", icon: "Q" },
  { to: "/profile", label: "Profile", icon: "U" },
  { to: "/admin", label: "Admin", icon: "M" },
];

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar-brand">
        <span className="sidebar-logo" aria-hidden>
          GP
        </span>
        <div>
          <div className="sidebar-title">GATE Progress</div>
          <div className="sidebar-sub">AI Prep SaaS</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " is-active" : ""}`
            }
          >
            <span className="sidebar-link-icon" aria-hidden>
              {link.icon}
            </span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        Plans, revision, PYQs, focus, insights, and realtime learning signals.
      </div>
    </aside>
  );
}
