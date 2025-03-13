import axios from "axios";

export const handler = async () => {
  try {
    const apiKey = process.env.VITE_API_KEY; // Keep this secret in Netlify's environment variables
    const apiUrl = `https://api.api-tennis.com/tennis/?method=get_live_odds&APIkey=${apiKey}`;
    console.log(apiKey)
    const response = await axios.get(apiUrl);
    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error fetching odds:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch odds" }),
    };
  }
};
