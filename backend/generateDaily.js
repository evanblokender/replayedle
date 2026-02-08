import fs from "fs";
import fetch from "node-fetch";

async function pickRankedMapWithReplay() {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const page = Math.floor(Math.random() * 50);
      const res = await fetch(
        `https://api.beatsaver.com/search/text/${page}?ranked=true`
      );
      const data = await res.json();
      
      if (!data.docs || data.docs.length === 0) continue;
      
      const map = data.docs[Math.floor(Math.random() * data.docs.length)];
      const hash = map.versions[0].hash;
      
      console.log(`Trying: ${map.metadata.songName} (${hash})`);
      
      const difficulties = ["ExpertPlus", "Expert", "Hard"];
      
      for (const diff of difficulties) {
        try {
          const blRes = await fetch(
            `https://api.beatleader.com/scores/${hash}/${diff}/1`,
            { headers: { 'User-Agent': 'Replayedle/1.0' } }
          );
          
          if (blRes.ok) {
            const blData = await blRes.json();
            
            if (blData.data && blData.data.length >= 5) {
              const topScores = blData.data.slice(0, Math.min(20, blData.data.length));
              const randomScore = topScores[Math.floor(Math.random() * topScores.length)];
              
              console.log(`✓ Found ${blData.data.length} replays for ${diff}`);
              
              return {
                map: map,
                hash: hash,
                scoreId: randomScore.id,
                difficulty: diff
              };
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log(`✗ No replays found`);
    } catch (e) {
      console.error(`Error on attempt ${attempt}:`, e.message);
    }
  }
  
  throw new Error("Could not find a valid map with replays after 20 attempts");
}

(async () => {
  try {
    console.log("🔍 Searching for ranked map with replays...");
    
    const { map, hash, scoreId, difficulty } = await pickRankedMapWithReplay();
    
    const daily = {
      date: new Date().toISOString(),
      mapId: map.id,
      mapHash: hash,
      songName: map.metadata.songName,
      songAuthor: map.metadata.songAuthorName,
      mapper: map.metadata.levelAuthorName,
      difficulty: difficulty,
      scoreId: scoreId,
      replayUrl: `https://replay.beatleader.xyz/?scoreId=${scoreId}`
    };
    
    if (!fs.existsSync("./docs")) fs.mkdirSync("./docs");
    fs.writeFileSync("./docs/data.json", JSON.stringify(daily, null, 2));
    
    console.log(`\n🎮 Daily level generated!`);
    console.log(`   Song: ${daily.songName}`);
    console.log(`   Difficulty: ${difficulty}`);
    console.log(`   Score ID: ${scoreId}`);
    console.log(`   Replay: ${daily.replayUrl}`);
  } catch (err) {
    console.error("❌ Error generating daily level:", err);
    process.exit(1);
  }
})();
