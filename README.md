# 🎮 Replayedle

Guess the Beat Saber level from watching actual BeatLeader replay gameplay! A daily puzzle game inspired by Wordle.

## Features

- 🎬 **Real Gameplay Replays**: Watch actual BeatLeader replays from top players
- 📅 **Daily Mode**: New level every day at midnight EST (updated via GitHub Actions)
- ♾️ **Infinite Mode**: Unlimited random ranked levels
- 📊 **Statistics**: Track your wins, streaks, and guess distribution
- 🌓 **Dark/Light Theme**: Toggle between themes
- 📱 **Mobile Friendly**: Responsive design
- 🎯 **Ranked Maps Only**: Only uses ranked Beat Saber maps

## How It Works

1. **GitHub Actions** runs daily at midnight EST
2. **generateDaily.js** fetches a random ranked map from BeatSaver
3. It finds a BeatLeader replay for that map (tries ExpertPlus, Expert, Hard)
4. Saves the replay scoreId to `docs/data.json`
5. The game loads the replay in an iframe from `https://replay.beatleader.xyz/?scoreId=XXXXX`
6. CSS overlay hides the song name
7. Time parameter controls how much of the replay is shown

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/replayedle.git
cd replayedle
npm install
```

### 2. Test Daily Generation (Optional)

```bash
npm run daily
```

This will:
- Fetch a random ranked map
- Find a BeatLeader replay
- Update `docs/data.json`

### 3. Deploy

Deploy the `docs/` folder to any static host:
- GitHub Pages (recommended)
- Netlify
- Vercel

**For GitHub Pages:**
1. Push to GitHub
2. Go to Settings → Pages
3. Set source to `main` branch, `/docs` folder
4. Your game will be live at `https://yourusername.github.io/replayedle`

### 4. Enable GitHub Actions

The `.github/workflows/daily.yml` file will automatically:
- Run every day at midnight EST
- Generate a new level
- Commit and push the updated `data.json`

Make sure GitHub Actions is enabled in your repository settings!

## How to Play

1. Watch a short replay clip (starts at 3 seconds)
2. Search for the level name (ranked maps only)
3. Wrong guess or skip = +2 seconds preview
4. 6 attempts to guess correctly!

## File Structure

```
replayedle/
├── docs/
│   ├── index.html          # Main game page
│   ├── main.js             # Game logic with BeatLeader integration
│   ├── style.css           # Styling
│   ├── anti-cheat.js       # Prevents console cheating
│   └── data.json           # Daily level data (auto-updated)
├── backend/
│   └── generateDaily.js    # Script to fetch maps with replays
├── .github/workflows/
│   └── daily.yml           # Automated daily updates
├── package.json
└── README.md
```

## Technical Details

### APIs Used

**BeatSaver API** - Ranked maps
```
https://api.beatsaver.com/search/text/{page}?ranked=true
```

**BeatLeader API** - Leaderboards and replays
```
https://api.beatleader.com/scores/{hash}/{difficulty}/1
```

**BeatLeader Replay Viewer** - Embedded replays
```
https://replay.beatleader.xyz/?scoreId={scoreId}&time={milliseconds}
```

### How Replays Work

The game embeds BeatLeader's web replay viewer in an iframe:
- `scoreId` parameter identifies the specific replay
- `time` parameter controls playback start time (in milliseconds)
- CSS overlay hides the song name that would otherwise be visible
- Each skip/wrong guess increases the `time` parameter by 2000ms

### Example Flow

```javascript
// Load daily level
const data = await fetch('data.json');
const scoreId = data.scoreId; // e.g., "16929896"

// Load replay with 3-second preview
const timeMs = 3 * 1000; // 3000ms
iframe.src = `https://replay.beatleader.xyz/?scoreId=${scoreId}&time=${timeMs}`;

// User skips - add 2 seconds
previewTime += 2; // Now 5 seconds
iframe.src = `https://replay.beatleader.xyz/?scoreId=${scoreId}&time=5000`;
```

## Customization

### Change Update Time

Edit `.github/workflows/daily.yml`:
```yaml
schedule:
  - cron: '0 5 * * *'  # 5 AM UTC = 12 AM EST
```

### Change Share URL

Edit `main.js`, find `shareResult()` function:
```javascript
text = `Replayedle ${dailyDate.split('T')[0]}\n${squares}\nhttps://YOUR-URL-HERE`;
```

### Adjust Song Name Blocker

The CSS overlay that hides the song name can be adjusted in `style.css`:
```css
.song-name-blocker {
  top: 8px;           /* Adjust vertical position */
  left: 50%;          /* Adjust horizontal position */
  width: 500px;       /* Adjust width */
  height: 70px;       /* Adjust height */
}
```

## Troubleshooting

### "No replay available"
- The backend script tries 20 maps before giving up
- Not all ranked maps have BeatLeader replays
- ExpertPlus has the most replays

### Replay not loading
- Check browser console for errors
- Verify `data.json` has a valid `scoreId`
- Test the replay URL directly: `https://replay.beatleader.xyz/?scoreId=YOUR_ID`

### Song name visible
- The BeatLeader UI may change over time
- Adjust `.song-name-blocker` CSS to match new layout
- Use browser devtools to inspect and fix positioning

## Credits

- Original concept: Wordle by Josh Wardle
- Forked from: Saberdle
- Beat Saber maps: [BeatSaver](https://beatsaver.com/)
- Leaderboard & Replays: [BeatLeader](https://beatleader.xyz/)

## License

MIT License - Feel free to fork and modify!

## Contributing

Contributions welcome! Please submit a Pull Request.

## Note

This game is not affiliated with Beat Games, Facebook Technologies, or BeatLeader. Beat Saber is a trademark of Beat Games.
