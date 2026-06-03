import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { Header } from "../components/layout/Header";

import {
  fetchProfile,
  updateProfile,
} from "../services/platformService";

import { useRealtime } from "../context/RealtimeContext";

export function ProfilePage() {
  const queryClient = useQueryClient();

  const realtime = useRealtime();

  // ---------------- PROFILE QUERY ----------------
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  // ---------------- FORM STATE ----------------
  const [values, setValues] = useState({
    name: "",
    avatar_url: "",
    target_exam_date: "",
    daily_goal_hours: "",
    weekly_goal_hours: "",
  });

  // ---------------- LOAD PROFILE ----------------
  useEffect(() => {
    if (profile.data) {
      setValues({
        name: profile.data.name || "",
        avatar_url: profile.data.avatar_url || "",
        target_exam_date:
          profile.data.target_exam_date || "",
        daily_goal_hours:
          profile.data.daily_goal_hours || "",
        weekly_goal_hours:
          profile.data.weekly_goal_hours || "",
      });
    }
  }, [profile.data]);

  // ---------------- UPDATE MUTATION ----------------
  const update = useMutation({
    mutationFn: updateProfile,

    onSuccess: () => {
      toast.success("Profile saved");

      queryClient.invalidateQueries({
        queryKey: ["profile"],
      });
    },

    onError: () => {
      toast.error("Failed to save profile");
    },
  });

  // ---------------- INPUT HANDLER ----------------
  const handleChange = (key) => (e) => {
    setValues((current) => ({
      ...current,
      [key]: e.target.value,
    }));
  };

  // ---------------- SUBMIT ----------------
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!values.name.trim()) {
      toast.error("Name is required");
      return;
    }

    update.mutate({
      ...values,

      daily_goal_hours: Number(
        values.daily_goal_hours
      ),

      weekly_goal_hours: Number(
        values.weekly_goal_hours
      ),
    });
  };

  // ---------------- LOADING ----------------
  if (profile.isLoading) {
    return (
      <>
        <Header
          title="Profile"
          subtitle="Loading profile..."
        />

        <div className="page">
          <div className="panel">
            <p>Loading profile data...</p>
          </div>
        </div>
      </>
    );
  }

  // ---------------- ERROR ----------------
  if (profile.isError) {
    return (
      <>
        <Header
          title="Profile"
          subtitle="Unable to load profile"
        />

        <div className="page">
          <div className="panel">
            <p>Something went wrong.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Profile"
        subtitle="Personalization, exam target, goals, and multi-device-ready preferences."
      />

      <div className="page">
        <form
          className="panel profile-form"
          onSubmit={handleSubmit}
        >
          {/* ---------------- AVATAR ---------------- */}
          <div className="profile-avatar-wrapper">
            {values.avatar_url ? (
              <img
                src={values.avatar_url}
                alt="Profile"
                className="profile-avatar-image"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div className="profile-avatar">
                {values.name
                  ?.slice(0, 2)
                  ?.toUpperCase() || "GP"}
              </div>
            )}
          </div>

          {/* ---------------- FORM ---------------- */}
          <div className="form-grid">
            <label className="field">
              <span className="field-label">
                Name
              </span>

              <input
                className="input"
                value={values.name}
                onChange={handleChange("name")}
                placeholder="Enter your name"
              />
            </label>

            <label className="field">
              <span className="field-label">
                Avatar URL
              </span>

              <input
                className="input"
                value={values.avatar_url}
                onChange={handleChange(
                  "avatar_url"
                )}
                placeholder="https://example.com/avatar.jpg"
              />
            </label>

            <label className="field">
              <span className="field-label">
                Target exam date
              </span>

              <input
                className="input"
                type="date"
                value={values.target_exam_date}
                onChange={handleChange(
                  "target_exam_date"
                )}
              />
            </label>

            <label className="field">
              <span className="field-label">
                Daily goal hours
              </span>

              <input
                className="input"
                type="number"
                min="1"
                step="0.5"
                value={values.daily_goal_hours}
                onChange={handleChange(
                  "daily_goal_hours"
                )}
              />
            </label>

            <label className="field">
              <span className="field-label">
                Weekly goal hours
              </span>

              <input
                className="input"
                type="number"
                min="1"
                step="0.5"
                value={values.weekly_goal_hours}
                onChange={handleChange(
                  "weekly_goal_hours"
                )}
              />
            </label>

            {/* ---------------- REALTIME STATUS ---------------- */}
            <div className="profile-status">
              <span
                className={`live-dot${
                  realtime?.connected
                    ? " is-live"
                    : ""
                }`}
              />

              {realtime?.connected
                ? "Realtime connected"
                : "Realtime idle"}
            </div>
          </div>

          {/* ---------------- BUTTON ---------------- */}
          <button
            className="btn btn-primary"
            disabled={update.isPending}
          >
            {update.isPending
              ? "Saving..."
              : "Save profile"}
          </button>
        </form>
      </div>
    </>
  );
}