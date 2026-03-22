# MMM-RemoteView

`MMM-RemoteView` is a [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) module that allows you to instantly control your mirror's display right from your smartphone's web browser. 

Whether you want to show a specific webpage to your family (using a fast backend screencasting process) or quickly cast a photo from your phone's camera roll directly onto your MagicMirror screen, `MMM-RemoteView` handles it seamlessly without requiring any apps to be installed.

> **Why use this module over MMM-EmbedURL or MMM-WebView?**
> Standard modules often rely on `<iframe>` tags or Electron's built-in `webview` components. However, many users run MagicMirror exclusively through a standard web browser (like Firefox or Midori in server-only mode) instead of the Electron app. In a standard browser, displaying websites securely is highly restricted by `X-Frame-Options` and `CORS` headers (blocking most modern websites from being embedded).
> 
> `MMM-RemoteView` solves this by taking a blazing-fast server-side screenshot of the website using `wkhtmltoimage`, bypassing all iframe restrictions completely and safely displaying the image of the website instead!

## Features

- **📱 Mobile Web Interface:** Provides a slick, responsive, and touch-friendly mobile interface accessible from any device on your local network.
- **🌐 Cast Websites:** Paste a URL to display a full-screen, high-quality rendering of any website on your mirror. 
  - *Note: It uses `wkhtmltoimage` to take a snapshot of the page, completely bypassing complex iframe restrictions (`X-Frame-Options` & `CORS`) that block most websites!*
- **📜 Scroll Support:** Includes "Scroll Up" and "Scroll Down" buttons on your phone to navigate long web articles on the mirror display in real-time.
- **📸 Upload Images:** Select an image directly from your phone's gallery and push it instantly to the mirror. Perfect for showing off photos!
- **⚡ Real-time Control:** Uses WebSockets for instant, lag-free communication between your phone and the MagicMirror display.

---

## Installation

### 1. Install `wkhtmltopdf` (Required)
The module relies on the command line tool `wkhtmltoimage` to securely render websites without iframe blocking issues.

**For Raspberry Pi (Raspbian/Debian/Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install wkhtmltopdf
```
*(This installs both `wkhtmltopdf` and `wkhtmltoimage`.)*

### 2. Install the Module
Clone the repository into your MagicMirror `modules` folder and install the necessary Node.js dependencies:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/YOUR_GITHUB_USERNAME/MMM-RemoteView.git
cd MMM-RemoteView
npm install
```

---

## Configuration

Add the module to your `config/config.js` file.

```javascript
{
  module: "MMM-RemoteView",
  position: "fullscreen_above", // Recommended to overlay other modules
  config: {
    port: 8088,                 // Port for the mobile interface
    transitionDuration: 500     // Fade transition in milliseconds
  }
}
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `port` | `number` | `8088` | The port your mobile device connects to. E.g., `http://magicmirror.local:8088` |
| `transitionDuration` | `number` | `500` | The duration of the fade-in/out effect when showing or hiding content. |

---

## How to use

1. Start your MagicMirror.
2. Ensure your smartphone is connected to the same Wi-Fi network as your MagicMirror.
3. Open a web browser on your smartphone and navigate to:  
   `http://<IP_ADDRESS_OF_YOUR_MIRROR>:8088`  
   *(Example: `http://192.168.1.100:8088` or `http://magicmirror.local:8088`)*
4. From the mobile interface, you can:
   - Enter a URL and tap **"Cast to mirror"**.
   - Tap **"Choose file"**, select an image, and tap **"Send to mirror"**.
   - Tap **"Close / return to mirror"** to dismiss the image/webpage and reveal your regular MagicMirror modules again.

## Customizing Website Renders
The module includes a `custom.css` file which is automatically injected into websites before they are rendered on your mirror. This is incredibly useful for hiding annoying cookie banners or popups! 
You can edit `modules/MMM-RemoteView/custom.css` and add your own CSS rules.

---

## License
MIT License. See the LICENSE file for details.