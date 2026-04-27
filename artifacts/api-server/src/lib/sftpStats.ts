import SftpClient from "ssh2-sftp-client";
import { logger } from "./logger";

export interface PlayerEntry {
  rank: number;
  id: string;
  name: string;
  kills: number;
  deaths: number;
  headshots: number;
  bash: number;
  timePlayed: number;
  longestDist: number;
  shots: number;
  hits: number;
  dmg: number;
  suicides: number;
  kd: number;
  accuracy: number;
}

interface CacheEntry {
  fetchedAt: number;
  players: PlayerEntry[];
}

const CACHE_TTL_MS = 30_000;
let cache: CacheEntry | null = null;
let inflight: Promise<PlayerEntry[]> | null = null;

function readEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function parseInt0(v: string | undefined): number {
  const n = Number.parseInt((v ?? "0").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseFloat0(v: string | undefined): number {
  const n = Number.parseFloat((v ?? "0").trim());
  return Number.isFinite(n) ? n : 0;
}

function parseUsersDat(text: string): Map<string, string> {
  const idToName = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  let headerSeen = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split("%");
    if (!headerSeen) {
      headerSeen = true;
      continue;
    }
    const id = parts[0]?.trim();
    const name = parts[1]?.trim();
    if (!id || !name) continue;
    idToName.set(id, name);
  }
  return idToName;
}

interface RawStat {
  user: string;
  kills: number;
  deaths: number;
  headshots: number;
  bash: number;
  timePlayed: number;
  longestDist: number;
  shots: number;
  hits: number;
  dmg: number;
  suicides: number;
}

function parseStatDat(text: string): RawStat[] {
  const out: RawStat[] = [];
  const lines = text.split(/\r?\n/);
  let headerSeen = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split("%");
    if (!headerSeen) {
      headerSeen = true;
      continue;
    }
    const user = parts[0]?.trim();
    if (!user || user.toLowerCase() === "none") continue;
    out.push({
      user,
      kills: parseInt0(parts[1]),
      deaths: parseInt0(parts[2]),
      headshots: parseInt0(parts[3]),
      bash: parseInt0(parts[4]),
      timePlayed: parseInt0(parts[5]),
      longestDist: parseFloat0(parts[6]),
      shots: parseInt0(parts[7]),
      hits: parseInt0(parts[8]),
      dmg: parseInt0(parts[9]),
      suicides: parseInt0(parts[10]),
    });
  }
  return out;
}

async function downloadFiles(): Promise<{ usersText: string; statsText: string }> {
  const sftp = new SftpClient();
  const host = readEnv("SFTP_HOST");
  const port = Number.parseInt(readEnv("SFTP_PORT"), 10);
  const username = readEnv("SFTP_USER");
  const password = readEnv("SFTP_PASS");
  const usersFile = process.env["SFTP_USERS_FILE"] ?? "main/users.dat";
  const statsFile = process.env["SFTP_STATS_FILE"] ?? "main/stat.dat";

  await sftp.connect({
    host,
    port,
    username,
    password,
    readyTimeout: 15_000,
  });

  try {
    const [usersBuf, statsBuf] = await Promise.all([
      sftp.get(usersFile) as Promise<Buffer>,
      sftp.get(statsFile) as Promise<Buffer>,
    ]);
    return {
      usersText: usersBuf.toString("utf8"),
      statsText: statsBuf.toString("utf8"),
    };
  } finally {
    try {
      await sftp.end();
    } catch (err) {
      logger.warn({ err }, "Failed to close SFTP connection cleanly");
    }
  }
}

function buildPlayers(usersText: string, statsText: string): PlayerEntry[] {
  const idToName = parseUsersDat(usersText);
  const stats = parseStatDat(statsText);

  const entries: PlayerEntry[] = [];
  for (const s of stats) {
    const name = idToName.get(s.user);
    if (!name) continue;
    const kd = s.deaths > 0 ? s.kills / s.deaths : s.kills;
    const accuracy = s.shots > 0 ? (s.hits / s.shots) * 100 : 0;
    entries.push({
      rank: 0,
      id: s.user,
      name,
      kills: s.kills,
      deaths: s.deaths,
      headshots: s.headshots,
      bash: s.bash,
      timePlayed: s.timePlayed,
      longestDist: s.longestDist,
      shots: s.shots,
      hits: s.hits,
      dmg: s.dmg,
      suicides: s.suicides,
      kd: Number(kd.toFixed(4)),
      accuracy: Number(accuracy.toFixed(4)),
    });
  }
  return entries;
}

async function refresh(): Promise<PlayerEntry[]> {
  const { usersText, statsText } = await downloadFiles();
  const players = buildPlayers(usersText, statsText);
  cache = { fetchedAt: Date.now(), players };
  return players;
}

export async function getAllPlayers(): Promise<PlayerEntry[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.players;
  }
  if (inflight) {
    return inflight;
  }
  inflight = refresh()
    .catch((err) => {
      logger.error({ err }, "SFTP refresh failed");
      if (cache) {
        return cache.players;
      }
      throw err;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export type SortKey =
  | "kills"
  | "deaths"
  | "headshots"
  | "bash"
  | "timePlayed"
  | "longestDist"
  | "shots"
  | "hits"
  | "dmg"
  | "suicides"
  | "kd"
  | "accuracy"
  | "name";

export function sortPlayers(
  players: PlayerEntry[],
  sortBy: SortKey,
  sortDir: "asc" | "desc",
): PlayerEntry[] {
  const sign = sortDir === "asc" ? 1 : -1;
  const sorted = [...players].sort((a, b) => {
    if (sortBy === "name") {
      return sign * a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    const av = a[sortBy] as number;
    const bv = b[sortBy] as number;
    if (av === bv) {
      return a.name.localeCompare(b.name);
    }
    return sign * (av - bv);
  });
  return sorted;
}
