import fs from "fs";
import fetch from "node-fetch";

const UA = { "User-Agent": "Replayedle/1.0" };

async function getRandomReplayScore() {
  const page = Math.floor(Math.random() * 50);

  const res = await fetch(
    `https://api.beatleader.com/scores/replays?page=${page}&count=50`,
    { headers: UA }
  );

  if (!res.ok) throw new Error("Failed to fetch replay scores");

  const json = await res.json();
  if (!json.data?.length) throw new Error("No replay scores returned");

  // Prefer ranked scores if possible
  const ranked = json.data.filter(s => s.leaderboard?.ranked);
  const pool = ranked.length ? ranked : json.data;

  return pool[Math.floor(Math.random() * pool.length)];
}

async function getBeatSaverMap(hash) {
  const res = await fetch(
    `https://api.beatsaver.com/maps/hash/${hash}`,
    { headers: UA }
  );
  if (!res.ok) return null;
  return res.json();
}

(async () => {
  try {
    console.log("🔍 Fetching BeatLeader replay score...");

    const score = await getRandomReplayScore();
    const lb = score.leaderboard;

    if (!lb?.songHash) throw new Error("Replay missing song hash");

    const map = await getBeatSaverMap(lb.songHash);
    if (!map) throw new Error("BeatSaver metadata missing");

    const daily = {
      date: new Date().toISOString(),
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

    if (!fs.existsSync("./docs")) fs.mkdirSync("./docs");
    fs.writeFileSync("./docs/data.json", JSON.stringify(daily, null, 2));

    console.log("🎮 Daily level generated successfully!");
    console.log(daily.replayUrl);
  } catch (err) {
    console.error("❌ Error generating daily level:", err);
    process.exit(1);
  }
})();
