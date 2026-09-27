import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  WalletCards,
  Clock3,
  Plus,
  Trash2,
  CircleDollarSign,
  Target,
  LogOut,
  RefreshCcw,
  CalendarDays,
  List,
  Columns3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

import { Doughnut, Bar } from "react-chartjs-2";
import * as XLSX from "xlsx";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

type Task = {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "DOING" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  tags?: string;
  deadline?: string;
  estimatedMinutes?: number;
  createdAt?: string;
  completedAt?: string;
};

type Transaction = {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  note?: string;
};

type DailyTarget = {
  id: string;
  date: string;
  activity: string;
  targetMinutes: number;
};

type TimeLog = {
  id: string;
  date: string;
  activity: string;
  durationMinutes: number;
  note?: string;
};

type Data = {
  tasks: Task[];
  transactions: Transaction[];
  targets: DailyTarget[];
  timeLogs: TimeLog[];
  dashboard: any;
};

const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

const money = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v || 0);

async function getApi(action = "bootstrap") {
  const r = await fetch(`/api/backend?action=${encodeURIComponent(action)}`, {
    cache: "no-store",
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "API error");
  return j.data;
}

async function postApi(action: string, payload: any = {}) {
  const r = await fetch("/api/backend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  const j = await r.json();

  if (!j.ok) throw new Error(j.error || "API error");

  return j.data;
}

const card =
  "rounded-2xl border border-zinc-800 bg-zinc-950 p-4";

const input =
  "w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-zinc-600";

const btn =
  "rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50";

/* =========================================================
   DATE / DEADLINE HELPERS
========================================================= */

function parseLocalDate(value?: string) {
  if (!value) return null;

  const parts = value.slice(0, 10).split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateID(value?: string) {
  const date = parseLocalDate(value);

  if (!date) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function deadlineInfo(task: Task) {
  if (!task.deadline) {
    return {
      text: "Tanpa deadline",
      className: "border-zinc-700 bg-zinc-900 text-zinc-400",
      days: null as number | null,
    };
  }

  if (task.status === "DONE") {
    return {
      text: `Selesai • ${formatDateID(task.deadline)}`,
      className:
        "border-emerald-900/60 bg-emerald-950/40 text-emerald-300",
      days: 0,
    };
  }

  const deadline = parseLocalDate(task.deadline);
  const now = parseLocalDate(today());

  if (!deadline || !now) {
    return {
      text: formatDateID(task.deadline),
      className: "border-zinc-700 bg-zinc-900 text-zinc-400",
      days: null,
    };
  }

  const diff = Math.ceil(
    (deadline.getTime() - now.getTime()) / 86400000
  );

  if (diff < 0) {
    const overdue = Math.abs(diff);

    return {
      text: `Terlambat ${overdue} hari`,
      className:
        "border-red-900/70 bg-red-950/50 text-red-300",
      days: diff,
    };
  }

  if (diff === 0) {
    return {
      text: "Deadline hari ini",
      className:
        "border-red-800 bg-red-950/60 text-red-200",
      days: diff,
    };
  }

  if (diff === 1) {
    return {
      text: "Besok",
      className:
        "border-orange-800 bg-orange-950/50 text-orange-200",
      days: diff,
    };
  }

  if (diff <= 3) {
    return {
      text: `${diff} hari lagi`,
      className:
        "border-orange-900/70 bg-orange-950/40 text-orange-300",
      days: diff,
    };
  }

  if (diff <= 7) {
    return {
      text: `${diff} hari lagi`,
      className:
        "border-amber-900/60 bg-amber-950/40 text-amber-300",
      days: diff,
    };
  }

  return {
    text: formatDateID(task.deadline),
    className:
      "border-zinc-700 bg-zinc-900 text-zinc-300",
    days: diff,
  };
}

function priorityClass(priority: Task["priority"]) {
  if (priority === "URGENT")
    return "bg-red-950 text-red-300 border-red-900";

  if (priority === "HIGH")
    return "bg-orange-950 text-orange-300 border-orange-900";

  if (priority === "MEDIUM")
    return "bg-amber-950 text-amber-300 border-amber-900";

  return "bg-zinc-900 text-zinc-400 border-zinc-800";
}

function statusLabel(status: Task["status"]) {
  if (status === "TODO") return "To Do";
  if (status === "DOING") return "Doing";
  return "Done";
}

function taskSort(a: Task, b: Task) {
  if (a.status === "DONE" && b.status !== "DONE") return 1;
  if (b.status === "DONE" && a.status !== "DONE") return -1;

  if (!a.deadline && b.deadline) return 1;
  if (a.deadline && !b.deadline) return -1;

  return String(a.deadline || "").localeCompare(
    String(b.deadline || "")
  );
}

/* =========================================================
   MAIN APP
========================================================= */

export default function PersonalOS() {
  const [tab, setTab] = useState<
    "dashboard" | "tasks" | "finance" | "daily"
  >("dashboard");

  const [data, setData] = useState<Data>({
    tasks: [],
    transactions: [],
    targets: [],
    timeLogs: [],
    dashboard: {},
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      setData(await getApi());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const balance = useMemo(
    () =>
      data.transactions.reduce(
        (a, t) =>
          a +
          (t.type === "INCOME"
            ? Number(t.amount)
            : -Number(t.amount)),
        0
      ),
    [data.transactions]
  );

  const pending = data.tasks.filter(
    (t) => t.status !== "DONE"
  ).length;

  const done = data.tasks.filter(
    (t) => t.status === "DONE"
  ).length;

  const todayLogs = data.timeLogs.filter(
    (x) => x.date === today()
  );

  const focusMin = todayLogs
    .filter(
      (x) =>
        !/istirahat|tidur|break/i.test(
          x.activity
        )
    )
    .reduce(
      (a, x) =>
        a + Number(x.durationMinutes),
      0
    );

  const restMin = todayLogs
    .filter((x) =>
      /istirahat|tidur|break/i.test(
        x.activity
      )
    )
    .reduce(
      (a, x) =>
        a + Number(x.durationMinutes),
      0
    );

  const nav = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["tasks", "Task", CheckSquare],
    ["finance", "Keuangan", WalletCards],
    ["daily", "Target Harian", Clock3],
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">

          <div className="flex items-center gap-3">

            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white font-black text-black">
              D
            </div>

            <div>
              <b>Dinar Personal OS</b>
              <div className="text-xs text-zinc-500">
                {today()}
              </div>
            </div>

          </div>

          <div className="flex gap-2">

            <button
              onClick={refresh}
              className="rounded-xl border border-zinc-800 p-2.5"
            >
              <RefreshCcw size={17} />
            </button>

            <form
              method="POST"
              action="/api/logout"
            >
              <button className="rounded-xl border border-zinc-800 p-2.5">
                <LogOut size={17} />
              </button>
            </form>

          </div>

        </div>

      </header>

      <div className="mx-auto grid max-w-7xl md:grid-cols-[220px_1fr]">

        <aside className="hidden min-h-[calc(100vh-65px)] border-r border-zinc-800 p-3 md:block">

          <nav className="space-y-1">

            {nav.map(
              ([key, label, Icon]) => (

                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                    tab === key
                      ? "bg-white text-black"
                      : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>

              )
            )}

          </nav>

        </aside>

        <main className="min-w-0 p-4 pb-24 md:p-6">

          {error && (
            <div className="mb-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-zinc-500">
              Memuat data...
            </div>
          ) : tab === "dashboard" ? (
            <Dashboard
              data={data}
              balance={balance}
              pending={pending}
              done={done}
              focusMin={focusMin}
              restMin={restMin}
            />
          ) : tab === "tasks" ? (
            <Tasks
              data={data}
              refresh={refresh}
            />
          ) : tab === "finance" ? (
            <Finance
              data={data}
              refresh={refresh}
              balance={balance}
            />
          ) : (
            <Daily
              data={data}
              refresh={refresh}
            />
          )}

        </main>

      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-zinc-800 bg-zinc-950 p-2 md:hidden">

        {nav.map(
          ([key, label, Icon]) => (

            <button
              key={key}
              onClick={() => setTab(key)}
              className={`grid place-items-center gap-1 rounded-xl py-2 text-[10px] ${
                tab === key
                  ? "text-white"
                  : "text-zinc-500"
              }`}
            >
              <Icon size={20} />
              {label}
            </button>

          )
        )}

      </nav>

    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  data,
  balance,
  pending,
  done,
  focusMin,
  restMin,
}: any) {

  const statusData = {
    labels: ["To Do", "Doing", "Done"],
    datasets: [
      {
        data: [
          data.tasks.filter((x: Task) => x.status === "TODO").length,
          data.tasks.filter((x: Task) => x.status === "DOING").length,
          data.tasks.filter((x: Task) => x.status === "DONE").length,
        ],
      },
    ],
  };

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));

    return d.toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });
  });

  const activity = {
    labels: last7.map((d) => d.slice(5)),
    datasets: [
      {
        label: "Menit aktivitas",
        data: last7.map((d) =>
          data.timeLogs
            .filter((x: TimeLog) => x.date === d)
            .reduce(
              (a: number, x: TimeLog) =>
                a + Number(x.durationMinutes),
              0
            )
        ),
      },
    ],
  };

  const upcoming = [...data.tasks]
    .filter((x: Task) => x.status !== "DONE" && x.deadline)
    .sort(taskSort)
    .slice(0, 6);

  const todaysTargets = data.targets.filter(
    (x: DailyTarget) => x.date === today()
  );

  const todaysLogs = data.timeLogs.filter(
    (x: TimeLog) => x.date === today()
  );

  const targetProgress = todaysTargets.map((target: DailyTarget) => {
    const actual = todaysLogs
      .filter(
        (log: TimeLog) =>
          log.activity.trim().toLowerCase() ===
          target.activity.trim().toLowerCase()
      )
      .reduce(
        (sum: number, log: TimeLog) =>
          sum + Number(log.durationMinutes || 0),
        0
      );

    const targetMinutes = Number(target.targetMinutes || 0);
    const pct =
      targetMinutes > 0
        ? Math.min(100, Math.round((actual / targetMinutes) * 100))
        : 0;

    return {
      ...target,
      actual,
      pct,
    };
  });

  const dailyProductivity =
    targetProgress.length > 0
      ? Math.round(
          targetProgress.reduce(
            (sum: number, item: any) => sum + item.pct,
            0
          ) / targetProgress.length
        )
      : 0;

  const completedTargets = targetProgress.filter(
    (item: any) => item.pct >= 100
  ).length;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Ringkasan produktivitas, task, waktu, dan keuanganmu hari ini.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<CheckSquare />}
          label="Task aktif"
          value={pending}
        />

        <Metric
          icon={<CircleDollarSign />}
          label="Saldo"
          value={money(balance)}
        />

        <Metric
          icon={<Target />}
          label="Produktivitas hari ini"
          value={`${dailyProductivity}%`}
        />

        <Metric
          icon={<Clock3 />}
          label="Waktu tercatat"
          value={`${Math.round(((focusMin + restMin) / 60) * 10) / 10} jam`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h2 className="mb-4 font-semibold">Status task</h2>
          <div className="mx-auto max-w-xs">
            <Doughnut data={statusData} />
          </div>
        </div>

        <div className={card}>
          <h2 className="mb-4 font-semibold">Aktivitas 7 hari</h2>
          <Bar data={activity} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Target harian</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {completedTargets}/{targetProgress.length} target selesai hari ini
              </p>
            </div>

            <div className="rounded-xl bg-zinc-900 px-3 py-2 text-right">
              <div className="text-xl font-black">{dailyProductivity}%</div>
              <div className="text-[10px] text-zinc-500">progress</div>
            </div>
          </div>

          {targetProgress.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-600">
              Belum ada target hari ini.
            </div>
          ) : (
            <div className="space-y-4">
              {targetProgress.slice(0, 6).map((item: any) => (
                <div key={item.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium">
                      {item.activity}
                    </span>

                    <span className="shrink-0 text-zinc-500">
                      {formatMinutes(item.actual)} /{" "}
                      {formatMinutes(Number(item.targetMinutes))}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-white transition-all"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>

                  <div className="mt-1 text-[10px] text-zinc-600">
                    {item.pct}% tercapai
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={card}>
          <h2 className="mb-3 font-semibold">Deadline terdekat</h2>

          <div className="space-y-2">
            {upcoming.length === 0 && (
              <p className="text-sm text-zinc-500">
                Belum ada task dengan deadline.
              </p>
            )}

            {upcoming.map((x: Task) => {
              const info = deadlineInfo(x);

              return (
                <div
                  key={x.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900 p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {x.title}
                    </div>

                    <div className="mt-1 text-xs text-zinc-500">
                      {formatDateID(x.deadline)}
                      {" • "}
                      {statusLabel(x.status)}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] ${info.className}`}
                  >
                    {info.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function formatMinutes(minutes: number) {
  const total = Math.max(0, Number(minutes || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours > 0 && mins > 0) return `${hours}j ${mins}m`;
  if (hours > 0) return `${hours} jam`;
  return `${mins} menit`;
}

function Metric({
  icon,
  label,
  value,
}: any) {
  return (
    <div className={card}>

      <div className="mb-4 text-zinc-500">
        {React.cloneElement(
          icon,
          { size: 18 }
        )}
      </div>

      <div className="text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-xs text-zinc-500">
        {label}
      </div>

    </div>
  );
}

/* =========================================================
   TASKS
   NEW: BOARD + LIST + CALENDAR
========================================================= */

function Tasks({
  data,
  refresh,
}: any) {

  const [view, setView] = useState<
    "board" | "list" | "calendar"
  >("board");

  const [calendarMonth, setCalendarMonth] =
    useState(() => {
      const now = new Date();

      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );
    });

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    tags: "",
    deadline: "",
    estimatedMinutes: "",
  });

  async function add(e: any) {

    e.preventDefault();

    await postApi(
      "createTask",
      {
        task: {
          ...form,
          status: "TODO",
          estimatedMinutes:
            Number(
              form.estimatedMinutes ||
                0
            ),
        },
      }
    );

    setForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      tags: "",
      deadline: "",
      estimatedMinutes: "",
    });

    refresh();
  }

  async function status(
    id: string,
    status: string
  ) {

    await postApi(
      "updateTask",
      {
        id,
        patch: {
          status,
        },
      }
    );

    refresh();
  }

  async function del(id: string) {

    if (
      confirm(
        "Hapus task ini?"
      )
    ) {

      await postApi(
        "deleteTask",
        { id }
      );

      refresh();
    }
  }

  const sortedTasks = [
    ...data.tasks,
  ].sort(taskSort);

  const overdueCount =
    data.tasks.filter(
      (task: Task) => {

        const info =
          deadlineInfo(task);

        return (
          task.status !== "DONE" &&
          info.days !== null &&
          info.days < 0
        );
      }
    ).length;

  const todayCount =
    data.tasks.filter(
      (task: Task) =>
        task.status !== "DONE" &&
        task.deadline === today()
    ).length;

  const upcomingCount =
    data.tasks.filter(
      (task: Task) => {

        const info =
          deadlineInfo(task);

        return (
          task.status !== "DONE" &&
          info.days !== null &&
          info.days >= 0 &&
          info.days <= 7
        );
      }
    ).length;

  return (
    <>

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <h1 className="text-2xl font-bold">
            Task
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Kelola pekerjaan dan pantau tenggat waktumu.
          </p>

        </div>

        <div className="inline-flex w-full rounded-xl border border-zinc-800 bg-zinc-900 p-1 lg:w-auto">

          <ViewButton
            active={
              view === "board"
            }
            onClick={() =>
              setView("board")
            }
            icon={
              <Columns3 size={15} />
            }
          >
            Board
          </ViewButton>

          <ViewButton
            active={
              view === "list"
            }
            onClick={() =>
              setView("list")
            }
            icon={<List size={15} />}
          >
            Deadline
          </ViewButton>

          <ViewButton
            active={
              view === "calendar"
            }
            onClick={() =>
              setView("calendar")
            }
            icon={
              <CalendarDays
                size={15}
              />
            }
          >
            Kalender
          </ViewButton>

        </div>

      </div>

      {/* RINGKASAN DEADLINE */}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">

        <div className="rounded-2xl border border-red-900/60 bg-red-950/20 p-4">
          <div className="text-2xl font-bold text-red-300">
            {overdueCount}
          </div>
          <div className="text-xs text-zinc-500">
            Task terlambat
          </div>
        </div>

        <div className="rounded-2xl border border-orange-900/60 bg-orange-950/20 p-4">
          <div className="text-2xl font-bold text-orange-300">
            {todayCount}
          </div>
          <div className="text-xs text-zinc-500">
            Deadline hari ini
          </div>
        </div>

        <div className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4">
          <div className="text-2xl font-bold text-amber-300">
            {upcomingCount}
          </div>
          <div className="text-xs text-zinc-500">
            Jatuh tempo ≤ 7 hari
          </div>
        </div>

      </div>

      {/* FORM */}

      <form
        onSubmit={add}
        className={`${card} mb-5 grid gap-3 md:grid-cols-2`}
      >

        <input
          className={input}
          placeholder="Nama task"
          required
          value={form.title}
          onChange={(e) =>
            setForm({
              ...form,
              title:
                e.target.value,
            })
          }
        />

        <input
          className={input}
          placeholder="Tag: kerja, kuliah, pribadi"
          value={form.tags}
          onChange={(e) =>
            setForm({
              ...form,
              tags:
                e.target.value,
            })
          }
        />

        <select
          className={input}
          value={form.priority}
          onChange={(e) =>
            setForm({
              ...form,
              priority:
                e.target.value,
            })
          }
        >
          <option value="LOW">
            LOW
          </option>
          <option value="MEDIUM">
            MEDIUM
          </option>
          <option value="HIGH">
            HIGH
          </option>
          <option value="URGENT">
            URGENT
          </option>
        </select>

        <div>
          <label className="mb-1.5 block text-xs text-zinc-500">
            Deadline
          </label>

          <input
            className={input}
            type="date"
            value={form.deadline}
            onChange={(e) =>
              setForm({
                ...form,
                deadline:
                  e.target.value,
              })
            }
          />
        </div>

        <input
          className={input}
          type="number"
          min="0"
          placeholder="Estimasi menit"
          value={
            form.estimatedMinutes
          }
          onChange={(e) =>
            setForm({
              ...form,
              estimatedMinutes:
                e.target.value,
            })
          }
        />

        <input
          className={input}
          placeholder="Deskripsi singkat"
          value={
            form.description
          }
          onChange={(e) =>
            setForm({
              ...form,
              description:
                e.target.value,
            })
          }
        />

        <button
          className={`${btn} md:col-span-2`}
        >
          <Plus
            size={16}
            className="mr-2 inline"
          />
          Tambah task
        </button>

      </form>

      {view === "board" && (
        <TaskBoard
          tasks={data.tasks}
          status={status}
          del={del}
        />
      )}

      {view === "list" && (
        <TaskDeadlineList
          tasks={sortedTasks}
          status={status}
          del={del}
        />
      )}

      {view === "calendar" && (
        <TaskCalendar
          tasks={data.tasks}
          month={calendarMonth}
          setMonth={
            setCalendarMonth
          }
          status={status}
        />
      )}

    </>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  children,
}: any) {

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition lg:flex-none ${
        active
          ? "bg-white text-black"
          : "text-zinc-400 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* =========================================================
   TASK BOARD
========================================================= */

function TaskBoard({
  tasks,
  status,
  del,
}: {
  tasks: Task[];
  status: (
    id: string,
    status: string
  ) => Promise<void>;
  del: (
    id: string
  ) => Promise<void>;
}) {

  return (
    <div className="grid gap-4 xl:grid-cols-3">

      {(
        [
          "TODO",
          "DOING",
          "DONE",
        ] as const
      ).map((s) => {

        const items =
          tasks
            .filter(
              (x) =>
                x.status === s
            )
            .sort(taskSort);

        return (
          <section
            key={s}
            className={`${card} min-h-56`}
          >

            <div className="mb-3 flex items-center justify-between">

              <h2 className="font-semibold">
                {statusLabel(s)}
              </h2>

              <span className="rounded-lg bg-zinc-900 px-2 py-1 text-xs text-zinc-500">
                {items.length}
              </span>

            </div>

            <div className="space-y-3">

              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-600">
                  Belum ada task
                </div>
              )}

              {items.map(
                (t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    status={status}
                    del={del}
                  />
                )
              )}

            </div>

          </section>
        );
      })}

    </div>
  );
}

function TaskCard({
  task,
  status,
  del,
}: {
  task: Task;
  status: (
    id: string,
    status: string
  ) => Promise<void>;
  del: (
    id: string
  ) => Promise<void>;
}) {

  const info =
    deadlineInfo(task);

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">

      <div className="flex items-start justify-between gap-2">

        <div className="min-w-0">

          <b className="block text-sm">
            {task.title}
          </b>

          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
              {task.description}
            </p>
          )}

        </div>

        <button
          onClick={() =>
            del(task.id)
          }
          className="shrink-0 text-zinc-600 hover:text-red-400"
        >
          <Trash2 size={15} />
        </button>

      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">

        <span
          className={`rounded-lg border px-2 py-1 ${priorityClass(
            task.priority
          )}`}
        >
          {task.priority}
        </span>

        {task.tags && (
          <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-400">
            {task.tags}
          </span>
        )}

        <span
          className={`rounded-lg border px-2 py-1 ${info.className}`}
        >
          <CalendarDays
            size={11}
            className="mr-1 inline"
          />
          {info.text}
        </span>

      </div>

      {task.deadline && (
        <div className="mt-2 text-[10px] text-zinc-600">
          Tenggat:{" "}
          {formatDateID(
            task.deadline
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-1">

        {(
          [
            "TODO",
            "DOING",
            "DONE",
          ] as const
        ).map((x) => (
          <button
            key={x}
            disabled={
              x === task.status
            }
            onClick={() =>
              status(task.id, x)
            }
            className="rounded-lg border border-zinc-800 py-1.5 text-[10px] disabled:bg-white disabled:text-black"
          >
            {x}
          </button>
        ))}

      </div>

    </article>
  );
}

/* =========================================================
   DEADLINE LIST
========================================================= */

function TaskDeadlineList({
  tasks,
  status,
  del,
}: {
  tasks: Task[];
  status: (
    id: string,
    status: string
  ) => Promise<void>;
  del: (
    id: string
  ) => Promise<void>;
}) {

  return (
    <div className={card}>

      <div className="mb-4">

        <h2 className="font-semibold">
          Urutan Deadline
        </h2>

        <p className="mt-1 text-xs text-zinc-500">
          Task paling mendesak ditampilkan terlebih dahulu.
        </p>

      </div>

      <div className="space-y-2">

        {tasks.length === 0 && (
          <div className="py-10 text-center text-sm text-zinc-600">
            Belum ada task.
          </div>
        )}

        {tasks.map((task) => {

          const info =
            deadlineInfo(task);

          return (
            <div
              key={task.id}
              className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 md:grid-cols-[1fr_auto_auto]"
            >

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <span className="font-medium">
                    {task.title}
                  </span>

                  <span
                    className={`rounded-lg border px-2 py-1 text-[10px] ${priorityClass(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>

                  <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400">
                    {statusLabel(
                      task.status
                    )}
                  </span>

                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">

                  {task.deadline ? (
                    <>
                      <span>
                        <CalendarDays
                          size={13}
                          className="mr-1 inline"
                        />
                        {formatDateID(
                          task.deadline
                        )}
                      </span>

                      <span
                        className={`rounded-lg border px-2 py-1 text-[10px] ${info.className}`}
                      >
                        {info.text}
                      </span>
                    </>
                  ) : (
                    <span>
                      Tanpa deadline
                    </span>
                  )}

                  {task.tags && (
                    <span>
                      #{task.tags}
                    </span>
                  )}

                </div>

              </div>

              <select
                value={task.status}
                onChange={(e) =>
                  status(
                    task.id,
                    e.target.value
                  )
                }
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs outline-none"
              >
                <option value="TODO">
                  TODO
                </option>
                <option value="DOING">
                  DOING
                </option>
                <option value="DONE">
                  DONE
                </option>
              </select>

              <button
                onClick={() =>
                  del(task.id)
                }
                className="grid h-9 w-9 place-items-center rounded-lg border border-zinc-800 text-zinc-600 hover:text-red-400"
              >
                <Trash2 size={15} />
              </button>

            </div>
          );
        })}

      </div>

    </div>
  );
}

/* =========================================================
   CALENDAR
========================================================= */

function TaskCalendar({
  tasks,
  month,
  setMonth,
  status,
}: {
  tasks: Task[];
  month: Date;
  setMonth: React.Dispatch<
    React.SetStateAction<Date>
  >;
  status: (
    id: string,
    status: string
  ) => Promise<void>;
}) {

  const year =
    month.getFullYear();

  const monthIndex =
    month.getMonth();

  const first =
    new Date(
      year,
      monthIndex,
      1
    );

  const last =
    new Date(
      year,
      monthIndex + 1,
      0
    );

  /* JS Minggu = 0.
     Kita ingin Senin = 0.
  */
  const leading =
    (first.getDay() + 6) % 7;

  const daysInMonth =
    last.getDate();

  const totalCells =
    Math.ceil(
      (leading +
        daysInMonth) /
        7
    ) * 7;

  const cells =
    Array.from(
      { length: totalCells },
      (_, i) => {

        const day =
          i - leading + 1;

        if (
          day < 1 ||
          day > daysInMonth
        ) {
          return null;
        }

        return new Date(
          year,
          monthIndex,
          day
        );
      }
    );

  const monthTitle =
    new Intl.DateTimeFormat(
      "id-ID",
      {
        month: "long",
        year: "numeric",
      }
    ).format(month);

  function previousMonth() {

    setMonth(
      new Date(
        year,
        monthIndex - 1,
        1
      )
    );
  }

  function nextMonth() {

    setMonth(
      new Date(
        year,
        monthIndex + 1,
        1
      )
    );
  }

  function goToday() {

    const now =
      new Date();

    setMonth(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      )
    );
  }

  return (
    <div className={card}>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h2 className="text-lg font-semibold capitalize">
            {monthTitle}
          </h2>

          <p className="text-xs text-zinc-500">
            Task ditampilkan berdasarkan tanggal deadline.
          </p>

        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={
              previousMonth
            }
            className="rounded-lg border border-zinc-800 p-2 hover:bg-zinc-900"
          >
            <ChevronLeft
              size={16}
            />
          </button>

          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-zinc-800 px-3 py-2 text-xs hover:bg-zinc-900"
          >
            Hari ini
          </button>

          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg border border-zinc-800 p-2 hover:bg-zinc-900"
          >
            <ChevronRight
              size={16}
            />
          </button>

        </div>

      </div>

      <div className="min-w-[720px]">

        <div className="grid grid-cols-7">

          {[
            "Sen",
            "Sel",
            "Rab",
            "Kam",
            "Jum",
            "Sab",
            "Min",
          ].map((day) => (
            <div
              key={day}
              className="border-b border-zinc-800 px-2 py-2 text-center text-xs font-semibold text-zinc-500"
            >
              {day}
            </div>
          ))}

        </div>

        <div className="grid grid-cols-7">

          {cells.map(
            (date, index) => {

              if (!date) {
                return (
                  <div
                    key={index}
                    className="min-h-32 border-b border-r border-zinc-900 bg-zinc-950/40"
                  />
                );
              }

              const key =
                dateKey(date);

              const dayTasks =
                tasks
                  .filter(
                    (task) =>
                      task.deadline ===
                      key
                  )
                  .sort(taskSort);

              const isToday =
                key === today();

              return (
                <div
                  key={key}
                  className={`min-h-32 border-b border-r border-zinc-900 p-2 ${
                    isToday
                      ? "bg-zinc-900/80"
                      : "bg-zinc-950"
                  }`}
                >

                  <div
                    className={`mb-2 grid h-7 w-7 place-items-center rounded-lg text-xs ${
                      isToday
                        ? "bg-white font-bold text-black"
                        : "text-zinc-500"
                    }`}
                  >
                    {date.getDate()}
                  </div>

                  <div className="space-y-1">

                    {dayTasks
                      .slice(0, 4)
                      .map(
                        (task) => (
                          <button
                            key={
                              task.id
                            }
                            type="button"
                            title={`${task.title} • ${statusLabel(
                              task.status
                            )}`}
                            onClick={() => {
                              const next =
                                task.status ===
                                "TODO"
                                  ? "DOING"
                                  : task.status ===
                                    "DOING"
                                  ? "DONE"
                                  : "TODO";

                              status(
                                task.id,
                                next
                              );
                            }}
                            className={`block w-full truncate rounded-md border px-2 py-1 text-left text-[10px] ${
                              task.status ===
                              "DONE"
                                ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-300 line-through"
                                : priorityClass(
                                    task.priority
                                  )
                            }`}
                          >
                            {task.status ===
                              "DONE"
                              ? "✓ "
                              : ""}
                            {task.title}
                          </button>
                        )
                      )}

                    {dayTasks.length >
                      4 && (
                      <div className="px-1 text-[10px] text-zinc-600">
                        +
                        {dayTasks.length -
                          4}{" "}
                        task lainnya
                      </div>
                    )}

                  </div>

                </div>
              );
            }
          )}

        </div>

      </div>

      <div className="mt-3 text-xs text-zinc-600">
        Tips: klik task pada kalender untuk mengubah status
        TODO → DOING → DONE.
      </div>

    </div>
  );
}

/* =========================================================
   FINANCE
   - DEBET / KREDIT
   - RUNNING BALANCE
   - EDIT / DELETE
   - EXPORT EXCEL
========================================================= */

function Finance({
  data,
  refresh,
  balance,
}: any) {

  const emptyForm = {
    date: today(),
    type: "INCOME",
    description: "",
    amount: "",
  };

  const [form, setForm] =
    useState(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  const transactionsChronological =
    useMemo(() => {

      return [...data.transactions]
        .sort((a: Transaction, b: Transaction) => {

          const byDate =
            String(a.date)
              .localeCompare(
                String(b.date)
              );

          if (byDate !== 0)
            return byDate;

          return String(
            (a as any).createdAt || ""
          ).localeCompare(
            String(
              (b as any).createdAt ||
                ""
            )
          );
        });

    }, [data.transactions]);

  const transactionsWithBalance =
    useMemo(() => {

      let runningBalance = 0;

      return transactionsChronological
        .map((t: Transaction) => {

          const amount =
            Number(t.amount || 0);

          if (
            t.type === "INCOME"
          ) {
            runningBalance += amount;
          } else {
            runningBalance -= amount;
          }

          return {
            ...t,
            runningBalance,
          };
        })
        .reverse();

    }, [
      transactionsChronological,
    ]);

  const income =
    data.transactions
      .filter(
        (x: Transaction) =>
          x.type === "INCOME"
      )
      .reduce(
        (
          a: number,
          x: Transaction
        ) =>
          a +
          Number(x.amount),
        0
      );

  const expense =
    data.transactions
      .filter(
        (x: Transaction) =>
          x.type === "EXPENSE"
      )
      .reduce(
        (
          a: number,
          x: Transaction
        ) =>
          a +
          Number(x.amount),
        0
      );

  async function submit(
    e: React.FormEvent
  ) {

    e.preventDefault();

    if (
      !form.description.trim()
    ) {
      alert(
        "Keterangan transaksi wajib diisi."
      );
      return;
    }

    const numericAmount =
      Number(form.amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      alert(
        "Jumlah transaksi harus lebih dari 0."
      );
      return;
    }

    setSaving(true);

    try {

      /*
        Schema DB lama kita tetap dipakai:
        category = keterangan transaksi
        note     = dikosongkan

        Jadi Apps Script / Spreadsheet
        tidak perlu diubah.
      */

      if (editingId) {

        await postApi(
          "updateTransaction",
          {
            id: editingId,
            patch: {
              date: form.date,
              type: form.type,
              category:
                form.description.trim(),
              amount:
                numericAmount,
              note: "",
            },
          }
        );

      } else {

        await postApi(
          "createTransaction",
          {
            transaction: {
              date: form.date,
              type: form.type,
              category:
                form.description.trim(),
              amount:
                numericAmount,
              note: "",
            },
          }
        );
      }

      setEditingId(null);

      setForm({
        ...emptyForm,
        date: today(),
      });

      await refresh();

    } catch (error: any) {

      alert(
        error?.message ||
          "Gagal menyimpan transaksi."
      );

    } finally {

      setSaving(false);
    }
  }

  function editTransaction(
    transaction: Transaction
  ) {

    setEditingId(
      transaction.id
    );

    setForm({
      date:
        transaction.date ||
        today(),

      type:
        transaction.type,

      description:
        transaction.category ||
        transaction.note ||
        "",

      amount:
        String(
          transaction.amount ||
            ""
        ),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {

    setEditingId(null);

    setForm({
      ...emptyForm,
      date: today(),
    });
  }

  async function del(
    id: string
  ) {

    if (
      !confirm(
        "Yakin ingin menghapus transaksi ini?"
      )
    ) {
      return;
    }

    try {

      await postApi(
        "deleteTransaction",
        { id }
      );

      if (
        editingId === id
      ) {
        cancelEdit();
      }

      await refresh();

    } catch (error: any) {

      alert(
        error?.message ||
          "Gagal menghapus transaksi."
      );
    }
  }

  function exportExcel() {

    const rows =
      [...transactionsChronological]
        .map(
          (
            t: Transaction,
            index: number
          ) => {

            let saldo = 0;

            for (
              let i = 0;
              i <= index;
              i++
            ) {

              const item =
                transactionsChronological[
                  i
                ];

              const amount =
                Number(
                  item.amount || 0
                );

              saldo +=
                item.type ===
                "INCOME"
                  ? amount
                  : -amount;
            }

            return {
              Tanggal:
                t.date,

              Keterangan:
                t.category ||
                t.note ||
                "",

              Debet:
                t.type ===
                "INCOME"
                  ? Number(
                      t.amount
                    )
                  : "",

              Kredit:
                t.type ===
                "EXPENSE"
                  ? Number(
                      t.amount
                    )
                  : "",

              Saldo: saldo,
            };
          }
        );

    const worksheet =
      XLSX.utils.json_to_sheet(
        rows
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Keuangan"
    );

    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 46 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];

    XLSX.writeFile(
      workbook,
      `Dinar-Keuangan-${today()}.xlsx`
    );
  }

  return (
    <>

      <div className="mb-5">

        <h1 className="text-2xl font-bold">
          Keuangan
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Catat pemasukan (Debet) dan pengeluaran (Kredit) pribadimu.
        </p>

      </div>

      {/* SUMMARY */}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">

        <Metric
          icon={
            <WalletCards />
          }
          label="Saldo Saat Ini"
          value={
            money(balance)
          }
        />

        <Metric
          icon={
            <CircleDollarSign />
          }
          label="Total Debet"
          value={
            money(income)
          }
        />

        <Metric
          icon={
            <CircleDollarSign />
          }
          label="Total Kredit"
          value={
            money(expense)
          }
        />

      </div>

      {/* INPUT TRANSAKSI */}

      <section className={`${card} mb-5 overflow-hidden`}>

        <div className="mb-6 border-l-4 border-blue-500 pl-4">

          <h2 className="text-lg font-bold">
            {editingId
              ? "Edit Transaksi"
              : "Tambah Transaksi"}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Catat pemasukan (Debet) dan pengeluaran (Kredit).
          </p>

        </div>

        <form
          onSubmit={submit}
          className="grid gap-5 md:grid-cols-2"
        >

          <label className="block">

            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">
              Tanggal
            </span>

            <input
              className={`${input} py-4`}
              type="date"
              required
              value={
                form.date
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  date:
                    e.target.value,
                })
              }
            />

          </label>

          <label className="block">

            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">
              Jenis Transaksi
            </span>

            <select
              className={`${input} py-4`}
              value={
                form.type
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  type:
                    e.target.value,
                })
              }
            >

              <option value="INCOME">
                Pemasukan (Debet)
              </option>

              <option value="EXPENSE">
                Pengeluaran (Kredit)
              </option>

            </select>

          </label>

          <label className="block md:col-span-2">

            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">
              Keterangan
            </span>

            <input
              className={`${input} py-4`}
              required
              placeholder="Contoh: Gaji freelance, makan siang, bensin..."
              value={
                form.description
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  description:
                    e.target.value,
                })
              }
            />

          </label>

          <label className="block">

            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">
              Jumlah (Rp)
            </span>

            <input
              className={`${input} py-4`}
              type="number"
              min="1"
              step="1"
              required
              placeholder="0"
              value={
                form.amount
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  amount:
                    e.target.value,
                })
              }
            />

          </label>

          <div className="flex items-end gap-2">

            <button
              disabled={
                saving
              }
              className="flex-1 rounded-xl bg-blue-500 px-4 py-4 text-sm font-bold text-white transition hover:bg-blue-400 disabled:opacity-50"
            >

              {saving
                ? "Menyimpan..."
                : editingId
                ? "Simpan Perubahan"
                : "Simpan Transaksi"}

            </button>

            {editingId && (

              <button
                type="button"
                onClick={
                  cancelEdit
                }
                className="rounded-xl border border-zinc-700 px-4 py-4 text-sm font-semibold text-zinc-300 hover:bg-zinc-900"
              >
                Batal
              </button>

            )}

          </div>

        </form>

      </section>

      {/* RIWAYAT */}

      <section className={`${card} overflow-hidden p-0`}>

        <div className="flex flex-col gap-3 border-b border-zinc-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="border-l-4 border-blue-500 pl-4">

            <h2 className="font-bold">
              Riwayat Transaksi
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              {data.transactions.length} transaksi tercatat.
            </p>

          </div>

          <button
            type="button"
            onClick={
              exportExcel
            }
            disabled={
              data.transactions.length ===
              0
            }
            className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export Excel
          </button>

        </div>

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">

          <table className="w-full min-w-[900px] border-collapse">

            <thead>

              <tr className="bg-zinc-900/80 text-left text-xs uppercase tracking-wide text-zinc-400">

                <th className="px-4 py-4">
                  Tanggal
                </th>

                <th className="px-4 py-4">
                  Keterangan
                </th>

                <th className="px-4 py-4 text-right">
                  Debet
                </th>

                <th className="px-4 py-4 text-right">
                  Kredit
                </th>

                <th className="px-4 py-4 text-right">
                  Saldo
                </th>

                <th className="px-4 py-4 text-center">
                  Aksi
                </th>

              </tr>

            </thead>

            <tbody>

              {transactionsWithBalance.length ===
                0 && (

                <tr>

                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-zinc-600"
                  >
                    Belum ada transaksi.
                  </td>

                </tr>
              )}

              {transactionsWithBalance.map(
                (
                  t: Transaction & {
                    runningBalance: number;
                  }
                ) => (

                  <tr
                    key={
                      t.id
                    }
                    className="border-t border-zinc-800 transition hover:bg-zinc-900/50"
                  >

                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {formatDateID(
                        t.date
                      )}
                    </td>

                    <td className="px-4 py-4">

                      <div className="font-medium">
                        {t.category ||
                          t.note ||
                          "-"}
                      </div>

                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-emerald-400">

                      {t.type ===
                      "INCOME"
                        ? money(
                            Number(
                              t.amount
                            )
                          )
                        : "-"}

                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-rose-400">

                      {t.type ===
                      "EXPENSE"
                        ? money(
                            Number(
                              t.amount
                            )
                          )
                        : "-"}

                    </td>

                    <td className={`whitespace-nowrap px-4 py-4 text-right font-bold ${
                      t.runningBalance < 0
                        ? "text-rose-300"
                        : "text-zinc-100"
                    }`}>

                      {money(
                        t.runningBalance
                      )}

                    </td>

                    <td className="px-4 py-4">

                      <div className="flex justify-center gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            editTransaction(
                              t
                            )
                          }
                          className="rounded-lg bg-indigo-950 px-3 py-2 text-xs font-bold text-indigo-400 hover:bg-indigo-900"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            del(
                              t.id
                            )
                          }
                          className="rounded-lg bg-rose-950 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-900"
                        >
                          Hapus
                        </button>

                      </div>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

        {/* MOBILE CARDS */}

        <div className="space-y-3 p-4 md:hidden">

          {transactionsWithBalance.length ===
            0 && (

            <div className="py-8 text-center text-sm text-zinc-600">
              Belum ada transaksi.
            </div>
          )}

          {transactionsWithBalance.map(
            (
              t: Transaction & {
                runningBalance: number;
              }
            ) => (

              <article
                key={
                  t.id
                }
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >

                <div className="flex items-start justify-between gap-3">

                  <div className="min-w-0">

                    <div className="text-xs text-zinc-500">
                      {formatDateID(
                        t.date
                      )}
                    </div>

                    <div className="mt-1 font-semibold">
                      {t.category ||
                        t.note ||
                        "-"}
                    </div>

                  </div>

                  <div
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${
                      t.type ===
                      "INCOME"
                        ? "bg-emerald-950 text-emerald-400"
                        : "bg-rose-950 text-rose-400"
                    }`}
                  >

                    {t.type ===
                    "INCOME"
                      ? "DEBET"
                      : "KREDIT"}

                  </div>

                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">

                  <div>

                    <div className="text-[10px] uppercase text-zinc-600">
                      Jumlah
                    </div>

                    <div
                      className={`mt-1 font-bold ${
                        t.type ===
                        "INCOME"
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {money(
                        Number(
                          t.amount
                        )
                      )}
                    </div>

                  </div>

                  <div className="text-right">

                    <div className="text-[10px] uppercase text-zinc-600">
                      Saldo
                    </div>

                    <div className="mt-1 font-bold">
                      {money(
                        t.runningBalance
                      )}
                    </div>

                  </div>

                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      editTransaction(
                        t
                      )
                    }
                    className="rounded-lg bg-indigo-950 py-2 text-xs font-bold text-indigo-400"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      del(
                        t.id
                      )
                    }
                    className="rounded-lg bg-rose-950 py-2 text-xs font-bold text-rose-400"
                  >
                    Hapus
                  </button>

                </div>

              </article>

            )
          )}

        </div>

      </section>

    </>
  );
}

