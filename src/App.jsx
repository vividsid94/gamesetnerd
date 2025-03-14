import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { styled } from "@mui/styles";
import { Box, display, flexbox, keyframes, width } from "@mui/system";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import CircularProgress from "@mui/material/CircularProgress";
import styles from "./styles.module.css";
import { initializeWebSocket } from "./webSocketService";

const Modal = ({ children }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "10px",
        textAlign: "center",
        boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
        minWidth: "300px",
      }}
    >
      {children}
    </div>
  </div>
);

const convertDecimalToAmerican = (decimalOdd) => {
  if (decimalOdd === "N/A" || isNaN(decimalOdd)) return "N/A";

  const odd = parseFloat(decimalOdd);

  if (odd <= 1 || !isFinite(odd)) return ""; // Prevents -Infinity and invalid values

  const americanOdd = odd >= 2.0 
    ? `+${Math.round((odd - 1) * 100)}`
    : `${Math.round(-100 / (odd - 1))}`;

  return Math.abs(americanOdd) > 100000 ? "" : americanOdd; // Remove extreme negative odds
};


const MatchCard = styled("div")(({ isDragging }) => ({
  opacity: isDragging ? 0.5 : 1,
  cursor: "grab",
}));

const FlashingOdds = styled("div")(({ flashing }) => ({
  padding: "5px 15px",
  borderRadius: "5px",
  backgroundColor: flashing ? "yellow" : "transparent",
  transition: "background-color 0.5s ease-in-out",
}));

const defaultSilhouette = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

