import fs from "fs";
import fetch from "node-fetch";

async function pickRankedMapWithReplay() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const page = Math.floor(Math.random() * 80);

      const res = await fetch(
        `https://api.beatsaver.com/search/text/${page}?ranked=true`
      );
      const data = await res.json();

      if (!data.docs?.length) continue;

      const map = data.docs[Math.floor(Math.random() * data.docs.length)];
      const hash = map.versions[0].hash;

      console.log(`Trying: ${map.metadata.songName} (${hash})`);

      // 🔥 NEW: ask BeatLeader for leaderboards
      const mapRes = await fetch(
        `https://api.beatleader.com/maps/hash/${hash}`,
        { headers: { "User-Agent": "Replayedle/1.0" } }
      );

      if (!mapRes.ok) {
        console.log("✗ No BeatLeader data");
        continue;
      }

      const mapData = await mapRes.json();
      const leaderboards = mapData.leaderboards || [];

      // Only leaderboards that actually HAVE replays
      const validBoards = leaderboards.filter(
        lb => lb.replayCount && lb.replayCount > 3
      );

      if (!validBoards.length) {
        console.log("✗ No replays found");
        continue;
      }

      const board = validBoards[Math.floor(Math.random() * validBoards.length)];

      // Get scores from that leaderboard
      const scoresRes = await fetch(
        `https://api.beatleader.com/leaderboard/${board.id}/scores?count=25`,
        { headers: { "User-Agent": "Replayedle/1.0" } }
      );

      if (!scoresRes.ok) continue;

      const scoresData = await scoresRes.json();
      if (!scoresData.data?.length) continue;

      const score =
        scoresData.data[Math.floor(Math.random() * scoresData.data.length)];

      console.log(`✓ Found replay on ${board.difficultyName}`);

      return {
        map,
        hash,
        leaderboardId: board.id,
        difficulty: board.difficultyName,
        scoreId: score.id
      };
    } catch (e) {
      console.error("Attempt error:", e.message);
    }
  }

  throw new Error("Could not find a valid map with replays after 40 attempts");
}

(async () => {
  try {
    console.log("🔍 Searching for ranked map with replays...");

    const { map, hash, scoreId, difficulty } =
      await pickRankedMapWithReplay();

    const daily = {
      date: new Date().toISOString(),
      mapId: map.id,
      mapHash: hash,
      songName: map.metadata.songName,
      songAuthor: map.metadata.songAuthorName,
      mapper: map.metadata.levelAuthorName,
      difficulty,
      scoreId,
      replayUrl: `https://replay.beatleader.xyz/?scoreId=${scoreId}`
    };

    if (!fs.existsSync("./docs")) fs.mkdirSync("./docs");
    fs.writeFileSync("./docs/data.json", JSON.stringify(daily, null, 2));

    console.log("🎮 Daily level generated!");
    console.log(`Song: ${daily.songName}`);
    console.log(`Replay: ${daily.replayUrl}`);
  } catch (err) {
    console.error("❌ Error generating daily level:", err);
    process.exit(1);
  }
})();
