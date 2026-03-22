Module.register("MMM-RemoteView", {
  defaults: {
    port: 8088,
    showControls: false,
    transitionDuration: 500,
  },

  start: function() {
    Log.info("Starting module: " + this.name);
    this.sendSocketNotification("CONFIG", this.config);
    this.currentState = "hidden"; // hidden, url, image
    this.currentUrl = "";
    this.currentImage = "";
  },

  getStyles: function() {
    return ["MMM-RemoteView.css"];
  },

  getDom: function() {
    const wrapper = document.createElement("div");
    wrapper.id = "mmrv-wrapper";
    // Inline styles as per requirements (can also be in css, but let's ensure it's here)
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.background = "black";
    wrapper.style.position = "absolute";
    wrapper.style.top = "0";
    wrapper.style.left = "0";
    wrapper.style.zIndex = "999";
    wrapper.style.display = "none";
    wrapper.style.transition = `opacity ${this.config.transitionDuration}ms ease-in-out`;
    wrapper.style.opacity = "0";

    // We now use an image to display the screenshot of the URL, not an iframe
    const urlImg = document.createElement("img");
    urlImg.id = "mmrv-url-image";
    urlImg.style.width = "100%";
    urlImg.style.display = "none";
    urlImg.style.objectFit = "contain";
    urlImg.style.position = "absolute";
    urlImg.style.top = "0";

    const scrollContainer = document.createElement("div");
    scrollContainer.id = "mmrv-scroll-container";
    scrollContainer.style.width = "100%";
    scrollContainer.style.height = "100%";
    scrollContainer.style.overflow = "hidden";
    scrollContainer.style.display = "none";
    scrollContainer.style.position = "relative";
    scrollContainer.appendChild(urlImg);

    const img = document.createElement("img");
    img.id = "mmrv-image";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.style.display = "none";

    // Loading overlay
    const loadingOverlay = document.createElement("div");
    loadingOverlay.id = "mmrv-loading-overlay";
    loadingOverlay.style.position = "absolute";
    loadingOverlay.style.top = "0";
    loadingOverlay.style.left = "0";
    loadingOverlay.style.width = "100%";
    loadingOverlay.style.height = "100%";
    loadingOverlay.style.display = "none";
    loadingOverlay.style.flexDirection = "column";
    loadingOverlay.style.alignItems = "center";
    loadingOverlay.style.justifyContent = "center";
    loadingOverlay.style.backgroundColor = "black";
    loadingOverlay.style.zIndex = "1000";

    // Spinner for loading states
    const spinner = document.createElement("div");
    spinner.id = "mmrv-spinner";
    spinner.style.width = "50px";
    spinner.style.height = "50px";
    spinner.style.border = "5px solid rgba(255, 255, 255, 0.3)";
    spinner.style.borderTop = "5px solid #ffffff";
    spinner.style.borderRadius = "50%";
    spinner.style.animation = "mmrv-spin 1s linear infinite";

    // Text under spinner
    const loadingText = document.createElement("div");
    loadingText.id = "mmrv-loading-text";
    loadingText.innerText = "Preparing website casting...";
    loadingText.style.marginTop = "20px";
    loadingText.style.color = "white";
    loadingText.style.fontFamily = "sans-serif";
    loadingText.style.fontSize = "20px";

    loadingOverlay.appendChild(spinner);
    loadingOverlay.appendChild(loadingText);

    // Add keyframes for spinner if not exists
    let style = document.createElement("style");
    style.innerHTML = `
      @keyframes mmrv-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    wrapper.appendChild(scrollContainer);
    wrapper.appendChild(img);
    wrapper.appendChild(loadingOverlay);

    return wrapper;
  },

  socketNotificationReceived: function(notification, payload) {
    const wrapper = document.getElementById("mmrv-wrapper");
    const scrollContainer = document.getElementById("mmrv-scroll-container");
    const urlImg = document.getElementById("mmrv-url-image");
    const img = document.getElementById("mmrv-image");
    const loadingOverlay = document.getElementById("mmrv-loading-overlay");

    if (!wrapper || !scrollContainer || !urlImg || !img) return;

    if (notification === "showUrl") {
      const port = this.config.port || 8088;
      const hostname = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
      const url = `http://${hostname}:${port}/screenshot?url=${encodeURIComponent(payload.url)}&t=${Date.now()}`;
      
      // Show loading overlay while loading
      if (loadingOverlay) loadingOverlay.style.display = "flex";
      
      // Add onload event to hide spinner when image is loaded
      urlImg.onload = () => {
        if (loadingOverlay) loadingOverlay.style.display = "none";
      };
      // In case of error loading the image
      urlImg.onerror = () => {
        if (loadingOverlay) loadingOverlay.style.display = "none";
      };
      
      urlImg.src = url;
      
      // Reset scroll
      urlImg.style.transform = `translateY(0px)`;
      this.currentScrollY = 0;

      scrollContainer.style.display = "block";
      urlImg.style.display = "block";
      img.style.display = "none";
      wrapper.style.display = "block";
      
      setTimeout(() => {
        wrapper.style.opacity = "1";
      }, 10);
      this.currentState = "url";
    } else if (notification === "showImage") {
      const port = this.config.port || 8088;
      const hostname = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
      // We prepend the hostname in case the payload path is relative
      const imgUrl = payload.path.startsWith('http') ? payload.path : `http://${hostname}:${port}${payload.path.startsWith('/') ? '' : '/'}${payload.path}`;
      img.src = imgUrl;
      
      img.style.display = "block";
      scrollContainer.style.display = "none";
      urlImg.style.display = "none";
      wrapper.style.display = "block";
      
      setTimeout(() => {
        wrapper.style.opacity = "1";
      }, 10);
      this.currentState = "image";
    } else if (notification === "hide") {
      wrapper.style.opacity = "0";
      if (loadingOverlay) loadingOverlay.style.display = "none";
      setTimeout(() => {
        wrapper.style.display = "none";
        scrollContainer.style.display = "none";
        urlImg.style.display = "none";
        img.style.display = "none";
        urlImg.src = "";
        img.src = "";
      }, this.config.transitionDuration);
      this.currentState = "hidden";
    } else if (notification === "scroll") {
      if (this.currentState === "url") {
        this.currentScrollY = payload.y;
        urlImg.style.transform = `translateY(-${payload.y}px)`;
        urlImg.style.transition = 'transform 0.3s ease-out';
      }
    }
  }
});
