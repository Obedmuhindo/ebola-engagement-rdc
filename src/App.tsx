import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Download, 
  Image as ImageIcon,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  PhoneCall
} from 'lucide-react';

// Import local direct des images pour permettre à Vite de les bundler et de résoudre parfaitement le routing
import LOGO_IMG from './Logo.png';
import FILTER_IMG from './Filtre.png';

const ASSETS = {
  logo: LOGO_IMG,
  filter: FILTER_IMG
};

export default function App() {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [posX, setPosX] = useState<number>(0);
  const [posY, setPosY] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [filterLoaded, setFilterLoaded] = useState<boolean>(false);
  const [filterDataUrl, setFilterDataUrl] = useState<string | null>(null);
  const [showShareGuide, setShowShareGuide] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [exportedImage, setExportedImage] = useState<string | null>(null);
  const [generatedShareImage, setGeneratedShareImage] = useState<string | null>(null);

  const [logoFailed, setLogoFailed] = useState<boolean>(false);
  const [logoSrc, setLogoSrc] = useState<string>(ASSETS.logo);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Autorisation d'administration masquée (Invisible par défaut pour les utilisateurs finaux)
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('admin') === 'true' || params.get('mode') === 'admin';
    }
    return false;
  });
  const [secretClicks, setSecretClicks] = useState<number>(0);

  const handleSecretClick = () => {
    setSecretClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setIsAdminAuthorized(true);
        setIsAdminOpen(true);
        alert("🔓 Zone d'administration déverrouillée ! Les options d'administration s'affichent maintenant en bas de page.");
        return 0;
      }
      return next;
    });
  };

  const uploadAdminAsset = (filename: 'Filtre.png' | 'Logo.png', file: File) => {
    setUploadStatus(`Restauration de ${filename} en cours...`);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      try {
        const response = await fetch('/api/upload-asset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ filename, dataUrl })
        });
        const result = await response.json();
        if (result.success) {
          setUploadStatus(`Succès: L'image ${filename} a été restaurée avec succès !`);
          if (filename === 'Filtre.png') {
            setFilterDataUrl(dataUrl);
            setFilterLoaded(true);
          } else {
            setLogoSrc(dataUrl);
          }
        } else {
          setUploadStatus(`Erreur de restauration: ${result.error}`);
        }
      } catch (err: any) {
        setUploadStatus(`Erreur réseau: ${err.message || err}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const messageText = `Bonjour à toutes et à tous 🙌🏾

Face à l'épidémie d'Ebola en RDC, mobilisons-nous aux côtés du Ministère de la Santé et de l'Institut National de Santé Publique (INSP) pour limiter la propagation de cette maladie.

Je viens de créer mon filtre d'engagement. Vous aussi, créez le vôtre et partagez-le pour sensibiliser votre entourage.

✅ Créez votre filtre d'engagement
✅ Partagez votre message de prévention
✅ Invitons chacun à protéger sa famille et sa communauté

Créez votre filtre ici :
https://obedmuhindo.github.io/ebola-engagement-rdc/

#StopEbolaRDC
Prévenons. Protégeons. Agissons.`;

  // Charge le filtre officiel depuis les assets bundlés par Vite.
  // Important : on évite le fetch + cache-busting ici, car cela peut créer un canvas "tainted"
  // dans certains navigateurs avec les anciennes versions en cache.
  useEffect(() => {
    setFilterDataUrl(ASSETS.filter);
    setFilterLoaded(true);
  }, []);

  // Empêche le défilement de l'écran mobile lors du drag & drop
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && userImage) {
        if (e.cancelable) e.preventDefault();
      }
    };

    preview.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => preview.removeEventListener('touchmove', handleTouchMove);
  }, [isDragging, userImage]);

  // Gestion du glissement de l'image (Drag & Drop)
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!userImage) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !userImage) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;

    // Déplacement proportionnel au niveau de zoom appliqué
    setPosX(prev => prev + deltaX / zoom);
    setPosY(prev => prev + deltaY / zoom);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Chargement de l'image de l'utilisateur
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUserImage(event.target.result as string);
          setZoom(1);
          setPosX(0);
          setPosY(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Boutons de contrôle directionnels et de zoom
  const moveImage = (direction: 'up' | 'down' | 'left' | 'right') => {
    const step = 20 / zoom; // Ajusté selon le zoom pour que le mouvement soit fluide
    if (direction === 'up') setPosY(prev => prev - step);
    if (direction === 'down') setPosY(prev => prev + step);
    if (direction === 'left') setPosX(prev => prev - step);
    if (direction === 'right') setPosX(prev => prev + step);
  };

  const changeZoom = (type: 'in' | 'out') => {
    setZoom(prev => {
      const step = 0.1;
      const next = type === 'in' ? prev + step : prev - step;
      return Math.max(0.5, Math.min(3, next));
    });
  };

  const resetControls = () => {
    setZoom(1);
    setPosX(0);
    setPosY(0);
  };

  // Charge une image sans polluer le canvas.
  // Les images utilisateur sont en Data URL et les assets Vite sont servis depuis le même domaine GitHub Pages.
  // On évite donc crossOrigin + cache-busting, qui peuvent provoquer des SecurityError avec certains caches Chrome.
  const loadImageSafely = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (!src) {
        reject(new Error("Source d'image vide."));
        return;
      }

      const img = new Image();
      img.decoding = 'async';

      img.onload = () => {
        if ((img.naturalWidth || img.width) > 0 && (img.naturalHeight || img.height) > 0) {
          resolve(img);
        } else {
          reject(new Error("Image chargée mais dimensions invalides."));
        }
      };

      img.onerror = () => {
        reject(new Error("Impossible de charger l'image : " + src.substring(0, 80)));
      };

      img.src = src;

      if (img.complete && (img.naturalWidth || img.width) > 0) {
        resolve(img);
      }
    });
  };

  // Dessin sur Canvas et création du fichier JPEG d'exportation
  const generateDesignDataUrl = async (): Promise<string | null> => {
    if (!userImage || !canvasRef.current || !previewRef.current) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 1080;
    canvas.height = 1080;
    ctx.clearRect(0, 0, 1080, 1080);

    try {
      // 1. Charger et dessiner la photo de l'utilisateur
      const img = await loadImageSafely(userImage);
      
      const previewWidth = previewRef.current.clientWidth || 400;
      const scaleFactor = 1080 / previewWidth;

      ctx.save();
      ctx.translate(540, 540); // centrer le canvas
      ctx.scale(zoom, zoom); // appliquer le zoom
      ctx.translate(posX * scaleFactor, posY * scaleFactor); // appliquer le décalage

      // Calcul de l'object-cover pour garder l'aspect ratio
      const imgWidth = img.naturalWidth || img.width || 1080;
      const imgHeight = img.naturalHeight || img.height || 1080;
      const baseScale = Math.max(1080 / imgWidth, 1080 / imgHeight);
      const drawWidth = imgWidth * baseScale;
      const drawHeight = imgHeight * baseScale;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // 2. Charger et dessiner le filtre officiel par-dessus
      const filterSrc = filterDataUrl || ASSETS.filter;
      const filterImg = await loadImageSafely(filterSrc);
      
      ctx.drawImage(filterImg, 0, 0, 1080, 1080);

      return canvas.toDataURL('image/jpeg', 0.95);
    } catch (err) {
      console.error("Erreur durant le rendu des calques sur le Canvas :", err);
      throw err;
    }
  };

  // Télécharger le visuel final
  const handleDownload = async () => {
    if (!userImage) return;
    setIsExporting(true);
    try {
      const dataUrl = await generateDesignDataUrl();
      if (dataUrl) {
        // Détecter si l'utlisateur est sur mobile (Android, iOS)
        const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Sur mobile, on affiche en plus l'overlay de sauvegarde car beaucoup de navigateurs mobiles bloquent le téléchargement programmatique local
        if (isMobile) {
          setExportedImage(dataUrl);
        }

        // Essayer le téléchargement direct
        try {
          const link = document.createElement('a');
          link.download = `StopEbolaRDC_${Date.now()}.jpg`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (downloadErr) {
          console.warn("Le téléchargement direct a échoué (attendu sur certains mobiles) :", downloadErr);
        }
      }
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      alert("Une erreur de sécurité ou d'accès s'est produite. Si vous êtes sur mobile, essayez d'utiliser le bouton de Partage WhatsApp pour enregistrer et publier le visuel.");
    } finally {
      setIsExporting(false);
    }
  };

  // Téléchargement du fichier unique index.html pour GitHub
  const handleDownloadSingleHtml = async () => {
    try {
      const response = await fetch(new URL('index_github.html', window.location.href).href);
      if (!response.ok) {
        throw new Error("Le fichier index_github.html n'a pas pu être chargé.");
      }
      const htmlText = await response.text();
      const blob = new Blob([htmlText], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'index.html'; // Prêt pour dépôt direct sur GitHub Pages !
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Le téléchargement direct a rencontré une restriction navigateur. Vous pouvez accéder directement au fichier compilé en ajoutant '/index_github.html' à l'URL de cette application !");
    }
  };

  // Partager sur WhatsApp
  const handleShare = async () => {
    if (!userImage) {
      alert("Veuillez d'abord ajouter votre photo.");
      return;
    }
    setIsExporting(true);
    try {
      const dataUrl = await generateDesignDataUrl();
      if (!dataUrl) {
        throw new Error("Impossible de générer le visuel.");
      }

      // Convertir le data URL Base64 en fichier physique (File) réutilisable par le téléphone sans fetch (évite les restrictions CSP)
      let sharedFile: File | null = null;
      try {
        const arr = dataUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        sharedFile = new File([u8arr], `StopEbolaRDC_${Date.now()}.jpg`, { type: mime });
      } catch (fileErr) {
        console.warn("Échec de la conversion de l'image en fichier pour le partage direct via atob:", fileErr);
      }

      // Tenter le partage direct natif (idéal pour tous les téléphones modernes Android/iOS)
      if (sharedFile && navigator.share && navigator.canShare && navigator.canShare({ files: [sharedFile] })) {
        try {
          await navigator.share({
            files: [sharedFile],
            title: "Engagement Contre Ebola 🇨🇩",
            text: messageText,
          });
          setIsExporting(false);
          return; // Succès absolu via le menu de partage natif (WhatsApp, Messenger, Téléchargement...)
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            console.warn("Échec du partage direct via le système natif (fallback activé) :", shareErr);
          } else {
            // L'utilisateur a simplement annulé
            setIsExporting(false);
            return;
          }
        }
      }

      // --- FALLBACK (Si le partage direct système n'est pas supporté) ---
      // 1. Copier automatiquement le texte d'engagement dans le presse-papiers
      try {
        await navigator.clipboard.writeText(messageText);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (clipErr) {
        console.warn("Échec de la copie automatique dans le presse-papiers :", clipErr);
      }

      // 2. Déclencher le téléchargement de l'image
      try {
        const downloadLink = document.createElement('a');
        downloadLink.download = `StopEbolaRDC_${Date.now()}.jpg`;
        downloadLink.href = dataUrl;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } catch (dlErr) {
        console.warn("Téléchargement automatique bloqué ou restreint :", dlErr);
      }

      // 3. Stocker l'image générée pour l'aperçu et le clic long de secours dans le guide
      setGeneratedShareImage(dataUrl);

      // 4. Afficher le guide explicatif complet
      setShowShareGuide(true);
    } catch (err) {
      console.error("Erreur pendant la préparation du partage WhatsApp :", err);
      alert("Une erreur s'est produite lors de la génération du visuel.");
    } finally {
      setIsExporting(false);
    }
  };

  const copyMessageOnly = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      alert("Impossible de copier le texte automatiquement.");
    }
  };

  const openWhatsAppDirectly = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
    setShowShareGuide(false);
  };

  return (
    <div id="stop-ebola-app" className="min-h-screen bg-gray-50 flex flex-col items-center pb-12 select-none">
      
      {/* En-tête de la page */}
      <header id="app-header" className="w-full bg-white shadow-md py-6 px-4 flex flex-col items-center space-y-4 border-b-4 border-[#1e3a8a] relative overflow-hidden">
        {/* Décorations subtiles en arrière-plan */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#f97316]/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#1e3a8a]/5 rounded-full -ml-12 -mb-12 pointer-events-none"></div>
        
        {logoFailed ? (
          <div className="flex items-center gap-3 bg-red-50/40 p-3 rounded-xl border border-red-150 max-w-full relative z-10 md:px-5 animate-fade-in">
            {/* Petit blason stylisé aux couleurs de la RDC */}
            <div className="flex flex-col items-center shrink-0 w-12 h-12 justify-center rounded-lg bg-sky-500 relative overflow-hidden border border-sky-450 shadow-xs">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600"></div>
              <div className="absolute top-1.5 left-0 right-0 h-1 bg-yellow-400"></div>
              <span className="text-white font-extrabold text-[10px] leading-tight text-center tracking-tight mt-1.5">RDC</span>
              <span className="text-white text-[7px] leading-none uppercase font-mono tracking-tighter">Santé</span>
            </div>
            {/* Textes officiels du Ministère en Fallback */}
            <div className="text-left font-sans">
              <p className="text-[8px] md:text-[9.5px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">
                République Démocratique du Congo
              </p>
              <p className="text-[10px] md:text-sm font-black text-gray-900 leading-tight uppercase font-sans tracking-tight">
                Ministère de la Santé Publique, <br className="xs:hidden" /> Hygiène & Prévoyance
              </p>
              <p className="text-[8.5px] md:text-[10px] font-bold text-[#1e3a8a] uppercase tracking-wide mt-0.5">
                Institut National de Santé Publique • INSP
              </p>
            </div>
          </div>
        ) : (
          <img 
            src={logoSrc} 
            alt="Logo du Ministère de la Santé" 
            className="h-14 md:h-16 object-contain relative z-10" 
            onError={() => {
              // Activer le fallback officiel si la bannière est corrompue/manquante
              setLogoFailed(true);
            }}
          />
        )}
        
        <div className="text-center space-y-3 relative z-10 max-w-xl">
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a8a] uppercase tracking-tight leading-tight">
            Engageons-nous pour barrer la route à <br className="hidden md:block" />
            l'épidémie d'<span className="text-[#f97316]">Ebola</span> en RDC
          </h1>
          
          <div className="inline-block bg-[#1e3a8a]/5 px-4 py-1.5 rounded-full border border-[#1e3a8a]/10">
            <p className="text-[10px] md:text-xs text-[#1e3a8a] font-bold uppercase tracking-[0.2em]">
              Prévention & Sensibilisation • Juin 2026
            </p>
          </div>
          
          <p className="text-xs md:text-sm text-gray-500 font-medium italic">
            "Générez votre filtre d'engagement et protégeons notre communauté"
          </p>
        </div>
      </header>

      {/* Message d'assistance à la restauration après premier déploiement */}
      {isAdminAuthorized && (!filterLoaded || logoFailed) && (
        <div className="w-full max-w-md px-4 mt-2 animate-fade-in z-20">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col items-center text-center space-y-2.5 shadow-sm">
            <span className="text-2xl">⚙️</span>
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-[#1ea8a] text-amber-900 uppercase tracking-normal">
                Visuels officiels requis (Logo & Filtre)
              </p>
              <p className="text-[11px] text-amber-700 leading-normal">
                Afin de retrouver le filtre d'engagement et le logo officiel en haute définition, restaurez-les en 1 clic grâce à vos images d'origine via la <strong>Zone Administrateur</strong> tout en bas.
              </p>
            </div>
            <button 
              onClick={() => {
                setIsAdminOpen(true);
                setTimeout(() => {
                  document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3.5 rounded-lg transition-colors flex items-center gap-1.5 active:scale-95 shadow-xs"
            >
              🛠️ Dérouler et Restaurer maintenant
            </button>
          </div>
        </div>
      )}

      {/* Corps principal : Parfaitement Mobile-First, centré et compact */}
      <main id="app-workspace" className="w-full max-w-md px-4 mt-6 space-y-6">
        
        {/* Cadre de prévisualisation de l'image */}
        <div 
          id="avatar-preview-box"
          ref={previewRef} 
          className={`relative aspect-square w-full bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-white ${userImage ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:border-blue-300 transition-all duration-300'}`}
          onClick={() => {
            if (!userImage) {
              fileInputRef.current?.click();
            }
          }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        >
          {/* Contenu photo sous le filtre */}
          <div className="absolute inset-0 z-0 flex items-center justify-center bg-gray-100">
            {userImage ? (
              <div 
                className="w-full h-full flex items-center justify-center pointer-events-none select-none"
                style={{ 
                  transform: `scale(${zoom}) translate(${posX}px, ${posY}px)`,
                  transition: (isExporting || isDragging) ? 'none' : 'transform 0.1s ease-out'
                }}
              >
                <img 
                  src={userImage} 
                  alt="Aperçu d'utilisateur" 
                  className="max-w-none min-w-full min-h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center text-gray-400 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-3 text-gray-500">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Importez votre photo d'abord</p>
                <p className="text-xs text-gray-400 mt-1">Glissez ou ajustez ensuite la photo de votre choix sous le filtre</p>
              </div>
            )}
          </div>

          {/* Calque Filtre Officiel superposé devant */}
          <div 
            className="absolute inset-0 z-10 pointer-events-none"
            style={{ 
              backgroundImage: filterDataUrl ? `url(${filterDataUrl})` : 'none', 
              backgroundSize: 'cover', 
              backgroundPosition: 'center' 
            }}
          >
            {/* Spinner de chargement du filtre au démarrage */}
            {!filterLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-8 h-8 text-[#1e3a8a] animate-spin" />
                  <p className="text-xs font-semibold text-[#1e3a8a]">Chargement du filtre officiel...</p>
                </div>
              </div>
            )}
          </div>
          
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>

        {/* Panneau de configuration et d'ajustement */}
        <div id="app-controls" className="bg-white rounded-2xl shadow-lg p-6 space-y-6 border border-gray-100">
          
          {/* Section d'ajustements - Désactivée si aucune image n'est présente */}
          {!userImage ? (
            <div className="bg-gray-50 rounded-xl p-4 text-center border-2 border-dashed border-gray-200">
              <p className="text-xs font-medium text-gray-500">
                Veuillez ajouter votre photo avec le bouton ci-dessous pour activer les fonctionnalités de réglage.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Molette / Boutons de commande directionnelle rapides de la photo (D-Pad) */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#1e3a8a] uppercase flex items-center">
                  <span className="bg-[#1e3a8a] text-white p-1 rounded-sm mr-2 text-[10px]">&nbsp;&nbsp;</span>
                  Ajuster l'emplacement de la photo
                </label>
                
                <div className="flex flex-col items-center space-y-2">
                  {/* Bouton Haut */}
                  <button 
                    onClick={() => moveImage('up')}
                    className="w-12 h-10 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 rounded-lg flex items-center justify-center shadow-xs transition-transform"
                    aria-label="Déplacer vers le haut"
                  >
                    <ChevronUp className="w-6 h-6 text-[#1e3a8a]" />
                  </button>
                  
                  {/* Gauche, Reset, Droite */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => moveImage('left')}
                      className="w-12 h-10 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 rounded-lg flex items-center justify-center shadow-xs transition-transform"
                      aria-label="Déplacer vers la gauche"
                    >
                      <ChevronLeft className="w-6 h-6 text-[#1e3a8a]" />
                    </button>
                    
                    <button 
                      onClick={resetControls}
                      className="w-12 h-10 bg-[#1e3a8a]/10 hover:bg-[#1e3a8a]/20 text-[#1e3a8a] rounded-lg flex items-center justify-center font-bold text-xs"
                      title="Réinitialiser la position"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => moveImage('right')}
                      className="w-12 h-10 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 rounded-lg flex items-center justify-center shadow-xs transition-transform"
                      aria-label="Déplacer vers la droite"
                    >
                      <ChevronRight className="w-6 h-6 text-[#1e3a8a]" />
                    </button>
                  </div>

                  {/* Bouton Bas */}
                  <button 
                    onClick={() => moveImage('down')}
                    className="w-12 h-10 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 rounded-lg flex items-center justify-center shadow-xs transition-transform"
                    aria-label="Déplacer vers le bas"
                  >
                    <ChevronDown className="w-6 h-6 text-[#1e3a8a]" />
                  </button>
                </div>
              </div>

              {/* Slider de zoom avec boutons d'ajustement fin */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1e3a8a] uppercase flex items-center">
                    <ZoomIn className="w-4 h-4 mr-2 text-[#1e3a8a]" /> Agrandissement (Zoom)
                  </label>
                  <span className="text-xs font-mono font-bold text-[#1e3a8a]">{Math.round(zoom * 100)}%</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => changeZoom('out')}
                    className="p-2 bg-gray-150 hover:bg-gray-200 rounded-lg text-[#1e3a8a]"
                    title="Zoom arrière"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  
                  <input 
                    type="range" 
                    min="0.5" 
                    max="3" 
                    step="0.01" 
                    value={zoom} 
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />

                  <button 
                    onClick={() => changeZoom('in')}
                    className="p-2 bg-gray-150 hover:bg-gray-200 rounded-lg text-[#1e3a8a]"
                    title="Zoom avant"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sliders d'ajustement d'origine au cas où l'utilisateur préfère faire glisser au curseur */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Ajustement Horizontal fin
                  </label>
                  <span className="text-xs font-bold text-gray-500">{posX}px</span>
                </div>
                <input 
                  type="range" min="-500" max="500" step="1" value={posX} 
                  onChange={(e) => setPosX(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Ajustement Vertical fin
                  </label>
                  <span className="text-xs font-bold text-gray-500">{posY}px</span>
                </div>
                <input 
                  type="range" min="-500" max="500" step="1" value={posY} 
                  onChange={(e) => setPosY(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

            </div>
          )}

          {/* Section Boutons d'Action Principale */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-3">
              {/* Bouton réinitialiser (visible au chargement de l'image) */}
              {userImage && (
                <button 
                  onClick={resetControls} 
                  className="p-3.5 rounded-xl border-2 border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors flex items-center justify-center shrink-0"
                  title="Réinitialiser les réglages"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
              
              {/* Bouton de sélection / Ajout photo */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-2 rounded-xl border-2 border-[#1e3a8a] text-[#1e3a8a] font-bold hover:bg-[#1e3a8a]/5 text-sm transition-all"
              >
                <ImageIcon className="w-5 h-5 text-[#f97316]" /> 
                {userImage ? "Remplacer ma photo" : "Ajouter votre photo"}
              </button>
            </div>
            
            {/* Bouton : Télécharger mon visuel */}
            <button 
              onClick={handleDownload}
              disabled={!userImage || isExporting}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl bg-[#f97316] text-white text-base font-bold shadow-lg shadow-[#f97316]/30 hover:bg-[#e0620d] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isExporting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><Download className="w-5 h-5" /> Télécharger mon visuel</>
              )}
            </button>

            {/* Bouton : Partager sur WhatsApp (Axe central de la viralisation) */}
            <button 
              onClick={handleShare}
              disabled={!userImage || isExporting}
              className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl bg-[#25D366] text-white text-base font-bold shadow-lg shadow-green-100 hover:bg-[#20ba5a] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.098 8.098 0 0 1-1.24-4.38c0-4.47 3.64-8.11 8.11-8.11 4.47 0 8.11 3.64 8.11 8.11 0 4.47-3.64 8.11-8.11 8.11zm4.56-6.22c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.66.83-.81.99-.15.17-.3.19-.55.06-1.09-.54-1.83-1-2.56-2.25-.19-.34.19-.31.55-1.03.06-.13.03-.25-.01-.34-.05-.08-.39-.95-.54-1.3-.15-.36-.3-.31-.41-.31h-.35c-.12 0-.32.05-.49.23-.17.18-.66.65-.66 1.58 0 .93.68 1.83.77 1.96.1.13 1.34 2.05 3.25 2.88.45.2 1.01.32 1.35.23.36-.09 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.29z"/>
              </svg>
              Partager sur WhatsApp
            </button>

          </div>
        </div>

        {/* Section Texte de Campagne pré-rempli à copier */}
        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">
              Message d'accompagnement
            </h3>
            
            <button 
              onClick={copyMessageOnly}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-[#1e3a8a] font-bold py-1 px-3 rounded-lg flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5 text-green-600" /> Copié</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copier</>
              )}
            </button>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
            <pre className="text-[11px] text-gray-600 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed scrollbar-thin">
              {messageText}
            </pre>
          </div>
          <p className="text-[10px] text-gray-400 italic">
            Astuce : Copiez ce texte pour l'accompagner de votre image lors du partage dans votre statut WhatsApp ou réseaux sociaux !
          </p>
        </div>

        {/* Boîte de dialogue explicative après avoir cliqué sur partager */}
        {showShareGuide && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 space-y-4 text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              
              <h4 className="text-lg font-extrabold text-[#1e3a8a] uppercase tracking-tight">Prêt pour WhatsApp ! 🇨🇩</h4>
              
              <div className="text-sm text-gray-600 space-y-3 text-left">
                <p className="font-semibold text-center text-gray-800 text-xs">Comment publier votre engagement :</p>
                
                <div className="bg-orange-50 border border-orange-100 p-2.5 rounded-xl space-y-1 text-[11px] text-amber-900 leading-normal">
                  <p className="font-bold flex items-center gap-1">
                    <span>💡</span> Info technique importante :
                  </p>
                  <p>
                    WhatsApp n'autorise pas l'envoi simultané direct d'une image et de votre texte personnalisé depuis un navigateur mobile. Suivez ces 3 étapes rapides :
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 space-y-3.5 text-xs text-gray-700 max-h-[290px] overflow-y-auto scrollbar-thin">
                  <div className="flex gap-2.5 items-start flex-col">
                    <div className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                      <p>Votre image de sensibilisation a été <strong>générée et téléchargée</strong>.</p>
                    </div>
                    {generatedShareImage && (
                      <div className="ml-7 mt-1 w-20 h-20 relative rounded-lg overflow-hidden border border-gray-300 shadow-sm shrink-0">
                        <img 
                          src={generatedShareImage} 
                          alt="Votre visuel d'engagement" 
                          className="w-full h-full object-cover select-all cursor-pointer"
                        />
                      </div>
                    )}
                    <p className="ml-7 text-[10px] text-gray-400 italic leading-snug">
                      (Si l'image n'est pas dans vos photos, faites un <strong>appui long</strong> dessus pour l'enregistrer.)
                    </p>
                  </div>
                  
                  <div className="flex gap-2.5 items-start flex-col">
                    <div className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                      <p>Le message d'engagement de secours a été copié, ou copiez-le ici :</p>
                    </div>
                    <button 
                      onClick={copyMessageOnly}
                      className="ml-7 w-full max-w-[200px] py-1 px-2.5 bg-amber-50 border border-amber-200 text-[#1e3a8a] hover:bg-amber-100 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all mt-0.5 shadow-sm active:scale-95"
                    >
                      {copied ? (
                        <>✅ Message copié !</>
                      ) : (
                        <>📋 Copier le message</>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-[#f97316] text-white flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                    <p>Ouvrez WhatsApp, séléctionnez l'image et faites un <strong>appui long pour Coller</strong> le message d'engagement en légende !</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button 
                  onClick={openWhatsAppDirectly}
                  className="w-full py-3 bg-[#25D366] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#20ba5a] active:scale-95 transition-all text-sm shadow-md"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.098 8.098 0 0 1-1.24-4.38c0-4.47 3.64-8.11 8.11-8.11 4.47 0 8.11 3.64 8.11 8.11 0 4.47-3.64 8.11-8.11 8.11zm4.56-6.22c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.66.83-.81.99-.15.17-.3.19-.55.06-1.09-.54-1.83-1-2.56-2.25-.19-.34.19-.31.55-1.03.06-.13.03-.25-.01-.34-.05-.08-.39-.95-.54-1.3-.15-.36-.3-.31-.41-.31h-.35c-.12 0-.32.05-.49.23-.17.18-.66.65-.66 1.58 0 .93.68 1.83.77 1.96.1.13 1.34 2.05 3.25 2.88.45.2 1.01.32 1.35.23.36-.09 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.29z"/>
                  </svg>
                  Ouvrir WhatsApp maintenant
                </button>
                <button 
                  onClick={() => {
                    setShowShareGuide(false);
                    setGeneratedShareImage(null);
                  }}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 font-semibold rounded-xl text-xs"
                >
                  Fermer l'aide
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section export unique de secours pour GitHub - Uniquement pour les spectateurs autorisés */}
        {isAdminAuthorized && (
          <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-xl p-5 space-y-4 border border-blue-500/20 text-left animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 bg-blue-600 text-[9px] uppercase font-mono font-bold rounded-sm animate-pulse">Production • GitHub Pages</span>
            </div>
            <h3 className="text-xs font-extrabold tracking-tight text-blue-300 uppercase">
              Exportateur de code source (Fichier unique index.html) 🇨🇩
            </h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Vous souhaitez héberger cette application sur <strong>GitHub Pages</strong> ou votre propre site ? 
              Téléchargez le fichier <code>index.html</code> de production 100% autonome. 
              Il contient le code React compressé et toutes les ressources (le logo, le filtre d'overlay) encodés directement en Base64. Aucun autre fichier n'est requis !
            </p>
            <button 
              onClick={handleDownloadSingleHtml}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all"
            >
              📋 Télécharger index.html pour GitHub
            </button>
            <div className="text-[10px] text-slate-400 text-center space-y-1 pt-1">
              <p>Le fichier est hébergé en toute sécurité dans l'application. Téléchargez-le d'un simple clic ou accédez-y directement via <span className="text-slate-200 font-mono bg-slate-800 px-1 py-0.5 rounded">/index_github.html</span></p>
            </div>
          </div>
        )}
      </main>
      
      {/* Overlay de téléchargement/sauvegarde manuelle (Indispensable pour garantir la réussite sur Android/iOS) */}
      {exportedImage && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 flex flex-col items-center space-y-4 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Download className="w-6 h-6 animate-bounce" />
            </div>
            
            <h4 className="text-base font-extrabold text-gray-950 uppercase tracking-tight">
              Visuel prêt pour téléchargement !
            </h4>
            
            <p className="text-xs text-gray-500 leading-normal">
              Si le téléchargement automatique n'a pas démarré, <strong>appuyez longuement</strong> sur l'image ci-dessous pour l'enregistrer dans vos photos :
            </p>

            {/* Aperçu de l'image pour le clic long natif */}
            <div className="w-full aspect-square relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 shadow-md">
              <img 
                src={exportedImage} 
                alt="Votre engagement contre Ebola" 
                className="w-full h-full object-cover select-all cursor-pointer"
                onContextMenu={(e) => e.stopPropagation()}
              />
            </div>

            <div className="w-full flex flex-col gap-2 pt-2">
              <button 
                onClick={() => setExportedImage(null)}
                className="w-full py-3 bg-[#1e3a8a] text-white font-bold rounded-xl active:scale-95 transition-all text-xs hover:bg-[#1e3a8a]/90"
              >
                J'ai enregistré mon visuel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input de sélection cachée */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        onChange={handleImageUpload} 
        className="hidden" 
      />

      {/* Pied de page */}
      <footer className="mt-8 text-center text-gray-400 text-xs px-6 max-w-md">
        <p>Note : Pour un résultat optimal, utilisez une photo bien éclairée.</p>
        <p 
          onClick={handleSecretClick}
          className="mt-2 cursor-pointer select-none hover:text-gray-500 transition-colors duration-200"
          title="Institut National de Santé Publique"
        >
          © 2026 Institut National de Santé Publique (INSP) - RDC
        </p>
      </footer>

      {/* Zone Administrateur pour restaurer les images originales - Uniquement visible si autorisé secrètement */}
      {isAdminAuthorized && (
        <div id="admin-panel" className="mt-12 mb-6 w-full max-w-md px-4 text-center animate-fade-in">
          <button 
            onClick={() => setIsAdminOpen(!isAdminOpen)}
            className="text-[10px] text-gray-400 hover:text-gray-600 font-mono transition-colors"
          >
            {isAdminOpen ? "⚙️ Fermer l'administration" : "⚙️ Zone Administrateur (Restauration des Médias)"}
          </button>
          
          {isAdminOpen && (
            <div className="mt-3 bg-white p-5 rounded-2xl shadow-lg border border-red-100 text-left space-y-4">
              <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide">
                Restauration des Images Originales PNG 🇨🇩
              </h4>
              <p className="text-[11px] text-gray-500 leading-normal">
                Si le logo ou le filtre apparaissent cassés (provenant d'un import de code corrompu), importez les fichiers originaux ici. Ils seront écrits directement dans les fichiers binaires d'origine de l'application sur le serveur :
              </p>
              
              <div className="space-y-3">
                {/* Restaurer le Filtre */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-700 mb-2">1. Filtre d'Engagement (Filtre.png)</p>
                  <input 
                    type="file" 
                    accept="image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAdminAsset('Filtre.png', file);
                    }}
                    className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {/* Restaurer le Logo */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-700 mb-2">2. Logo Bannière (Logo.png)</p>
                  <input 
                    type="file" 
                    accept="image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAdminAsset('Logo.png', file);
                    }}
                    className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {uploadStatus && (
                <div className="p-2 bg-blue-50 text-blue-800 text-[11px] rounded-lg font-medium border border-blue-100 text-center">
                  {uploadStatus}
                </div>
              )}
              
              <p className="text-[9px] text-gray-400 text-center italic">
                Une fois les fichiers restaurés, ils sont sauvegardés en binaire pur sur le serveur de production.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
