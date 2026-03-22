const NodeHelper = require("node_helper");
const express = require("express");
const multer = require("multer");
const { WebSocketServer } = require("ws");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

module.exports = NodeHelper.create({
  start: function() {
    this.expressApp = express();
    
    // Create uploads dir
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir);
    }
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "CONFIG") {
      this.config = payload;
      this.startServer();
    }
  },

  startServer: function() {
    if (this.serverStarted) return;
    this.serverStarted = true;

    const port = this.config.port || 8088;

    // Serve public folder
    this.expressApp.use(express.static(path.join(__dirname, "public")));
    
    // Configure Express to allow requests from any IP
    // Not just localhost since MM might be running on a Raspberry Pi accessed via network
    const server = this.expressApp.listen(port, "0.0.0.0", () => {
      console.log(`MMM-RemoteView server running on port ${port}`);
    });

    // WebSocket server
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });

    // Explicit route for the root to serve remote.html
    this.expressApp.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "remote.html"));
    });

    // Serve uploads folder
    this.expressApp.use("/uploads", express.static(path.join(__dirname, "uploads")));
    
    // Fallback if the module uses relative paths
    this.expressApp.use(express.static(path.join(__dirname, "uploads")));

    // Multer config
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "uploads"));
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed."));
      }
    };

    const upload = multer({ 
      storage: storage,
      fileFilter: fileFilter,
      limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
    });

    this.expressApp.get('/screenshot', (req, res) => {
      const url = req.query.url;
      if (!url) return res.status(400).send('Missing url');

      const outFile = path.join(__dirname, 'uploads', `screenshot_${Date.now()}.jpg`);
      const cssFile = path.join(__dirname, 'custom.css');

      exec(`wkhtmltoimage --width 1080 --user-style-sheet "${cssFile}" "${url}" ${outFile}`, (err) => {
        if (err) return res.status(500).send(err.message);
        
        // Allow CORS so local browser instances on different hostnames/ports can load the image
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'no-store');
        
        res.sendFile(outFile, (err) => {
          if (!err) {
            fs.unlink(outFile, () => {}); // clean up the temporary image
          }
        });
      });
    });

    this.expressApp.post("/upload", upload.single("image"), (req, res) => {
      if (!req.file) {
        return res.status(400).send("No file uploaded or invalid file type.");
      }
      
      const filePath = "/uploads/" + req.file.filename;
      
      // We will let the frontend resolve the URL with window.location.hostname
      this.sendSocketNotification("showImage", { path: filePath });
      
      // Broadcast to WebSocket clients (for sync if needed)
      this.broadcastToClients(JSON.stringify({ action: "showImage", path: filePath }));

      res.status(200).send({ success: true, path: filePath });
    });

    this.wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.action === "showUrl") {
            this.sendSocketNotification("showUrl", { url: data.url });
          } else if (data.action === "showImage") {
            this.sendSocketNotification("showImage", { path: data.path });
          } else if (data.action === "hide") {
            this.sendSocketNotification("hide", {});
          } else if (data.action === "scroll") {
            this.sendSocketNotification("scroll", { x: data.x, y: data.y });
          }

          // Broadcast to other clients
          this.broadcastToClients(message, ws);
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      });
    });
  },

  broadcastToClients: function(message, excludeWs = null) {
    if (!this.wss) return;
    this.wss.clients.forEach((client) => {
      if (client !== excludeWs && client.readyState === 1 /* WebSocket.OPEN */) {
        client.send(message);
      }
    });
  }
});
