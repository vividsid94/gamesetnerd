export const setupWebSocket = (onMessage) => {
    const APIkey = import.meta.env.VITE_API_KEY;
    const socket = new WebSocket(`wss://wss.api-tennis.com/live?APIkey=${APIkey}&timezone=+03:00`);
  
    socket.onopen = () => {
      console.log("WebSocket Connected to API Tennis");
    };
  
    socket.onmessage = (event) => {
      if (event.data) {
        try {
          const matchesData = JSON.parse(event.data);
          console.log("Received Match Data:", matchesData);
          if (onMessage) onMessage(matchesData);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error, "Raw data:", event.data);
        }
      }
    };
  
    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };
  
    socket.onclose = (event) => {
      console.warn("WebSocket Disconnected", event.reason);
      console.warn("Close event code:", event.code);
      
      if (event.code !== 1000) { // 1000 means normal closure
        console.log("Reconnecting in 5 seconds...");
        setTimeout(() => setupWebSocket(onMessage), 5000);
      }
    };
  
    return socket;
};
  