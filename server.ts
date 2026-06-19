import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Augmenter la limite pour supporter le transfert d'images en base64 (l'image du filtre fait ~3MB)
  app.use(express.json({ limit: "15mb" }));

  // Endpoint API pour restaurer les images originales en binaire propre
  app.post("/api/upload-asset", (req, res) => {
    try {
      const { filename, dataUrl } = req.body;
      
      if (!filename || !dataUrl) {
        res.status(400).json({ error: "filename et dataUrl requis" });
        return;
      }

      if (filename !== "Filtre.png" && filename !== "Logo.png") {
        res.status(400).json({ error: "Fichier non supporté" });
        return;
      }

      // Parser le Data URL (ex: data:image/png;base64,iVBOR...)
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ error: "Format de dataUrl invalide" });
        return;
      }

      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Écriture du fichier binaire brut original !
      const targetPath = path.join(process.cwd(), "src", filename);
      fs.writeFileSync(targetPath, buffer);
      console.log(`[API] Réceptionné et écrit en binaire brut : ${targetPath} (${buffer.length} octets)`);

      // Nettoyer également le dossier dist s'il existe pour forcer Vite à re-packager le nouvel asset
      const distAssetDir = path.join(process.cwd(), "dist");
      if (fs.existsSync(distAssetDir)) {
        try {
          fs.rmSync(distAssetDir, { recursive: true, force: true });
          console.log("[API] Dossier dist supprimé pour forcer le rebuild.");
        } catch (err) {
          console.error("[API] Échec de la suppression de dist:", err);
        }
      }

      res.json({ 
        success: true, 
        message: `L'image ${filename} a été restaurée avec succès en binaire pur sur le serveur !` 
      });
    } catch (err: any) {
      console.error("[API] Erreur d'écriture de fichier:", err);
      res.status(500).json({ error: err.message || "Erreur interne" });
    }
  });

  // Gérer Vite en middleware de développement ou fichiers statiques en production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      setHeaders: (res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
