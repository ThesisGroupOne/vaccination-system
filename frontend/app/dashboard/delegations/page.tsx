"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightLeftIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  SendIcon,
  InboxIcon,
  SyringeIcon,
  CalendarIcon,
  RefreshCwIcon,
  ClockIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import DelegateTaskModal from "@/components/DelegateTaskModal";

const API = "http://localhost:9999";

interface Delegation {
  id: number;
  schedule_id: number;
  from_user_id: number;
  to_user_id: number;
  reason: string;
  status: "Pending" | "Accepted" | "Rejected";
  created_at: string;
  responded_at?: string;
  schedule?: {
    schedule_id: number;
    schedule_type: string;
    scheduled_date: string;
    status: string;
    animal?: { animal_id: number; nickname?: string; animal_type: string };
    vaccine?: { vaccine_name: string };
  };
  from_user?: { user_id: number; full_name: string; role: string };
  to_user?: { user_id: number; full_name: string; role: string } | null;
}

interface User {
  user_id: number;
  full_name: string;
  role: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Pending")
    return (
      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 gap-1">
        <ClockIcon className="w-3 h-3" /> Pending
      </Badge>
    );
  if (status === "Accepted")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 gap-1">
        <CheckCircle2Icon className="w-3 h-3" /> Accepted
      </Badge>
    );
  return (
    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200 gap-1">
      <XCircleIcon className="w-3 h-3" /> Rejected
    </Badge>
  );
}

function ScheduleTypeBadge({ type }: { type: string }) {
  if (type === "Emergency")
    return (
      <Badge className="bg-rose-50 text-rose-600 hover:bg-rose-50 text-[10px] border-rose-200">
        🚨 Emergency
      </Badge>
    );
  return (
    <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-50 text-[10px] border-blue-200">
      🔄 Routine
    </Badge>
  );
}