/* =========================================================
   DAILY TARGET
========================================================= */

function Daily({
  data,
  refresh,
}: any) {

  const activitySuggestions = [
    "Ngaji",
    "Belajar Hal Baru",
    "Nugas",
    "Bisnis",
    "Kerja",
    "Olahraga",
    "Baca Buku",
    "Istirahat",
  ];

  const [selectedDate, setSelectedDate] = useState(today());

  const [targetForm, setTargetForm] = useState({
    id: "",
    activity: "Ngaji",
    targetMinutes: "30",
  });

  const [resultForm, setResultForm] = useState({
    activity: "Ngaji",
    durationMinutes: "30",
    note: "",
  });

  const [savingTarget, setSavingTarget] = useState(false);
  const [savingResult, setSavingResult] = useState(false);

  const dayTargets = data.targets.filter(
    (x: DailyTarget) => x.date === selectedDate
  );

  const dayLogs = data.timeLogs.filter(
    (x: TimeLog) => x.date === selectedDate
  );

  const progressItems = dayTargets.map((target: DailyTarget) => {
    const actual = dayLogs
      .filter(
        (log: TimeLog) =>
          log.activity.trim().toLowerCase() ===
          target.activity.trim().toLowerCase()
      )
      .reduce(
        (sum: number, log: TimeLog) =>
          sum + Number(log.durationMinutes || 0),
        0
      );

    const targetMinutes = Number(target.targetMinutes || 0);

    const pct =
      targetMinutes > 0
        ? Math.min(100, Math.round((actual / targetMinutes) * 100))
        : 0;

    return {
      ...target,
      actual,
      pct,
      remaining: Math.max(0, targetMinutes - actual),
    };
  });

  const totalTargetMinutes = progressItems.reduce(
    (sum: number, x: any) =>
      sum + Number(x.targetMinutes || 0),
    0
  );

  const totalActualMinutes = dayLogs.reduce(
    (sum: number, x: TimeLog) =>
      sum + Number(x.durationMinutes || 0),
    0
  );

  const dailyProductivity =
    progressItems.length > 0
      ? Math.round(
          progressItems.reduce(
            (sum: number, x: any) => sum + x.pct,
            0
          ) / progressItems.length
        )
      : 0;

  const completedCount = progressItems.filter(
    (x: any) => x.pct >= 100
  ).length;

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault();

    const activity = targetForm.activity.trim();
    const minutes = Number(targetForm.targetMinutes);

    if (!activity) {
      alert("Nama aktivitas wajib diisi.");
      return;
    }

    if (!Number.isFinite(minutes) || minutes <= 0) {
      alert("Target durasi harus lebih dari 0 menit.");
      return;
    }

    setSavingTarget(true);

    try {
      if (targetForm.id) {
        /*
          Memerlukan action updateDailyTarget pada Apps Script versi terbaru.
          Jika belum ada, gunakan tombol edit hanya untuk target yang aktivitasnya
          tidak diubah atau tambahkan patch Apps Script yang disertakan.
        */
        await postApi("updateDailyTarget", {
          id: targetForm.id,
          patch: {
            date: selectedDate,
            activity,
            targetMinutes: minutes,
          },
        });
      } else {
        await postApi("upsertDailyTarget", {
          target: {
            date: selectedDate,
            activity,
            targetMinutes: minutes,
          },
        });
      }

      setTargetForm({
        id: "",
        activity: "Ngaji",
        targetMinutes: "30",
      });

      await refresh();
    } catch (error: any) {
      alert(error?.message || "Gagal menyimpan target.");
    } finally {
      setSavingTarget(false);
    }
  }

  function editTarget(target: DailyTarget) {
    setTargetForm({
      id: target.id,
      activity: target.activity,
      targetMinutes: String(target.targetMinutes),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEditTarget() {
    setTargetForm({
      id: "",
      activity: "Ngaji",
      targetMinutes: "30",
    });
  }

  async function deleteTarget(id: string) {
    if (!confirm("Hapus target harian ini?")) return;

    try {
      await postApi("deleteDailyTarget", { id });

      if (targetForm.id === id) {
        cancelEditTarget();
      }

      await refresh();
    } catch (error: any) {
      alert(
        error?.message ||
          "Gagal menghapus target. Pastikan Apps Script sudah mendukung deleteDailyTarget."
      );
    }
  }

  async function saveResult(e: React.FormEvent) {
    e.preventDefault();

    const activity = resultForm.activity.trim();
    const minutes = Number(resultForm.durationMinutes);

    if (!activity) {
      alert("Aktivitas wajib diisi.");
      return;
    }

    if (!Number.isFinite(minutes) || minutes <= 0) {
      alert("Durasi aktual harus lebih dari 0 menit.");
      return;
    }

    setSavingResult(true);

    try {
      await postApi("addTimeLog", {
        log: {
          date: selectedDate,
          activity,
          durationMinutes: minutes,
          note: resultForm.note.trim(),
        },
      });

      setResultForm({
        activity,
        durationMinutes: "30",
        note: "",
      });

      await refresh();
    } catch (error: any) {
      alert(error?.message || "Gagal mencatat hasil aktivitas.");
    } finally {
      setSavingResult(false);
    }
  }

  async function deleteLog(id: string) {
    if (!confirm("Hapus catatan aktivitas ini?")) return;

    try {
      await postApi("deleteTimeLog", { id });
      await refresh();
    } catch (error: any) {
      alert(error?.message || "Gagal menghapus catatan.");
    }
  }

  function chooseActivity(activity: string) {
    setTargetForm((current) => ({
      ...current,
      activity,
    }));

    setResultForm((current) => ({
      ...current,
      activity,
    }));
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Target & Produktivitas Harian</h1>

          <p className="mt-1 text-sm text-zinc-500">
            Tentukan apa yang ingin kamu capai, lalu catat hasil aktual sepanjang hari.
          </p>
        </div>

        <label className="block sm:w-56">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">
            Tanggal
          </span>

          <input
            className={input}
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              cancelEditTarget();
            }}
          />
        </label>
      </div>

      {/* DAILY SUMMARY */}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<Target />}
          label="Produktivitas"
          value={`${dailyProductivity}%`}
        />

        <Metric
          icon={<CheckSquare />}
          label="Target tercapai"
          value={`${completedCount}/${progressItems.length}`}
        />

        <Metric
          icon={<Clock3 />}
          label="Target waktu"
          value={formatMinutes(totalTargetMinutes)}
        />

        <Metric
          icon={<Clock3 />}
          label="Aktual tercatat"
          value={formatMinutes(totalActualMinutes)}
        />
      </div>

      {/* OVERALL PROGRESS */}

      <section className={`${card} mb-4`}>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Progress Hari Ini</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Rata-rata capaian seluruh target pada {formatDateID(selectedDate)}.
            </p>
          </div>

          <div className="text-3xl font-black">{dailyProductivity}%</div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${dailyProductivity}%` }}
          />
        </div>
      </section>

      {/* FORMS */}

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={saveTarget} className={card}>
          <div className="mb-4">
            <h2 className="font-semibold">
              {targetForm.id ? "Edit Target" : "Tambah Target"}
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Kamu bebas menentukan aktivitas dan target waktunya.
            </p>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {activitySuggestions.map((activity) => (
              <button
                key={activity}
                type="button"
                onClick={() => chooseActivity(activity)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
                  targetForm.activity === activity
                    ? "border-white bg-white text-black"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400"
                }`}
              >
                {activity}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">
                Aktivitas
              </span>

              <input
                className={input}
                placeholder="Contoh: Ngaji, Nugas, Bisnis, Belajar UI/UX..."
                value={targetForm.activity}
                onChange={(e) =>
                  setTargetForm({
                    ...targetForm,
                    activity: e.target.value,
                  })
                }
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">
                Target durasi
              </span>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  className={input}
                  type="number"
                  min="1"
                  placeholder="Menit"
                  value={targetForm.targetMinutes}
                  onChange={(e) =>
                    setTargetForm({
                      ...targetForm,
                      targetMinutes: e.target.value,
                    })
                  }
                />

                <div className="grid place-items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-400">
                  {formatMinutes(Number(targetForm.targetMinutes || 0))}
                </div>
              </div>
            </label>

            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 120, 240].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() =>
                    setTargetForm({
                      ...targetForm,
                      targetMinutes: String(minutes),
                    })
                  }
                  className="rounded-lg border border-zinc-800 py-2 text-[11px] text-zinc-400 hover:bg-zinc-900"
                >
                  {formatMinutes(minutes)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button disabled={savingTarget} className={`${btn} flex-1`}>
                {savingTarget
                  ? "Menyimpan..."
                  : targetForm.id
                  ? "Simpan Perubahan"
                  : "Tambah Target"}
              </button>

              {targetForm.id && (
                <button
                  type="button"
                  onClick={cancelEditTarget}
                  className="rounded-xl border border-zinc-800 px-4 text-sm text-zinc-400"
                >
                  Batal
                </button>
              )}
            </div>
          </div>
        </form>

        <form onSubmit={saveResult} className={card}>
          <div className="mb-4">
            <h2 className="font-semibold">Input Hasil Hari Ini</h2>

            <p className="mt-1 text-xs text-zinc-500">
              Setiap selesai melakukan sesuatu, catat durasinya. Bisa berkali-kali.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">
                Aktivitas
              </span>

              <input
                className={input}
                list="daily-activities"
                placeholder="Pilih / ketik aktivitas"
                value={resultForm.activity}
                onChange={(e) =>
                  setResultForm({
                    ...resultForm,
                    activity: e.target.value,
                  })
                }
              />

              <datalist id="daily-activities">
                {Array.from(
                  new Set([
                    ...activitySuggestions,
                    ...dayTargets.map((x: DailyTarget) => x.activity),
                  ])
                ).map((activity) => (
                  <option key={activity} value={activity} />
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">
                Durasi aktual
              </span>

              <input
                className={input}
                type="number"
                min="1"
                placeholder="Menit"
                value={resultForm.durationMinutes}
                onChange={(e) =>
                  setResultForm({
                    ...resultForm,
                    durationMinutes: e.target.value,
                  })
                }
              />
            </label>

            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 60, 120].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() =>
                    setResultForm({
                      ...resultForm,
                      durationMinutes: String(minutes),
                    })
                  }
                  className="rounded-lg border border-zinc-800 py-2 text-[11px] text-zinc-400 hover:bg-zinc-900"
                >
                  {formatMinutes(minutes)}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">
                Hasil / catatan
              </span>

              <textarea
                className={`${input} min-h-24 resize-y`}
                placeholder="Contoh: selesai baca 15 halaman, belajar React state, revisi 2 halaman tugas..."
                value={resultForm.note}
                onChange={(e) =>
                  setResultForm({
                    ...resultForm,
                    note: e.target.value,
                  })
                }
              />
            </label>

            <button disabled={savingResult} className={`${btn} w-full`}>
              {savingResult ? "Menyimpan..." : "Catat Hasil"}
            </button>
          </div>
        </form>
      </div>

      {/* TARGET PROGRESS CARDS */}

      <section className="mt-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Perkembangan Target</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Progress dihitung otomatis dari hasil yang kamu input.
            </p>
          </div>
        </div>

        {progressItems.length === 0 ? (
          <div className={`${card} text-center text-sm text-zinc-600`}>
            Belum ada target untuk tanggal ini.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {progressItems.map((item: any) => (
              <article key={item.id} className={card}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{item.activity}</h3>

                    <div className="mt-1 text-xs text-zinc-500">
                      Target {formatMinutes(Number(item.targetMinutes))}
                    </div>
                  </div>

                  <div
                    className={`rounded-xl px-3 py-2 text-sm font-black ${
                      item.pct >= 100
                        ? "bg-emerald-950 text-emerald-300"
                        : "bg-zinc-900 text-white"
                    }`}
                  >
                    {item.pct}%
                  </div>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      item.pct >= 100 ? "bg-emerald-400" : "bg-white"
                    }`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-zinc-900 p-2">
                    <div className="text-[10px] text-zinc-600">Aktual</div>
                    <div className="mt-1 text-xs font-bold">
                      {formatMinutes(item.actual)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-zinc-900 p-2">
                    <div className="text-[10px] text-zinc-600">Target</div>
                    <div className="mt-1 text-xs font-bold">
                      {formatMinutes(Number(item.targetMinutes))}
                    </div>
                  </div>

                  <div className="rounded-lg bg-zinc-900 p-2">
                    <div className="text-[10px] text-zinc-600">Sisa</div>
                    <div className="mt-1 text-xs font-bold">
                      {item.pct >= 100
                        ? "Selesai"
                        : formatMinutes(item.remaining)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => editTarget(item)}
                    className="rounded-lg border border-zinc-800 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-900"
                  >
                    Edit Target
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTarget(item.id)}
                    className="rounded-lg border border-red-950 bg-red-950/30 py-2 text-xs font-semibold text-red-400"
                  >
                    Hapus
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ACTIVITY LOG */}

      <section className={`${card} mt-4`}>
        <div className="mb-4">
          <h2 className="font-semibold">Hasil yang Sudah Dikerjakan</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Riwayat aktivitas pada {formatDateID(selectedDate)}.
          </p>
        </div>

        {dayLogs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-600">
            Belum ada hasil yang dicatat.
          </div>
        ) : (
          <div className="space-y-2">
            {[...dayLogs].reverse().map((log: TimeLog) => (
              <div
                key={log.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium">{log.activity}</div>

                  <div className="mt-1 text-xs text-zinc-500">
                    {formatMinutes(Number(log.durationMinutes))}
                    {log.note ? ` • ${log.note}` : ""}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteLog(log.id)}
                  className="self-start rounded-lg bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-400 sm:self-auto"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

