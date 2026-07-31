"use client";

import { useState, useEffect, useMemo } from "react";
import { useData } from "@/hooks/use-data";
import type { Room, Staff, CompletedSession } from "@/lib/database.types";
import {
  Plus,
  X,
  Users,
  DoorClosed,
  TrendingUp,
  Pencil,
  Trash2,
  Wallet,
  LogIn,
  LogOut,
  Clock,
  History,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Timer,
  Receipt,
  Filter,
} from "lucide-react";

const COLORS = {
  bg: "#FFFFFF",
  bgSubtle: "#F7F8FA",
  surface: "#FFFFFF",
  border: "#E7E9EE",
  textPrimary: "#15181F",
  textMuted: "#6B7280",
  textFaint: "#9AA1AC",
  primary: "#15181F",
  primarySoft: "#EAEAEC",
  blue: "#2563EB",
  red: "#C13B2F",
  redSoft: "#FBEAE8",
  green: "#16A34A",
  greenSoft: "#DCFCE7",
};

const DAY_MS = 86400000;

function formatMoney(n: number) {
  return Math.round(n).toLocaleString("vi-VN") + "đ";
}
function formatClock(d: Date) {
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function formatDuration(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function formatDate(d: Date) {
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function formatDateShort(d: Date) {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
function startOfDay(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
function todayStart() {
  return startOfDay(new Date());
}
function thisWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return startOfDay(monday);
}
function thisMonthStart() {
  const now = new Date();
  return startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
}
function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}
function parseDate(str: string) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const BOTTOM_TABS = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "rooms", icon: DoorClosed },
  { id: "staff", icon: Users },
  { id: "report", icon: TrendingUp },
];

const PERIODS = [
  { id: "today", label: "Hôm nay", cutoff: () => todayStart() },
  { id: "7d", label: "7 ngày trước", cutoff: () => Date.now() - 7 * DAY_MS },
  { id: "week", label: "Tuần này", cutoff: () => thisWeekStart() },
  { id: "30d", label: "30 ngày trước", cutoff: () => Date.now() - 30 * DAY_MS },
  { id: "month", label: "Tháng này", cutoff: () => thisMonthStart() },
];

interface PayrollGroup {
  staffId: string;
  name: string;
  hours: number;
  amount: number;
  count: number;
  sessions: CompletedSession[];
}

interface Toast {
  type: "success" | "error";
  text: string;
}

export default function App() {
  const {
    rooms,
    staff,
    completedSessions,
    loading,
    addRoom: addRoomMut,
    updateRoom: updateRoomMut,
    deleteRoom: deleteRoomMut,
    addStaff: addStaffMut,
    updateStaff: updateStaffMut,
    deleteStaff: deleteStaffMut,
    quickCheckin: quickCheckinMut,
    updateSession: updateSessionMut,
    deleteSession: deleteSessionMut,
  } = useData();

  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState<Toast | null>(null);

  // staff form state
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRate, setFormRate] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  // room form state
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [formRoomName, setFormRoomName] = useState("");
  const [confirmingDeleteRoomId, setConfirmingDeleteRoomId] = useState<
    string | null
  >(null);

  // payroll state
  const [period, setPeriod] = useState("today");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStaffId, setFilterStaffId] = useState("all");
  const [tempPeriod, setTempPeriod] = useState("today");
  const [tempFilterStaffId, setTempFilterStaffId] = useState("all");
  const [tempStaffSearch, setTempStaffSearch] = useState("");

  // quick check-in state
  const [quickCheckinOpen, setQuickCheckinOpen] = useState(false);
  const [qcDate, setQcDate] = useState(toDateInputValue(new Date()));
  const [qcStaffId, setQcStaffId] = useState("");
  const [qcRoomId, setQcRoomId] = useState("");
  const [qcStart, setQcStart] = useState("");
  const [qcEnd, setQcEnd] = useState("");

  // edit session state
  const [editSession, setEditSession] = useState<CompletedSession | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStaffId, setEditStaffId] = useState("");
  const [editRoomId, setEditRoomId] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // invoice
  const [invoiceSession, setInvoiceSession] = useState<CompletedSession | null>(
    null,
  );

  // history tab date
  const [historyDate, setHistoryDate] = useState(toDateInputValue(new Date()));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const staffById = useMemo(
    () => Object.fromEntries(staff.map((s) => [s.id, s])),
    [staff],
  );

  // ---- Quick check-in computed ----
  const qcPerson = qcStaffId ? staffById[qcStaffId] : null;
  const qcRoom = qcRoomId ? rooms.find((r) => r.id === qcRoomId) : null;
  const qcHours =
    qcStart && qcEnd
      ? (() => {
          const [sh, sm] = qcStart.split(":").map(Number);
          const [eh, em] = qcEnd.split(":").map(Number);
          const startMin = sh * 60 + sm;
          const endMin = eh * 60 + em;
          const diffMin =
            endMin >= startMin ? endMin - startMin : 1440 - startMin + endMin;
          return diffMin / 60;
        })()
      : 0;
  const qcAmount = qcPerson ? qcPerson.rate * qcHours : 0;

  function resetQuickCheckin() {
    setQcDate(toDateInputValue(new Date()));
    setQcStaffId("");
    setQcRoomId("");
    setQcStart("");
    setQcEnd("");
    setQuickCheckinOpen(false);
  }

  function resetEdit() {
    setEditSession(null);
    setEditDate("");
    setEditStaffId("");
    setEditRoomId("");
    setEditStart("");
    setEditEnd("");
  }

  function openEdit(session: CompletedSession) {
    const d = new Date(session.start);
    setEditSession(session);
    setEditDate(toDateInputValue(d));
    setEditStaffId(session.staffId);
    setEditRoomId(session.roomId);
    setEditStart(formatClock(d));
    setEditEnd(formatClock(new Date(session.end)));
  }

  async function handleQuickCheckin() {
    if (!qcPerson || !qcRoom || !qcStart || !qcEnd) return;
    const dateStr = qcDate;
    const startTs = new Date(`${dateStr}T${qcStart}:00`).getTime();
    let endTs = new Date(`${dateStr}T${qcEnd}:00`).getTime();
    if (endTs <= startTs) {
      endTs += DAY_MS;
    }
    const session = await quickCheckinMut(
      qcRoomId,
      qcStaffId,
      qcRoom.name,
      qcPerson.name,
      startTs,
      endTs,
      qcHours,
      qcAmount,
    );
    if (session) {
      resetQuickCheckin();
      setInvoiceSession(session);
      setToast({ type: "success", text: `Đã thêm ca cho ${qcPerson.name}` });
    } else {
      setToast({ type: "error", text: "Lỗi khi tạo ca" });
    }
  }

  async function handleEdit() {
    if (!editSession || !editStaffId || !editRoomId || !editStart || !editEnd)
      return;
    const person = staffById[editStaffId];
    const room = rooms.find((r) => r.id === editRoomId);
    if (!person || !room) return;
    const dateStr = editDate;
    const startTs = new Date(`${dateStr}T${editStart}:00`).getTime();
    let endTs = new Date(`${dateStr}T${editEnd}:00`).getTime();
    if (endTs <= startTs) endTs += DAY_MS;
    const hours = (endTs - startTs) / 3600000;
    const amount = hours * person.rate;
    const ok = await updateSessionMut(editSession.id, {
      roomId: editRoomId,
      staffId: editStaffId,
      roomName: room.name,
      staffName: person.name,
      start: startTs,
      end: endTs,
      hours,
      amount,
    });
    if (ok) {
      resetEdit();
      setToast({ type: "success", text: "Đã cập nhật ca làm" });
    } else {
      setToast({ type: "error", text: "Lỗi khi cập nhật" });
    }
  }

  async function handleDelete(id: string) {
    const ok = await deleteSessionMut(id);
    if (ok) {
      setDeleteConfirmId(null);
      setToast({ type: "success", text: "Đã xoá ca làm" });
    } else {
      setToast({ type: "error", text: "Lỗi khi xoá ca" });
    }
  }

  // ---- Today data ----
  const todayStartTs = useMemo(() => todayStart(), []);
  const todaySessions = useMemo(
    () => completedSessions.filter((s) => s.start >= todayStartTs),
    [completedSessions, todayStartTs],
  );
  const todayPayroll = useMemo(
    () => todaySessions.reduce((sum, s) => sum + s.amount, 0),
    [todaySessions],
  );
  const todayHours = useMemo(
    () => todaySessions.reduce((sum, s) => sum + s.hours, 0),
    [todaySessions],
  );
  const todayUniqueStaffCount = useMemo(
    () => new Set(todaySessions.map((s) => s.staffId)).size,
    [todaySessions],
  );

  // ---- History data ----
  const historyStartTs = useMemo(
    () => startOfDay(parseDate(historyDate)),
    [historyDate],
  );
  const historyEndTs = historyStartTs + DAY_MS;
  const historySessions = useMemo(
    () =>
      completedSessions.filter(
        (s) => s.start >= historyStartTs && s.start < historyEndTs,
      ),
    [completedSessions, historyStartTs, historyEndTs],
  );

  // ---- Staff CRUD ----
  function openAddStaff() {
    setEditingStaffId(null);
    setFormName("");
    setFormRate("");
    setStaffFormOpen(true);
  }
  function openEditStaff(person: Staff) {
    setEditingStaffId(person.id);
    setFormName(person.name);
    setFormRate(String(person.rate));
    setStaffFormOpen(true);
  }
  async function saveStaffForm() {
    const name = formName.trim();
    const rate = Number(formRate);
    if (!name || !rate || rate <= 0) {
      setToast({
        type: "error",
        text: "Vui lòng nhập tên và lương/giờ hợp lệ",
      });
      return;
    }
    if (editingStaffId) {
      await updateStaffMut(editingStaffId, name, rate);
      setToast({ type: "success", text: `Đã cập nhật ${name}` });
    } else {
      await addStaffMut(name, rate);
      setToast({ type: "success", text: `Đã thêm ${name}` });
    }
    setStaffFormOpen(false);
  }
  async function deleteStaff(id: string) {
    const person = staffById[id];
    await deleteStaffMut(id);
    setConfirmingDeleteId(null);
    setToast({ type: "success", text: `Đã xoá ${person.name}` });
  }

  // ---- Room CRUD ----
  function openAddRoom() {
    setEditingRoomId(null);
    setFormRoomName("");
    setRoomFormOpen(true);
  }
  function openEditRoom(room: Room) {
    setEditingRoomId(room.id);
    setFormRoomName(room.name);
    setRoomFormOpen(true);
  }
  async function saveRoomForm() {
    const name = formRoomName.trim();
    if (!name) {
      setToast({ type: "error", text: "Vui lòng nhập tên địa điểm" });
      return;
    }
    if (editingRoomId) {
      await updateRoomMut(editingRoomId, name);
      setToast({ type: "success", text: `Đã cập nhật ${name}` });
    } else {
      await addRoomMut(name);
      setToast({ type: "success", text: `Đã thêm ${name}` });
    }
    setRoomFormOpen(false);
  }
  async function deleteRoom(id: string) {
    const room = rooms.find((r) => r.id === id);
    await deleteRoomMut(id);
    setConfirmingDeleteRoomId(null);
    setToast({ type: "success", text: `Đã xoá ${room!.name}` });
  }

  // ---- Payroll ----
  const periodCutoff = PERIODS.find((p) => p.id === period)!.cutoff();
  const filteredCompleted = useMemo(
    () =>
      completedSessions.filter((s) => {
        if (s.start < periodCutoff) return false;
        if (filterStaffId !== "all" && s.staffId !== filterStaffId)
          return false;
        return true;
      }),
    [completedSessions, periodCutoff, filterStaffId],
  );
  const payrollByStaff: PayrollGroup[] = useMemo(() => {
    const map: Record<string, PayrollGroup> = {};
    for (const s of filteredCompleted) {
      if (!map[s.staffId])
        map[s.staffId] = {
          staffId: s.staffId,
          name: s.staffName,
          hours: 0,
          amount: 0,
          count: 0,
          sessions: [],
        };
      map[s.staffId].hours += s.hours;
      map[s.staffId].amount += s.amount;
      map[s.staffId].count += 1;
      map[s.staffId].sessions.push(s);
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [filteredCompleted]);
  const totalPayrollPeriod = payrollByStaff.reduce(
    (sum, p) => sum + p.amount,
    0,
  );

  if (loading) {
    return (
      <div
        className="w-full min-h-screen flex items-center justify-center py-20"
        style={{ background: COLORS.bgSubtle, color: COLORS.textPrimary }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{
              borderColor: COLORS.textPrimary,
              borderTopColor: "transparent",
            }}
          />
          <span className="text-sm" style={{ color: COLORS.textMuted }}>
            Đang tải...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ background: COLORS.bgSubtle, color: COLORS.textPrimary }}
      className="w-full min-h-screen font-sans"
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-30"
        style={{
          background: COLORS.surface,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          className="flex items-center justify-between px-4"
          style={{ height: 60 }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: COLORS.primarySoft }}
            >
              <DoorClosed size={18} color={COLORS.textPrimary} />
            </div>
            <span
              className="font-bold"
              style={{ fontSize: 17, color: COLORS.textPrimary }}
            >
              Quản lý ca
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: COLORS.bgSubtle,
                color: COLORS.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {formatClock(new Date())}
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: COLORS.primarySoft,
                color: COLORS.textPrimary,
              }}
            >
              CN
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-28">
        {/* ---------------- PAGE TITLE ---------------- */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div
              className="text-xs uppercase font-semibold mb-1"
              style={{ color: COLORS.textFaint, letterSpacing: "0.08em" }}
            >
              {tab === "dashboard"
                ? "Bảng điều khiển"
                : tab === "rooms"
                  ? "Quản lý địa điểm"
                  : tab === "staff"
                    ? "Quản lý nhân sự"
                    : "Báo cáo"}
            </div>
            <h1
              className="text-2xl font-bold"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "-0.3px",
              }}
            >
              {tab === "dashboard"
                ? "Trang chủ"
                : tab === "rooms"
                  ? "Danh sách địa điểm"
                  : tab === "staff"
                    ? "Nhân viên"
                    : "Báo cáo"}
            </h1>
          </div>
          {tab === "report" && (
            <div className="relative shrink-0">
              {(period !== "today" || filterStaffId !== "all") && (
                <span
                  className="absolute -top-0.5 -right-0.5 z-10 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: COLORS.red, borderColor: COLORS.bg }}
                />
              )}
              <button
                onClick={() => {
                  setTempPeriod(period);
                  setTempFilterStaffId(filterStaffId);
                  setTempStaffSearch("");
                  setShowFilters(true);
                }}
                className="rounded-xl p-2.5"
                style={{
                  background: showFilters ? COLORS.primary : COLORS.bgSubtle,
                  color: showFilters ? "#FFFFFF" : COLORS.textMuted,
                  border: `1px solid ${showFilters ? COLORS.primary : COLORS.border}`,
                  transition: "all 0.15s",
                }}
              >
                <Filter size={18} />
              </button>
            </div>
          )}
        </div>

        {/* ---------------- TAB: DASHBOARD ---------------- */}
        {tab === "dashboard" && (
          <div className="flex flex-col gap-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                icon={<TrendingUp size={16} />}
                value={formatMoney(todayPayroll)}
                label="Tổng lương"
                accent
              />
              <KpiCard
                icon={<Users size={16} />}
                value={String(todayUniqueStaffCount)}
                label="Nhân viên hôm nay"
              />
            </div>

            {/* Today's sessions */}
            <div className="flex items-center justify-between">
              <div
                className="text-sm font-semibold"
                style={{ color: COLORS.textPrimary }}
              >
                Hôm nay · {formatDate(new Date())}
              </div>
              {todaySessions.length > 0 && (
                <div className="text-xs" style={{ color: COLORS.textFaint }}>
                  {todaySessions.length} ca
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {todaySessions.length === 0 ? (
                <div
                  className="rounded-2xl p-6 text-sm text-center"
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textFaint,
                  }}
                >
                  <Clock
                    size={24}
                    className="mx-auto mb-2"
                    style={{ color: COLORS.textFaint }}
                  />
                  Chưa có ca làm nào hôm nay
                  <div className="mt-1 text-xs">
                    Nhấn <strong>&ldquo;Chấm công nhanh&rdquo;</strong> để bắt
                    đầu
                  </div>
                </div>
              ) : (
                todaySessions.map((session) => (
                  <CheckinCard
                    key={session.id}
                    session={session}
                    onEdit={() => openEdit(session)}
                    onDelete={() => setDeleteConfirmId(session.id)}
                    onInvoice={() => setInvoiceSession(session)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ---------------- TAB: ROOMS CRUD ---------------- */}
        {tab === "rooms" && (
          <div className="flex flex-col gap-2.5">
            <button
              onClick={openAddRoom}
              className="rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 mb-1"
              style={{ background: COLORS.textPrimary, color: "#FFFFFF" }}
            >
              <Plus size={16} /> Thêm địa điểm
            </button>

            {rooms.map((r, idx) => {
              const confirming = confirmingDeleteRoomId === r.id;
              return (
                <div
                  key={r.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
                        style={{
                          background: COLORS.primarySoft,
                          color: COLORS.textPrimary,
                        }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {r.name}
                        </div>
                      </div>
                    </div>
                    {!confirming ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditRoom(r)}
                          className="rounded-lg p-2"
                          style={{
                            color: COLORS.textMuted,
                            background: COLORS.bgSubtle,
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteRoomId(r.id)}
                          className="rounded-lg p-2"
                          style={{
                            color: COLORS.red,
                            background: COLORS.redSoft,
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setConfirmingDeleteRoomId(null)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{
                            background: COLORS.bgSubtle,
                            color: COLORS.textMuted,
                          }}
                        >
                          Huỷ
                        </button>
                        <button
                          onClick={() => deleteRoom(r.id)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: COLORS.red, color: "#FFFFFF" }}
                        >
                          Xoá
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- TAB: STAFF ---------------- */}
        {tab === "staff" && (
          <div className="flex flex-col gap-2.5">
            <button
              onClick={openAddStaff}
              className="rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 mb-1"
              style={{ background: COLORS.textPrimary, color: "#FFFFFF" }}
            >
              <Plus size={16} /> Thêm nhân viên
            </button>

            {staff.map((p) => {
              const confirming = confirmingDeleteId === p.id;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-medium text-sm truncate block">
                        {p.name}
                      </span>
                      <div
                        className="text-sm mt-0.5"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontVariantNumeric: "tabular-nums",
                          color: COLORS.textFaint,
                        }}
                      >
                        {formatMoney(p.rate)}/giờ
                      </div>
                    </div>
                    {!confirming ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditStaff(p)}
                          className="rounded-lg p-2"
                          style={{
                            color: COLORS.textMuted,
                            background: COLORS.bgSubtle,
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(p.id)}
                          className="rounded-lg p-2"
                          style={{
                            color: COLORS.red,
                            background: COLORS.redSoft,
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{
                            background: COLORS.bgSubtle,
                            color: COLORS.textMuted,
                          }}
                        >
                          Huỷ
                        </button>
                        <button
                          onClick={() => deleteStaff(p.id)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: COLORS.red, color: "#FFFFFF" }}
                        >
                          Xoá
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- TAB: PAYROLL ---------------- */}
        {tab === "report" && (
          <div className="flex flex-col gap-3">
            <div
              className="rounded-2xl p-5"
              style={{ background: COLORS.textPrimary, color: "#FFFFFF" }}
            >
              <div
                className="text-base font-semibold mb-1.5"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                Tổng lương · {PERIODS.find((p) => p.id === period)!.label}
                {filterStaffId !== "all" && staffById[filterStaffId]
                  ? ` · ${staffById[filterStaffId].name}`
                  : ""}
              </div>
              <div
                className="text-4xl font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {formatMoney(totalPayrollPeriod)}
              </div>
              <div className="flex items-center gap-3 mt-3 text-sm">
                <span style={{ color: "rgba(255,255,255,0.65)" }}>
                  {filteredCompleted.length} ca hoàn thành
                </span>
              </div>
            </div>

            {payrollByStaff.length === 0 ? (
              <div
                className="rounded-2xl p-6 text-sm text-center"
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.textFaint,
                }}
              >
                Chưa có ca nào hoàn thành trong khoảng thời gian này
              </div>
            ) : (
              payrollByStaff.map((p) => {
                return (
                  <div
                    key={p.staffId}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: COLORS.surface,
                      border: `1px solid ${COLORS.border}`,
                      boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">
                            {p.name}
                          </div>
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: COLORS.textFaint }}
                          >
                            {p.count} ca · {formatDuration(p.hours)}
                          </div>
                        </div>
                        <span
                          className="text-sm font-semibold shrink-0"
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontVariantNumeric: "tabular-nums",
                            color: COLORS.textPrimary,
                          }}
                        >
                          {formatMoney(p.amount)}
                        </span>
                      </div>
                    </div>

                    <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      {p.sessions.map((s) => (
                        <div
                          key={s.id}
                          className="px-4 py-3"
                          style={{ borderTop: `1px solid ${COLORS.border}` }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div
                              className="text-xs font-medium"
                              style={{ color: COLORS.textPrimary }}
                            >
                              {s.roomName} ·{" "}
                              {formatDateShort(new Date(s.start))}
                            </div>
                            <div
                              className="text-xs font-semibold"
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {formatMoney(s.amount)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-3 text-[11px]"
                              style={{ color: COLORS.textMuted }}
                            >
                              <span className="flex items-center gap-1">
                                <LogIn size={11} color={COLORS.primary} />{" "}
                                {formatClock(new Date(s.start))}
                              </span>
                              <span className="flex items-center gap-1">
                                <LogOut size={11} color={COLORS.primary} />{" "}
                                {formatClock(new Date(s.end))}
                              </span>
                              <span>{formatDuration(s.hours)}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                onClick={() => setInvoiceSession(s)}
                                className="rounded-lg p-1.5"
                                style={{
                                  color: COLORS.blue,
                                  background: "#EBF0FE",
                                }}
                              >
                                <Receipt size={12} />
                              </button>
                              <button
                                onClick={() => setEditSession(s)}
                                className="rounded-lg p-1.5"
                                style={{
                                  color: COLORS.textMuted,
                                  background: COLORS.bgSubtle,
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(s.id)}
                                className="rounded-lg p-1.5"
                                style={{
                                  color: COLORS.red,
                                  background: COLORS.redSoft,
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ---------------- TAB: HISTORY ---------------- */}
        {tab === "history" && (
          <div className="flex flex-col gap-4">
            {/* Date navigation */}
            <div
              className="flex items-center justify-between rounded-2xl p-3"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <button
                onClick={() => {
                  const d = parseDate(historyDate);
                  d.setDate(d.getDate() - 1);
                  setHistoryDate(toDateInputValue(d));
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: COLORS.bgSubtle }}
              >
                <ChevronLeft size={18} color={COLORS.textPrimary} />
              </button>
              <div className="flex items-center gap-2">
                <Calendar size={16} color={COLORS.textMuted} />
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="text-sm font-semibold bg-transparent text-center"
                  style={{
                    color: COLORS.textPrimary,
                    border: "none",
                    outline: "none",
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const d = parseDate(historyDate);
                  d.setDate(d.getDate() + 1);
                  setHistoryDate(toDateInputValue(d));
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: COLORS.bgSubtle }}
              >
                <ChevronRight size={18} color={COLORS.textPrimary} />
              </button>
            </div>

            {/* Sessions for selected date */}
            <div className="flex items-center justify-between">
              <div
                className="text-sm font-semibold"
                style={{ color: COLORS.textPrimary }}
              >
                {formatDate(parseDate(historyDate))}
              </div>
              {historySessions.length > 0 && (
                <div
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: COLORS.primarySoft,
                    color: COLORS.primary,
                  }}
                >
                  {historySessions.length} ca ·{" "}
                  {formatMoney(
                    historySessions.reduce((s, c) => s + c.amount, 0),
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {historySessions.length === 0 ? (
                <div
                  className="rounded-2xl p-6 text-sm text-center"
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textFaint,
                  }}
                >
                  Không có ca làm nào trong ngày này
                </div>
              ) : (
                historySessions.map((session) => (
                  <CheckinCard
                    key={session.id}
                    session={session}
                    onEdit={() => openEdit(session)}
                    onDelete={() => setDeleteConfirmId(session.id)}
                    onInvoice={() => setInvoiceSession(session)}
                  />
                ))
              )}
            </div>

            {/* Today shortcut */}
            {historyDate !== toDateInputValue(new Date()) && (
              <button
                onClick={() => setHistoryDate(toDateInputValue(new Date()))}
                className="text-xs font-semibold text-center py-3 rounded-xl"
                style={{ background: COLORS.bgSubtle, color: COLORS.blue }}
              >
                Xem hôm nay
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- Bottom Navigation ---- */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          className="max-w-2xl mx-auto flex items-center justify-between px-6"
          style={{ height: 64 }}
        >
          {/* Left icons */}
          <div className="flex items-center gap-8">
            {BOTTOM_TABS.slice(0, 2).map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center justify-center"
                  style={{ width: 44, height: 44 }}
                >
                  <Icon
                    size={24}
                    color={isActive ? COLORS.textPrimary : COLORS.textFaint}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </button>
              );
            })}
          </div>

          {/* Center FAB */}
          <div
            className="relative flex flex-col items-center"
            style={{ marginTop: -28 }}
          >
            <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
              style={{ background: COLORS.surface }}
            >
              <button
                onClick={() => setQuickCheckinOpen(true)}
                className="w-[58px] h-[58px] rounded-full flex items-center justify-center active:scale-95 transition-transform"
                style={{ background: COLORS.primary }}
              >
                <Plus size={28} strokeWidth={2.5} color="#FFFFFF" />
              </button>
            </div>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-8">
            {BOTTOM_TABS.slice(2).map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center justify-center"
                  style={{ width: 44, height: 44 }}
                >
                  <Icon
                    size={24}
                    color={isActive ? COLORS.textPrimary : COLORS.textFaint}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Quick Check-in Sheet ---- */}
      {quickCheckinOpen && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50"
          style={{ background: "rgba(15,18,24,0.45)" }}
          onClick={resetQuickCheckin}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 sheet-in"
            style={{
              background: COLORS.surface,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              className="w-9 h-1 rounded-full mx-auto mb-4 sm:hidden"
              style={{ background: COLORS.border }}
            />
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs" style={{ color: COLORS.textFaint }}>
                  Tạo ca làm mới
                </div>
                <div
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Chấm công nhanh
                </div>
              </div>
              <button
                onClick={resetQuickCheckin}
                style={{ color: COLORS.textFaint }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {/* Date */}
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Ngày
                </label>
                <input
                  type="date"
                  value={qcDate}
                  onChange={(e) => setQcDate(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: COLORS.bgSubtle,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>
              {/* Staff */}
              <div>
                <label
                  className="text-xs font-medium mb-1.5 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Nhân viên
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {staff.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setQcStaffId(p.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        background:
                          qcStaffId === p.id ? COLORS.primary : COLORS.bgSubtle,
                        color:
                          qcStaffId === p.id ? "#FFFFFF" : COLORS.textMuted,
                        border: `1px solid ${qcStaffId === p.id ? COLORS.primary : COLORS.border}`,
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              {/* Room */}
              <div>
                <label
                  className="text-xs font-medium mb-1.5 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Địa điểm
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setQcRoomId(r.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        background:
                          qcRoomId === r.id ? COLORS.primary : COLORS.bgSubtle,
                        color: qcRoomId === r.id ? "#FFFFFF" : COLORS.textMuted,
                        border: `1px solid ${qcRoomId === r.id ? COLORS.primary : COLORS.border}`,
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
              {/* Time in */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs font-medium mb-1 block"
                    style={{ color: COLORS.textMuted }}
                  >
                    Giờ vào
                  </label>
                  <input
                    type="time"
                    value={qcStart}
                    onChange={(e) => setQcStart(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: COLORS.bgSubtle,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.textPrimary,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium mb-1 block"
                    style={{ color: COLORS.textMuted }}
                  >
                    Giờ ra
                  </label>
                  <input
                    type="time"
                    value={qcEnd}
                    onChange={(e) => setQcEnd(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: COLORS.bgSubtle,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.textPrimary,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                </div>
              </div>
              {/* Preview + Submit */}
              {qcPerson && qcRoom && qcStart && qcEnd ? (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: COLORS.bgSubtle,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div
                        className="text-xs font-medium"
                        style={{ color: COLORS.textMuted }}
                      >
                        {qcPerson.name} · {qcRoom.name}
                      </div>
                      <div
                        className="text-sm font-semibold mt-0.5"
                        style={{ color: COLORS.primary }}
                      >
                        {formatDuration(qcHours)} · {formatMoney(qcAmount)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleQuickCheckin}
                    className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                    style={{
                      background: qcHours > 0 ? COLORS.primary : COLORS.border,
                      color: "#FFFFFF",
                    }}
                  >
                    Tạo ca làm
                  </button>
                </div>
              ) : (
                <div
                  className="text-xs text-center py-3"
                  style={{ color: COLORS.textFaint }}
                >
                  Chọn nhân viên, địa điểm, giờ vào và giờ ra
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Edit Session Sheet ---- */}
      {editSession && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50"
          style={{ background: "rgba(15,18,24,0.45)" }}
          onClick={resetEdit}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 sheet-in"
            style={{
              background: COLORS.surface,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              className="w-9 h-1 rounded-full mx-auto mb-4 sm:hidden"
              style={{ background: COLORS.border }}
            />
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs" style={{ color: COLORS.textFaint }}>
                  Chỉnh sửa ca làm
                </div>
                <div
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Sửa ca
                </div>
              </div>
              <button onClick={resetEdit} style={{ color: COLORS.textFaint }}>
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Ngày
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: COLORS.bgSubtle,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium mb-1.5 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Nhân viên
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {staff.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setEditStaffId(p.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        background:
                          editStaffId === p.id
                            ? COLORS.primary
                            : COLORS.bgSubtle,
                        color:
                          editStaffId === p.id ? "#FFFFFF" : COLORS.textMuted,
                        border: `1px solid ${editStaffId === p.id ? COLORS.primary : COLORS.border}`,
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label
                  className="text-xs font-medium mb-1.5 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Địa điểm
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setEditRoomId(r.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        background:
                          editRoomId === r.id
                            ? COLORS.primary
                            : COLORS.bgSubtle,
                        color:
                          editRoomId === r.id ? "#FFFFFF" : COLORS.textMuted,
                        border: `1px solid ${editRoomId === r.id ? COLORS.primary : COLORS.border}`,
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs font-medium mb-1 block"
                    style={{ color: COLORS.textMuted }}
                  >
                    Giờ vào
                  </label>
                  <input
                    type="time"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: COLORS.bgSubtle,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.textPrimary,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium mb-1 block"
                    style={{ color: COLORS.textMuted }}
                  >
                    Giờ ra
                  </label>
                  <input
                    type="time"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: COLORS.bgSubtle,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.textPrimary,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                </div>
              </div>
              <button
                onClick={handleEdit}
                className="w-full rounded-xl py-3 text-sm font-semibold mt-1"
                style={{ background: COLORS.primary, color: "#FFFFFF" }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Delete Confirmation ---- */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(15,18,24,0.45)" }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[300px] rounded-2xl p-5"
            style={{ background: COLORS.surface }}
          >
            <div
              className="text-sm font-semibold mb-2"
              style={{ color: COLORS.textPrimary }}
            >
              Xác nhận xoá
            </div>
            <div className="text-sm mb-5" style={{ color: COLORS.textMuted }}>
              Bạn có chắc muốn xoá ca làm này?
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="text-xs font-semibold rounded-lg px-4 py-2"
                style={{ background: COLORS.bgSubtle, color: COLORS.textMuted }}
              >
                Huỷ
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="text-xs font-semibold rounded-lg px-4 py-2"
                style={{ background: COLORS.red, color: "#FFFFFF" }}
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Staff Form Sheet ---- */}
      {staffFormOpen && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50"
          style={{ background: "rgba(15,18,24,0.45)" }}
          onClick={() => setStaffFormOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 sheet-in"
            style={{ background: COLORS.surface }}
          >
            <div
              className="w-9 h-1 rounded-full mx-auto mb-4 sm:hidden"
              style={{ background: COLORS.border }}
            />
            <div className="flex items-center justify-between mb-4">
              <div
                className="text-lg font-semibold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {editingStaffId ? "Sửa nhân viên" : "Thêm nhân viên"}
              </div>
              <button
                onClick={() => setStaffFormOpen(false)}
                style={{ color: COLORS.textFaint }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Tên nhân viên
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Nguyễn Thị Lan"
                  className="w-full rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: COLORS.bgSubtle,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Lương / giờ (VNĐ)
                </label>
                <input
                  value={formRate}
                  onChange={(e) =>
                    setFormRate(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="VD: 60000"
                  inputMode="numeric"
                  className="w-full rounded-xl px-4 py-3 text-sm"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    background: COLORS.bgSubtle,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>
              <button
                onClick={saveStaffForm}
                className="rounded-xl py-3.5 text-sm font-semibold mt-1"
                style={{ background: COLORS.primary, color: "#FFFFFF" }}
              >
                {editingStaffId ? "Lưu thay đổi" : "Thêm nhân viên"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Invoice View ---- */}
      {invoiceSession && (
        <InvoiceView
          session={invoiceSession}
          staffRate={staffById[invoiceSession.staffId]?.rate ?? 0}
          onClose={() => setInvoiceSession(null)}
        />
      )}

      {/* ---- Room Form Sheet ---- */}
      {roomFormOpen && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50"
          style={{ background: "rgba(15,18,24,0.45)" }}
          onClick={() => setRoomFormOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 sheet-in"
            style={{ background: COLORS.surface }}
          >
            <div
              className="w-9 h-1 rounded-full mx-auto mb-4 sm:hidden"
              style={{ background: COLORS.border }}
            />
            <div className="flex items-center justify-between mb-4">
              <div
                className="text-lg font-semibold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {editingRoomId ? "Sửa địa điểm" : "Thêm địa điểm"}
              </div>
              <button
                onClick={() => setRoomFormOpen(false)}
                style={{ color: COLORS.textFaint }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Tên địa điểm
                </label>
                <input
                  value={formRoomName}
                  onChange={(e) => setFormRoomName(e.target.value)}
                  placeholder="VD: Địa điểm 1"
                  className="w-full rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: COLORS.bgSubtle,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                  }}
                />
              </div>
              <button
                onClick={saveRoomForm}
                className="rounded-xl py-3.5 text-sm font-semibold mt-1"
                style={{ background: COLORS.primary, color: "#FFFFFF" }}
              >
                {editingRoomId ? "Lưu thay đổi" : "Thêm địa điểm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Filter Modal ---- */}
      {showFilters && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50"
          style={{ background: "rgba(15,18,24,0.45)" }}
          onClick={() => setShowFilters(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 sheet-in"
            style={{
              background: COLORS.surface,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              className="w-9 h-1 rounded-full mx-auto mb-4 sm:hidden"
              style={{ background: COLORS.border }}
            />
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs" style={{ color: COLORS.textFaint }}>
                  Báo cáo
                </div>
                <div
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Bộ lọc
                </div>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                style={{ color: COLORS.textFaint }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label
                  className="text-xs font-medium mb-2 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Khoảng thời gian
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PERIODS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setTempPeriod(p.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full"
                      style={{
                        background:
                          tempPeriod === p.id
                            ? COLORS.textPrimary
                            : COLORS.bgSubtle,
                        color:
                          tempPeriod === p.id ? "#FFFFFF" : COLORS.textMuted,
                        border: `1px solid ${tempPeriod === p.id ? COLORS.textPrimary : COLORS.border}`,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label
                  className="text-xs font-medium mb-1.5 block"
                  style={{ color: COLORS.textMuted }}
                >
                  Nhân viên
                </label>
                <input
                  type="text"
                  placeholder="Tìm tên nhân viên..."
                  value={tempStaffSearch}
                  onChange={(e) => setTempStaffSearch(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm mb-2"
                  style={{
                    background: COLORS.bgSubtle,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textPrimary,
                  }}
                />
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => {
                      setTempFilterStaffId("all");
                      setTempStaffSearch("");
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{
                      background:
                        tempFilterStaffId === "all"
                          ? COLORS.primary
                          : COLORS.bgSubtle,
                      color:
                        tempFilterStaffId === "all"
                          ? "#FFFFFF"
                          : COLORS.textMuted,
                      border: `1px solid ${tempFilterStaffId === "all" ? COLORS.primary : COLORS.border}`,
                    }}
                  >
                    Tất cả
                  </button>
                  {staff
                    .filter((s) =>
                      s.name
                        .toLowerCase()
                        .includes(tempStaffSearch.toLowerCase()),
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setTempFilterStaffId(p.id);
                          setTempStaffSearch("");
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{
                          background:
                            tempFilterStaffId === p.id
                              ? COLORS.primary
                              : COLORS.bgSubtle,
                          color:
                            tempFilterStaffId === p.id
                              ? "#FFFFFF"
                              : COLORS.textMuted,
                          border: `1px solid ${tempFilterStaffId === p.id ? COLORS.primary : COLORS.border}`,
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setPeriod(tempPeriod);
                setFilterStaffId(tempFilterStaffId);
                setShowFilters(false);
              }}
              className="w-full rounded-xl py-3.5 text-sm font-semibold mt-4"
              style={{ background: COLORS.primary, color: "#FFFFFF" }}
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-28 left-1/2 z-50 toast-in"
          style={{ transform: "translateX(-50%)" }}
        >
          <div
            className="px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg"
            style={{
              background:
                toast.type === "success" ? COLORS.primary : COLORS.red,
              color: "#FFFFFF",
            }}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Check-in Card Component ----
function CheckinCard({
  session,
  onEdit,
  onDelete,
  onInvoice,
}: {
  session: CompletedSession;
  onEdit: () => void;
  onDelete: () => void;
  onInvoice: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          {/* Time range */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex items-center gap-1 text-sm font-semibold"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <LogIn size={14} color={COLORS.green} />
              {formatClock(new Date(session.start))}
            </div>
            <div className="text-xs" style={{ color: COLORS.textFaint }}>
              →
            </div>
            <div
              className="flex items-center gap-1 text-sm font-semibold"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <LogOut size={14} color={COLORS.red} />
              {formatClock(new Date(session.end))}
            </div>
          </div>
          {/* Staff + Room */}
          <div className="text-sm" style={{ color: COLORS.textMuted }}>
            <div className="font-medium" style={{ color: COLORS.textPrimary }}>
              {session.staffName}
            </div>
            <div>{session.roomName}</div>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-3 mt-1.5">
            <span
              className="text-xs font-semibold"
              style={{ color: COLORS.textMuted }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                style={{ background: COLORS.green }}
              />
              {formatDuration(session.hours)}
            </span>
            <span
              className="text-sm font-bold"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: COLORS.primary,
              }}
            >
              {formatMoney(session.amount)}
            </span>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-3">
          <button
            onClick={onInvoice}
            className="rounded-lg p-2"
            style={{ color: COLORS.blue, background: "#EBF0FE" }}
          >
            <Receipt size={14} />
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg p-2"
            style={{ color: COLORS.textMuted, background: COLORS.bgSubtle }}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2"
            style={{ color: COLORS.red, background: COLORS.redSoft }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Invoice View Component ----
function InvoiceView({
  session,
  staffRate,
  onClose,
}: {
  session: CompletedSession;
  staffRate: number;
  onClose: () => void;
}) {
  const startDate = new Date(session.start);
  const endDate = new Date(session.end);
  const dayOfWeek = startDate.toLocaleDateString("vi-VN", { weekday: "long" });

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.88)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm"
        style={{ boxShadow: "0 25px 80px rgba(0,0,0,0.35)" }}
      >
        {/* === Receipt paper === */}
        <div
          style={{
            background: "#FEFEF7",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <div className="px-5 pt-6 pb-4">
            {/* ---- Top thick border ---- */}
            <div
              className="mb-4"
              style={{
                height: 4,
                background: COLORS.textPrimary,
                borderRadius: 2,
              }}
            />

            {/* ---- Header ---- */}
            <div className="text-center mb-4">
              <div
                className="text-[11px] font-semibold tracking-[0.15em]"
                style={{ color: COLORS.textFaint }}
              >
                QUẢN LÝ CA
              </div>
              <div
                className="text-lg font-bold mt-0.5"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: COLORS.textPrimary,
                  letterSpacing: "0.5px",
                }}
              >
                HÓA ĐƠN CHẤM CÔNG
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div
                  className="flex-1"
                  style={{
                    height: 1,
                    backgroundImage: `repeating-linear-gradient(to right, ${COLORS.border} 0px, ${COLORS.border} 5px, transparent 5px, transparent 8px)`,
                  }}
                />
                <span
                  className="text-[9px] font-mono tracking-wider"
                  style={{ color: COLORS.textFaint }}
                >
                  #{session.id.slice(0, 8).toUpperCase()}
                </span>
                <div
                  className="flex-1"
                  style={{
                    height: 1,
                    backgroundImage: `repeating-linear-gradient(to right, ${COLORS.border} 0px, ${COLORS.border} 5px, transparent 5px, transparent 8px)`,
                  }}
                />
              </div>
            </div>

            {/* ---- Dashed divider ---- */}
            <div
              className="mb-4"
              style={{
                height: 1,
                backgroundImage: `repeating-linear-gradient(to right, ${COLORS.border} 0px, ${COLORS.border} 6px, transparent 6px, transparent 10px)`,
              }}
            />

            {/* ---- Info section ---- */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: COLORS.textMuted }}
                >
                  Ngày
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: COLORS.textPrimary }}
                >
                  {formatDate(startDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: COLORS.textMuted }}
                >
                  Thứ
                </span>
                <span className="text-sm" style={{ color: COLORS.textMuted }}>
                  {dayOfWeek}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: COLORS.textMuted }}
                >
                  Nhân viên
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: COLORS.textPrimary }}
                >
                  {session.staffName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: COLORS.textMuted }}
                >
                  Địa điểm
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: COLORS.textPrimary }}
                >
                  {session.roomName}
                </span>
              </div>
            </div>

            {/* ---- Solid divider ---- */}
            <div
              className="my-4"
              style={{ height: 1, background: COLORS.border }}
            />

            {/* ---- Time section ---- */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: COLORS.textMuted }}
                >
                  Giờ vào
                </span>
                <span
                  className="text-sm font-semibold font-mono"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: COLORS.textPrimary,
                  }}
                >
                  {formatClock(startDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: COLORS.textMuted }}
                >
                  Giờ ra
                </span>
                <span
                  className="text-sm font-semibold font-mono"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: COLORS.textPrimary,
                  }}
                >
                  {formatClock(endDate)}
                </span>
              </div>
              <div
                className="flex items-center justify-between pt-1"
                style={{ borderTop: `1px dashed ${COLORS.border}` }}
              >
                <span
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: COLORS.textMuted }}
                >
                  Tổng giờ
                </span>
                <span
                  className="text-sm font-bold font-mono"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: COLORS.textPrimary,
                  }}
                >
                  {formatDuration(session.hours)}
                </span>
              </div>
            </div>

            {/* ---- Solid divider ---- */}
            <div
              className="my-4"
              style={{ height: 1, background: COLORS.border }}
            />

            {/* ---- Payment section ---- */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: COLORS.textMuted }}
                >
                  Đơn giá
                </span>
                <span
                  className="text-sm font-mono"
                  style={{ color: COLORS.textMuted }}
                >
                  {formatMoney(staffRate)} / giờ
                </span>
              </div>
              <div
                className="flex items-center justify-between py-2.5 px-3 -mx-3"
                style={{ background: COLORS.textPrimary, borderRadius: 8 }}
              >
                <span
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ color: "#FFFFFF" }}
                >
                  Thành tiền
                </span>
                <span
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "#FFFFFF",
                  }}
                >
                  {formatMoney(session.amount)}
                </span>
              </div>
            </div>

            {/* ---- Dashed divider ---- */}
            <div
              className="my-4"
              style={{
                height: 1,
                backgroundImage: `repeating-linear-gradient(to right, ${COLORS.border} 0px, ${COLORS.border} 6px, transparent 6px, transparent 10px)`,
              }}
            />

            {/* ---- Footer ---- */}
            <div className="text-center">
              <div
                className="text-[10px] italic"
                style={{ color: COLORS.textFaint }}
              >
                Cảm ơn quý khách!
              </div>
              <div className="flex items-center gap-1.5 justify-center mt-2">
                <span
                  className="text-[8px]"
                  style={{ color: COLORS.textFaint }}
                >
                  ✂
                </span>
                <span
                  className="text-[7px] font-mono tracking-[0.2em]"
                  style={{ color: COLORS.textFaint }}
                >
                  CẮT THEO ĐƯỜNG NÀY
                </span>
                <span
                  className="text-[8px]"
                  style={{ color: COLORS.textFaint }}
                >
                  ✂
                </span>
              </div>
              <div
                className="mt-1"
                style={{
                  height: 1,
                  backgroundImage: `repeating-linear-gradient(to right, ${COLORS.border} 0px, ${COLORS.border} 3px, transparent 3px, transparent 6px)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ---- Close button ---- */}
        <button
          onClick={onClose}
          className="w-full py-3.5 text-sm font-semibold tracking-wider"
          style={{ background: COLORS.textPrimary, color: "#FFFFFF" }}
        >
          ĐÓNG
        </button>
      </div>
    </div>
  );
}

// ---- KPI Card ----
function KpiCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: boolean;
}) {
  if (accent) {
    return (
      <div
        className="rounded-2xl p-4 flex flex-col gap-2"
        style={{ background: COLORS.textPrimary, minHeight: 90 }}
      >
        <div className="flex items-center justify-between">
          <div style={{ color: "rgba(255,255,255,0.9)" }}>{icon}</div>
        </div>
        <div
          className="text-[11px] font-semibold tracking-wider"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          {label}
        </div>
        <div
          className="text-2xl font-bold"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: "#FFFFFF",
          }}
        >
          {value}
        </div>
      </div>
    );
  }
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{
        background: COLORS.surface,
        border: `1.5px solid ${COLORS.textPrimary}`,
        minHeight: 90,
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: COLORS.primarySoft, color: COLORS.textPrimary }}
        >
          {icon}
        </div>
      </div>
      <div
        className="text-[11px] font-semibold tracking-wider"
        style={{ color: COLORS.textFaint }}
      >
        {label}
      </div>
      <div
        className="text-2xl font-bold"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          color: COLORS.textPrimary,
        }}
      >
        {value}
      </div>
    </div>
  );
}
