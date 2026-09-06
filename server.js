const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("."));

const rooms = new Map();

wss.on("connection", (ws) => {
  let room = null;

  ws.on("message", (data) => {
    let message;

    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (message.type === "join") {
      room = message.room;

      if (!rooms.has(room)) {
        rooms.set(room, new Set());
      }

      const clients = rooms.get(room);

      clients.add(ws);

      // Avisar a los demás que alguien entró
      clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "peer-joined"
          }));
        }
      });

      return;
    }

    // Reenviar mensajes WebRTC solamente a la misma sala
    if (room && rooms.has(room)) {
      rooms.get(room).forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(data.toString());
        }
      });
    }
  });

  ws.on("close", () => {
    if (!room || !rooms.has(room)) return;

    const clients = rooms.get(room);
    clients.delete(ws);

    if (clients.size === 0) {
      rooms.delete(room);
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor funcionando en el puerto ${PORT}`);
});
