import fs from "fs";
import fetch from "node-fetch";

const UA = {
  "User-Agent": "Mozilla/5.0 Replayedle/1.0",
  "Accept": "application/json"
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* -------------------- BEATLEADER (BEST CASE) -------------------- */
async function tryBeatLeader() {
  const page = Math.floor(Math.random() * 20);
  const data = await fetchJson(
    `https://api.beatleader.com/scores/replays?page=${page}&count=50`
  );

  const ranked = data.data?.filter(s => s.leaderboard?.ranked);
  const pool = ranked?.length ? ranked : data.data;

  if (!pool?.length) throw new Error("No BL replay scores");

  const score = pool[Math.floor(Math.random() * pool.length)];
  return {
    source: "BeatLeader",
    scoreId: score.id,
    leaderboard: score.leaderboard
  };
}

/* -------------------- SCORESABER FALLBACK -------------------- */
async function tryScoreSaber() {
  const page = Math.floor(Math.random() * 20);
  const data = await fetchJson(
    `https://scoresaber.com/api/player/76561197960287930/scores?limit=100&page=${page}`
  );

  if (!data.playerScores?.length)
    throw new Error("No SS scores");

  const withReplay = data.playerScores.filter(
    s => s.score?.hasReplay && s.leaderboard?.ranked
  );

  if (!withReplay.length)
    throw new Error("No SS replay scores");

  const pick =
    withReplay[Math.floor(Math.random() * withReplay.length)];

  return {
    source: "ScoreSaber",
    scoreId: pick.score.id,
    leaderboard: {
      id: pick.leaderboard.id,
      songHash: pick.leaderboard.songHash,
      songName: pick.leaderboard.songName,
      songAuthorName: pick.leaderboard.songAuthorName,
      difficultyName: pick.leaderboard.difficulty.difficultyRaw
    }
  };
}

/* -------------------- BEATSAVER -------------------- */
async function getBeatSaverMap(hash) {
  return fetchJson(`https://api.beatsaver.com/maps/hash/${hash}`);
}

/* -------------------- MAIN -------------------- */
(async () => {
  try {
    console.log("🔍 Fetching replay (BeatLeader → ScoreSaber fallback)…");

    let replay;
    try {
      replay = await tryBeatLeader();
      console.log("✓ BeatLeader replay selected");
    } catch {
      console.log("⚠ BeatLeader blocked — falling back to ScoreSaber");
      replay = await tryScoreSaber();
      console.log("✓ ScoreSaber replay selected");
    }

    const lb = replay.leaderboard;
    if (!lb?.songHash) throw new Error("Missing song hash");

    const map = await getBeatSaverMap(lb.songHash);

    const daily = {
      date: new Date().toISOString(),
      source: replay.source,
      mapId: map.id,
      mapHash: lb.songHash,
      songName: lb.songName,
      songAuthor: lb.songAuthorName,
      mapper: map.metadata.levelAuthorName,
      difficulty: lb.difficultyName,
      leaderboardId: lb.id,
      scoreId: replay.scoreId,
      replayUrl:
        replay.source === "BeatLeader"
          ? `https://replay.beatleader.xyz/?scoreId=${replay.scoreId}`
          : `https://scoresaber.com/leaderboard/${lb.id}`
    };

    if (!fs.existsSync("./docs")) fs.mkdirSync("./docs");
    fs.writeFileSync("./docs/data.json", JSON.stringify(daily, null, 2));

    console.log("🎮 Daily level generated!");
    console.log(daily.replayUrl);
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  }
})();