const DraggableMatch = ({ match, index, moveCard }) => {
  const [darkMode, setDarkMode] = useState(window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const [{}, drag] = useDrag({
    type: "MATCH",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "MATCH",
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveCard(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const textColor = darkMode ? "#FFF" : "#000";
  const backgroundColor = darkMode ? "navy" : "#FFF";

  return (
    <MatchCard ref={(node) => drag(drop(node))} className={styles.matchCard} style={{ backgroundColor: backgroundColor, color: textColor }}>
      <h3>{match.round}</h3>
      <Box className={styles.matchRow}>
        <Box className={styles.playerContainer}>
          <Box className={styles.playerColumn}>
            <img className={styles.playerImage} src={match.homeLogo || defaultSilhouette} alt="Home Player" />
            <span>{match.homePlayer}</span>
            {match.servingPlayer === "First Player" && <div className={styles.tennisBall}>🎾</div>}
          </Box>
          {match.homeOdd}
        </Box>

        {/* Scoreboard with Curly Braces */}
        <Box className={styles.scoreboard}>
          <span className={styles.brace}>{"{"}</span>
          <div className={styles.scoreContent}>
            {/* First row: Completed sets count (First Player - Second Player) */}
            <div>
              {match.setScores
                ? `${match.setScores.filter(set => parseInt(set.score_first) >= 6 && parseInt(set.score_first) - parseInt(set.score_second) >= 2).length} - 
                  ${match.setScores.filter(set => parseInt(set.score_second) >= 6 && parseInt(set.score_second) - parseInt(set.score_first) >= 2).length}`
                : "0 - 0"}
            </div>
            {/* Second row: Current set score (last non-zero set) */}
            <div>
              {match.setScores?.findLast(set => parseInt(set.score_first) > 0 || parseInt(set.score_second) > 0)
                ? `${match.setScores.findLast(set => parseInt(set.score_first) > 0 || parseInt(set.score_second) > 0).score_first} - 
                  ${match.setScores.findLast(set => parseInt(set.score_first) > 0 || parseInt(set.score_second) > 0).score_second}`
                : "0 - 0"}
            </div>
            <div>{match.score || "0 - 0"}</div> {/* Current game score */}
          </div>
          <span className={styles.brace}>{"}"}</span>
        </Box>

        <Box className={styles.playerContainer}>
          {match.awayOdd}
          <Box className={styles.playerColumn}>
            <img className={styles.playerImage} src={match.awayLogo || defaultSilhouette} alt="Away Player" />
            <span>{match.awayPlayer}</span>
            {match.servingPlayer === "Second Player" && <div className={styles.tennisBall}>🎾</div>}
          </Box>
        </Box>
      </Box>
    </MatchCard>
  );
};


function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const matchesRef = useRef([]);

  const apiKey = import.meta.env.VITE_API_KEY;

  const fetchOdds = async () => {
    try {
      const response = await axios.get("/.netlify/functions/getOdds");
      const events = Object.values(response.data.result || {});
      console.log("Live Odds API:", events);
  
      const formattedMatches = await Promise.all(
        events.map(async (event) => {
          const homeWinOdd = event.live_odds?.find(o => o.odd_name === "To Win" && o.type === "Home")?.value || "N/A";
          const awayWinOdd = event.live_odds?.find(o => o.odd_name === "To Win" && o.type === "Away")?.value || "N/A";
          return {
            event_key: event.event_key,
            round: event.tournament_name,
            homeLogo: event.event_first_player_logo,
            awayLogo: event.event_second_player_logo,
            homeOdd: convertDecimalToAmerican(homeWinOdd),
            awayOdd: convertDecimalToAmerican(awayWinOdd),
          };
        })
      );
  
      setMatches((prevMatches) => {
        return events.map((event) => {
          const existingMatch = prevMatches.find((m) => m.event_key === event.event_key); // Find existing match
  
          return {
            ...existingMatch, // Preserve existing data (score, setScores, servingPlayer)
            event_key: event.event_key,
            round: event.tournament_name,
            homeLogo: event.event_first_player_logo,
            awayLogo: event.event_second_player_logo,
            homeOdd: convertDecimalToAmerican(
              event.live_odds?.find(o => o.odd_name === "To Win" && o.type === "Home")?.value || "N/A"
            ),
            awayOdd: convertDecimalToAmerican(
              event.live_odds?.find(o => o.odd_name === "To Win" && o.type === "Away")?.value || "N/A"
            ),
          };
        });
      });

      matchesRef.current = formattedMatches;
      if (loading) {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching odds:", error);
    }
  };
  
  const fetchLiveScores = async (matches) => {
    try {
      const response = await axios.get("/.netlify/functions/getLiveScores");
      const liveMatches = response.data.result || [];
      console.log("Live Scores API:", liveMatches);
  
      // Update scores for matches that exist
      const updatedMatches = matches.map((match) => {
        const currentMatch = liveMatches.find((m) => m.event_key === match.event_key);
        return currentMatch
          ? {
              ...match,
              homePlayer: currentMatch.event_first_player,
              awayPlayer: currentMatch.event_second_player,
              score: currentMatch.event_game_result || "0 - 0",
              setScores: currentMatch.scores || [],
              servingPlayer: currentMatch.event_serve,
            }
          : match; // Keep existing match if no live score found
      });
  
      setMatches(updatedMatches);
    } catch (error) {
      console.error("Error fetching live scores:", error);
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      await fetchOdds(); // Fetch odds first
    };
  
    fetchData();
    const interval = setInterval(fetchOdds, 10000); // Refresh odds every 10s
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (!loading && matchesRef.current.length > 0) {
      fetchLiveScores(matchesRef.current); // Uses ref for immediate data access
    }
  }, [loading]);
  
  useEffect(() => {
    const socket = initializeWebSocket(apiKey, setMatches, fetchOdds, setLoading);

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
        console.log("WebSocket connection closed");
      }
    };
  }, []);

  const [tournamentType, setTournamentType] = useState("all");

  const handleTournamentChange = (event, newType) => {
    if (newType !== null) {
      setTournamentType(newType);
    }
  }

  const moveCard = (fromIndex, toIndex) => {
    setMatches((prevMatches) => {
      const updatedMatches = [...prevMatches];
      const [movedMatch] = updatedMatches.splice(fromIndex, 1);
      updatedMatches.splice(toIndex, 0, movedMatch);
      return updatedMatches;
    });
  };
  
  const filteredMatches = matches.filter((match) => {
    if (tournamentType === "all") return true;
    if (tournamentType === "challenger") return match.round.includes("Challenger");
    if (tournamentType === "itf") return match.round.includes("ITF");
    if (tournamentType === "atp-wta") return !match.round.includes("Challenger") && !match.round.includes("ITF");
    return false;
  });  
  return (
    <DndProvider backend={HTML5Backend}>
      <Box className={styles.container}>
      <div className={styles.center}>
        <h2 className={styles.title}>Game, Set, Nerd! 🎾</h2>
        <ToggleButtonGroup
          value={tournamentType}
          exclusive
          onChange={handleTournamentChange}
          aria-label="Tournament Filter"
          sx={{ marginBottom: "20px" }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="atp-wta">ATP/WTA</ToggleButton>
          <ToggleButton value="challenger">Challenger</ToggleButton>
          <ToggleButton value="itf">ITF</ToggleButton>
        </ToggleButtonGroup>
      </div>
      {loading ? (
        <Modal>
          <CircularProgress size={30} thickness={4} color="primary" />
          <h3 className={styles.title}>Initializing API...</h3>
        </Modal>
      ) : (
        <div className={styles.cardsWrapper}>
          {filteredMatches.map((match, index) => (
            <DraggableMatch key={match.event_key} match={match} index={index} moveCard={moveCard}/>
          ))}
        </div>
      )}
     </Box>
    </DndProvider>
  );  
}

export default App;
