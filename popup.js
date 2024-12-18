document.addEventListener("DOMContentLoaded", function () {
  const configForm = document.getElementById("configForm");
  const statusMessage = document.getElementById("statusMessage");

  // Charger la configuration existante
  chrome.storage.sync.get("torrentDownloaderConfig", function (data) {
    if (data.torrentDownloaderConfig) {
      const config = data.torrentDownloaderConfig;
      document.getElementById("alldebridApiKey").value =
        config.alldebridApiKey || "";
      document.getElementById("synologyHost").value = config.synologyHost || "";
      document.getElementById("synologyUsername").value =
        config.synologyUsername || "";
      document.getElementById("downloadStationMoviesPath").value =
        config.downloadStationMoviesPath || "";
      document.getElementById("downloadStationSeriesPath").value =
        config.downloadStationSeriesPath || "";
    }
  });

  // Gestion de la soumission du formulaire
  configForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = {
      alldebridApiKey: document.getElementById("alldebridApiKey").value,
      synologyHost: document.getElementById("synologyHost").value,
      synologyUsername: document.getElementById("synologyUsername").value,
      synologyPassword: document.getElementById("synologyPassword").value,
      downloadStationMoviesPath: document.getElementById(
        "downloadStationMoviesPath"
      ).value,
      downloadStationSeriesPath: document.getElementById(
        "downloadStationSeriesPath"
      ).value,
    };

    // Effacer les messages précédents
    statusMessage.innerHTML = "";
    statusMessage.classList.remove("error", "success");

    // Enregistrer la configuration
    chrome.storage.sync.set(
      {
        torrentDownloaderConfig: formData,
      },
      function () {
        if (chrome.runtime.lastError) {
          statusMessage.innerHTML = "Erreur lors de l'enregistrement";
          statusMessage.classList.add("error");
        } else {
          statusMessage.innerHTML = "Configuration enregistrée avec succès !";
          statusMessage.classList.add("success");
        }
      }
    );
  });
});
