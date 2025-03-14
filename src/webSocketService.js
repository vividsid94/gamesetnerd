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
  
          setMatches((prevMatches) =>
            prevMatches.map((match) => {
              const updatedMatch = Object.values(matchesData).find((event) => event.event_key === match.event_key);
  
              if (updatedMatch) {
                return {
                  ...match, // Keep existing odds & other details
                  score: updatedMatch.event_game_result || match.score, // Update live score
                  setScores: updatedMatch.scores || match.setScores, // Update set scores
                  servingPlayer: updatedMatch.event_serve || match.servingPlayer, // Update serving player
                };
              }
              return match; // Keep match unchanged if no update is available
            })
          );
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
  