export default function DelegationsPage() {
  const [activeTab, setActiveTab] = useState<"received" | "all" | "requests">(
    "received",
  );
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignToUserId, setAssignToUserId] = useState<Record<number, string>>(
    {},
  );
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const isAdmin = role === "Admin";

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchDelegations = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint =
        activeTab === "received"
          ? "/api/delegations/received"
          : "/api/delegations/all";

      const res = await fetch(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setDelegations(await res.json());
      } else {
        setDelegations([]);
      }

      if (isAdmin && activeTab === "requests" && doctors.length === 0) {
        const uRes = await fetch(`${API}/api/users`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (uRes.ok) {
          const uData = await uRes.json();
          setDoctors(
            uData.filter(
              (u: any) => u.role === "Doctor" || u.role === "FarmWorker",
            ),
          );
        }
      }
    } catch {
      setDelegations([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isAdmin, doctors.length]);

  useEffect(() => {
    fetchDelegations();
  }, [fetchDelegations]);

  const handleRespond = async (id: number, status: "Accepted" | "Rejected") => {
    setRespondingId(id);
    try {
      const res = await fetch(`${API}/api/delegations/${id}/respond`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Delegation ${status.toLowerCase()} successfully!`);
        fetchDelegations();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to respond");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setRespondingId(null);
    }
  };

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      const res = await fetch(`${API}/api/delegations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        toast.success("Delegation cancelled.");
        fetchDelegations();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to cancel");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setCancellingId(null);
    }
  };
  const handleAssign = async (id: number) => {
    const to_user_id = assignToUserId[id];
    if (!to_user_id) return toast.error("Please select a doctor to assign to.");

    setAssigningId(id);
    try {
      const res = await fetch(`${API}/api/delegations/${id}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ to_user_id: parseInt(to_user_id) }),
      });
      if (res.ok) {
        toast.success("Task assigned successfully!");
        fetchDelegations();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to assign");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setAssigningId(null);
    }
  };

  const safeDelegations = Array.isArray(delegations) ? delegations : [];
  const pendingCount = safeDelegations.filter(
    (d) => d.status === "Pending" && d.to_user_id !== null,
  ).length;
  const requestsCount = safeDelegations.filter(
    (d) => d.to_user_id === null && d.status === "Pending",
  ).length;

  const tabs = [
    {
      key: "received",
      label: "Received",
      icon: <InboxIcon className="w-4 h-4" />,
    },
    ...(isAdmin
      ? [
          {
            key: "requests",
            label: "Delegation Requests",
            icon: <ClockIcon className="w-4 h-4" />,
          },
          {
            key: "all",
            label: "All Delegations",
            icon: <ArrowRightLeftIcon className="w-4 h-4" />,
          },
        ]
      : []),
  ] as const;

  const displayDelegations =
    activeTab === "requests"
      ? safeDelegations.filter((d) => d.to_user_id === null)
      : activeTab === "all"
        ? safeDelegations.filter((d) => d.to_user_id !== null)
        : safeDelegations;

  return (
    <div className="bg-[#f8faff] min-h-screen p-4 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ArrowRightLeftIcon className="w-6 h-6 text-blue-600" />
            Task Delegations
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Transfer vaccination tasks to other team members when needed.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsDelegateModalOpen(true)}
            className="rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-bold shadow-sm shadow-blue-200"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Delegate Task
          </Button>
          <Button
            onClick={fetchDelegations}
            variant="outline"
            className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <RefreshCwIcon className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all relative ${
              activeTab === tab.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.key === "received" &&
              pendingCount > 0 &&
              activeTab !== "received" && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            {tab.key === "requests" &&
              requestsCount > 0 &&
              activeTab !== "requests" && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {requestsCount}
                </span>
              )}
          </button>
        ))}
      </div>

      {/* Content */}
      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 flex flex-col items-center gap-3 text-slate-400">
              <Loader2Icon className="w-8 h-8 animate-spin" />
              <span className="text-sm">Loading delegations...</span>
            </div>
          ) : displayDelegations.length === 0 ? (
            <div className="p-16 flex flex-col items-center gap-3 text-slate-400">
              <ArrowRightLeftIcon className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">No delegations found.</p>
              {activeTab === "received" && (
                <p className="text-xs text-center max-w-xs">
                  When someone delegates a vaccination task to you, it will
                  appear here.
                </p>
              )}
              {activeTab === "requests" && (
                <p className="text-xs text-center max-w-xs">
                  No pending delegation requests from doctors.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {displayDelegations.map((d) => (
                <div
                  key={d.id}
                  className={`p-5 hover:bg-slate-50/70 transition-colors ${
                    d.status === "Pending" && activeTab === "received"
                      ? "border-l-4 border-blue-500"
                      : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="space-y-3 flex-1 min-w-0">
                      {/* Schedule info */}
                      <div className="flex flex-wrap items-center gap-2">
                        <SyringeIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="font-bold text-slate-800 text-sm">
                          {d.schedule?.vaccine?.vaccine_name || "—"}
                        </span>
                        <span className="text-slate-400 text-sm">→</span>
                        <span className="text-slate-600 text-sm">
                          Animal #{d.schedule?.animal?.animal_id}
                          {d.schedule?.animal?.nickname
                            ? ` (${d.schedule.animal.nickname})`
                            : ""}
                        </span>
                        {d.schedule?.schedule_type && (
                          <ScheduleTypeBadge type={d.schedule.schedule_type} />
                        )}
                        <StatusBadge status={d.status} />
                      </div>

                      {/* People */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-400 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">
                            {d.from_user?.full_name?.charAt(0)?.toUpperCase() ||
                              "?"}
                          </div>
                          <span className="font-semibold text-slate-700">
                            {d.from_user?.full_name}
                          </span>
                          <span className="text-slate-400">
                            ({d.from_user?.role})
                          </span>
                        </div>
                        <ArrowRightLeftIcon className="w-3 h-3 text-blue-500" />
                        {d.to_user ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">
                              {d.to_user?.full_name?.charAt(0)?.toUpperCase() ||
                                "?"}
                            </div>
                            <span className="font-semibold text-slate-700">
                              {d.to_user.full_name}
                            </span>
                            <span className="text-slate-400">
                              ({d.to_user.role})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                            Pending Admin Assignment
                          </span>
                        )}
                      </div>

                      {/* Reason */}
                      <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 border border-slate-100">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Reason:{" "}
                        </span>
                        {d.reason}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <CalendarIcon className="w-3 h-3" />
                        Delegated {new Date(d.created_at).toLocaleString()}
                        {d.responded_at && (
                          <span className="ml-2">
                            · Responded{" "}
                            {new Date(d.responded_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {/* Received → can Accept/Reject if Pending */}
                      {activeTab === "received" && d.status === "Pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleRespond(d.id, "Accepted")}
                            disabled={respondingId === d.id}
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-9 px-4 text-xs shadow-sm shadow-emerald-200"
                          >
                            {respondingId === d.id ? (
                              <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2Icon className="w-3.5 h-3.5 mr-1" />{" "}
                                Accept
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRespond(d.id, "Rejected")}
                            disabled={respondingId === d.id}
                            className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold h-9 px-4 text-xs"
                          >
                            <XCircleIcon className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}

                      {/* Sent → can Cancel if Pending */}
                      {activeTab === "sent" && d.status === "Pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(d.id)}
                          disabled={cancellingId === d.id}
                          className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold h-9 px-4 text-xs"
                        >
                          {cancellingId === d.id ? (
                            <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Cancel Delegation"
                          )}
                        </Button>
                      )}
                      {/* Requests Tab → Admin assigns task */}
                      {activeTab === "requests" && d.status === "Pending" && (
                        <div className="flex gap-2 items-center">
                          <select
                            value={assignToUserId[d.id] || ""}
                            onChange={(e) =>
                              setAssignToUserId((prev) => ({
                                ...prev,
                                [d.id]: e.target.value,
                              }))
                            }
                            className="border border-slate-200 rounded-xl px-3 text-xs h-9 bg-slate-50 outline-none focus:border-blue-400 w-36"
                          >
                            <option value="" disabled>
                              Select Doctor
                            </option>
                            {doctors
                              .filter((u) => u.user_id !== d.from_user_id)
                              .map((u) => (
                                <option key={u.user_id} value={u.user_id}>
                                  {u.full_name}
                                </option>
                              ))}
                          </select>
                          <Button
                            size="sm"
                            onClick={() => handleAssign(d.id)}
                            disabled={
                              assigningId === d.id || !assignToUserId[d.id]
                            }
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9 px-4 text-xs shadow-sm shadow-blue-200"
                          >
                            {assigningId === d.id ? (
                              <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Assign"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delegate Task Modal */}
      <DelegateTaskModal
        open={isDelegateModalOpen}
        onClose={() => setIsDelegateModalOpen(false)}
        schedule={null}
        onSuccess={fetchDelegations}
      />
    </div>
  );
}
