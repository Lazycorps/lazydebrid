// background.js
// Fonctions utilitaires
const createContextMenus = () => {
  chrome.contextMenus.create({
    id: "torrent-downloader-movies",
    title: "Download movies",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "torrent-downloader-series",
    title: "Download series",
    contexts: ["selection"],
  });
};

const generateMagnetLink = (hash) => `magnet:?xt=urn:btih:${hash}`;

const showNotification = (title, message) => {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "81477075.jpg",
    title,
    message,
  });
};

const openConfigurationPage = () => chrome.tabs.create({ url: "popup.html" });

const getDestination = (config, menuItemId) => {
  switch (menuItemId) {
    case "torrent-downloader-movies":
      return config.downloadStationMoviesPath;
    case "torrent-downloader-series":
      return config.downloadStationSeriesPath;
    default:
      return null;
  }
};

const getConfiguration = () =>
  new Promise((resolve) => {
    chrome.storage.sync.get("torrentDownloaderConfig", (data) => {
      resolve(data.torrentDownloaderConfig);
    });
  });

const getDownloadLink = async (apiKey, magnetOrLink) => {
  try {
    const params = new URLSearchParams({
      agent: "lazyDebrid",
      apikey: apiKey,
      link: magnetOrLink,
    });

    const response = await fetch(
      `https://api.alldebrid.com/v4/link/unlock?${params}`
    );

    if (!response.ok) {
      throw new Error("Erreur de requête API");
    }

    const data = await response.json();

    if (data.status === "success") {
      return data.data.link;
    } else {
      throw new Error("Impossible de récupérer le lien de téléchargement");
    }
  } catch (error) {
    console.error("Erreur:", error.message);
    return null;
  }
};

const uploadToAllDebrid = async (apiKey, magnetLink) => {
  const uploadResponse = await fetch(
    `https://api.alldebrid.com/v4/magnet/upload?agent=lazyDebrid&apikey=${apiKey}&magnets=${encodeURIComponent(
      magnetLink
    )}`
  );
  const uploadJson = await uploadResponse.json();

  const filesResponse = await fetch(
    `https://api.alldebrid.com/v4/magnet/files?agent=lazyDebrid&apikey=${apiKey}&id[]=${uploadJson.data.magnets[0].id}`
  );
  const filesJson = await filesResponse.json();

  return getDownloadLink(apiKey, filesJson.data.magnets[0].files[0].l);
};

const getSID = async (config) => {
  const loginResponse = await fetch(`${config.synologyHost}/webapi/auth.cgi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
    },
    body: new URLSearchParams({
      api: "SYNO.API.Auth",
      method: "login",
      version: "7",
      session: "DownloadStation",
      format: "cookie",
      account: config.synologyUsername,
      passwd: config.synologyPassword,
    }),
  });

  if (!loginResponse.ok) {
    throw new Error("Login failed");
  }

  const loginResult = await loginResponse.json();
  return loginResult.data.sid;
};

const transferToNAS = async (config, destination, downloadLink) => {
  try {
    console.log("Transferring link:", downloadLink);

    const sessionId = await getSID(config);

    const response = await fetch(`${config.synologyHost}/webapi/entry.cgi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "synology-download-app": "SynologyDownloadService2",
      },
      credentials: "include",
      body: new URLSearchParams({
        api: "SYNO.DownloadStation2.Task",
        method: "create",
        version: "2",
        type: "url",
        create_list: false,
        destination: destination,
        url: `["${downloadLink}"]`,
        _sid: sessionId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Transfer result:", result);
    return result;
  } catch (error) {
    console.error("Transfer failed:", error);
    throw error;
  }
};

const handleTorrentDownload = async (info) => {
  try {
    // Récupérer la configuration
    const config = await getConfiguration();

    if (!config) {
      openConfigurationPage();
      return;
    }

    const destination = getDestination(config, info.menuItemId);
    if (!destination) return;

    const hash = info.selectionText;
    if (!hash) {
      throw new Error("Impossible d'extraire le hash du torrent");
    }

    const magnetLink = generateMagnetLink(hash);
    const allDebridLink = await uploadToAllDebrid(
      config.alldebridApiKey,
      magnetLink
    );
    await transferToNAS(config, destination, allDebridLink);

    showNotification(
      "Téléchargement Réussi",
      "Le torrent a été téléchargé avec succès !"
    );
  } catch (error) {
    showNotification("Erreur de Téléchargement", error.message);
  }
};

// Configuration initiale
const initializeTorrentDownloader = () => {
  // Créer les menus contextuels lors de l'installation
  chrome.runtime.onInstalled.addListener(createContextMenus);

  // Écouter les clics sur les menus contextuels
  chrome.contextMenus.onClicked.addListener(handleTorrentDownload);
};

// Lancer l'initialisation
initializeTorrentDownloader();
