import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const apiKey = import.meta.env.VITE_API_KEY;
  const apiUrl = "https://zylalabs.com/api/961/live+tennis+api/786/fetch+live+tennis+matches";
  const wsUrl = "wss://echo.websocket.org"; // Replace with the actual WebSocket URL

  useEffect(() => {
    const fetchOdds = () => {
      axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      .then(response => {
        console.log("API Response:", response.data.matches);
        const liveMatches = response.data.matches.filter(match => match["Live Away Odd"] && match["Live Home Odd"]);
        setMatches(liveMatches);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching odds:", error);
        setLoading(false);
      });
    };

    // Fetch initial odds
    fetchOdds();

    // Setup WebSocket connection
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket Connected");
    };

    socket.onmessage = (event) => {
      const newOdds = JSON.parse(event.data);
      console.log("WebSocket Update:", newOdds);
      setMatches(newOdds); // Update matches live from WebSocket
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected");
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", backgroundColor: "#f4f4f9", minHeight: "100vh", textAlign: "center" }}>
      <h1 style={{ color: "#2c3e50", fontSize: "2.5rem", marginBottom: "20px" }}>Live Tennis Odds 🎾</h1>
      {loading ? (
        <p style={{ fontSize: "1.5rem", color: "#34495e" }}>Loading matches...</p>
      ) : matches.length === 0 ? (
        <p style={{ fontSize: "1.5rem", color: "#e74c3c" }}>No live odds available.</p>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <table style={{ width: "90%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0px 4px 15px rgba(0,0,0,0.15)" }}>
            <thead>
              <tr style={{ backgroundColor: "#2c3e50", color: "white", fontSize: "1.3rem" }}>
                <th style={{ padding: "20px" }}>Match</th>
                <th style={{ padding: "20px" }}>Player 1</th>
                <th style={{ padding: "20px" }}>Player 2</th>
                <th style={{ padding: "20px" }}>Live Odds (Player 1)</th>
                <th style={{ padding: "20px" }}>Live Odds (Player 2)</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#ecf0f1" : "white", fontSize: "1.2rem" }}>
                  <td style={{ padding: "20px", fontWeight: "bold", color: "#34495e" }}>{match["Round"]}</td>
                  <td style={{ padding: "20px", fontWeight: "bold", color: "#2ecc71" }}>{match["Home Player"]}</td>
                  <td style={{ padding: "20px", fontWeight: "bold", color: "#e67e22" }}>{match["Away Player"]}</td>
                  <td style={{ padding: "20px", fontWeight: "bold", color: "#3498db" }}>{match["Live Home Odd"] > 0 ? `+${match["Live Home Odd"]}` : match["Live Home Odd"]}</td>
                  <td style={{ padding: "20px", fontWeight: "bold", color: "#e74c3c" }}>{match["Live Away Odd"] > 0 ? `+${match["Live Away Odd"]}` : match["Live Away Odd"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
