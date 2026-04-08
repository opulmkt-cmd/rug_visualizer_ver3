import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import apiRouter from "./server/api.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Applet Config if it exists
let firebaseAppletConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn("Could not load firebase-applet-config.json");
}

const rawDomain = process.env.VITE_SHOPIFY_STORE_DOMAIN || '';
// Clean domain: remove https://, trailing slashes, and ensure .myshopify.com is present if it's just the store name
const SHOPIFY_DOMAIN = rawDomain
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
  .includes('.') ? rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '') : (rawDomain ? `${rawDomain}.myshopify.com` : '');

const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

async function startServer() {
  console.log(">>> SERVER STARTING ON PORT 3000...");
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

  // Request Logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API routes
  app.use("/api", apiRouter);

  // Firebase Config Endpoint (Keep here for easy access to firebaseAppletConfig)
  app.get("/api/config/firebase", (req, res) => {
    const config = {
      apiKey: process.env.FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
      projectId: process.env.FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
      appId: process.env.FIREBASE_APP_ID || firebaseAppletConfig.appId,
      firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId
    };

    res.json(config);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
