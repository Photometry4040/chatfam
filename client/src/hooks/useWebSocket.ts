import { useEffect, useRef, useCallback, useState } from "react";
import type { Message } from "@shared/schema";

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface UseWebSocketOptions {
  userId: string;
  userName: string;
  roomId: string;
  onMessage: (message: Message) => void;
  onRoomHistory: (roomId: string, messages: Message[]) => void;
  onTyping?: (userId: string, userName: string) => void;
}

export function useWebSocket({
  userId,
  userName,
  roomId,
  onMessage,
  onRoomHistory,
  onTyping,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const callbacksRef = useRef({ onMessage, onRoomHistory, onTyping });
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttemptsRef = useRef(10);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  // Keep callbacks updated without triggering reconnection
  useEffect(() => {
    callbacksRef.current = { onMessage, onRoomHistory, onTyping };
  }, [onMessage, onRoomHistory, onTyping]);

  const calculateBackoff = useCallback(() => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, etc. (max 30s)
    const backoff = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    return backoff;
  }, []);

  const setupHeartbeat = useCallback((ws: WebSocket) => {
    // Clear existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Send ping every 30 seconds to keep connection alive
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket (attempt ${reconnectAttemptsRef.current + 1})...`);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected successfully");
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // Reset on successful connection
      
      // Setup heartbeat to keep connection alive
      setupHeartbeat(ws);
      
      // Send join_room message immediately
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "join_room",
          payload: { roomId, userId, userName },
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case "new_message":
            callbacksRef.current.onMessage(message.payload);
            break;
          case "room_history":
            callbacksRef.current.onRoomHistory(message.payload.roomId, message.payload.messages || []);
            break;
          case "user_typing":
            callbacksRef.current.onTyping?.(message.payload.userId, message.payload.userName);
            break;
          case "pong":
            // Heartbeat response - connection is alive
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = (event) => {
      console.log(`WebSocket disconnected (code: ${event.code})`);
      setIsConnected(false);
      
      // Clear heartbeat on close
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttemptsRef.current) {
        const backoffTime = calculateBackoff();
        reconnectAttemptsRef.current += 1;
        console.log(`Reconnecting in ${backoffTime}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttemptsRef.current})...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoffTime);
      } else {
        console.error("Max reconnection attempts reached. Please refresh the page.");
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      // onclose will be called after onerror, so we don't need to handle reconnection here
    };
  }, [roomId, userId, userName, calculateBackoff, setupHeartbeat]);

  // Initial connection only
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Room switching - send join_room when room changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "join_room",
        payload: { roomId, userId, userName },
      }));
    }
  }, [roomId, userId, userName]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "send_message",
        payload: { content },
      }));
    }
  }, []);

  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        payload: {},
      }));
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  return { isConnected, sendMessage, sendTyping };
}
