import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";

interface WebSocketMessage {
  type: "send_message" | "join_room" | "typing" | "ping" | "pong";
  payload: any;
}

interface ConnectedClient {
  ws: WebSocket;
  currentRoom: string;
  userId: string;
  userName: string;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients: Map<WebSocket, ConnectedClient> = new Map();

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");

    ws.on("message", async (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "join_room": {
            const { roomId, userId, userName } = message.payload;
            clients.set(ws, { ws, currentRoom: roomId, userId, userName });
            console.log(`User ${userName} (${userId}) joined room ${roomId}`);
            
            const messages = await storage.getMessages(roomId);
            ws.send(JSON.stringify({ 
              type: "room_history", 
              payload: { roomId, messages } 
            }));
            break;
          }

          case "send_message": {
            const client = clients.get(ws);
            if (!client) {
              console.log("Client not found for send_message");
              return;
            }

            const validationResult = insertMessageSchema.safeParse({
              content: message.payload.content,
              senderId: client.userId,
              senderName: client.userName,
              roomId: client.currentRoom,
            });

            if (!validationResult.success) {
              ws.send(JSON.stringify({ 
                type: "error", 
                payload: { message: "Invalid message format" } 
              }));
              return;
            }

            const savedMessage = await storage.createMessage(validationResult.data);
            console.log(`Message from ${client.userName} in room ${client.currentRoom}: "${savedMessage.content}"`);

            const broadcastMessage = JSON.stringify({
              type: "new_message",
              payload: savedMessage,
            });

            clients.forEach((c) => {
              if (c.currentRoom === client.currentRoom && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(broadcastMessage);
              }
            });
            break;
          }

          case "typing": {
            const client = clients.get(ws);
            if (!client) return;

            const typingMessage = JSON.stringify({
              type: "user_typing",
              payload: { userId: client.userId, userName: client.userName },
            });

            clients.forEach((c) => {
              if (c.currentRoom === client.currentRoom && c.ws !== ws && c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(typingMessage);
              }
            });
            break;
          }

          case "ping": {
            // Respond to ping with pong to keep connection alive
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "pong" }));
            }
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      const client = clients.get(ws);
      if (client) {
        console.log(`User ${client.userName} (${client.userId}) disconnected from room ${client.currentRoom}`);
      }
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });

  app.get("/api/members", async (req, res) => {
    try {
      const members = await storage.getFamilyMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.getFamilyMember(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  app.get("/api/messages/:roomId", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.roomId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  return httpServer;
}
