"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  Plus, X, Users, DoorClosed, TrendingUp, Ban, ChevronDown,
  Pencil, Trash2, Wallet,   Download, LogIn, LogOut, FileText, Menu, Bell, Settings, Clock, Trash,
} from "lucide-react";
import { toPng } from "html-to-image";

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
};

const INITIAL_ROOMS = [
  { id: "r1", name: "Phòng 1" },
  { id: "r2", name: "Phòng 2" },
  { id: "r3", name: "Phòng 3" },
  { id: "r4", name: "Phòng VIP 1" },
  { id: "r5", name: "Phòng VIP 2" },
];

const INITIAL_STAFF = [
  { id: "s1", name: "Nguyễn Thị Lan", rate: 60000 },
  { id: "s2", name: "Trần Văn Minh", rate: 55000 },
  { id: "s3", name: "Phạm Thị Hoa", rate: 65000 },
  { id: "s4", name: "Lê Văn Hùng", rate: 55000 },
];

const DAY_MS = 86400000;

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
function formatMoney(n: number) {
  return Math.round(n).toLocaleString("vi-VN") + "đ";
}
function formatClock(d: Date) {
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(d: Date) {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: TrendingUp },
  { id: "rooms", label: "Phòng", icon: DoorClosed },
  { id: "staff", label: "Nhân viên", icon: Users },
  { id: "payroll", label: "Lương", icon: Wallet },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

const PERIODS = [
  { id: "today", label: "Hôm nay", cutoff: () => startOfToday() },
  { id: "week", label: "7 ngày qua", cutoff: () => Date.now() - 7 * DAY_MS },
  { id: "month", label: "30 ngày qua", cutoff: () => Date.now() - 30 * DAY_MS },
  { id: "all", label: "Tất cả", cutoff: () => 0 },
];

interface Staff {
  id: string;
  name: string;
  rate: number;
}

interface Room {
  id: string;
  name: string;
}

interface ActiveSession {
  id: string;
  roomId: string;
  staffId: string;
  start: number;
}

interface CompletedSession {
  id: string;
  roomName: string;
  roomId: string;
  staffId: string;
  staffName: string;
  start: number;
  end: number;
  hours: number;
  amount: number;
  invoiceImage: string | null;
}

interface PayrollGroup {
  staffId: string;
  name: string;
  hours: number;
  amount: number;
  count: number;
  sessions: CompletedSession[];
}

interface Toast {
  type: "start" | "end";
  text: string;
}

interface InvoiceModal {
  session: CompletedSession | null;
  generated: boolean;
}

export default function App() {
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState("dashboard");
  const [rooms, setRooms] = useLocalStorage<Room[]>("rooms", INITIAL_ROOMS);
  const [staff, setStaff] = useLocalStorage<Staff[]>("staff", INITIAL_STAFF);
  const [activeSessions, setActiveSessions] = useLocalStorage<ActiveSession[]>("activeSessions", []);
  const [completedSessions, setCompletedSessions] = useLocalStorage<CompletedSession[]>("completedSessions", []);
  const [modalRoomId, setModalRoomId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<InvoiceModal>({ session: null, generated: false });
  const [viewerInvoice, setViewerInvoice] = useState<string | null>(null);

  interface AppSettings {
    autoReset: boolean;
    resetTime: string;
    lastResetDate: string;
  }
  const [settings, setSettings] = useLocalStorage<AppSettings>("settings", {
    autoReset: false,
    resetTime: "00:00",
    lastResetDate: "",
  });

  // staff form state
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRate, setFormRate] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // room form state
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [formRoomName, setFormRoomName] = useState("");
  const [confirmingDeleteRoomId, setConfirmingDeleteRoomId] = useState<string | null>(null);

  // payroll state
  const [period, setPeriod] = useState("today");
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // auto-reset check on mount + every 60s
  useEffect(() => {
    if (!settings.autoReset) return;
    function doReset() {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      if (settings.lastResetDate === today) return;
      const [h, m] = settings.resetTime.split(":").map(Number);
      const resetToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      if (now.getTime() >= resetToday.getTime()) {
        setActiveSessions([]);
        setCompletedSessions([]);
        setSettings((prev) => ({ ...prev, lastResetDate: today }));
      }
    }
    doReset();
    const t = setInterval(doReset, 60000);
    return () => clearInterval(t);
  }, [settings.autoReset, settings.resetTime, settings.lastResetDate]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);
  const activeStaffIdsGlobal = useMemo(() => new Set(activeSessions.map((s) => s.staffId)), [activeSessions]);

  function startSession(roomId: string, staffId: string) {
    const room = rooms.find((r) => r.id === roomId);
    const person = staffById[staffId];
    setActiveSessions((prev) => [...prev, { id: `${roomId}-${staffId}-${Date.now()}`, roomId, staffId, start: Date.now() }]);
    setModalRoomId(null);
    setToast({ type: "start", text: `${person.name} bắt đầu ca tại ${room!.name}` });
  }

  function endSession(sessionId: string) {
    setActiveSessions((prev) => {
      const session = prev.find((s) => s.id === sessionId);
      if (!session) return prev;
      const end = Date.now();
      const hours = (end - session.start) / 3600000;
      const person = staffById[session.staffId];
      const amount = hours * person.rate;
      const room = rooms.find((r) => r.id === session.roomId);
      const completed: CompletedSession = {
        id: session.id,
        roomName: room!.name,
        roomId: session.roomId,
        staffId: session.staffId,
        staffName: person.name,
        start: session.start,
        end,
        hours,
        amount,
        invoiceImage: null,
      };
      setCompletedSessions((c) => [completed, ...c]);
      setInvoiceModal({ session: completed, generated: false });
      setToast({ type: "end", text: `${person.name} kết thúc ca — ${formatMoney(amount)} (${hours.toFixed(2)}h)` });
      return prev.filter((s) => s.id !== sessionId);
    });
  }

  function cancelSession(sessionId: string) {
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }

  const generateInvoiceImage = useCallback(async () => {
    if (!invoiceRef.current || invoiceModal.generated) return;
    try {
      const dataUrl = await toPng(invoiceRef.current, { quality: 1, pixelRatio: 2, backgroundColor: "#FFFFFF" });
      setInvoiceModal((prev) => ({ ...prev, generated: true }));
      setCompletedSessions((prev) =>
        prev.map((s) => (s.id === invoiceModal.session?.id ? { ...s, invoiceImage: dataUrl } : s))
      );
    } catch {
      // silently fail
    }
  }, [invoiceModal.session?.id, invoiceModal.generated]); // eslint-disable-line react-hooks/exhaustive-deps

  function downloadInvoice(dataUrl: string, fileName: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function viewExistingInvoice(session: CompletedSession) {
    if (session.invoiceImage) {
      setViewerInvoice(session.invoiceImage);
    }
  }

  // ---- staff CRUD ----
  function openAddStaff() {
    setEditingStaffId(null); setFormName(""); setFormRate(""); setStaffFormOpen(true);
  }
  function openEditStaff(person: Staff) {
    setEditingStaffId(person.id); setFormName(person.name); setFormRate(String(person.rate)); setStaffFormOpen(true);
  }
  function saveStaffForm() {
    const name = formName.trim();
    const rate = Number(formRate);
    if (!name || !rate || rate <= 0) {
      setToast({ type: "end", text: "Vui lòng nhập tên và lương/giờ hợp lệ" });
      return;
    }
    if (editingStaffId) {
      setStaff((prev) => prev.map((p) => (p.id === editingStaffId ? { ...p, name, rate } : p)));
      setToast({ type: "start", text: `Đã cập nhật ${name}` });
    } else {
      setStaff((prev) => [...prev, { id: `s${Date.now()}`, name, rate }]);
      setToast({ type: "start", text: `Đã thêm ${name}` });
    }
    setStaffFormOpen(false);
  }
  function deleteStaff(id: string) {
    if (activeStaffIdsGlobal.has(id)) {
      setToast({ type: "end", text: "Nhân viên đang trong ca, không thể xoá" });
      setConfirmingDeleteId(null);
      return;
    }
    const person = staffById[id];
    setStaff((prev) => prev.filter((p) => p.id !== id));
    setConfirmingDeleteId(null);
    setToast({ type: "end", text: `Đã xoá ${person.name}` });
  }

  // ---- room CRUD ----
  function openAddRoom() {
    setEditingRoomId(null); setFormRoomName(""); setRoomFormOpen(true);
  }
  function openEditRoom(room: Room) {
    setEditingRoomId(room.id); setFormRoomName(room.name); setRoomFormOpen(true);
  }
  function saveRoomForm() {
    const name = formRoomName.trim();
    if (!name) {
      setToast({ type: "end", text: "Vui lòng nhập tên phòng" });
      return;
    }
    if (editingRoomId) {
      setRooms((prev) => prev.map((r) => (r.id === editingRoomId ? { ...r, name } : r)));
      setToast({ type: "start", text: `Đã cập nhật ${name}` });
    } else {
      setRooms((prev) => [...prev, { id: `r${Date.now()}`, name }]);
      setToast({ type: "start", text: `Đã thêm ${name}` });
    }
    setRoomFormOpen(false);
  }
  function deleteRoom(id: string) {
    const room = rooms.find((r) => r.id === id);
    const hasActive = activeSessions.some((s) => s.roomId === id);
    if (hasActive) {
      setToast({ type: "end", text: "Phòng đang có nhân viên phục vụ, không thể xoá" });
      setConfirmingDeleteRoomId(null);
      return;
    }
    setRooms((prev) => prev.filter((r) => r.id !== id));
    setConfirmingDeleteRoomId(null);
    setToast({ type: "end", text: `Đã xoá ${room!.name}` });
  }

  // ---- payroll aggregation ----
  const periodCutoff = PERIODS.find((p) => p.id === period)!.cutoff();
  const filteredCompleted = useMemo(() => completedSessions.filter((s) => s.start >= periodCutoff), [completedSessions, periodCutoff]);
  const payrollByStaff: PayrollGroup[] = useMemo(() => {
    const map: Record<string, PayrollGroup> = {};
    for (const s of filteredCompleted) {
      if (!map[s.staffId]) map[s.staffId] = { staffId: s.staffId, name: s.staffName, hours: 0, amount: 0, count: 0, sessions: [] };
      map[s.staffId].hours += s.hours;
      map[s.staffId].amount += s.amount;
      map[s.staffId].count += 1;
      map[s.staffId].sessions.push(s);
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [filteredCompleted]);
  const totalPayrollPeriod = payrollByStaff.reduce((sum, p) => sum + p.amount, 0);

  const roomsActiveCount = new Set(activeSessions.map((s) => s.roomId)).size;
  const todayPayroll = completedSessions.filter((s) => s.start >= startOfToday()).reduce((sum, s) => sum + s.amount, 0);
  const todayCompletedCount = completedSessions.filter((s) => s.start >= startOfToday()).length;

  return (
    <div style={{ background: COLORS.bgSubtle, color: COLORS.textPrimary }} className="w-full min-h-screen font-sans">
      {/* Top bar */}
      <div className="sticky top-0 z-30" style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center justify-between px-4" style={{ height: 60 }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: COLORS.bgSubtle }}>
              <Menu size={20} color={COLORS.textPrimary} />
            </button>
            <span className="font-bold" style={{ fontSize: 17, color: COLORS.textPrimary }}>Rent Room</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: COLORS.bgSubtle }}>
              <Bell size={18} color={COLORS.textMuted} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: COLORS.primarySoft, color: COLORS.textPrimary }}>
              CN
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
        {/* ---------------- PAGE TITLE ---------------- */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs uppercase font-semibold mb-1" style={{ color: COLORS.textFaint, letterSpacing: "0.08em" }}>
              {tab === "dashboard" ? "Bảng điều khiển" : tab === "rooms" ? "Quản lý phòng" : tab === "staff" ? "Quản lý nhân sự" : tab === "payroll" ? "Báo cáo tài chính" : "Cài đặt"}
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.3px" }}>
              {tab === "dashboard" ? "Dashboard" : tab === "rooms" ? "Danh sách phòng" : tab === "staff" ? "Nhân viên" : tab === "payroll" ? "Tính lương" : "Cài đặt"}
            </h1>
          </div>
          {tab === "dashboard" && (
            <div className="shrink-0 mt-0.5 text-base" style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em", color: COLORS.textMuted }}>
              {formatClock(new Date(now))}
            </div>
          )}
        </div>

        {/* ---------------- TAB SUBHEADER ---------------- */}
        {tab === "staff" && (
          <div className="text-sm mb-6" style={{ color: COLORS.textFaint }}>{staff.length} nhân viên · {activeStaffIdsGlobal.size} đang trong ca</div>
        )}
        {tab === "payroll" && (
          <div className="flex gap-1.5 overflow-x-auto mb-6" style={{ scrollbarWidth: "none" }}>
            {PERIODS.map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)} className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
                style={{ background: period === p.id ? COLORS.textPrimary : COLORS.bgSubtle, color: period === p.id ? "#FFFFFF" : COLORS.textMuted, border: `1px solid ${period === p.id ? COLORS.textPrimary : COLORS.border}` }}>
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* ---------------- KPI DASHBOARD ---------------- */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <KpiCard
              icon={<DoorClosed size={18} />}
              value={`${roomsActiveCount}`}
              label="PHÒNG ĐANG PHỤC VỤ"
              sub={`${roomsActiveCount}/${rooms.length}`}
            />
            <KpiCard
              icon={<Users size={18} />}
              value={`${activeSessions.length}`}
              label="NHÂN VIÊN TRONG CA"
              sub="Đang làm"
            />
            <KpiCard
              icon={<TrendingUp size={18} />}
              value={formatMoney(todayPayroll)}
              label="TỔNG LƯƠNG HÔM NAY"
              sub={todayCompletedCount > 0 ? `${todayCompletedCount} ca` : "Chưa có ca"}
            />
            <KpiCard
              icon={<FileText size={18} />}
              value={String(todayCompletedCount)}
              label="CA HOÀN THÀNH HÔM NAY"
              sub="Tổng số"
              accent
            />
          </div>
        )}

        {/* ---------------- TAB: DASHBOARD (phòng) ---------------- */}
        {tab === "dashboard" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rooms.map((room) => {
              const sessions = activeSessions.filter((s) => s.roomId === room.id);
              const isActive = sessions.length > 0;
              return (
                <div key={room.id} className="rounded-2xl p-4 flex flex-col gap-3"
                  style={{ background: COLORS.surface, border: `1px solid ${isActive ? COLORS.textPrimary : COLORS.border}`, boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{room.name}</span>
                    <StatusTag active={isActive} />
                  </div>

                  {sessions.length === 0 && <div className="text-sm" style={{ color: COLORS.textFaint }}>Chưa có nhân viên phục vụ</div>}

                  <div className="flex flex-col gap-2">
                    {sessions.map((session) => {
                      const person = staffById[session.staffId];
                      if (!person) return null;
                      return (
                        <div key={session.id} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: COLORS.primarySoft }}>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{person.name}</div>
                            <div className="text-[11px] mt-0.5" style={{ color: COLORS.primary }}>Vào lúc {formatClock(new Date(session.start))}</div>
                            <div className="flex items-center gap-1.5 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em", color: COLORS.primary }}>
                              <span className="inline-block w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: COLORS.primary }} />
                              {formatElapsed(now - session.start)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => endSession(session.id)} className="text-xs font-semibold rounded-lg px-3 py-2" style={{ background: COLORS.primary, color: "#FFFFFF" }}>
                              Kết thúc
                            </button>
                            <button onClick={() => cancelSession(session.id)} title="Huỷ" className="rounded-lg p-2" style={{ color: COLORS.textFaint }}>
                              <Ban size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button onClick={() => setModalRoomId(room.id)} className="mt-1 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-1.5"
                    style={{ background: COLORS.primarySoft, color: COLORS.primary }}>
                    <Plus size={16} />
                    {sessions.length === 0 ? "Bắt đầu ca" : "Thêm nhân viên"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- TAB: ROOMS CRUD ---------------- */}
        {tab === "rooms" && (
          <div className="flex flex-col gap-2.5">
            <button onClick={openAddRoom} className="rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 mb-1" style={{ background: COLORS.textPrimary, color: "#FFFFFF" }}>
              <Plus size={16} /> Thêm phòng
            </button>

            {rooms.map((r, idx) => {
              const confirming = confirmingDeleteRoomId === r.id;
              const hasActive = activeSessions.some((s) => s.roomId === r.id);
              return (
                <div key={r.id} className="rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: COLORS.primarySoft, color: COLORS.textPrimary }}>
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{r.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: COLORS.textFaint }}>{hasActive ? "Đang có nhân viên" : "Trống"}</div>
                      </div>
                    </div>
                    {!confirming ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditRoom(r)} className="rounded-lg p-2" style={{ color: COLORS.textMuted, background: COLORS.bgSubtle }}><Pencil size={15} /></button>
                        <button onClick={() => setConfirmingDeleteRoomId(r.id)} className="rounded-lg p-2" style={{ color: COLORS.red, background: COLORS.redSoft }}><Trash2 size={15} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setConfirmingDeleteRoomId(null)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: COLORS.bgSubtle, color: COLORS.textMuted }}>Huỷ</button>
                        <button onClick={() => deleteRoom(r.id)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: COLORS.red, color: "#FFFFFF" }}>Xoá</button>
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
            <button onClick={openAddStaff} className="rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 mb-1" style={{ background: COLORS.textPrimary, color: "#FFFFFF" }}>
              <Plus size={16} /> Thêm nhân viên
            </button>

            {staff.map((p) => {
              const isWorking = activeStaffIdsGlobal.has(p.id);
              const confirming = confirmingDeleteId === p.id;
              return (
                <div key={p.id} className="rounded-2xl p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{p.name}</span>
                        {isWorking && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: COLORS.primarySoft, color: COLORS.primary }}>Đang trong ca</span>}
                      </div>
                      <div className="text-sm mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", color: COLORS.textFaint }}>{formatMoney(p.rate)}/giờ</div>
                    </div>
                    {!confirming ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditStaff(p)} className="rounded-lg p-2" style={{ color: COLORS.textMuted, background: COLORS.bgSubtle }}><Pencil size={15} /></button>
                        <button onClick={() => setConfirmingDeleteId(p.id)} className="rounded-lg p-2" style={{ color: COLORS.red, background: COLORS.redSoft }}><Trash2 size={15} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setConfirmingDeleteId(null)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: COLORS.bgSubtle, color: COLORS.textMuted }}>Huỷ</button>
                        <button onClick={() => deleteStaff(p.id)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: COLORS.red, color: "#FFFFFF" }}>Xoá</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- TAB: PAYROLL ---------------- */}
        {tab === "payroll" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl p-5" style={{ background: COLORS.textPrimary, color: "#FFFFFF" }}>
              <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Tổng lương · {PERIODS.find((p) => p.id === period)!.label}</div>
              <div className="text-3xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatMoney(totalPayrollPeriod)}</div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span style={{ color: "rgba(255,255,255,0.65)" }}>{filteredCompleted.length} ca hoàn thành</span>
              </div>
            </div>

            {payrollByStaff.length === 0 ? (
              <div className="rounded-2xl p-6 text-sm text-center" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textFaint }}>
                Chưa có ca nào hoàn thành trong khoảng thời gian này
              </div>
            ) : (
              payrollByStaff.map((p) => {
                const isExpanded = expandedStaffId === p.staffId;
                return (
                  <div key={p.staffId} className="rounded-2xl overflow-hidden" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <button onClick={() => setExpandedStaffId(isExpanded ? null : p.staffId)} className="text-left min-w-0 flex-1">
                          <div className="font-medium text-sm truncate flex items-center gap-1.5">
                            {p.name}
                            <ChevronDown size={14} style={{ color: COLORS.textFaint, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: COLORS.textFaint }}>{p.count} ca · {p.hours.toFixed(2)} giờ</div>
                        </button>
                        <span className="text-sm font-semibold shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", color: COLORS.textPrimary }}>{formatMoney(p.amount)}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        {p.sessions.map((s) => (
                          <div key={s.id} className="px-4 py-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="text-xs font-medium" style={{ color: COLORS.textPrimary }}>{s.roomName} · {formatDate(new Date(s.start))}</div>
                              <div className="text-xs font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>{formatMoney(s.amount)}</div>
                            </div>
                            <div className="flex items-center gap-3 text-[11px]" style={{ color: COLORS.textMuted }}>
                              <span className="flex items-center gap-1"><LogIn size={11} color={COLORS.primary} /> {formatClock(new Date(s.start))}</span>
                              <span className="flex items-center gap-1"><LogOut size={11} color={COLORS.primary} /> {formatClock(new Date(s.end))}</span>
                              <span>{s.hours.toFixed(2)} giờ</span>
                              <button
                                onClick={() => viewExistingInvoice(s)}
                                className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0"
                                style={{ background: COLORS.bgSubtle, color: COLORS.primary, border: `1px solid ${COLORS.primary}` }}
                              >
                                <FileText size={12} /> Hoá đơn
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ---------------- TAB: SETTINGS ---------------- */}
        {tab === "settings" && (
          <div className="flex flex-col gap-4">
            {/* Reset data */}
            <div className="rounded-2xl p-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <h2 className="text-sm font-semibold mb-1" style={{ color: COLORS.textPrimary }}>Xoá dữ liệu</h2>
              <p className="text-xs mb-4" style={{ color: COLORS.textFaint }}>Xoá toàn bộ phòng, nhân viên và lịch sử ca làm việc</p>
              <button
                onClick={() => {
                  setActiveSessions([]);
                  setCompletedSessions([]);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl"
                style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5" }}
              >
                <Trash size={14} /> Reset dữ liệu
              </button>
            </div>

            {/* Auto-reset schedule */}
            <div className="rounded-2xl p-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>Tự động xoá hàng ngày</h2>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.textFaint }}>Tự động reset dữ liệu vào một giờ nhất định mỗi ngày</p>
                </div>
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, autoReset: !prev.autoReset }))}
                  className="relative w-11 h-6 rounded-full transition-colors"
                  style={{
                    background: settings.autoReset ? COLORS.primary : COLORS.border,
                    border: `1px solid ${settings.autoReset ? COLORS.primary : COLORS.border}`,
                  }}
                >
                  <div
                    className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-transform shadow-sm"
                    style={{ transform: settings.autoReset ? "translateX(20px)" : "translateX(2px)" }}
                  />
                </button>
              </div>
              {settings.autoReset && (
                <div className="flex items-center gap-3">
                  <Clock size={16} style={{ color: COLORS.textMuted }} />
                  <input
                    type="time"
                    value={settings.resetTime}
                    onChange={(e) => setSettings((prev) => ({ ...prev, resetTime: e.target.value }))}
                    className="text-sm font-semibold rounded-lg px-3 py-1.5"
                    style={{
                      background: COLORS.bgSubtle,
                      color: COLORS.textPrimary,
                      border: `1px solid ${COLORS.border}`,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  />
                  <span className="text-xs" style={{ color: COLORS.textFaint }}>Giờ reset hàng ngày</span>
                </div>
              )}
              {settings.autoReset && settings.lastResetDate && (
                <div className="text-xs mt-3" style={{ color: COLORS.textMuted }}>
                  Lần reset gần nhất: {settings.lastResetDate}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(15,18,24,0.45)" }} />
          <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-0 bottom-0 w-64 max-w-[75vw] sidebar-in flex flex-col" style={{ background: COLORS.surface }}>
            <div className="flex items-center gap-3 px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: COLORS.primarySoft, color: COLORS.textPrimary }}>
                <DoorClosed size={20} />
              </div>
              <div>
                <div className="text-base font-bold" style={{ color: COLORS.textPrimary }}>Rent Room</div>
                <div className="text-xs" style={{ color: COLORS.textFaint }}>Quản lý nhân viên</div>
              </div>
            </div>
            <div className="flex-1 px-3 py-5 flex flex-col gap-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); setSidebarOpen(false); }}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                    style={{ background: isActive ? `${COLORS.primarySoft}` : "transparent", color: isActive ? COLORS.textPrimary : COLORS.textMuted, fontSize: 15, fontWeight: 500 }}
                  >
                    <Icon size={20} color={isActive ? COLORS.textPrimary : COLORS.textFaint} />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "14px 16px" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: COLORS.primarySoft, color: COLORS.textPrimary }}>
                  CN
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: COLORS.textPrimary }}>Chủ quán</div>
                  <div className="text-xs" style={{ color: COLORS.textFaint }}>Quản trị viên</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet: chọn nhân viên cho phòng */}
      {modalRoomId && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50" style={{ background: "rgba(15,18,24,0.45)" }} onClick={() => setModalRoomId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 sheet-in" style={{ background: COLORS.surface }}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: COLORS.border }} />
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs" style={{ color: COLORS.textFaint }}>{rooms.find((r) => r.id === modalRoomId)?.name}</div>
                <div className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Chọn nhân viên</div>
              </div>
              <button onClick={() => setModalRoomId(null)} style={{ color: COLORS.textFaint }}><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-2">
              {staff
                .filter((p) => !activeSessions.filter((s) => s.roomId === modalRoomId).map((s) => s.staffId).includes(p.id))
                .map((p) => (
                <button key={p.id} onClick={() => startSession(modalRoomId, p.id)} className="flex items-center justify-between rounded-xl px-4 py-3.5 text-left" style={{ background: COLORS.bgSubtle, border: `1px solid ${COLORS.border}` }}>
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", color: COLORS.textFaint }}>{formatMoney(p.rate)}/giờ</span>
                </button>
              ))}
              {staff.filter((p) => !activeSessions.filter((s) => s.roomId === modalRoomId).map((s) => s.staffId).includes(p.id)).length === 0 && (
                <div className="text-sm text-center py-3" style={{ color: COLORS.textFaint }}>Tất cả nhân viên đã được phân vào phòng này</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet: thêm / sửa nhân viên */}
      {staffFormOpen && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50" style={{ background: "rgba(15,18,24,0.45)" }} onClick={() => setStaffFormOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 sheet-in" style={{ background: COLORS.surface }}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: COLORS.border }} />
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{editingStaffId ? "Sửa nhân viên" : "Thêm nhân viên"}</div>
              <button onClick={() => setStaffFormOpen(false)} style={{ color: COLORS.textFaint }}><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: COLORS.textMuted }}>Tên nhân viên</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="VD: Nguyễn Thị Lan" className="w-full rounded-xl px-4 py-3 text-sm" style={{ background: COLORS.bgSubtle, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: COLORS.textMuted }}>Lương / giờ (VNĐ)</label>
                <input value={formRate} onChange={(e) => setFormRate(e.target.value.replace(/[^0-9]/g, ""))} placeholder="VD: 60000" inputMode="numeric" className="w-full rounded-xl px-4 py-3 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", background: COLORS.bgSubtle, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }} />
              </div>
              <button onClick={saveStaffForm} className="rounded-xl py-3.5 text-sm font-semibold mt-1" style={{ background: COLORS.primary, color: "#FFFFFF" }}>
                {editingStaffId ? "Lưu thay đổi" : "Thêm nhân viên"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet: thêm / sửa phòng */}
      {roomFormOpen && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50" style={{ background: "rgba(15,18,24,0.45)" }} onClick={() => setRoomFormOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 sheet-in" style={{ background: COLORS.surface }}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: COLORS.border }} />
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{editingRoomId ? "Sửa phòng" : "Thêm phòng"}</div>
              <button onClick={() => setRoomFormOpen(false)} style={{ color: COLORS.textFaint }}><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: COLORS.textMuted }}>Tên phòng</label>
                <input value={formRoomName} onChange={(e) => setFormRoomName(e.target.value)} placeholder="VD: Phòng 6" className="w-full rounded-xl px-4 py-3 text-sm" style={{ background: COLORS.bgSubtle, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }} />
              </div>
              <button onClick={saveRoomForm} className="rounded-xl py-3.5 text-sm font-semibold mt-1" style={{ background: COLORS.primary, color: "#FFFFFF" }}>
                {editingRoomId ? "Lưu thay đổi" : "Thêm phòng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice modal */}
      {invoiceModal.session && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50" style={{ background: "rgba(15,18,24,0.45)" }} onClick={() => setInvoiceModal({ session: null, generated: false })}>
          <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 sheet-in" style={{ background: COLORS.surface }}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: COLORS.border }} />
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Hoá đơn ca làm</div>
              <button onClick={() => setInvoiceModal({ session: null, generated: false })} style={{ color: COLORS.textFaint }}><X size={20} /></button>
            </div>

            {/* Invoice template - captured directly from DOM */}
            <div ref={invoiceRef}>
              <InvoicePreview session={invoiceModal.session} />
            </div>

            <button
              onClick={async () => {
                if (!invoiceModal.generated) {
                  await generateInvoiceImage();
                }
                const s = completedSessions.find((cs) => cs.id === invoiceModal.session?.id);
                if (s?.invoiceImage) {
                  downloadInvoice(s.invoiceImage, `hoa-don_${s.staffName}_${formatDate(new Date(s.start))}.png`);
                }
              }}
              className="w-full rounded-xl py-3.5 text-sm font-semibold mt-4 flex items-center justify-center gap-2"
              style={{ background: COLORS.primary, color: "#FFFFFF" }}
            >
              <Download size={16} /> Lưu hoá đơn
            </button>
            <div className="text-xs text-center mt-2" style={{ color: COLORS.textFaint }}>Nhấn để tải ảnh hoá đơn về máy</div>
          </div>
        </div>
      )}

      {/* Invoice fullscreen viewer (from payroll) */}
      {viewerInvoice && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4" style={{ background: "rgba(10,12,16,0.85)" }} onClick={() => setViewerInvoice(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewerInvoice} alt="Hoá đơn" className="max-w-full max-h-[80vh] rounded-2xl" onClick={(e) => e.stopPropagation()} />
          <button
            onClick={(e) => { e.stopPropagation(); downloadInvoice(viewerInvoice, `hoa-don.png`); }}
            className="mt-4 rounded-xl py-3 px-6 text-sm font-semibold flex items-center gap-2"
            style={{ background: COLORS.primary, color: "#FFFFFF" }}
          >
            <Download size={16} /> Tải hoá đơn
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 toast-in" style={{ transform: "translateX(-50%)" }}>
          <div className="px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg" style={{ background: COLORS.primary, color: "#FFFFFF" }}>
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Invoice Components ----

function InvoicePreview({ session }: { session: CompletedSession }) {
  return (
    <div style={{ background: "#FFFFFF", padding: 32, fontFamily: "Arial, sans-serif", borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#15181F" }}>HOÁ ĐƠN CA LÀM</div>
        <div style={{ fontSize: 11, color: "#9AA1AC", marginTop: 4 }}>{formatDate(new Date(session.start))}</div>
      </div>
      <table style={{ width: "100%", fontSize: 14, lineHeight: 2 }}>
        <tbody>
          <tr>
            <td style={{ color: "#6B7280", paddingRight: 16, whiteSpace: "nowrap", paddingTop: 4, paddingBottom: 4 }}>Nhân viên</td>
            <td style={{ fontWeight: 600, color: "#15181F", textAlign: "right", paddingTop: 4, paddingBottom: 4 }}>{session.staffName}</td>
          </tr>
          <tr><td colSpan={2} style={{ borderTop: "1px dashed #E7E9EE", height: 4 }} /></tr>
          <tr>
            <td style={{ color: "#6B7280", paddingRight: 16, whiteSpace: "nowrap", paddingTop: 4, paddingBottom: 4 }}>Phòng</td>
            <td style={{ fontWeight: 500, color: "#15181F", textAlign: "right", paddingTop: 4, paddingBottom: 4 }}>{session.roomName}</td>
          </tr>
          <tr>
            <td style={{ color: "#6B7280", paddingRight: 16, whiteSpace: "nowrap", paddingTop: 4, paddingBottom: 4 }}>Giờ vào</td>
            <td style={{ fontWeight: 500, color: "#15181F", textAlign: "right", paddingTop: 4, paddingBottom: 4 }}>{formatClock(new Date(session.start))}</td>
          </tr>
          <tr>
            <td style={{ color: "#6B7280", paddingRight: 16, whiteSpace: "nowrap", paddingTop: 4, paddingBottom: 4 }}>Giờ ra</td>
            <td style={{ fontWeight: 500, color: "#15181F", textAlign: "right", paddingTop: 4, paddingBottom: 4 }}>{formatClock(new Date(session.end))}</td>
          </tr>
          <tr>
            <td style={{ color: "#6B7280", paddingRight: 16, whiteSpace: "nowrap", paddingTop: 4, paddingBottom: 4 }}>Tổng thời gian</td>
            <td style={{ fontWeight: 500, color: "#15181F", textAlign: "right", paddingTop: 4, paddingBottom: 4 }}>{session.hours.toFixed(2)} giờ</td>
          </tr>
          <tr><td colSpan={2} style={{ borderTop: "2px solid #15181F", height: 4 }} /></tr>
          <tr>
            <td style={{ fontSize: 16, fontWeight: 700, color: "#15181F", paddingTop: 8 }}>Thành tiền</td>
            <td style={{ fontSize: 22, fontWeight: 700, color: "#15181F", textAlign: "right", paddingTop: 8, fontFamily: "'Courier New', monospace" }}>{formatMoney(session.amount)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---- KPI Card Component ----

function KpiCard({ icon, value, label, sub, accent }: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub: string;
  accent?: boolean;
}) {
  if (accent) {
    return (
      <div className="rounded-2xl p-4 flex flex-col justify-between" style={{ background: COLORS.textPrimary, minHeight: 120 }}>
        <div className="flex items-center justify-between">
          <div style={{ color: "rgba(255,255,255,0.9)" }}>{icon}</div>
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{sub}</span>
        </div>
        <div className="mt-auto">
          <div className="text-[11px] font-semibold tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</div>
          <div className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#FFFFFF" }}>{value}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl p-4 flex flex-col justify-between" style={{ background: COLORS.surface, border: `1.5px solid ${COLORS.textPrimary}`, minHeight: 120 }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: COLORS.primarySoft, color: COLORS.textPrimary }}>{icon}</div>
        <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: "#DBEAF4", color: COLORS.blue, borderRadius: 999 }}>{sub}</span>
      </div>
      <div className="mt-auto">
        <div className="text-[11px] font-semibold tracking-wider mb-0.5" style={{ color: COLORS.textFaint }}>{label}</div>
        <div className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.textPrimary }}>{value}</div>
      </div>
    </div>
  );
}

function StatusTag({ active }: { active: boolean }) {
  return (
    <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: active ? COLORS.primarySoft : COLORS.bgSubtle, color: active ? COLORS.textPrimary : COLORS.textMuted }}>
      {active ? "Đang phục vụ" : "Trống"}
    </span>
  );
}
