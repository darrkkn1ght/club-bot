import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3010);
const SESSION_SECRET = process.env.SESSION_SECRET || "club-bot-secret-2026-v1";
const ALLOWED_USERNAMES = String(process.env.ALLOWED_USERNAMES || "aremocash01,milespete")
  .split(",")
  .map((s) => s.trim().replace(/^@/, "").toLowerCase())
  .filter(Boolean);
const ACCESS_KEY = String(process.env.ACCESS_KEY || "").trim();
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

function isUserAllowed(user) {
  if (!ALLOWED_USERNAMES.length) return true;
  const uname = String(user?.username || "").trim().replace(/^@/, "").toLowerCase();
  return Boolean(uname && ALLOWED_USERNAMES.includes(uname));
}

function isAccessKeyValid(provided) {
  if (!ACCESS_KEY) return true;
  const a = Buffer.from(String(provided || "").trim());
  const b = Buffer.from(ACCESS_KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sleepCancelable(ms, worker) {
  const end = Date.now() + ms;
  while (Date.now() < end && !worker.cancelled) {
    await sleep(Math.min(500, end - Date.now()));
  }
}

// =========================================================================
// VERIFIED CLUBS & ITEM CATALOG
// =========================================================================
const CLUBS = [
  {
    id: "clubEko",
    city: "Lagos",
    name: "Quilox (Club Eko)",
    emoji: "🍾",
    hours: { open: 22, close: 5 },
    items: [
      { id: "clubShutdown", label: "Shut Down the Club", emoji: "🔒", cost: 1_000_000_000, worldEvent: "venue:takeover", venueKind: "shutdown", isBigMoment: true },
      { id: "bigTable", label: "Book the Big Man VIP Table", emoji: "🎩", cost: 500_000_000, worldEvent: "venue:dorime" },
      { id: "bigRound", label: "Top-Shelf Round for the Whole Club", emoji: "🥂", cost: 100_000_000, worldEvent: "venue:round" },
      { id: "clubTakeover", label: "Take Over Quilox for the Night", emoji: "👑", cost: 10_000_000, worldEvent: "venue:takeover" },
      { id: "clubRound", label: "Buy the Whole Club a Round", emoji: "🥂", cost: 2_500_000, worldEvent: "venue:round" },
      { id: "champagneParade", label: "Ace of Spades Parade (10 bottles)", emoji: "🍾", cost: 1_000_000, worldEvent: "venue:parade" },
      { id: "vipTable", label: "Book a VIP Table", emoji: "🛋️", cost: 250_000, worldEvent: "venue:dorime" },
      { id: "goldBottle", label: "Order the Gold Bottle (Dorime!)", emoji: "✨", cost: 50_000, worldEvent: "venue:dorime" },
      { id: "bottleService", label: "Bottle Service (VIP)", emoji: "🍾", cost: 9_600, worldEvent: "venue:dorime" },
      { id: "hypeMan", label: "Pay the Hype Man", emoji: "🎤", cost: 5_000, worldEvent: "venue:hype" },
      { id: "djShoutout", label: "Pay the DJ for a Shout-out", emoji: "🎧", cost: 3_000, worldEvent: "venue:dj" }
    ]
  },
  {
    id: "golfClub",
    city: "Lagos",
    name: "Ikoyi Golf Club",
    emoji: "⛳",
    hours: null,
    items: [
      { id: "billionBottle", label: "Order the ₦1bn Diamond Bottle", emoji: "💎", cost: 1_000_000_000, worldEvent: "venue:dorime" },
      { id: "golfRound", label: "Buy the Members a Round", emoji: "🥂", cost: 100_000_000, worldEvent: "venue:round" },
      { id: "golfChampagne", label: "Vintage Champagne on the Terrace", emoji: "🍾", cost: 5_000_000, worldEvent: "venue:dorime" },
      { id: "playGolf", label: "Play 18 Holes", emoji: "⛳", cost: 2_000_000 },
      { id: "golfLesson", label: "Lesson with the Club Pro", emoji: "🏌️", cost: 500_000 },
      { id: "golfDrinks", label: "Single Malt at the Clubhouse", emoji: "🥃", cost: 250_000 }
    ]
  },
  {
    id: "boatCruise",
    city: "Lagos",
    name: "Lagos Boat Cruise",
    emoji: "🛥️",
    hours: null,
    items: [
      { id: "yachtCharter", label: "Charter the Whole Boat", emoji: "🛥️", cost: 25_000_000 },
      { id: "sunsetCruise", label: "Sunset Cruise", emoji: "🌅", cost: 150_000 },
      { id: "boatParty", label: "Party on the Deck", emoji: "🎉", cost: 50_000 },
      { id: "deckCocktail", label: "Cocktail on Deck", emoji: "🍹", cost: 15_000 }
    ]
  },
  {
    id: "ekoHotel",
    city: "Lagos",
    name: "Eko Hotel & Suites",
    emoji: "🏨",
    hours: null,
    items: [
      { id: "presidentialSuite", label: "The Presidential Suite", emoji: "👑", cost: 15_000_000 },
      { id: "hotelRoom", label: "Sleep in a Deluxe Room", emoji: "🛏️", cost: 250_000 },
      { id: "hotelSpa", label: "Spa Day & Massage", emoji: "💆", cost: 120_000 },
      { id: "polancoBrunch", label: "Brunch in the Lounge", emoji: "🥂", cost: 60_000 },
      { id: "hotelBuffet", label: "The Eko Hotels Buffet", emoji: "🍽️", cost: 45_000 }
    ]
  },
  {
    id: "phClub",
    city: "Port Harcourt",
    name: "Playhouse (PH Club)",
    emoji: "🔥",
    hours: { open: 22, close: 5 },
    items: [
      { id: "phShutDownClub", label: "Shut Down the Club", emoji: "🔒", cost: 1_000_000_000, worldEvent: "venue:takeover", venueKind: "shutdown", isBigMoment: true },
      { id: "phClubTakeover", label: "Take Over Playhouse for the Night", emoji: "👑", cost: 10_000_000, worldEvent: "venue:takeover" },
      { id: "phClubParade", label: "Ace of Spades Parade (10 bottles)", emoji: "🍾", cost: 1_000_000, worldEvent: "venue:parade" },
      { id: "phClubVipTable", label: "Book a VIP Table", emoji: "🛋️", cost: 250_000, worldEvent: "venue:dorime" },
      { id: "phClubGoldBottle", label: "Order the Gold Bottle (Dorime!)", emoji: "✨", cost: 50_000, worldEvent: "venue:dorime" },
      { id: "phClubBottle", label: "Bottle Service (VIP)", emoji: "🍾", cost: 9_600, worldEvent: "venue:dorime" }
    ]
  },
  {
    id: "abjClub",
    city: "Abuja",
    name: "Hustle & Bustle",
    emoji: "⚡",
    hours: null,
    items: [
      { id: "abjShutDownClub", label: "Shut Down the Club", emoji: "🔒", cost: 1_000_000_000, worldEvent: "venue:takeover", venueKind: "shutdown", isBigMoment: true },
      { id: "abjBigTable", label: "Book the Big Man VIP Table", emoji: "🎩", cost: 500_000_000, worldEvent: "venue:dorime" },
      { id: "abjClubTakeover", label: "Take Over Hustle & Bustle for the Night", emoji: "👑", cost: 10_000_000, worldEvent: "venue:takeover" },
      { id: "abjGoldBottle", label: "Order the Gold Bottle (Dorime!)", emoji: "✨", cost: 50_000, worldEvent: "venue:dorime" }
    ]
  },
  {
    id: "abjMoscow",
    city: "Abuja",
    name: "Moscow Underground",
    emoji: "🧊",
    hours: null,
    items: [
      { id: "abjMoscowIce", label: "Order the Ice Tower (Dorime!)", emoji: "🧊", cost: 150_000, worldEvent: "venue:dorime" }
    ]
  }
];

const CLUB_MAP = Object.fromEntries(CLUBS.map((c) => [c.id, c]));

// =========================================================================
// SESSION & JOB STATE (Stateless HMAC + In-Memory Job Workers)
// =========================================================================
const sessions = new Map(); // token -> { cookie, user, jobs: [] }
const activeWorkers = new Map(); // jobId -> { paused, cancelled }

function signToken(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.cookie || !data?.user || (data.exp && data.exp < Date.now())) return null;
    return data;
  } catch {
    return null;
  }
}

