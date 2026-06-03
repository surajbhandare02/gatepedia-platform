import { useState } from "react";
import toast from "react-hot-toast";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { Header } from "../components/layout/Header";
import { StatCard } from "../components/ui/StatCard";
import { FocusTimer } from "../components/productivity/FocusTimer";

import {
  createGoal,
  fetchProductivity,
} from "../services/platformService";

export function ProductivityPage() {

  const queryClient = useQueryClient();

  // ---------------- STATES ----------------

  const [goalTitle, setGoalTitle] = useState("");

  const [target, setTarget] = useState("10");



  // ---------------- QUERY ----------------

  const productivity = useQuery({

    queryKey: ["productivity"],

    queryFn: fetchProductivity,
  });

  // ---------------- GOAL MUTATION ----------------

  const goalMutation = useMutation({

    mutationFn: createGoal,

    onSuccess: () => {

      toast.success("Goal created");

      setGoalTitle("");

      setTarget("10");

      queryClient.invalidateQueries({
        queryKey: ["productivity"],
      });
    },

    onError: () => {

      toast.error("Failed to create goal");
    },
  });

  // ---------------- FOCUS MUTATION ----------------
  // (Focus mutations are now handled directly inside FocusTimer component)

  // ---------------- GAMIFICATION ----------------

  const gamification =
    productivity.data?.gamification;

  // ---------------- LOADING ----------------

  if (productivity.isLoading) {

    return (
      <>
        <Header
          title="Productivity"
          subtitle="Loading productivity data..."
        />

        <div className="page">

          <div className="panel">
            <p>Loading...</p>
          </div>

        </div>
      </>
    );
  }

  // ---------------- ERROR ----------------

  if (productivity.isError) {

    return (
      <>
        <Header
          title="Productivity"
          subtitle="Unable to load productivity data"
        />

        <div className="page">

          <div className="panel">
            <p>
              Something went wrong while
              fetching data.
            </p>
          </div>

        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Productivity"
        subtitle="Goals, Pomodoro focus, XP, levels, achievements, and consistency signals."
      />

      <div className="page">

        {/* ---------------- STATS ---------------- */}

        <section className="grid stats-grid">

          <StatCard
            label="XP"
            value={String(
              gamification?.xp_points ?? 0
            )}
            hint={`Level ${
              gamification?.level ?? 1
            }`}
            accent="blue"
          />

          <StatCard
            label="Deep work"
            value={`${
              productivity.data?.deep_work_minutes ??
              0
            }m`}
            hint="Completed Pomodoro focus time"
            accent="teal"
          />

          <StatCard
            label="Achievements"
            value={String(
              gamification?.achievements
                ?.length ?? 0
            )}
            hint="Unlocked badges"
            accent="violet"
          />

          <StatCard
            label="Streak"
            value={`${
              gamification?.current_streak ?? 0
            }d`}
            hint="Gamified consistency"
            accent="amber"
          />

        </section>

        {/* ---------------- GOALS + POMODORO ---------------- */}

        <section className="saas-grid">

          {/* ---------------- GOAL SCHEDULER ---------------- */}

          <article className="panel">

            <div className="panel-head">

              <h2>Goal Scheduler</h2>

              <p className="panel-sub">
                Create measurable goals for
                hours, topics, PYQs, or revisions.
              </p>

            </div>

            <form
              className="inline-form"
              onSubmit={(e) => {

                e.preventDefault();

                if (!goalTitle.trim()) {

                  toast.error(
                    "Please enter a goal title"
                  );

                  return;
                }

                const numericTarget =
                  Number(target);

                if (
                  !numericTarget ||
                  numericTarget < 1
                ) {

                  toast.error(
                    "Target must be greater than 0"
                  );

                  return;
                }

                goalMutation.mutate({

                  title: goalTitle.trim(),

                  target_value: numericTarget,

                  unit: "hours",
                });
              }}
            >

              <input
                className="input"
                value={goalTitle}
                onChange={(e) =>
                  setGoalTitle(e.target.value)
                }
                placeholder="Finish OS deadlocks"
              />

              <input
                className="input"
                type="number"
                min="1"
                value={target}
                onChange={(e) =>
                  setTarget(e.target.value)
                }
              />

              <button
                className="btn btn-primary"
                disabled={goalMutation.isPending}
              >

                {goalMutation.isPending
                  ? "Adding..."
                  : "Add goal"}

              </button>

            </form>

            <div className="stack-list">

              {(productivity.data?.goals || [])
                .length === 0 ? (

                <p>No goals created yet.</p>

              ) : (

                (productivity.data?.goals || [])
                  .map((goal) => (

                    <div
                      className="compact-row"
                      key={goal.id}
                    >

                      <span>
                        {goal.title}
                      </span>

                      <span className="pill subtle">

                        {goal.current_value}/
                        {goal.target_value}
                        {" "}
                        {goal.unit}

                      </span>

                    </div>

                  ))
              )}

            </div>

          </article>

          {/* ---------------- POMODORO ---------------- */}

          <FocusTimer 
            activeSession={(productivity.data?.focus_sessions || []).find(s => s.status === "active")}
            focusSessions={productivity.data?.focus_sessions || []}
          />

        </section>

        {/* ---------------- ACHIEVEMENTS ---------------- */}

        <section className="panel">

          <div className="panel-head">

            <h2>Achievements</h2>

            <p className="panel-sub">
              Portfolio-friendly gamification
              layer.
            </p>

          </div>

          <div className="achievement-grid">

            {(gamification?.achievements || [])
              .length === 0 ? (

              <p>
                No achievements unlocked yet.
              </p>

            ) : (

              (
                gamification?.achievements ||
                []
              ).map((achievement) => (

                <div
                  className="achievement-card"
                  key={achievement.code}
                >

                  <strong>
                    {achievement.title}
                  </strong>

                  <p>
                    {achievement.description}
                  </p>

                  <span>
                    {achievement.xp_reward} XP
                  </span>

                </div>

              ))
            )}

          </div>

        </section>

      </div>
    </>
  );
}