import { useAuth } from "../../context/AuthContext";
import { useRealtime } from "../../context/RealtimeContext";
import { useTheme } from "../../context/ThemeContext";

export function Header({ title, subtitle }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { connected } = useRealtime();

  return (
    <header className="topbar">
      <div>
        <h1 className="topbar-title">{title}</h1>
        {subtitle ? <p className="topbar-sub">{subtitle}</p> : null}
      </div>
      <div className="topbar-actions">
        <span className="live-chip">
          <span className={`live-dot${connected ? " is-live" : ""}`} />
          Live
        </span>
        {user ? <span className="user-chip">{user.name}</span> : null}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
