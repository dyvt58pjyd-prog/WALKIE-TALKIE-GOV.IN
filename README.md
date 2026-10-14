# 🇮🇳 BHARAT-COM // TACTICAL SECURE SDR INTERCOM
### रक्षा मंत्रालय | Ministry of Defence — Government of India
**BEL / DRDO Tactical Software Defined Radio (SDR) Intercom System**

---

## 🎖️ Overview

**BHARAT-COM** is an advanced, military-spec Tactical Walkie-Talkie and Intercom Progressive Web App (PWA) designed for the **Ministry of Defence (MoD), Government of India**. 

It features real-time half-duplex voice communication, live voice fluctuations with decibel VU metering, authentic military DSP biquad filtering, synthesized roger beeps, squelch burst audio effects, an audio replay log, and official Government of India branding with the **State Emblem of India (Lion Capital of Ashoka with सत्यमेव जयते)**.

---

## 🔐 Access Control & Service Console

Access to BHARAT-COM is restricted to authorized personnel of the Ministry of Defence and Armed Forces.

* **Field Operators:** Log in using their assigned Defence Employee ID and security token.
* **Service Department / Signal Corps:** Access the central Command Console to manage personnel IDs, monitor tactical channels, clear locks, and review recorded communications.

---

## 🚀 Key Features

1. **Official Ministry of Defence (MoD) Branding**:
   - Scalable gold vector of the **National Emblem of India (Ashoka Lion Capital)** as favicon and app icon.
   - Bilingual Indian Government masthead: *भारत सरकार • रक्षा मंत्रालय* / *Government of India • Ministry of Defence*.
   - Tri-services division indicators (Indian Army, Indian Navy, Indian Air Force).
   - Authentic Indian Defence callsigns (`GARUD-1`, `PARA-SF`, `MARCOS-6`, `GORKHA-9`, `VIKRAM-7`, etc.).

2. **Live Voice Fluctuations & Metering**:
   - **Real-Time Decibel VU Meter**: 10-segment LED ladder (`-48 dB` to `+3 dB`) with color gating (Green -> Amber -> Red peak overload).
   - **Dual Visualizer Modes**:
     - *Oscilloscope Waveform*: High-speed real-time time-domain voice wave with phosphor glow.
     - *32-Band FFT Frequency Bars*: Displays spectral energy fluctuations corresponding to syllables and vocal resonance.
   - **Voice Analytics**: Pitch register estimator (Bass, Mid, High Sibilant), Modulation Depth percentage, and Peak-Hold decibel detector.

3. **Military Radio DSP & Authentic Sound FX**:
   - **Narrowband Mil-Spec Filter**: Bandpass (350Hz–3200Hz) with speech presence peak (+4dB at 2.1kHz) and subtle analog harmonic saturation.
   - **Roger Beep Synthesizer**: Indian Army Tactical Chirp, IAF Air Defence 2-Tone, ISRO Quindar Tone, and Mechanical Squelch Click.
   - **Half-Duplex Collision Lock**: Enforces real radio behavior — when an operator transmits, the channel is marked `BUSY`, and incoming listeners hear the transmission in real-time.
   - **Squelch Tail & Mic Click**: Pure Web Audio API synthesis (zero external audio file dependencies).

4. **Tactical Capabilities**:
   - **Comms Replay Log**: Automatically caches incoming radio transmissions into audio bursts with instant `[▶ REPLAY]` playback.
   - **Guarded Mayday Emergency Distress**: Priority alarm tone and GPS grid broadcast across all channels.
   - **VOX (Voice Activated Transmission)**: Automatic hands-free transmission when speaking above the threshold.
   - **Rotary Knobs**: Tactical Volume, Squelch Threshold (SQL), and Mic Sensitivity controls.

5. **PWA (Progressive Web App)**:
   - Installable directly on **Android, iOS, Windows, macOS, and Linux**.
   - Offline asset caching with Service Worker (`sw.js`).
   - Orientation-friendly layout for smartphones and widescreen command centers.

---

## 📡 Tactical Defence Channels

| Channel | Identifier | Frequency | Operational Sector |
|---|---|---|---|
| **CH 01** | **TRISHUL** | 142.850 MHz | Northern Sector Recon & Border Patrol |
| **CH 02** | **BRAHMOS** | 148.125 MHz | Western Sector Tactical Strike Comms |
| **CH 03** | **GARUD** | 151.400 MHz | Air Defence & Airborne Interceptor Net |
| **CH 04** | **MARCOS** | 155.675 MHz | Maritime & Coastal Quick Reaction |
| **CH 05** | **DHANUSH** | 162.025 MHz | Artillery & Fire Direction Control |
| **CH 06** | **AGNI** | 168.350 MHz | Integrated Defence Staff Joint HQ |
| **CH 07** | **SURYAKIRAN** | 171.900 MHz | Special Forces Direct Action Team |
| **CH 08** | **SANJEEVANI 9** | 121.500 MHz | Search & Rescue / Medevac Guard (Distress) |

---

## 💻 Local Quick Start

To run the application locally on your computer:

```bash
cd /Users/anurag.bawaskar/.gemini/antigravity-ide/scratch/tactical-walkie-talkie
npm install
npm start
```

Open your browser and navigate to:
**`http://localhost:3030`**

### Testing Between Two Devices on the Same Wi-Fi:
1. Find your machine's local IP address (e.g. `192.168.1.15`).
2. Open `http://192.168.1.15:3030` on another computer or smartphone connected to the same Wi-Fi.
3. Tune both devices to the same channel (e.g., **CH 01 TRISHUL**).
4. Hold **PUSH TO TALK** (or press `Spacebar`) on one device and speak — the other device will instantly receive the live audio transmission with squelch and roger beeps!

---

## 🌐 How to Deploy to Public Internet (Free 1-Click Hosting)

The application is completely self-contained with Node.js and WebSockets, ready for cloud deployment.

### Option 1: Render.com (Recommended — 100% Free)
1. Push this folder to a GitHub repository.
2. Go to [Render.com](https://render.com) and click **New + > Web Service**.
3. Select your GitHub repository.
4. Set the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Click **Create Web Service**.
6. Render will provide a live HTTPS URL (e.g., `https://bharat-com.onrender.com`).
   *Because Render uses HTTPS, WebSockets will automatically connect via secure `wss://`, and microphone permissions will work seamlessly!*

### Option 2: Railway.app
1. Go to [Railway.app](https://railway.app).
2. Click **New Project > Deploy from GitHub Repo**.
3. Railway automatically detects `package.json` and `Procfile` and deploys in seconds.

### Option 3: Glitch.com
1. Go to [Glitch.com](https://glitch.com).
2. Click **New Project > Import from GitHub**.
3. It immediately runs live with instant public URL!

---

## 📲 How to Install as an App (PWA)

- **Android (Chrome)**: Open the URL -> Tap the 3 dots menu -> Tap **"Install app"** or **"Add to Home screen"**.
- **iOS / iPhone (Safari)**: Open the URL in Safari -> Tap the **Share** button -> Tap **"Add to Home Screen"**.
- **Desktop (Chrome / Edge / Brave)**: Click the **"📲 INSTALL APP"** button in the header, or click the computer icon in the browser address bar.

---

## ⌨️ Tactical Hotkeys

| Key | Action |
|---|---|
| `Spacebar` / `T` | **Push To Talk (PTT)** (Hold to transmit) |
| `1` – `8` | Quick Channel Hop (Preset CH 1 to CH 8) |
| `V` | Toggle **VOX Auto-Transmission** |
| `M` | **Mute / Unmute** Audio |
