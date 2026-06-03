import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { AUTH_TOKEN_KEY } from "../services/api";
import { useAuth } from "./AuthContext";

const RealtimeContext = createContext({ connected: false, notifications: [] });

const socketURL =
  process.env.REACT_APP_SOCKET_URL ||
  process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

export function RealtimeProvider({ children }) {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const activeToken = token || localStorage.getItem(AUTH_TOKEN_KEY);
    if (!activeToken) return undefined;

    const socket = io(socketURL, {
      auth: { token: activeToken },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("notification", (notification) => {
      setNotifications((items) => [notification, ...items].slice(0, 8));
      if (notification?.title && notification.notification_type !== "system") {
        toast(notification.title);
      }
    });

    return () => socket.disconnect();
  }, [token]);

  const value = useMemo(
    () => ({ connected, notifications }),
    [connected, notifications]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
