import axios from "axios";

export const handler = async () => {
  try {
    const apiKey = process.env.VITE_API_KEY; // Keep this secret in Netlify environment variables
    const apiUrl = `https://api.api-tennis.com/tennis/?method=get_livescore&APIkey=${apiKey}`;
    
    const response = await axios.get(apiUrl);

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error fetching live scores:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch live scores" }),
    };
  }
};
