import fs from "fs";
import fetch from "node-fetch";

const UA = { "User-Agent": "Replayedle/1.0" };

async function pickReplayLeaderboard() {
  // Pull ranked leaderboards directly from BeatLeader
  const page = Math.floor(Math.random() * 50);

  const res = await fetch(
    `https://api.beatleader.com/leaderboards?ranked=true&page=${page}&count=50`,
    { headers: UA }
  );

  if (!res.ok) throw new Error("Failed to fetch BeatLeader leaderboards");

  const data = await res.json();

  const valid = data.data.filter(
    lb => lb.replayCount > 5 && lb.songHash
  );

  if (!valid.length) throw new Error("No replay leaderboards found");

  return valid[Math.floor(Math.random() * valid.length)];
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
    console.log("🔍 Searching for ranked BeatLeader replay...");

    const lb = await pickReplayLeaderboard();

    console.log(
      `✓ Found replayed leaderboard: ${lb.songName} (${lb.difficultyName})`
    );

    const map = await getBeatSaverMap(lb.songHash);

    if (!map) throw new Error("BeatSaver metadata missing");

    const scoreRes = await fetch(
      `https://api.beatleader.com/leaderboard/${lb.id}/scores?count=25`,
      { headers: UA }
    );

    const scores = await scoreRes.json();
    const score =
      scores.data[Math.floor(Math.random() * scores.data.length)];

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
