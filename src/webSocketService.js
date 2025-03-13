export const initializeWebSocket = (apiKey, setMatches, fetchOdds, setLoading) => {
    const socket = new WebSocket(`wss://wss.api-tennis.com/live?APIkey=${apiKey}&timezone=+03:00`);
  
    socket.onopen = () => {
      console.log("WebSocket connection established");
    };
  
    socket.onmessage = (e) => {
      if (e.data) {
        try {
          const matchesData = JSON.parse(e.data);
          if (!matchesData || Object.keys(matchesData).length === 0) return;
  
          console.log("WebSocket Data:", matchesData);
          const formattedMatches = Object.values(matchesData).map(event => ({
            event_key: event.event_key,
            round: event.tournament_name,
            homePlayer: event.event_first_player,
            awayPlayer: event.event_second_player,
            homeLogo: event.event_first_player_logo,
            awayLogo: event.event_second_player_logo,
            homeOdd: "N/A", // Placeholder, will be updated by fetchOdds()
            awayOdd: "N/A",
          }));
  
          setMatches(formattedMatches);
          setLoading(false);
  
          // Fetch odds after setting match data
          fetchOdds();
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      }
    };
  
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  
    socket.onclose = (event) => {
      console.warn("WebSocket closed:", event);
    };
  
    return socket; // Return the WebSocket instance for cleanup if needed
  };
  