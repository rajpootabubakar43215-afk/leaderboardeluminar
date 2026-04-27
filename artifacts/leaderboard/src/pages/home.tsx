import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, Trophy, ChevronUp, ChevronDown, Clock, Users, ArrowUpRight, ArrowDownRight, Minus, Square, Medal, Award } from "lucide-react";
import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { keepPreviousData } from "@tanstack/react-query";
import { formatTime, formatNumber, formatRange } from "../lib/format";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlayerEntry, GetLeaderboardSortBy, GetLeaderboardSortDir } from "@workspace/api-client-react/src/generated/api.schemas";

export default function Home() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<GetLeaderboardSortBy>("kills");
  const [sortDir, setSortDir] = useState<GetLeaderboardSortDir>("desc");

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const queryParams = {
    page,
    pageSize: 20,
    sortBy,
    sortDir,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading, isFetching } = useGetLeaderboard(queryParams, {
    query: {
      queryKey: getGetLeaderboardQueryKey(queryParams),
      refetchInterval: 30000,
      placeholderData: keepPreviousData,
    },
  });

  const handleSort = (column: GetLeaderboardSortBy) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("desc"); // Default to desc when changing columns
    }
    setPage(1);
  };

  // Live Server Clock
  const [localTime, setLocalTime] = useState<string>("--:--:--");
  const serverTimeRef = useRef<string | null>(null);

  useEffect(() => {
    if (data?.serverTime && data.serverTime !== serverTimeRef.current) {
      serverTimeRef.current = data.serverTime;
      setLocalTime(data.serverTime);
    }
  }, [data?.serverTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime((prev) => {
        if (prev === "--:--:--") return prev;
        const [h, m, s] = prev.split(":").map(Number);
        let totalSeconds = h * 3600 + m * 60 + s + 1;
        const newH = Math.floor(totalSeconds / 3600) % 24;
        const newM = Math.floor((totalSeconds % 3600) / 60);
        const newS = totalSeconds % 60;
        return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}:${newS.toString().padStart(2, "0")}`;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-[100dvh] w-full text-foreground flex flex-col p-4 md:p-8 font-sans selection:bg-primary/30">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-1.5 rounded-md border border-primary/20">
                <Square className="w-5 h-5 text-primary fill-primary/20" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-white">ELU</span>
                <span className="text-primary">MINAR</span>
                <span className="text-white/80 ml-2 font-medium tracking-widest text-xl">LEADERBOARD</span>
              </h1>
              <span className="bg-white/10 text-white/80 text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ml-2">
                CoD 1.1
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 ml-[2.75rem]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live from ELUMINAR RIFLES S&D.
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium tabular-nums text-white/90">
                {data?.totalPlayers ?? "--"} players
              </span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium tabular-nums text-white/90 tracking-wider">
                {localTime}
              </span>
            </div>
          </div>
        </header>

        {/* MAIN CARD */}
        <div className="bg-card/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
          
          {/* Card Header */}
          <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-white">Top Players</h2>
              {isFetching && !isLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin opacity-50" />
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search playername..."
                className="pl-9 bg-black/40 border-white/10 text-sm focus-visible:ring-primary/50 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs uppercase bg-black/20 text-muted-foreground border-b border-white/5">
                <tr>
                  <th className="px-4 py-3 font-semibold w-16 text-center">#</th>
                  <th className="px-4 py-3 font-semibold">Player</th>
                  
                  {/* Sortable Columns */}
                  <SortableHeader column="kills" label="Kills" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader column="deaths" label="Deaths" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader column="kd" label="K/D" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader column="accuracy" label="Acc" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader column="dmg" label="DMG" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader column="timePlayed" label="Time" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader column="shots" label="Shots" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader column="hits" label="Hits" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader column="longestDist" label="Range (units)" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={11} className="px-4 py-3"><Skeleton className="h-6 w-full opacity-10" /></td>
                    </tr>
                  ))
                ) : data?.players.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-muted-foreground">
                      No players found.
                    </td>
                  </tr>
                ) : (
                  data?.players.map((player) => (
                    <PlayerRow key={player.id} player={player} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="p-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-md disabled:opacity-30 disabled:pointer-events-none transition-colors"
                data-testid="button-page-prev"
              >
                Prev
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers(page, data.totalPages).map((p, i) => (
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      data-testid={`button-page-${p}`}
                      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors
                        ${page === p 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                    >
                      {p}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-md disabled:opacity-30 disabled:pointer-events-none transition-colors"
                data-testid="button-page-next"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function SortableHeader({ 
  column, 
  label, 
  currentSort, 
  currentDir, 
  onSort,
  align = "left"
}: { 
  column: GetLeaderboardSortBy, 
  label: string, 
  currentSort: string, 
  currentDir: string, 
  onSort: (col: GetLeaderboardSortBy) => void,
  align?: "left" | "right" | "center"
}) {
  const isActive = currentSort === column;
  return (
    <th 
      className={`px-4 py-3 font-semibold cursor-pointer select-none hover:text-white transition-colors group ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
      onClick={() => onSort(column)}
      data-testid={`button-sort-${column}`}
    >
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span className={isActive ? "text-primary" : ""}>{label}</span>
        <div className="flex flex-col -space-y-1">
          <ChevronUp className={`w-3 h-3 ${isActive && currentDir === 'asc' ? 'text-primary' : 'text-white/20 group-hover:text-white/40'}`} />
          <ChevronDown className={`w-3 h-3 ${isActive && currentDir === 'desc' ? 'text-primary' : 'text-white/20 group-hover:text-white/40'}`} />
        </div>
      </div>
    </th>
  );
}

function PlayerRow({ player }: { player: PlayerEntry }) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  };

  const handleLeave = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={0} closeDelay={0}>
      <tr
        className="hover:bg-white/[0.03] transition-colors cursor-default group"
        data-testid={`row-player-${player.id}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <td className="px-4 py-3 text-center font-mono text-xs">
          <RankBadge rank={player.rank} />
        </td>
        <td className="px-4 py-3 font-semibold text-white/90 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all">
          <HoverCardTrigger asChild>
            <span className="cursor-default">{player.name}</span>
          </HoverCardTrigger>
        </td>
        <td className="px-4 py-3 font-mono tabular-nums text-white/80">{formatNumber(player.kills)}</td>
        <td className="px-4 py-3 font-mono tabular-nums text-white/80">{formatNumber(player.deaths)}</td>
        <td className="px-4 py-3 font-mono tabular-nums text-primary/90 font-medium">{player.kd.toFixed(2)}</td>
        <td className="px-4 py-3 font-mono tabular-nums text-white/80">{player.accuracy.toFixed(1)}%</td>
        <td className="px-4 py-3 font-mono tabular-nums text-white/80">{formatNumber(player.dmg)}</td>
        <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground text-xs">{formatTime(player.timePlayed)}</td>
        <td className="px-4 py-3 font-mono tabular-nums text-white/80">{formatNumber(player.shots)}</td>
        <td className="px-4 py-3 font-mono tabular-nums text-white/80">{formatNumber(player.hits)}</td>
        <td className="px-4 py-3 font-mono tabular-nums text-white/80 text-right">{formatRange(player.longestDist)}</td>
      </tr>

      <HoverCardContent
        side="right"
        align="start"
        className="w-72 p-4 bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-primary/10 rounded-xl"
        sideOffset={12}
        collisionPadding={12}
        avoidCollisions
      >
        <div className="flex flex-col gap-3">
          <div>
            <h4 className="font-bold text-white text-lg tracking-tight">{player.name}</h4>
            <p className="text-xs text-muted-foreground">No changes yet today</p>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <StatBreakdown label="Kills" current={formatNumber(player.kills)} change="− 0" />
            <StatBreakdown label="Deaths" current={formatNumber(player.deaths)} change="− 0" />
            <StatBreakdown label="K/D" current={player.kd.toFixed(2)} change="+0.00" changeType="positive" />
            <StatBreakdown label="Accuracy" current={`${player.accuracy.toFixed(1)}%`} change="+0.0%" changeType="positive" />
            <StatBreakdown label="Damage" current={formatNumber(player.dmg)} change="− 0" />
            <StatBreakdown label="Time" current={formatTime(player.timePlayed)} change="− 0" />
            <StatBreakdown label="Shots" current={formatNumber(player.shots)} change="− 0" />
            <StatBreakdown label="Hits" current={formatNumber(player.hits)} change="− 0" />
            <StatBreakdown label="Range" current={formatRange(player.longestDist)} change="− 0.00" />
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] tracking-wide
          bg-gradient-to-b from-yellow-300 to-amber-500 text-black shadow-[0_0_12px_rgba(250,204,21,0.45)] border border-yellow-200/60"
        data-testid={`badge-rank-${rank}`}
      >
        <Trophy className="w-3 h-3" strokeWidth={2.5} />
        #{rank}
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] tracking-wide
          bg-gradient-to-b from-slate-200 to-slate-400 text-black shadow-[0_0_10px_rgba(203,213,225,0.35)] border border-slate-100/60"
        data-testid={`badge-rank-${rank}`}
      >
        <Medal className="w-3 h-3" strokeWidth={2.5} />
        #{rank}
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] tracking-wide
          bg-gradient-to-b from-amber-600 to-orange-800 text-white shadow-[0_0_10px_rgba(217,119,6,0.4)] border border-amber-500/60"
        data-testid={`badge-rank-${rank}`}
      >
        <Award className="w-3 h-3" strokeWidth={2.5} />
        #{rank}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground" data-testid={`badge-rank-${rank}`}>
      <span className="opacity-50">#</span>{rank}
    </span>
  );
}

function StatBreakdown({ 
  label, 
  current, 
  change, 
  changeType = "neutral" 
}: { 
  label: string, 
  current: string, 
  change: string,
  changeType?: "positive" | "negative" | "neutral"
}) {
  return (
    <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="text-white/30 text-xs">Current:</span>
        <span className="text-white/90 font-mono text-xs">{current}</span>
      </div>
      <div className={`font-mono text-xs font-medium flex items-center ${
        changeType === 'positive' ? 'text-emerald-400' : 
        changeType === 'negative' ? 'text-destructive' : 'text-muted-foreground'
      }`}>
        {change}
      </div>
    </div>
  );
}

// --- Helpers ---

function getPageNumbers(currentPage: number, totalPages: number) {
  const delta = 2;
  const range = [];
  for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
    range.push(i);
  }

  if (currentPage - delta > 2) {
    range.unshift("...");
  }
  if (currentPage + delta < totalPages - 1) {
    range.push("...");
  }

  range.unshift(1);
  if (totalPages !== 1) {
    range.push(totalPages);
  }

  return range;
}
