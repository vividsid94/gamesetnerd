import axios from "axios";

export const handler = async (event) => {
  const playerKey = event.queryStringParameters.player_key;

  if (!playerKey) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing player_key parameter" }),
    };
  }

  try {
    const apiKey = process.env.VITE_API_KEY;
    const apiUrl = `https://api.api-tennis.com/tennis/?method=get_players&player_key=${playerKey}&APIkey=${apiKey}`;
    const response = await axios.get(apiUrl);

    if (response.data && response.data.result && response.data.result.length > 0) {
      const player = response.data.result[0];

      return {
        statusCode: 200,
        body: JSON.stringify({
            player_name: player.player_full_name || player.player_name,
        }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Player not found" }),
      };
    }
  } catch (error) {
    console.error("Error fetching player details:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch player details" }),
    };
  }
};
