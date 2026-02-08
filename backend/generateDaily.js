import fs from "fs";
import fetch from "node-fetch";

const UA = { "User-Agent": "Replayedle/1.0" };

async function findReplayLeaderboard() {
  console.log("🔍 Scanning BeatLeader leaderboards...");

  for (let page = 0; page < 10; page++) {
    const res = await fetch(
      `https://api.beatleader.com/leaderboards?page=${page}&count=100`,
      { headers: UA }
    );

    if (!res.ok) continue;

    const json = await res.json();
    if (!json.data?.length) continue;

    const candidates = json.data.filter(lb =>
      lb.ranked &&
      lb.replayCount > 3 &&
      lb.songHash &&
      lb.difficultyName
    );

    if (candidates.length) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  throw new Error("No replay leaderboards found after scanning pages");
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

    const lb = await findReplayLeaderboard();
    console.log(`✓ Found: ${lb.songName} (${lb.difficultyName})`);

    const map = await getBeatSaverMap(lb.songHash);
    if (!map) throw new Error("BeatSaver metadata missing");

    const scoreRes = await fetch(
      `https://api.beatleader.com/leaderboard/${lb.id}/scores?count=25`,
      { headers: UA }
    );

    const scoreData = await scoreRes.json();
    if (!scoreData.data?.length)
      throw new Error("No scores found for leaderboard");

    const score =
      scoreData.data[Math.floor(Math.random() * scoreData.data.length)];

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

    console.log("🎮 Daily level generated!");
    console.log(daily.replayUrl);
  } catch (err) {
    console.error("❌ Error generating daily level:", err);
    process.exit(1);
  }
})();
