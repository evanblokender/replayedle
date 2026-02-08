import fs from "fs";
import fetch from "node-fetch";

const UA = {
  "User-Agent": "Mozilla/5.0 Replayedle/1.0",
  "Accept": "application/json"
};

const DATA_PATH = "./docs/data.json";

async function fetchJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* -------------------- BEATLEADER REPLAY -------------------- */
async function tryBeatLeaderReplay() {
  const page = Math.floor(Math.random() * 10);

  const json = await fetchJson(
    `https://api.beatleader.com/scores/replays?page=${page}&count=50`
  );

  if (!json.data?.length) throw new Error("No replay data");

  const ranked = json.data.filter(s => s.leaderboard?.ranked);
  const score = (ranked.length ? ranked : json.data)[
    Math.floor(Math.random() * (ranked.length || json.data.length))
  ];

  return score;
}

/* -------------------- BEATSAVER -------------------- */
async function getBeatSaverMap(hash) {
  return fetchJson(`https://api.beatsaver.com/maps/hash/${hash}`);
}

/* -------------------- MAIN -------------------- */
(async () => {
  try {
    console.log("🔍 Fetching BeatLeader replay…");

    let daily;

    try {
      const score = await tryBeatLeaderReplay();
      const lb = score.leaderboard;

      if (!lb?.songHash) throw new Error("Replay missing hash");

      const map = await getBeatSaverMap(lb.songHash);

      daily = {
        date: new Date().toISOString(),
        source: "BeatLeader",
        mapId: map.id,
        mapHash: lb.songHash,
        songName: lb.songName,
        songAuthor: lb.songAuthorName,
        mapper: map.metadata.levelAuthorName,
        difficulty: lb.difficultyName,
        leaderboardId: lb.id,
        scoreId: score.id,
        replayUrl: `https://replay.beatleader.xyz/?scoreId=${score.id}`
      };

      console.log("✓ New daily generated");

    } catch (err) {
      console.log("⚠ BeatLeader blocked — using cached daily");

      if (!fs.existsSync(DATA_PATH)) {
        throw new Error("No cached daily available");
      }

      daily = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
      daily.date = new Date().toISOString();
    }

    if (!fs.existsSync("./docs")) fs.mkdirSync("./docs");
    fs.writeFileSync(DATA_PATH, JSON.stringify(daily, null, 2));

    console.log("🎮 Daily ready");
    console.log(daily.replayUrl);

  } catch (err) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  }
})();
