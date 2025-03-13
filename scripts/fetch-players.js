import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.VITE_API_KEY;
const players = [];

const savePlayersToFile = () => {
  const outputPath = path.join(__dirname, '../public/players.json');
  fs.writeFileSync(outputPath, JSON.stringify(players, null, 2));
  console.log(`✅ Saved ${players.length} players to ${outputPath}`);
};

// Capture Ctrl+C (SIGINT) event to gracefully save before exit
process.on('SIGINT', () => {
  console.log('\n❗ Interrupted by user (Ctrl+C). Saving current data to file...');
  savePlayersToFile();
  process.exit();
});

async function fetchPlayers() {
  console.log("Using API Key:", API_KEY);
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const requests = Array.from({ length: 10 }, (_, i) =>
        axios.get(`https://api.api-tennis.com/tennis/?method=get_players&player_key=${page + i}&APIkey=${API_KEY}`)
      );

      const responses = await Promise.all(requests);

      let fetchedAny = false;

      responses.forEach((response, index) => {
        if (response.data && response.data.result && response.data.result.length) {
          players.push(...response.data.result);
          console.log(`Fetched player_key ${page + index}, total players: ${players.length}`);
          fetchedAny = true;
        }
      });

      if (!fetchedAny) {
        hasMore = false;
        console.log("No more players available from API.");
      } else {
        page += 10;
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      break;
    }
  }

  savePlayersToFile();
}

fetchPlayers();
