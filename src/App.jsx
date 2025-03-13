import { useEffect, useState } from "react";
import axios from "axios";
import { styled } from "@mui/styles";

const convertDecimalToAmerican = (decimalOdd) => {
  if (decimalOdd === "N/A" || isNaN(decimalOdd)) return "N/A";
  const odd = parseFloat(decimalOdd);
  if (odd >= 2.0) {
    return `+${Math.round((odd - 1) * 100)}`;
  } else {
    return `${Math.round(-100 / (odd - 1))}`;
  }
};

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
  const [matches, setMatches] = useState([]);
  const [previousMatches, setPreviousMatches] = useState([]);
  const [flashingCells, setFlashingCells] = useState({});
  const [loading, setLoading] = useState(true);
  const apiKey = import.meta.env.VITE_API_KEY;
  const apiUrl = `https://api.api-tennis.com/tennis/?method=get_live_odds&APIkey=${apiKey}`;

  useEffect(() => {
    const fetchOdds = () => {
      axios.get(apiUrl)
        .then(response => {
          console.log("API Response:", response.data);
          const events = response.data.result || {};
          const formattedMatches = Object.values(events).map(event => {
            const odds = event.live_odds.filter(odd => odd.odd_name === "To Win");
            return {
              round: event.event_type_type,
              homePlayer: event.first_player_key,
              awayPlayer: event.second_player_key,
              homeLogo: event.event_first_player_logo,
              awayLogo: event.event_second_player_logo,
              homeOdd: convertDecimalToAmerican(odds.find(o => o.type === "Home")?.value || "N/A"),
              awayOdd: convertDecimalToAmerican(odds.find(o => o.type === "Away")?.value || "N/A"),
            };
          });

          setPreviousMatches(prevMatches => {
            const newFlashingCells = {};
            formattedMatches.forEach((match, index) => {
              const prevMatch = prevMatches[index];
              if (prevMatch) {
                if (prevMatch.homeOdd !== match.homeOdd) newFlashingCells[`${index}-home`] = true;
                if (prevMatch.awayOdd !== match.awayOdd) newFlashingCells[`${index}-away`] = true;
              }
            });

            setFlashingCells(newFlashingCells);
            setTimeout(() => setFlashingCells({}), 3000);
            return formattedMatches;
          });

          setMatches(formattedMatches);
          setLoading(false);
        })
        .catch(error => {
          console.error("Error fetching odds:", error);
          setLoading(false);
        });
    };

    fetchOdds();
    const interval = setInterval(fetchOdds, 10000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <Container>
      <Title>Live Tennis Odds 🎾</Title>
      {loading ? (
        <p>Loading matches...</p>
      ) : matches.length === 0 ? (
        <p>No live odds available.</p>
      ) : (
        <table style={{ width: "90%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0px 4px 15px rgba(0,0,0,0.15)" }}>
          <thead>
            <tr style={{ backgroundColor: "#2c3e50", color: "white", fontSize: "1.3rem" }}>
              <th>Match</th>
              <th>Player 1</th>
              <th>Player 2</th>
              <th>Live Odds (Player 1)</th>
              <th>Live Odds (Player 2)</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match, index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#ecf0f1" : "white" }}>
                <td style={{ padding: "20px", fontWeight: "bold" }}>{match.round}</td>
                <td>
                  <PlayerCell>
                    {match.homeLogo && <PlayerImage src={match.homeLogo} alt="Player 1 Logo" />} 
                    {match.homePlayer}
                  </PlayerCell>
                </td>
                <td>
                  <PlayerCell>
                    {match.awayLogo && <PlayerImage src={match.awayLogo} alt="Player 2 Logo" />} 
                    {match.awayPlayer}
                  </PlayerCell>
                </td>
                <td
                  style={{
                    padding: "20px",
                    fontWeight: "bold",
                    border: flashingCells[`${index}-home`] ? "3px solid yellow" : "none",
                    transition: "border 0.3s ease-in-out",
                  }}
                >
                  {match.homeOdd}
                </td>
                <td
                  style={{
                    padding: "20px",
                    fontWeight: "bold",
                    border: flashingCells[`${index}-away`] ? "3px solid yellow" : "none",
                    transition: "border 0.3s ease-in-out",
                  }}
                >
                  {match.awayOdd}
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
