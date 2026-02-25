/* ============================================================
   AdminDashboard — Owner-only audit leads management panel
   Design: Deep navy dashboard matching Visibility Engine brand
   Security: adminProcedure enforces owner-only access server-side
   ============================================================ */

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Download,
  Search,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogOut,
  Shield,
  Users,
  BarChart3,
  Zap,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Building2,
  User,
  Calendar,
} from "lucide-react";
import { useLocation } from "wouter";

// ── Score badge colour helper ─────────────────────────────────────────────────

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-white/30";
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  if (score >= 25) return "text-orange-400";
  return "text-red-400";
}

function scoreBg(score: number | null | undefined): string {
  if (score == null) return "bg-white/5 border-white/10";
  if (score >= 75) return "bg-emerald-400/10 border-emerald-400/20";
  if (score >= 50) return "bg-yellow-400/10 border-yellow-400/20";
  if (score >= 25) return "bg-orange-400/10 border-orange-400/20";
  return "bg-red-400/10 border-red-400/20";
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Lead = {
  id: number;
  url: string;
  businessName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  overallScore: number | null;
  seoScore: number | null;
  sgoScore: number | null;
  geoScore: number | null;
  tier: string | null;
  isDemoMode: number;
  createdAt: Date;
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl border p-5 flex items-start gap-4"
      style={{
        background: "rgba(11,20,38,0.7)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs mono text-white/40 tracking-wide uppercase">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Lead Detail Modal ─────────────────────────────────────────────────────────

function LeadDetailModal({
  lead,
  open,
  onClose,
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!lead) return null;

  const date = new Date(lead.createdAt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg border"
        style={{
          background: "linear-gradient(135deg, #0B1426 0%, #1A2744 100%)",
          borderColor: "rgba(20,184,166,0.25)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="syne text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-400" />
            Lead Detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Score row */}
          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1.5 rounded-lg border text-sm font-bold mono ${scoreBg(lead.overallScore)} ${scoreColor(lead.overallScore)}`}
            >
              {lead.overallScore ?? "—"}/100
            </div>
            <span className="text-sm text-white/50">{lead.tier ?? "Unknown tier"}</span>
            <span
              className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${
                lead.isDemoMode
                  ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-400"
                  : "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"
              }`}
            >
              {lead.isDemoMode ? "Demo" : "Live Audit"}
            </span>
          </div>

          {/* Contact details */}
          <div
            className="rounded-lg border p-4 space-y-2.5"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
          >
            <p className="text-xs mono text-white/40 uppercase tracking-wider mb-3">Contact Details</p>
            {[
              { icon: User, label: "Name", value: lead.contactName },
              { icon: Building2, label: "Business", value: lead.businessName },
              { icon: Mail, label: "Email", value: lead.email },
              { icon: Phone, label: "Phone", value: lead.phone },
              { icon: Globe, label: "Website", value: lead.url },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-white/30">{label}: </span>
                  {value ? (
                    label === "Email" ? (
                      <a href={`mailto:${value}`} className="text-xs text-teal-400 hover:underline break-all">{value}</a>
                    ) : label === "Phone" ? (
                      <a href={`tel:${value}`} className="text-xs text-teal-400 hover:underline">{value}</a>
                    ) : label === "Website" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-400 hover:underline break-all">{value}</a>
                    ) : (
                      <span className="text-xs text-white/70">{value}</span>
                    )
                  ) : (
                    <span className="text-xs text-white/25 italic">Not provided</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Score breakdown */}
          <div
            className="rounded-lg border p-4"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
          >
            <p className="text-xs mono text-white/40 uppercase tracking-wider mb-3">Score Breakdown</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "SEO", score: lead.seoScore, max: 30 },
                { label: "SGO", score: lead.sgoScore, max: 35 },
                { label: "GEO", score: lead.geoScore, max: 35 },
              ].map(({ label, score, max }) => (
                <div key={label} className="text-center">
                  <p className={`text-xl font-bold mono ${scoreColor(score ? (score / max) * 100 : null)}`}>
                    {score ?? "—"}
                    <span className="text-xs text-white/25">/{max}</span>
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-white/30">
            <Calendar className="w-3.5 h-3.5" />
            <span>Submitted: {date}</span>
          </div>

          {/* Quick action links */}
          {(lead.email || lead.phone) && (
            <div className="flex gap-2 pt-1">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}?subject=Your AI Visibility Score for ${lead.businessName ?? lead.url}: ${lead.overallScore ?? "Demo"}/100`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "oklch(0.72 0.14 185)", color: "#0B1426" }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Send Follow-up
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-white/15 text-white/70 hover:border-white/30 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const utils = trpc.useUtils();

  // ── Data queries ──────────────────────────────────────────────────────────

  const statsQuery = trpc.admin.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const leadsQuery = trpc.admin.getLeads.useQuery(
    { page, limit: 25, search: search || undefined },
    { enabled: isAuthenticated, retry: false }
  );

  const exportQuery = trpc.admin.exportCsv.useQuery(undefined, {
    enabled: false,
    retry: false,
  });

  const deleteMutation = trpc.admin.deleteLead.useMutation({
    onSuccess: () => {
      utils.admin.getLeads.invalidate();
      utils.admin.getStats.invalidate();
      setDeleteTarget(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }, []);

  const handleExport = useCallback(async () => {
    const result = await utils.admin.exportCsv.fetch();
    if (!result?.csv) return;
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smaidm-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [utils]);

  const handleRefresh = useCallback(() => {
    utils.admin.getLeads.invalidate();
    utils.admin.getStats.invalidate();
  }, [utils]);

  // ── Auth guards ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0B1426 0%, #1A2744 100%)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin" />
          <p className="text-xs mono text-white/40">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0B1426 0%, #1A2744 100%)" }}>
        <div className="text-center max-w-sm px-6">
          <Shield className="w-10 h-10 text-teal-400 mx-auto mb-4" />
          <h1 className="syne text-xl font-bold text-white mb-2">Authentication Required</h1>
          <p className="text-sm text-white/50 mb-6">Sign in with your Manus account to access the admin dashboard.</p>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="w-full"
            style={{ background: "oklch(0.72 0.14 185)", color: "#0B1426" }}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // If authenticated but not admin, show access denied
  const isForbidden =
    leadsQuery.error?.data?.code === "FORBIDDEN" ||
    statsQuery.error?.data?.code === "FORBIDDEN";

  if (isForbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0B1426 0%, #1A2744 100%)" }}>
        <div className="text-center max-w-sm px-6">
          <Shield className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="syne text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-sm text-white/50 mb-6">This dashboard is restricted to the platform owner only.</p>
          <Button variant="outline" onClick={() => setLocation("/")} className="border-white/20 text-white/70">
            Return to Platform
          </Button>
        </div>
      </div>
    );
  }

  const leads = leadsQuery.data?.leads ?? [];
  const total = leadsQuery.data?.total ?? 0;
  const totalPages = leadsQuery.data?.totalPages ?? 1;
  const stats = statsQuery.data;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #0B1426 0%, #1A2744 60%, #0D1F3C 100%)" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b px-6 py-4"
        style={{
          background: "rgba(11,20,38,0.92)",
          borderColor: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663245699750/iiiwCRQyohWmOVPx.jpeg"
              alt="SMAIDM"
              className="h-7 w-auto object-contain"
            />
            <div>
              <p className="text-sm font-bold text-white syne">Admin Dashboard</p>
              <p className="text-xs mono text-white/35">Audit Leads — Owner Access Only</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-white/15 text-white/60 hover:text-white hover:border-white/30 bg-transparent"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="border-white/15 text-white/60 hover:text-white hover:border-white/30 bg-transparent"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/")}
              className="border-white/15 text-white/60 hover:text-white hover:border-white/30 bg-transparent"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Platform
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="border-red-400/20 text-red-400/70 hover:text-red-400 hover:border-red-400/40 bg-transparent"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Leads"
            value={statsQuery.isLoading ? "—" : (stats?.total ?? 0)}
            sub="All time submissions"
            color="#14B8A6"
          />
          <StatCard
            icon={Mail}
            label="With Contact"
            value={statsQuery.isLoading ? "—" : (stats?.withContact ?? 0)}
            sub="Email or phone provided"
            color="#60A5FA"
          />
          <StatCard
            icon={Zap}
            label="Live Audits"
            value={statsQuery.isLoading ? "—" : (stats?.liveAudits ?? 0)}
            sub="Backend-powered scans"
            color="#A78BFA"
          />
          <StatCard
            icon={BarChart3}
            label="Avg Score"
            value={statsQuery.isLoading ? "—" : (stats?.avgScore != null ? `${stats.avgScore}/100` : "N/A")}
            sub="Live audits only"
            color="#F59E0B"
          />
        </div>

        {/* Search + table */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: "rgba(11,20,38,0.7)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          {/* Table toolbar */}
          <div
            className="px-5 py-4 border-b flex items-center gap-3 flex-wrap"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex-1 min-w-0 flex items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search URL, business, name, email..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-transparent text-white placeholder-white/25 focus:outline-none focus:border-teal-400/50 transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                />
              </div>
              <Button
                size="sm"
                onClick={handleSearch}
                style={{ background: "oklch(0.72 0.14 185)", color: "#0B1426" }}
                className="shrink-0 text-xs"
              >
                Search
              </Button>
              {search && (
                <button
                  onClick={handleClearSearch}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="ml-auto text-xs mono text-white/30">
              {leadsQuery.isLoading ? "Loading..." : `${total} lead${total !== 1 ? "s" : ""}${search ? " found" : ""}`}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Website / Business", "Contact", "Score", "Tier", "Mode", "Date", ""].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs mono text-white/35 font-normal tracking-wider uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leadsQuery.isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 rounded bg-white/5 animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">
                      {search ? "No leads match your search." : "No audit leads yet. Leads appear here after the first audit submission."}
                    </td>
                  </tr>
                ) : (
                  leads.map(lead => {
                    const date = new Date(lead.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const domain = (() => {
                      try { return new URL(lead.url).hostname.replace(/^www\./, ""); }
                      catch { return lead.url; }
                    })();

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-white/2 transition-colors cursor-pointer"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        onClick={() => setSelectedLead(lead as Lead)}
                      >
                        {/* Website / Business */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-sm text-white/80 font-medium truncate">
                            {lead.businessName || domain}
                          </p>
                          <p className="text-xs mono text-white/30 truncate mt-0.5">{domain}</p>
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3">
                          {lead.contactName || lead.email || lead.phone ? (
                            <div>
                              {lead.contactName && (
                                <p className="text-xs text-white/70">{lead.contactName}</p>
                              )}
                              {lead.email && (
                                <p className="text-xs mono text-teal-400/70 truncate max-w-[160px]">{lead.email}</p>
                              )}
                              {lead.phone && (
                                <p className="text-xs mono text-white/40">{lead.phone}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-white/20 italic">Anonymous</span>
                          )}
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold mono ${scoreColor(lead.overallScore)}`}>
                            {lead.overallScore ?? "—"}
                            {lead.overallScore != null && <span className="text-white/25 text-xs">/100</span>}
                          </span>
                        </td>

                        {/* Tier */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-white/50">{lead.tier ?? "—"}</span>
                        </td>

                        {/* Mode */}
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              lead.isDemoMode
                                ? "bg-yellow-400/8 border-yellow-400/20 text-yellow-400/70"
                                : "bg-emerald-400/8 border-emerald-400/20 text-emerald-400/70"
                            }`}
                          >
                            {lead.isDemoMode ? "Demo" : "Live"}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          <span className="text-xs mono text-white/35">{date}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedLead(lead as Lead)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 transition-colors text-white/40 hover:text-white/70"
                              title="View details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(lead as Lead)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-400/10 transition-colors text-white/25 hover:text-red-400"
                              title="Delete lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="px-5 py-3 border-t flex items-center justify-between"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <p className="text-xs mono text-white/30">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs mono transition-colors"
                      style={{
                        background: p === page ? "oklch(0.72 0.14 185 / 0.15)" : "transparent",
                        border: p === page ? "1px solid oklch(0.72 0.14 185 / 0.3)" : "1px solid transparent",
                        color: p === page ? "#14B8A6" : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs mono text-white/20 pb-4">
          SMAIDM SSG Platform · Admin Dashboard · Owner Access Only
        </p>
      </main>

      {/* Lead detail modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent
          style={{
            background: "linear-gradient(135deg, #0B1426 0%, #1A2744 100%)",
            border: "1px solid rgba(239,68,68,0.25)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will permanently remove the audit lead for{" "}
              <strong className="text-white/70">{deleteTarget?.businessName ?? deleteTarget?.url}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 text-white/60 bg-transparent hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
