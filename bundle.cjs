const fs = require('fs');
const path = require('path');

async function buildSingleFile() {
  try {
    const distDir = path.join(__dirname, 'dist');
    const indexHtmlPath = path.join(distDir, 'index.html');
    
    if (!fs.existsSync(indexHtmlPath)) {
      throw new Error("Le fichier dist/index.html n'existe pas. Veuillez d'abord compiler l'application.");
    }

    console.log("Lecture du fichier dist/index.html...");
    let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

    // Trouver tous les fichiers joints dans dist/assets
    const assetsDir = path.join(distDir, 'assets');
    const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];

    // Séparer les types de fichiers
    const cssFiles = assetFiles.filter(f => f.endsWith('.css'));
    const jsFiles = assetFiles.filter(f => f.endsWith('.js'));
    const imageFiles = assetFiles.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.svg') || f.endsWith('.gif'));

    console.log(`Fichiers trouvés : ${cssFiles.length} CSS, ${jsFiles.length} JS, ${imageFiles.length} Images.`);

    // 1. Lire et assembler les styles CSS
    let inlinedCss = '';
    for (const cssFile of cssFiles) {
      console.log(`Inlining CSS : ${cssFile}`);
      const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
      inlinedCss += cssContent + '\n';
    }

    // 2. Lire et assembler les Scripts JS
    let inlinedJs = '';
    for (const jsFile of jsFiles) {
      console.log(`Inlining JS : ${jsFile}`);
      const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
      inlinedJs += jsContent + '\n';
    }

    // 3. Encoder toutes les images en Base64 et les remplacer dans le CSS et le JS
    console.log("Étape d'encodage des images en base64...");
    const imageReplacements = [];
    for (const imgFile of imageFiles) {
      const imgPath = path.join(assetsDir, imgFile);
      const imgBuffer = fs.readFileSync(imgPath);
      const ext = path.extname(imgFile).toLowerCase();
      let mime = 'image/png';
      if (ext === '.svg') mime = 'image/svg+xml';
      else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
      else if (ext === '.gif') mime = 'image/gif';

      const base64Data = imgBuffer.toString('base64');
      const dataUrl = `data:${mime};base64,${base64Data}`;
      
      console.log(`Image encodée : ${imgFile} (${(imgBuffer.length / 1024).toFixed(1)} kB)`);
      
      imageReplacements.push({
        fileName: imgFile,
        dataUrl: dataUrl
      });
    }

    // Remplacer les chemins d'images dans le CSS et le JS
    for (const replacement of imageReplacements) {
      const { fileName, dataUrl } = replacement;
      
      // On cherche les différentes variations d'appel de l'asset dans le code
      const patterns = [
        `/assets/${fileName}`,
        `assets/${fileName}`,
        `./assets/${fileName}`,
        fileName
      ];

      for (const pattern of patterns) {
        // Enlever les antislashs pour éviter les problèmes d'échappement regex
        const escapedPattern = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedPattern, 'g');
        
        const cssCount = (inlinedCss.match(regex) || []).length;
        const jsCount = (inlinedJs.match(regex) || []).length;
        const htmlCount = (htmlContent.match(regex) || []).length;

        if (cssCount > 0) {
          inlinedCss = inlinedCss.replace(regex, dataUrl);
        }
        if (jsCount > 0) {
          inlinedJs = inlinedJs.replace(regex, dataUrl);
        }
        if (htmlCount > 0) {
          htmlContent = htmlContent.replace(regex, dataUrl);
        }

        if (cssCount > 0 || jsCount > 0 || htmlCount > 0) {
          console.log(`-> Remplacé "${pattern}" (${cssCount} dans CSS, ${jsCount} dans JS, ${htmlCount} dans HTML)`);
        }
      }
    }

    // 4. Intégrer le CSS compilé dans le HTML
    // Supprimer les balises <link rel="stylesheet"> d'origine
    htmlContent = htmlContent.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
    
    // Injecter dans la balise <head>
    const styleTag = `<style>${inlinedCss}</style>`;
    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `${styleTag}\n</head>`);
    } else {
      htmlContent = styleTag + '\n' + htmlContent;
    }

    // 5. Intégrer le JS compilé dans le HTML
    // Supprimer les balises <script type="module"> d'origine
    htmlContent = htmlContent.replace(/<script[^>]*src=["'][^"']*["'][^>]*><\/script>/gi, '');
    htmlContent = htmlContent.replace(/<script[^>]*type=["']module["'][^>]*src=["'][^"']*["'][^>]*><\/script>/gi, '');

    // Injecter avant </body> ou à la fin
    const scriptTag = `<script type="module">\n${inlinedJs}\n</script>`;
    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', `${scriptTag}\n</body>`);
    } else {
      htmlContent = htmlContent + '\n' + scriptTag;
    }

    // Écrire le résultat final
    // Écrire dans le dossier public pour que l'application puisse le servir en téléchargement direct et rapide
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }
    const publicOutputPath = path.join(publicDir, 'index_github.html');
    fs.writeFileSync(publicOutputPath, htmlContent, 'utf8');

    const distOutputPath = path.join(distDir, 'index.html');
    fs.writeFileSync(distOutputPath, htmlContent, 'utf8');

    const distGithubOutputPath = path.join(distDir, 'index_github.html');
    fs.writeFileSync(distGithubOutputPath, htmlContent, 'utf8');

    const finalSizeMB = (fs.statSync(publicOutputPath).size / (1024 * 1024)).toFixed(2);
    console.log(`\n🎉 SUCCÈS ! Fichier unique généré avec succès !`);
    console.log(`- Enregistré pour le téléchargement public : ${publicOutputPath}`);
    console.log(`- Enregistré pour la production : ${distOutputPath}`);
    console.log(`- Enregistré pour l'accès URL de production : ${distGithubOutputPath}`);
    console.log(`Taille finale : ${finalSizeMB} MB. Tout y est embarqué, aucun appel réseau extérieur ou CORS requis !`);
    
  } catch (err) {
    console.error("Échec de la génération du fichier unique :", err);
  }
}

buildSingleFile();