function getSession(req) {
  const token = String(req.headers["x-bot-token"] || "").trim();
  if (!token) return null;
  if (sessions.has(token)) return { token, ...sessions.get(token) };
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const sess = { cookie: decoded.cookie, user: decoded.user, jobs: [] };
  sessions.set(token, sess);
  return { token, ...sess };
}

function requireAuth(req, res, next) {
  const sess = getSession(req);
  if (!sess) return res.status(401).json({ error: "Please log in first." });
  if (!isUserAllowed(sess.user)) {
    return res.status(403).json({ error: "This bot is licensed to a different LagosLife account." });
  }
  req.sess = sess;
  next();
}

function mergeSetCookies(baseCookie, setCookieHeaders) {
  const jar = {};
  for (const part of String(baseCookie || "").split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) jar[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  for (const sc of setCookieHeaders || []) {
    const kv = sc.split(";")[0];
    const eq = kv.indexOf("=");
    if (eq > 0) jar[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim();
  }
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function fetchLagosLife(cookie, urlPath, opts = {}) {
  const res = await fetch(`https://lagoslife.app${urlPath}`, {
    ...opts,
    headers: {
      cookie: cookie || "",
      accept: "application/json",
      "user-agent": USER_AGENT,
      origin: "https://lagoslife.app",
      referer: "https://lagoslife.app/",
      ...(opts.body ? { "content-type": "application/json" } : {}),
      ...(opts.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data, headers: res.headers };
}

function getGameHour(game) {
  const mins = Number(game?.time || 0);
  return Math.floor(((mins % 1440) + 1440) % 1440 / 60);
}

function formatGameTime(game) {
  const mins = Math.floor(((Number(game?.time || 0) % 1440) + 1440) % 1440);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function isClubOpen(club, game) {
  if (!club?.hours) return true;
  const h = getGameHour(game);
  if (club.hours.open > club.hours.close) {
    return h >= club.hours.open || h < club.hours.close;
  }
  return h >= club.hours.open && h < club.hours.close;
}

// =========================================================================
// AUTH ROUTES
// =========================================================================
app.get("/api/auth/config", (req, res) => {
  res.json({
    requireAccessKey: Boolean(ACCESS_KEY),
    licensedOnly: ALLOWED_USERNAMES.length > 0
  });
});

app.post("/api/auth/login", async (req, res) => {
  if (!isAccessKeyValid(req.body?.accessKey)) {
    return res.status(403).json({ error: "Invalid license / access key." });
  }
  const username = String(req.body?.username || "").trim().replace(/^@/, "");
  const password = String(req.body?.password || "");
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  try {
    const loginRes = await fetch("https://lagoslife.app/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        origin: "https://lagoslife.app",
        referer: "https://lagoslife.app/",
        "user-agent": USER_AGENT
      },
      body: JSON.stringify({ username, password })
    });
    const d = await loginRes.json().catch(() => ({}));
    if (d.code === "two_factor") {
      return res.json({
        twoFactor: true,
        challenge: d.challenge,
        method: d.method || "email",
        to: d.to || ""
      });
    }
    if (!loginRes.ok) {
      return res.status(loginRes.status).json({ error: d.error || "Login failed." });
    }
    const setCookies = typeof loginRes.headers.getSetCookie === "function" ? loginRes.headers.getSetCookie() : [];
    const cookie = mergeSetCookies("", setCookies);
    if (!cookie) return res.status(401).json({ error: "No session cookie received." });

    const me = await fetchLagosLife(cookie, "/api/auth/me");
    const user = me.data?.user || { username };
    if (!isUserAllowed(user)) {
      return res.status(403).json({
        error: `This bot is licensed to a specific LagosLife account. @${user.username || username} is not authorized.`
      });
    }
    const token = signToken({ cookie, user, exp: Date.now() + 7 * 24 * 3600 * 1000 });
    sessions.set(token, { cookie, user, jobs: [] });
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/2fa", async (req, res) => {
  if (!isAccessKeyValid(req.body?.accessKey)) {
    return res.status(403).json({ error: "Invalid license / access key." });
  }
  const challenge = String(req.body?.challenge || "").trim();
  const code = String(req.body?.code || "").trim();
  if (!challenge || !code) return res.status(400).json({ error: "Challenge and 2FA code required." });
  try {
    const r = await fetch("https://lagoslife.app/api/auth/2fa", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        origin: "https://lagoslife.app",
        referer: "https://lagoslife.app/",
        "user-agent": USER_AGENT
      },
      body: JSON.stringify({ action: "login", challenge, code })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) return res.status(r.status || 400).json({ error: d.error || "Invalid 2FA code." });
    const setCookies = typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie() : [];
    const cookie = mergeSetCookies("", setCookies);
    const me = await fetchLagosLife(cookie, "/api/auth/me");
    const user = me.data?.user || { username: "player" };
    if (!isUserAllowed(user)) {
      return res.status(403).json({
        error: `This bot is licensed to a specific LagosLife account. @${user.username || "this account"} is not authorized.`
      });
    }
    const token = signToken({ cookie, user, exp: Date.now() + 7 * 24 * 3600 * 1000 });
    sessions.set(token, { cookie, user, jobs: [] });
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/cookie", async (req, res) => {
  if (!isAccessKeyValid(req.body?.accessKey)) {
    return res.status(403).json({ error: "Invalid license / access key." });
  }
  const cookie = String(req.body?.cookie || "").trim();
  if (!cookie) return res.status(400).json({ error: "Session cookie is required." });
  try {
    const me = await fetchLagosLife(cookie, "/api/auth/me");
    if (!me.ok || !me.data?.user) {
      return res.status(401).json({ error: "Invalid or expired LagosLife session cookie." });
    }
    const user = me.data.user;
    if (!isUserAllowed(user)) {
      return res.status(403).json({
        error: `This bot is licensed to a specific LagosLife account. @${user.username} is not authorized.`
      });
    }
    const token = signToken({ cookie, user, exp: Date.now() + 7 * 24 * 3600 * 1000 });
    sessions.set(token, { cookie, user, jobs: [] });
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const token = String(req.headers["x-bot-token"] || "").trim();
  if (token) sessions.delete(token);
  res.json({ success: true });
});

// =========================================================================
// CLUBS & SPENDER ROUTES
// =========================================================================
app.get("/api/clubs", (req, res) => {
  res.json({ clubs: CLUBS });
});

app.get("/api/status", requireAuth, async (req, res) => {
  try {
    const saveRes = await fetchLagosLife(req.sess.cookie, "/api/save");
    if (saveRes.status === 401) {
      return res.status(401).json({ error: "LagosLife session expired. Please sign in again." });
    }
    const game = saveRes.data?.game || {};
    const gameTime = formatGameTime(game);
    const clubOpenMap = {};
    for (const c of CLUBS) clubOpenMap[c.id] = isClubOpen(c, game);

    res.json({
      user: req.sess.user,
      balance: Number(game.money || 0),
      location: game.location || "",
      gameTime,
      clubOpenMap,
      jobs: req.sess.jobs.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/spend/start", requireAuth, async (req, res) => {
  const clubId = String(req.body?.clubId || "").trim();
  const itemId = String(req.body?.itemId || "").trim();
  const quantity = Math.min(500, Math.max(1, Math.floor(Number(req.body?.quantity) || 1)));
  const delayMs = Math.min(10000, Math.max(400, Math.floor(Number(req.body?.delayMs) || 1000)));
  const autoWait = Boolean(req.body?.autoWait);

  const club = CLUB_MAP[clubId];
  if (!club) return res.status(400).json({ error: "Invalid club selected." });
  const item = club.items.find((i) => i.id === itemId);
  if (!item) return res.status(400).json({ error: "Invalid item selected for this club." });

  const saveRes = await fetchLagosLife(req.sess.cookie, "/api/save");
  if (!saveRes.ok || !saveRes.data?.game) {
    return res.status(401).json({ error: "Could not load your LagosLife save. Re-login and try again." });
  }
  const game = saveRes.data.game;
  const totalCost = item.cost * quantity;
  if (Number(game.money || 0) < item.cost) {
    return res.status(400).json({ error: `Not enough cash for even 1x ${item.label}.` });
  }

  const openNow = isClubOpen(club, game);
  if (!openNow && !autoWait) {
    return res.status(400).json({
      error: `${club.name} is currently closed (in-game time: ${formatGameTime(game)}, opens at ${club.hours.open % 12 || 12} PM). Enable "Auto-wait until open" to queue it.`
    });
  }

  const jobId = "club_" + crypto.randomBytes(5).toString("hex");
  const job = {
    id: jobId,
    clubId: club.id,
    clubName: club.name,
    itemId: item.id,
    itemLabel: item.label,
    unitCost: item.cost,
    quantity,
    bought: 0,
    spent: 0,
    status: openNow ? "RUNNING" : "WAITING_OPEN",
    logs: [
      openNow
        ? `Started ${quantity}x ${item.label} at ${club.name}`
        : `Waiting for ${club.name} to open (currently ${formatGameTime(game)})...`
    ],
    createdAt: Date.now()
  };

  req.sess.jobs.unshift(job);
  if (req.sess.jobs.length > 15) req.sess.jobs.length = 15;
  const worker = { paused: false, cancelled: false };
  activeWorkers.set(jobId, worker);

  (async () => {
    try {
      while (!worker.cancelled && job.bought < quantity) {
        while (worker.paused && !worker.cancelled) await sleep(300);
        if (worker.cancelled) break;

        const latest = await fetchLagosLife(req.sess.cookie, "/api/save");
        if (!latest.ok || !latest.data?.game) {
          job.logs.push("Session expired or failed to load save.");
          job.status = "FAILED";
          break;
        }
        const g = latest.data.game;

        if (!isClubOpen(club, g)) {
          if (!autoWait) {
            job.logs.push(`${club.name} closed (${formatGameTime(g)}). Stopping.`);
            break;
          }
          job.status = "WAITING_OPEN";
          await sleep(10000);
          continue;
        }

        job.status = "RUNNING";
        if (Number(g.money || 0) < item.cost) {
          job.logs.push(`Insufficient funds remaining (₦${Number(g.money || 0).toLocaleString("en-NG")}).`);
          break;
        }

        // Record venue spend on leaderboard FIRST so 429 cooldowns never drop buys
        const venueKind = item.venueKind || (item.worldEvent?.startsWith("venue:") ? item.worldEvent.slice(6) : "");
        if (venueKind && ["shutdown", "takeover", "dorime", "parade", "round"].includes(venueKind)) {
          const venueId = item.isBigMoment ? crypto.randomBytes(16).toString("hex") : undefined;
          const venueBody = venueId ? { kind: venueKind, id: venueId } : { kind: venueKind };
          const venueRes = await fetchLagosLife(req.sess.cookie, "/api/venue", {
            method: "POST",
            body: JSON.stringify(venueBody)
          }).catch((e) => ({ ok: false, status: 0, data: { error: e.message } }));

          if (venueRes.status === 429) {
            const waitMs = Math.min(65000, Math.max(4000, Number(venueRes.data?.retryIn) || 6000));
            const msg = `Venue cooldown (429): waiting ${Math.ceil(waitMs / 1000)}s before retrying...`;
            if (job.logs[job.logs.length - 1] !== msg) job.logs.push(msg);
            if (job.logs.length > 40) job.logs = job.logs.slice(-40);
            await sleepCancelable(waitMs, worker);
            continue;
          }

          if (!venueRes.ok) {
            job.logs.push(`Venue (${venueRes.status}): ${venueRes.data?.error || "failed"}`);
            if (venueRes.status === 401) {
              job.status = "FAILED";
              break;
            }
            if (item.isBigMoment) {
              await sleepCancelable(3000, worker);
              continue;
            }
          }
        }

        // Apply purchase to save state (retry on 409 conflict without re-charging venue)
        let saved = false;
        let saveData = latest.data;
        for (let attempt = 0; attempt < 4 && !worker.cancelled; attempt++) {
          const curGame = saveData.game;
          curGame.location = club.id;
          curGame.money = Number(curGame.money || 0) - item.cost;
          curGame.stats = curGame.stats || {};
          curGame.stats.actionsDone = curGame.stats.actionsDone || {};
          curGame.stats.actionsDone[item.id] = Number(curGame.stats.actionsDone[item.id] || 0) + 1;

          const owner = curGame.owner || req.sess.user?.username;
          const saveOut = await fetchLagosLife(req.sess.cookie, "/api/save", {
            method: "PUT",
            body: JSON.stringify({
              game: { ...curGame, owner, outbox: curGame.outbox || { notices: [], fx: [] } },
              owner,
              base: saveData.updatedAt
            })
          });
          if (saveOut.ok) {
            saved = true;
            break;
          }
          if (saveOut.status === 409) {
            await sleepCancelable(500, worker);
            const refreshed = await fetchLagosLife(req.sess.cookie, "/api/save");
            if (refreshed.ok && refreshed.data?.game) {
              saveData = refreshed.data;
              continue;
            }
          }
          job.logs.push(`Save error (${saveOut.status}): ${saveOut.data?.error || "retrying..."}`);
          break;
        }
        if (!saved) {
          await sleepCancelable(2000, worker);
          continue;
        }

        // Broadcast live room event if applicable
        if (item.worldEvent) {
          await fetchLagosLife(req.sess.cookie, "/api/world", {
            method: "POST",
            body: JSON.stringify({ location: club.id, event: item.worldEvent })
          }).catch(() => {});
        }

        job.bought += 1;
        job.spent += item.cost;
        if (job.bought === 1 || job.bought % 5 === 0 || job.bought === quantity) {
          job.logs.push(`#${job.bought}/${quantity} ${item.emoji} ${item.label} (₦${job.spent.toLocaleString("en-NG")} spent)`);
        }
        if (job.logs.length > 40) job.logs = job.logs.slice(-40);

        await sleep(delayMs);
      }

      if (worker.cancelled) {
        job.status = "CANCELLED";
        job.logs.push("Stopped by user.");
      } else if (job.status !== "FAILED") {
        job.status = "COMPLETED";
        job.logs.push(`Finished! Bought ${job.bought}x (₦${job.spent.toLocaleString("en-NG")}).`);
      }
    } catch (err) {
      job.status = "FAILED";
      job.logs.push(`Error: ${err.message}`);
    } finally {
      activeWorkers.delete(jobId);
    }
  })();

  res.json({ success: true, job, totalCost });
});

app.post("/api/spend/control", requireAuth, (req, res) => {
  const jobId = String(req.body?.jobId || "");
  const action = String(req.body?.action || "");
  const w = activeWorkers.get(jobId);
  const job = req.sess.jobs.find((j) => j.id === jobId);
  if (!w || !job) return res.status(404).json({ error: "Active job not found." });

  if (action === "pause") {
    w.paused = true;
    job.status = "PAUSED";
  } else if (action === "resume") {
    w.paused = false;
    job.status = "RUNNING";
  } else if (action === "stop") {
    w.cancelled = true;
    job.status = "CANCELLED";
  }
  res.json({ success: true, job });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`LagosLife Club Bot running on http://localhost:${PORT}`);
});
