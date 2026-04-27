import { Router, type IRouter } from "express";
import { GetLeaderboardQueryParams, GetLeaderboardResponse } from "@workspace/api-zod";
import { getAllPlayers, sortPlayers, type SortKey } from "../lib/sftpStats";

const router: IRouter = Router();

function formatServerTime(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

router.get("/leaderboard", async (req, res) => {
  const parsed = GetLeaderboardQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params", details: parsed.error.issues });
    return;
  }
  const { page, pageSize, sortBy, sortDir, search } = parsed.data;

  try {
    const all = await getAllPlayers();

    const filtered = search
      ? all.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      : all;

    const sorted = sortPlayers(filtered, sortBy as SortKey, sortDir);

    const ranked = sorted.map((p, i) => ({ ...p, rank: i + 1 }));

    const totalPlayers = ranked.length;
    const totalPages = Math.max(1, Math.ceil(totalPlayers / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const players = ranked.slice(startIdx, startIdx + pageSize);

    const response = GetLeaderboardResponse.parse({
      page: safePage,
      pageSize,
      totalPlayers,
      totalPages,
      onlinePlayers: 0,
      serverTime: formatServerTime(new Date()),
      sortBy,
      sortDir,
      players,
    });

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to load leaderboard");
    res.status(502).json({
      error: "Failed to load player data from server",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
