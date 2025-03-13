import { useEffect, useState } from "react";
import axios from "axios";
import { styled } from "@mui/styles";

// Convert Decimal Odds to American Odds
const convertDecimalToAmerican = (decimalOdd) => {
  if (decimalOdd === "N/A" || isNaN(decimalOdd)) return "N/A";
  const odd = parseFloat(decimalOdd);
  return odd >= 2.0 ? `+${Math.round((odd - 1) * 100)}` : `${Math.round(-100 / (odd - 1))}`;
};

// Styled Components
const Container = styled("div")({
  padding: "20px",
  fontFamily: "Arial, sans-serif",
  backgroundColor: "#f4f4f9",
  minHeight: "100vh",
  textAlign: "center",
});

const Title = styled("h1")({
  color: "#2c3e50",
  fontSize: "2.5rem",
  marginBottom: "20px",
});

const PlayerCell = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: "10px",
});

const PlayerImage = styled("img")({
  width: "30px",
  height: "30px",
  borderRadius: "50%",
});

function App() {
  const [matches, setMatches] = useState([]); // Stores match data (from WebSocket)
  const [previousOdds, setPreviousOdds] = useState({}); // Stores old odds for comparison
  const [flashingCells, setFlashingCells] = useState({}); // Manages flashing animation
  const [loading, setLoading] = useState(true);

  const apiKey = import.meta.env.VITE_API_KEY;
  const apiUrl = `https://api.api-tennis.com/tennis/?method=get_live_odds&APIkey=${apiKey}`;

  // Fetch odds from API (Only updates odds, not match details)
  const fetchOdds = () => {
    axios.get(apiUrl)
      .then(response => {
        console.log("API Odds Response:", response.data);
        const eventsObject = response.data.result || {};
        const events = Object.values(eventsObject); // Convert object to array

        // Create a mapping of odds based on event_key
        const newOdds = {};
        events.forEach(event => {
          newOdds[event.event_key] = {
            homeOdd: convertDecimalToAmerican(event.live_odds?.find(o => o.type === "Home")?.value || "N/A"),
            awayOdd: convertDecimalToAmerican(event.live_odds?.find(o => o.type === "Away")?.value || "N/A"),
          };
        });

        // Compare new odds with previous odds to detect changes
        const newFlashingCells = {};
        matches.forEach((match, index) => {
          if (previousOdds[match.event_key]) {
            if (previousOdds[match.event_key].homeOdd !== newOdds[match.event_key]?.homeOdd) {
              newFlashingCells[`${index}-home`] = true;
            }
            if (previousOdds[match.event_key].awayOdd !== newOdds[match.event_key]?.awayOdd) {
              newFlashingCells[`${index}-away`] = true;
            }
          }
        });

        setFlashingCells(newFlashingCells);
        setTimeout(() => setFlashingCells({}), 3000); // Remove flashing effect after 3s

        // Update matches by merging new odds
        setMatches(prevMatches => prevMatches.map(match => ({
          ...match,
          homeOdd: newOdds[match.event_key]?.homeOdd || "N/A",
          awayOdd: newOdds[match.event_key]?.awayOdd || "N/A",
        })));

        setPreviousOdds(newOdds);
      })
      .catch(error => {
        console.error("Error fetching odds:", error);
      });
  };

  // WebSocket Connection for match data
  useEffect(() => {
    console.log("Initializing WebSocket...");

    const socket = new WebSocket(`wss://wss.api-tennis.com/live?APIkey=${apiKey}&timezone=+03:00`);

    socket.onopen = () => {
      console.log("WebSocket Connection Opened!");
    };

    socket.onmessage = (e) => {
      console.log("Received WebSocket Message:");

      if (e.data) {
        try {
          const matchesData = JSON.parse(e.data);

          if (!matchesData || Object.keys(matchesData).length === 0) {
            console.log("WebSocket Data Empty");
            return;
          }

          console.log(matchesData);

          const formattedMatches = Object.values(matchesData).map(event => ({
            event_key: event.event_key, // Unique identifier for each match
            round: event.tournament_name,
            homePlayer: event.event_first_player,
            awayPlayer: event.event_second_player,
            homeLogo: event.event_first_player_logo,
            awayLogo: event.event_second_player_logo,
          }));

          setMatches(formattedMatches);
          setLoading(false);
          fetchOdds(); // Fetch odds immediately after getting match data

        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    socket.onclose = (event) => {
      console.warn("WebSocket Closed:", event);
    };

    return () => {
      console.log("Closing WebSocket...");
      socket.close();
    };
  }, []);

  // Poll API every 10s to keep odds updated
  useEffect(() => {
    const interval = setInterval(fetchOdds, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Container>
      <Title>Live Tennis Odds 🎾</Title>
      {loading ? (
        <p>Loading matches...</p>
      ) : matches.length === 0 ? (
        <p>No live odds available.</p>
      ) : (
        <table style={{borderCollapse: "collapse", backgroundColor: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0px 4px 15px rgba(0,0,0,0.15)" }}>
          <tbody>
            {matches.map((match, index) => (
              <tr key={match.event_key} style={{ backgroundColor: index % 2 === 0 ? "#ecf0f1" : "white" }}>
                <td>
                  <PlayerCell>
                    {match.round}
                  </PlayerCell>
                  <PlayerCell>
                    {match.homeLogo && <PlayerImage src={match.homeLogo} alt="Player 1 Logo" />} 
                    {match.homePlayer}
                  </PlayerCell>
                  <PlayerCell>
                    {match.awayLogo && <PlayerImage src={match.awayLogo} alt="Player 2 Logo" />} 
                    {match.awayPlayer}
                  </PlayerCell>
                </td>
                <td style={{ border: flashingCells[`${index}-home`] ? "3px solid yellow" : "none", transition: "border 0.3s ease-in-out" }}>
                  <PlayerCell>
                    {match.homeOdd}
                  </PlayerCell>
                  <PlayerCell>
                    {match.awayOdd}
                  </PlayerCell>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Container>
  );
}

export default App;
