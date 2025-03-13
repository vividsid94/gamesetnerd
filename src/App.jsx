import { useEffect, useState } from "react";
import axios from "axios";
import { styled } from "@mui/styles";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";

import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import styles from "./styles.module.css";

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

// Styled Components
const Container = styled("div")({
  padding: "20px",
  fontFamily: "Arial, sans-serif",
  backgroundColor: "#f4f4f9",
  display: "flex",
  flexWrap: "wrap", // ✅ Wraps cards into multiple rows
  justifyContent: "center",
  gap: "50px", // ✅ Adds space between cards
});

const Title = styled("h1")({
  color: "#2c3e50",
  fontSize: "2.5rem",
  width: "100%",
  textAlign: "center",
  marginBottom: "20px",
});

const MatchCard = styled("div")(({ isDragging }) => ({
  backgroundColor: "white",
  borderRadius: "10px",
  boxShadow: isDragging ? "0px 4px 15px rgba(0,0,0,0.2)" : "0px 4px 10px rgba(0,0,0,0.1)",
  padding: "20px",
  width: "100%",
  maxWidth: "300px", // ✅ Makes cards fit in rows dynamically
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
  const [{ isDragging }, drag] = useDrag({
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
    <MatchCard ref={(node) => drag(drop(node))} isDragging={isDragging}>
      <h2>{match.round}</h2>
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
        <FlashingOdds flashing={flashingCells[`${index}-home`]}>
          {match.homeOdd}
        </FlashingOdds>
        <FlashingOdds flashing={flashingCells[`${index}-away`]}>
          {match.awayOdd}
        </FlashingOdds>
      </OddsContainer>
    </MatchCard>
  );
};

function App() {
  const [matches, setMatches] = useState([]);
  const [odds, setOdds] = useState({});
  const [flashingCells, setFlashingCells] = useState({});
  const [loading, setLoading] = useState(true);

  const apiKey = import.meta.env.VITE_API_KEY;
  const apiUrl = `https://api.api-tennis.com/tennis/?method=get_live_odds&APIkey=${apiKey}`;

  // Fetch live odds
  const fetchOdds = () => {
    axios.get(apiUrl)
      .then(response => {
        const events = Object.values(response.data.result || {});
        const newOdds = {};
        events.forEach(event => {
          newOdds[event.event_key] = {
            homeOdd: convertDecimalToAmerican(event.live_odds?.find(o => o.type === "Home")?.value || "N/A"),
            awayOdd: convertDecimalToAmerican(event.live_odds?.find(o => o.type === "Away")?.value || "N/A"),
          };
        });

        setOdds(newOdds);
      })
      .catch(error => console.error("Error fetching odds:", error));
  };

  // WebSocket to get match data
  useEffect(() => {
    const socket = new WebSocket(`wss://wss.api-tennis.com/live?APIkey=${apiKey}&timezone=+03:00`);

    socket.onmessage = (e) => {
      if (e.data) {
        try {
          const matchesData = JSON.parse(e.data);
          if (!matchesData || Object.keys(matchesData).length === 0) return;

          const formattedMatches = Object.values(matchesData).map(event => ({
            event_key: event.event_key,
            round: event.tournament_name,
            homePlayer: event.event_first_player,
            awayPlayer: event.event_second_player,
            homeLogo: event.event_first_player_logo,
            awayLogo: event.event_second_player_logo,
            homeOdd: odds[event.event_key]?.homeOdd || "N/A",
            awayOdd: odds[event.event_key]?.awayOdd || "N/A",
          }));

          setMatches(formattedMatches);
          setLoading(false);
          fetchOdds();
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      }
    };

    return () => socket.close();
  }, [odds]);

  useEffect(() => {
    const interval = setInterval(fetchOdds, 10000);
    return () => clearInterval(interval);
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
          <ToggleButton value="challenger">Challenger</ToggleButton>
          <ToggleButton value="itf">ITF</ToggleButton>
          <ToggleButton value="atp-wta">ATP/WTA</ToggleButton>
        </ToggleButtonGroup>
      </div>
  
      <Container>
        {loading ? (
          <Modal>
            <h3 className={styles.title}>Initializing API...</h3>
          </Modal>
        ) : filteredMatches.map((match, index) => (
          <DraggableMatch key={match.event_key} match={match} index={index} moveCard={moveCard} flashingCells={flashingCells} />
        ))}
      </Container>
    </DndProvider>
  );  
}

export default App;
