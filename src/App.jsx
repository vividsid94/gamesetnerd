import { useEffect, useState } from "react";
import axios from "axios";
import { styled } from "@mui/styles";
import { Box, keyframes } from "@mui/system";
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


// Convert Decimal Odds to American Odds
const convertDecimalToAmerican = (decimalOdd) => {
  if (decimalOdd === "N/A" || isNaN(decimalOdd)) return "N/A";
  const odd = parseFloat(decimalOdd);
  return odd >= 2.0 ? `+${Math.round((odd - 1) * 100)}` : `${Math.round(-100 / (odd - 1))}`;
};

const MatchCard = styled("div")(({ isDragging }) => ({
  backgroundColor: "white",
  borderRadius: "10px",
  boxShadow: isDragging ? "0px 4px 15px rgba(0,0,0,0.2)" : "0px 4px 10px rgba(0,0,0,0.1)",
  padding: "10px 20px 20px",
  width: "100%",
  maxWidth: "300px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  opacity: isDragging ? 0.5 : 1,
  cursor: "grab",
}));

const PlayersContainer = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  width: "100%",
  alignItems: "center",
});

const Player = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: "10px",
});

const PlayerImage = styled("img")({
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  objectFit: "cover",
});

const OddsContainer = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  width: "100%",
  marginTop: "10px",
  fontSize: "1.2rem",
  fontWeight: "bold",
});

const FlashingOdds = styled("div")(({ flashing }) => ({
  padding: "5px 15px",
  borderRadius: "5px",
  backgroundColor: flashing ? "yellow" : "transparent",
  transition: "background-color 0.5s ease-in-out",
}));

const defaultSilhouette = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

// Draggable Card Component
const DraggableMatch = ({ match, index, moveCard, flashingCells }) => {
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

  return (
    <MatchCard ref={(node) => drag(drop(node))} >
      <h3>{match.round}</h3>
      <PlayersContainer>
        <Player>
          <PlayerImage src={match.homeLogo || defaultSilhouette} alt="Home Player" />
          <span>{match.homePlayer}</span>
        </Player>
        <Player>
          <PlayerImage src={match.awayLogo || defaultSilhouette} alt="Away Player" />
          <span>{match.awayPlayer}</span>
        </Player>
      </PlayersContainer>
      <OddsContainer>
        <FlashingOdds>
          {match.homeOdd}
        </FlashingOdds>
        <FlashingOdds>
          {match.awayOdd}
        </FlashingOdds>
      </OddsContainer>
    </MatchCard>
  );
};

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const apiKey = import.meta.env.VITE_API_KEY;

  const fetchOdds = async () => {
    try {
      const response = await axios.get("/.netlify/functions/getOdds");
      const events = Object.values(response.data.result || {});
      console.log("Live Odds API:", events);
      const formattedMatches = await Promise.all(
        events.map(async (event) => {
          const existingMatch = matches.find(m => m.event_key === event.event_key);
  
          const homeWinOdd = event.live_odds?.find(o => o.odd_name === "To Win" && o.type === "Home")?.value || "N/A";
          const awayWinOdd = event.live_odds?.find(o => o.odd_name === "To Win" && o.type === "Away")?.value || "N/A";
          console.log(existingMatch)
          const homePlayer = existingMatch?.homePlayer || 
            (await axios.get(`/.netlify/functions/getPlayer?player_key=${event.first_player_key}`)).data.player_name;
  
          const awayPlayer = existingMatch ? existingMatch.awayPlayer :
            (await axios.get(`/.netlify/functions/getPlayer?player_key=${event.second_player_key}`)).data.player_name;
  
          return {
            event_key: event.event_key,
            round: event.tournament_name,
            homePlayer,
            awayPlayer,
            homeLogo: event.event_first_player_logo,
            awayLogo: event.event_second_player_logo,
            homeOdd: convertDecimalToAmerican(homeWinOdd),
            awayOdd: convertDecimalToAmerican(awayWinOdd),
          };
        })
      );
  
      setMatches(formattedMatches);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching odds:", error);
    }
  };
  
  useEffect(() => {
    fetchOdds();
    const interval = setInterval(fetchOdds, 10000);
    return () => clearInterval(interval);
  }, []);
  
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

   // Detect system dark mode
   const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
   const textColor = prefersDarkMode ? "#FFF" : "#000"; // White for dark mode, black for light mode
   const backgroundColor = prefersDarkMode ? "#121212" : "#FFF"; // Dark background for dark mode

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
      <Box className={styles.container} style={{ backgroundColor: backgroundColor, color: textColor}}>
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
