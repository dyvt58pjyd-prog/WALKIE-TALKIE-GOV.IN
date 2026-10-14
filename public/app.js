/**
 * BHARAT-COM // TACTICAL SECURE SDR INTERCOM
 * Ministry of Defence - Government of India
 * Command Authorization Terminal, Live Clocks, Biometric Scanner, Tactical Pinpad
 */

class TacticalRadioApp {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.employeeId = '';
    this.callsign = 'GARUD-1';
    this.currentChannel = 1;
    this.channels = [];
    this.channelLocks = {};

    // Authentication & Role State
    this.isAuthenticated = false;
    this.isServiceConsole = false;
    this.authRole = 'field'; // 'field' | 'service'
    this.activeInputTarget = null;
    this.pendingAuthCallsign = 'GARUD-1';

    // Service Department C4I Master State
    this.serviceState = {
      authorizedPersonnel: [],
      masterCommsLog: [],
      activeNodes: [],
      channels: [],
      channelLocks: {}
    };
    this.interceptedAudioBlobs = new Map();

    // Audio Engine State
    this.audioCtx = null;
    this.micStream = null;
    this.micSourceNode = null;
    this.micGainNode = null;
    this.tacticalFilterHighpass = null;
    this.tacticalFilterLowpass = null;
    this.tacticalFilterPeak = null;
    this.distortionNode = null;
    this.masterGainNode = null;
    this.analyserNode = null;

    // Filter Mode
    this.isTacticalFilter = true;
    this.rogerBeepType = 'motorola';

    // Visualizer View Mode: 'waveform' | 'fft'
    this.scopeMode = 'waveform';

    // Live Voice Fluctuations & Metering
    this.peakDecibel = -96;
    this.lastPitchEstimate = 'STEADY';

    // PTT & Transmission State
    this.isTransmitting = false;
    this.isReceiving = false;
    this.pttMode = 'momentary';
    this.txStartTime = 0;
    this.txTimerInterval = null;

    // Hardware Knobs
    this.volume = 0.85;
    this.squelchLevel = 4;
    this.micGain = 1.0;

    // VOX State
    this.isVoxActive = false;
    this.voxThreshold = 0.04;
    this.voxSilenceTimer = null;

    // Replay Log Buffer
    this.activeRxChunks = [];
    this.activeRxCallsign = '';
    this.activeRxStartTime = 0;
    this.replayLog = [];

    // Hardware Telemetry
    this.gpsGrid = '43Q BK 9284 1024';

    // Audio stream recorder
    this.mediaRecorder = null;
    this.deferredInstallPrompt = null;

    this.initDOM();
    this.initEventListeners();
    this.initClocks();
    this.initPWA();
    this.initGeolocation();
  }

  /* =========================================================
     DOM REFERENCES & INITIALIZATION
  ========================================================= */
  initDOM() {
    this.dom = {
      // Command Login Deck
      modLoginOverlay: document.getElementById('modLoginOverlay'),
      commandDeck: document.querySelector('.command-terminal-deck'),
      tabFieldMode: document.getElementById('tabFieldMode'),
      tabServiceMode: document.getElementById('tabServiceMode'),
      paneFieldOperator: document.getElementById('paneFieldOperator'),
      paneServiceDepartment: document.getElementById('paneServiceDepartment'),

      // Field Operator Form
      modAuthForm: document.getElementById('modAuthForm'),
      inputEmpId: document.getElementById('inputEmpId'),
      inputPasscode: document.getElementById('inputPasscode'),
      inputCallsign: document.getElementById('inputCallsign'),
      authTerminalConsole: document.getElementById('authTerminalConsole'),
      btnAuthSubmit: document.getElementById('btnAuthSubmit'),

      // Service Department Form
      serviceAuthForm: document.getElementById('serviceAuthForm'),
      inputServiceKey: document.getElementById('inputServiceKey'),
      selectServiceDept: document.getElementById('selectServiceDept'),
      inputServiceStation: document.getElementById('inputServiceStation'),
      serviceTerminalConsole: document.getElementById('serviceTerminalConsole'),
      btnServiceAuthSubmit: document.getElementById('btnServiceAuthSubmit'),

      // Header Navigation & Telemetry
      btnLogoutSecure: document.getElementById('btnLogoutSecure'),
      activeEmpIdTag: document.getElementById('activeEmpIdTag'),
      profileEmpId: document.getElementById('profileEmpId'),
      btnSwitchToConsole: document.getElementById('btnSwitchToConsole'),
      btnSwitchToRadio: document.getElementById('btnSwitchToRadio'),
      connStatus: document.getElementById('connStatus'),
      totalOnlineCount: document.getElementById('totalOnlineCount'),
      btnInstallPwa: document.getElementById('btnInstallPwa'),

      // Main Workbenches & Mobile Tactical Dock
      radioWorkbench: document.getElementById('radioWorkbench'),
      serviceConsoleDashboard: document.getElementById('serviceConsoleDashboard'),
      mobileTacticalDock: document.getElementById('mobileTacticalDock'),
      mobDockBtns: document.querySelectorAll('.mob-dock-btn'),
      rackLeftFlank: document.getElementById('rackLeftFlank'),
      rackCenterTransceiver: document.getElementById('rackCenterTransceiver'),
      rackRightFlank: document.getElementById('rackRightFlank'),

      // Service Console Elements
      btnExportAuditLog: document.getElementById('btnExportAuditLog'),
      btnConsoleReturnRadio: document.getElementById('btnConsoleReturnRadio'),
      consoleTabBtns: document.querySelectorAll('.c-tab-btn[data-tab]'),
      consoleTabPanes: document.querySelectorAll('.console-tab-pane'),

      // Registry Form & Table
      formAssignDefenceId: document.getElementById('formAssignDefenceId'),
      newEmpIdInput: document.getElementById('newEmpIdInput'),
      btnAutoGenerateId: document.getElementById('btnAutoGenerateId'),
      newCallsignInput: document.getElementById('newCallsignInput'),
      newCorpsSelect: document.getElementById('newCorpsSelect'),
      newClearanceSelect: document.getElementById('newClearanceSelect'),
      newPasscodePin: document.getElementById('newPasscodePin'),
      btnSubmitAssignId: document.getElementById('btnSubmitAssignId'),
      assignFeedback: document.getElementById('assignFeedback'),
      searchRegistryInput: document.getElementById('searchRegistryInput'),
      registryTableBody: document.getElementById('registryTableBody'),
      totalRegCount: document.getElementById('totalRegCount'),
      activeRegCount: document.getElementById('activeRegCount'),
      revokedRegCount: document.getElementById('revokedRegCount'),

      // Wiretap & Audit Logs
      channelsWiretapStrip: document.getElementById('channelsWiretapStrip'),
      serviceLogCount: document.getElementById('serviceLogCount'),
      wiretapLogTableBody: document.getElementById('wiretapLogTableBody'),

      // Spectrum & Carrier Override
      carrierOverrideGrid: document.getElementById('carrierOverrideGrid'),

      // Active Nodes
      activeNodesCount: document.getElementById('activeNodesCount'),
      activeNodesTableBody: document.getElementById('activeNodesTableBody'),

      // HQ All-Net Directive
      formAllNetDirective: document.getElementById('formAllNetDirective'),
      directivePriority: document.getElementById('directivePriority'),
      directiveMessage: document.getElementById('directiveMessage'),
      btnSendDirective: document.getElementById('btnSendDirective'),
      directiveFeedback: document.getElementById('directiveFeedback'),
      allNetDirectiveModal: document.getElementById('allNetDirectiveModal'),
      directiveSenderStrip: document.getElementById('directiveSenderStrip'),
      directiveMessageContent: document.getElementById('directiveMessageContent'),
      btnAckDirective: document.getElementById('btnAckDirective'),
      directiveCloseBtn: document.getElementById('directiveCloseBtn'),

      // Clocks & Biometrics
      loginClockIst: document.getElementById('loginClockIst'),
      loginClockZulu: document.getElementById('loginClockZulu'),
      bioScannerPad: document.getElementById('bioScannerPad'),
      bioStatusTxt: document.getElementById('bioStatusTxt'),

      // Pinpad
      pinKeys: document.querySelectorAll('.pin-key[data-val]'),
      btnPinClear: document.getElementById('btnPinClear'),
      btnPinBack: document.getElementById('btnPinBack'),

      // Channels & Sidebar
      channelListContainer: document.getElementById('channelListContainer'),
      btnFilterTactical: document.getElementById('btnFilterTactical'),
      btnFilterHifi: document.getElementById('btnFilterHifi'),
      rogerBeepSelect: document.getElementById('rogerBeepSelect'),

      // Knobs
      volKnob: document.getElementById('volKnob'),
      volIndicator: document.getElementById('volIndicator'),
      volValue: document.getElementById('volValue'),

      sqlKnob: document.getElementById('sqlKnob'),
      sqlIndicator: document.getElementById('sqlIndicator'),
      sqlValue: document.getElementById('sqlValue'),

      gainKnob: document.getElementById('gainKnob'),
      gainIndicator: document.getElementById('gainIndicator'),
      gainValue: document.getElementById('gainValue'),

      // OLED Screen
      oledFreqDisplay: document.getElementById('oledFreqDisplay'),
      oledChannelNumber: document.getElementById('oledChannelNumber'),
      oledChannelName: document.getElementById('oledChannelName'),
      oledChannelDesc: document.getElementById('oledChannelDesc'),
      transceiverStateTag: document.getElementById('transceiverStateTag'),
      scopeCanvas: document.getElementById('scopeCanvas'),
      btnScopeWave: document.getElementById('btnScopeWave'),
      btnScopeBars: document.getElementById('btnScopeBars'),
      txDurationCounter: document.getElementById('txDurationCounter'),
      carrierLabel: document.getElementById('carrierLabel'),
      activeSpeakerLabel: document.getElementById('activeSpeakerLabel'),
      myCallsignDisplay: document.getElementById('myCallsignDisplay'),
      myGridDisplay: document.getElementById('myGridDisplay'),
      oledVoxBadge: document.getElementById('oledVoxBadge'),
      rssiBars: document.getElementById('rssiBars'),

      // Live Voice Fluctuation Elements
      vuSegments: document.getElementById('vuSegments').querySelectorAll('.seg'),
      vuDbReadout: document.getElementById('vuDbReadout'),
      voicePitchVal: document.getElementById('voicePitchVal'),
      voiceModDepth: document.getElementById('voiceModDepth'),
      voicePeakHold: document.getElementById('voicePeakHold'),

      // LEDs
      ledTx: document.getElementById('ledTx'),
      ledRx: document.getElementById('ledRx'),
      ledSec: document.getElementById('ledSec'),
      ledPwr: document.getElementById('ledPwr'),
      ledBusy: document.getElementById('ledBusy'),

      // PTT Controls
      pttButton: document.getElementById('pttButton'),
      btnModeHold: document.getElementById('btnModeHold'),
      btnModeLatch: document.getElementById('btnModeLatch'),
      btnVoxToggle: document.getElementById('btnVoxToggle'),
      keypadButtons: document.querySelectorAll('.key-btn'),
      btnDistressMayday: document.getElementById('btnDistressMayday'),

      // Right Panel
      profileCallsignBadge: document.getElementById('profileCallsignBadge'),
      btnEditCallsign: document.getElementById('btnEditCallsign'),
      replayCount: document.getElementById('replayCount'),
      replayList: document.getElementById('replayList'),
      rosterList: document.getElementById('rosterList'),
      rosterCount: document.getElementById('rosterCount'),

      // Modals
      callsignModal: document.getElementById('callsignModal'),
      callsignInput: document.getElementById('callsignInput'),
      btnSaveCallsign: document.getElementById('btnSaveCallsign'),
      btnCancelCallsign: document.getElementById('btnCancelCallsign'),
      modalCloseBtn: document.getElementById('modalCloseBtn'),
      chipSuggests: document.querySelectorAll('.chip-suggest')
    };

    this.scopeCtx = this.dom.scopeCanvas.getContext('2d');
    this.activeInputTarget = this.dom.inputEmpId;
  }

  /* =========================================================
     LIVE MILITARY CLOCKS (IST & ZULU)
  ========================================================= */
  initClocks() {
    const update = () => {
      const now = new Date();
      // IST
      const istOptions = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
      this.dom.loginClockIst.textContent = now.toLocaleTimeString('en-US', istOptions);

      // ZULU (UTC)
      const zuluOptions = { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
      this.dom.loginClockZulu.textContent = `${now.toLocaleTimeString('en-US', zuluOptions)}Z`;
    };

    update();
    setInterval(update, 1000);
  }

  /* =========================================================
     HARD LOGIN & AUTHENTICATION (NO ONE-CLICK BYPASS)
  ========================================================= */
  maskEmployeeId(id) {
    if (!id || id === 'UNASSIGNED' || id === 'UNRECORDED') return 'AUTHENTICATED';
    if (typeof id !== 'string') id = String(id);
    if (id.startsWith('MOD-SERVICE') || id.startsWith('C4I')) return 'C4I-SERVICE-MASTER';
    if (id.includes('••')) return id;
    if (id.length <= 4) return '••••';
    return '•••• •••• ' + id.slice(-4);
  }

  checkExistingSession() {
    // OPSEC Rule: Zero auto-login bypass. All sessions start secured to prevent accidental credential leakage.
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (e) {}

    const wipeInputs = () => {
      [
        this.dom.inputEmpId,
        this.dom.inputPasscode,
        this.dom.inputCallsign,
        this.dom.inputServiceKey,
        this.dom.inputServiceStation,
        this.dom.newEmpIdInput,
        this.dom.newPasscodePin,
        this.dom.newCallsignInput
      ].filter(Boolean).forEach(inp => {
        inp.value = '';
        inp.defaultValue = '';
      });
    };

    wipeInputs();
    setTimeout(wipeInputs, 100);
    setTimeout(wipeInputs, 350);
    setTimeout(wipeInputs, 800);
  }

  handleLoginSubmission(e) {
    e.preventDefault();
    const enteredId = this.dom.inputEmpId.value.trim();
    const enteredPass = this.dom.inputPasscode.value.trim();
    const enteredCallsign = this.dom.inputCallsign.value.trim().toUpperCase() || 'GARUD-1';

    const consoleEl = this.dom.authTerminalConsole;
    const deck = this.dom.commandDeck;

    if (!enteredId) {
      this.playBusyTone();
      consoleEl.className = 'live-auth-terminal error';
      consoleEl.innerHTML = `<span class="terminal-prompt">⚠️</span> ACCESS REJECTED: DEFENCE ID NUMBER CANNOT BE EMPTY.`;
      return;
    }

    if (!enteredPass) {
      this.playBusyTone();
      consoleEl.className = 'live-auth-terminal error';
      consoleEl.innerHTML = `<span class="terminal-prompt">⚠️</span> ACCESS REJECTED: SECURITY PASSCODE / PIN CANNOT BE EMPTY.`;
      return;
    }

    consoleEl.className = 'live-auth-terminal';
    consoleEl.innerHTML = `<span class="terminal-prompt">&gt;</span> TRANSMITTING AUTHENTICATION CHALLENGE TO DEFENCE REGISTRY...`;

    this.pendingAuthCallsign = enteredCallsign;

    // Send challenge to server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'AUTH_REQUEST',
        employeeId: enteredId,
        passcode: enteredPass,
        callsign: enteredCallsign
      }));
    } else {
      setTimeout(() => {
        this.playBusyTone();
        consoleEl.className = 'live-auth-terminal error';
        consoleEl.innerHTML = `<span class="terminal-prompt">⚠️</span> NETWORK ERROR: SECURE GATEWAY OFFLINE. RETRYING LINK...`;
      }, 500);
    }
  }

  handleServiceLoginSubmission(e) {
    e.preventDefault();
    const enteredKey = this.dom.inputServiceKey.value.trim();
    const enteredDept = this.dom.selectServiceDept.value;
    const enteredStation = this.dom.inputServiceStation.value.trim().toUpperCase() || 'HQ-DCCD-MASTER';

    const consoleEl = this.dom.serviceTerminalConsole;

    if (!enteredKey) {
      this.playBusyTone();
      consoleEl.className = 'live-auth-terminal error';
      consoleEl.innerHTML = `<span class="terminal-prompt">⚠️</span> ACCESS REJECTED: SERVICE MASTER KEY REQUIRED.`;
      return;
    }

    consoleEl.className = 'live-auth-terminal';
    consoleEl.innerHTML = `<span class="terminal-prompt">&gt;</span> INTERROGATING C4I SERVICE GATEWAY WITH MASTER CREDENTIALS...`;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SERVICE_LOGIN',
        masterKey: enteredKey,
        unitDesignation: enteredDept,
        stationId: enteredStation
      }));
    } else {
      setTimeout(() => {
        this.playBusyTone();
        consoleEl.className = 'live-auth-terminal error';
        consoleEl.innerHTML = `<span class="terminal-prompt">⚠️</span> SERVICE GATEWAY TIMEOUT. RETRYING ENCRYPTED LINK...`;
      }, 500);
    }
  }

  onAuthSuccess(record) {
    const consoleEl = this.dom.authTerminalConsole;
    this.playRogerBeep('motorola');

    consoleEl.className = 'live-auth-terminal success';
    consoleEl.innerHTML = `<span class="terminal-prompt">✓</span> AUTHORIZATION CONFIRMED // OPERATOR [${record.callsign}] ONLINE`;

    this.employeeId = record.id;
    this.callsign = record.callsign;

    sessionStorage.setItem('bharat_com_auth', JSON.stringify({
      empId: record.id,
      callsign: record.callsign,
      clearance: record.clearance,
      corps: record.corps
    }));

    // Initialize audio on user interaction
    this.initAudioHardware();

    setTimeout(() => {
      this.unlockApplication(record);
    }, 600);
  }

  onAuthFailed(reason) {
    const consoleEl = this.dom.authTerminalConsole;
    const deck = this.dom.commandDeck;

    this.playBusyTone();
    consoleEl.className = 'live-auth-terminal error';
    consoleEl.innerHTML = `<span class="terminal-prompt">⚠️</span> ACCESS REJECTED: ${reason || 'INVALID CREDENTIALS'}`;

    if (deck) {
      deck.classList.add('rejected');
      setTimeout(() => deck.classList.remove('rejected'), 500);
    }
  }

  onServiceAuthSuccess(msg) {
    const consoleEl = this.dom.serviceTerminalConsole;
    this.playRogerBeep('chime');

    consoleEl.className = 'live-auth-terminal success';
    consoleEl.innerHTML = `<span class="terminal-prompt">✓</span> SERVICE MASTER CLEARANCE CONFIRMED // C4I MANAGEMENT CONSOLE ENGAGED`;

    this.isServiceConsole = true;
    this.callsign = msg.stationId || 'HQ-DCCD-MASTER';
    this.employeeId = 'MOD-SERVICE-MASTER';

    sessionStorage.setItem('bharat_com_auth', JSON.stringify({
      isServiceConsole: true,
      callsign: this.callsign,
      empId: this.employeeId
    }));

    this.initAudioHardware();

    setTimeout(() => {
      this.unlockServiceConsole(msg);
    }, 600);
  }

  onServiceAuthFailed(reason) {
    const consoleEl = this.dom.serviceTerminalConsole;
    const deck = this.dom.commandDeck;

    this.playBusyTone();
    consoleEl.className = 'live-auth-terminal error';
    consoleEl.innerHTML = `<span class="terminal-prompt">⚠️</span> ACCESS REJECTED: ${reason || 'INVALID SERVICE CREDENTIALS'}`;

    if (deck) {
      deck.classList.add('rejected');
      setTimeout(() => deck.classList.remove('rejected'), 500);
    }
  }

  unlockApplication(record = {}) {
    this.isAuthenticated = true;
    this.dom.modLoginOverlay.classList.add('authenticated');

    const maskedEmpId = this.maskEmployeeId(this.employeeId);
    this.dom.activeEmpIdTag.textContent = maskedEmpId;
    this.dom.profileEmpId.textContent = maskedEmpId;
    this.dom.myCallsignDisplay.textContent = this.callsign;
    this.dom.profileCallsignBadge.textContent = this.callsign;
    this.dom.callsignInput.value = this.callsign;

    // Show Radio view, hide service console by default for operators
    this.showRadioTransceiver();

    if (this.isServiceConsole) {
      this.dom.btnSwitchToConsole.style.display = 'inline-flex';
      this.dom.btnSwitchToRadio.style.display = 'none';
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'UPDATE_PROFILE',
        callsign: this.callsign,
        employeeId: this.employeeId,
        location: this.gpsGrid
      }));
    }
  }

  unlockServiceConsole(msg = {}) {
    this.isAuthenticated = true;
    this.isServiceConsole = true;
    this.dom.modLoginOverlay.classList.add('authenticated');

    this.dom.activeEmpIdTag.textContent = 'SERVICE-MASTER';
    this.dom.profileEmpId.textContent = 'SERVICE-MASTER';
    this.dom.myCallsignDisplay.textContent = this.callsign;
    this.dom.profileCallsignBadge.textContent = this.callsign;

    // Open Service Console view
    this.showServiceConsole();

    // Enable navigation switch buttons
    this.dom.btnSwitchToConsole.style.display = 'none';
    this.dom.btnSwitchToRadio.style.display = 'inline-flex';
  }

  showRadioTransceiver() {
    this.dom.serviceConsoleDashboard.style.display = 'none';
    this.dom.radioWorkbench.style.display = '';

    if (this.dom.mobileTacticalDock) {
      this.dom.mobileTacticalDock.style.display = window.innerWidth < 1024 ? 'flex' : 'none';
    }

    if (this.isServiceConsole) {
      this.dom.btnSwitchToConsole.style.display = 'inline-flex';
      this.dom.btnSwitchToRadio.style.display = 'none';
    } else {
      this.dom.btnSwitchToConsole.style.display = 'none';
      this.dom.btnSwitchToRadio.style.display = 'none';
    }

    this.handleResponsiveRacks();
    setTimeout(() => this.resizeCanvasForMobile(), 60);
  }

  showServiceConsole() {
    this.dom.radioWorkbench.style.display = 'none';
    this.dom.serviceConsoleDashboard.style.display = 'flex';
    this.dom.serviceConsoleDashboard.style.flexDirection = 'column';
    if (this.dom.mobileTacticalDock) {
      this.dom.mobileTacticalDock.style.display = 'none';
    }
    this.dom.btnSwitchToConsole.style.display = 'none';
    this.dom.btnSwitchToRadio.style.display = 'inline-flex';

    // Programmatically ensure only the active pane is displayed
    if (this.dom.consoleTabPanes) {
      this.dom.consoleTabPanes.forEach(pane => {
        const isActive = pane.classList.contains('active');
        pane.style.display = isActive ? 'block' : 'none';
      });
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'SERVICE_GET_DATA' }));
    }
  }

  handleResponsiveRacks() {
    if (window.innerWidth >= 1024) {
      if (this.dom.rackLeftFlank) this.dom.rackLeftFlank.style.display = '';
      if (this.dom.rackCenterTransceiver) this.dom.rackCenterTransceiver.style.display = '';
      if (this.dom.rackRightFlank) this.dom.rackRightFlank.style.display = '';
      if (this.dom.mobileTacticalDock) this.dom.mobileTacticalDock.style.display = 'none';
    } else {
      if (this.dom.mobileTacticalDock && this.isAuthenticated && !this.isServiceConsole) {
        this.dom.mobileTacticalDock.style.display = 'flex';
      }
      const activeBtn = document.querySelector('.mob-dock-btn.active');
      const target = activeBtn ? activeBtn.getAttribute('data-target') : 'center';
      if (target === 'left') {
        if (this.dom.rackLeftFlank) this.dom.rackLeftFlank.style.display = 'flex';
        if (this.dom.rackCenterTransceiver) this.dom.rackCenterTransceiver.style.display = 'none';
        if (this.dom.rackRightFlank) this.dom.rackRightFlank.style.display = 'none';
      } else if (target === 'right') {
        if (this.dom.rackLeftFlank) this.dom.rackLeftFlank.style.display = 'none';
        if (this.dom.rackCenterTransceiver) this.dom.rackCenterTransceiver.style.display = 'none';
        if (this.dom.rackRightFlank) this.dom.rackRightFlank.style.display = 'flex';
      } else {
        if (this.dom.rackLeftFlank) this.dom.rackLeftFlank.style.display = 'none';
        if (this.dom.rackCenterTransceiver) this.dom.rackCenterTransceiver.style.display = 'flex';
        if (this.dom.rackRightFlank) this.dom.rackRightFlank.style.display = 'none';
      }
    }
  }

  logout() {
    sessionStorage.removeItem('bharat_com_auth');
    this.isAuthenticated = false;
    this.isServiceConsole = false;
    this.stopTransmission();

    this.dom.modLoginOverlay.classList.remove('authenticated');
    this.dom.inputEmpId.value = '';
    this.dom.inputPasscode.value = '';
    this.dom.inputCallsign.value = '';
    this.dom.inputServiceKey.value = '';
    this.dom.activeEmpIdTag.textContent = 'UNAUTHENTICATED';
    this.dom.profileEmpId.textContent = 'LOCKED';
    this.dom.btnSwitchToConsole.style.display = 'none';
    this.dom.btnSwitchToRadio.style.display = 'none';

    this.dom.authTerminalConsole.className = 'live-auth-terminal';
    this.dom.authTerminalConsole.innerHTML = `<span class="terminal-prompt">&gt;</span> TERMINAL SECURED. ENTER CREDENTIALS TO LOG IN.`;

    this.dom.serviceTerminalConsole.className = 'live-auth-terminal';
    this.dom.serviceTerminalConsole.innerHTML = `<span class="terminal-prompt">&gt;</span> SERVICE CONSOLE READY. RESTRICTED TO AUTHORIZED OFFICERS.`;

    this.showRadioTransceiver();
    this.playMicClick();
  }

  /* =========================================================
     PWA SERVICE WORKER & APP INSTALL PROMPT
  ========================================================= */
  initPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) {
          reg.update();
        }
      });
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('[BHARAT-COM] SW registration:', err);
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (this.dom.btnInstallPwa) {
        this.dom.btnInstallPwa.style.display = 'inline-flex';
        this.dom.btnInstallPwa.addEventListener('click', () => {
          this.deferredInstallPrompt.prompt();
          this.deferredInstallPrompt.userChoice.then(() => {
            this.dom.btnInstallPwa.style.display = 'none';
            this.deferredInstallPrompt = null;
          });
        });
      }
    });
  }

  /* =========================================================
     AUDIO HARDWARE INITIALIZATION (Web Audio API)
  ========================================================= */
  async initAudioHardware() {
    try {
      if (this.audioCtx && this.audioCtx.state === 'running') return;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.value = this.volume;
      this.masterGainNode.connect(this.audioCtx.destination);

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.65;
      this.masterGainNode.connect(this.analyserNode);

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.setupMicGraph();
      this.startVisualizerLoop();
      this.initMediaStreamBroadcaster();

      this.playSquelchTail();
      console.log('[BHARAT-COM] Defence Audio Engine Online at', this.audioCtx.sampleRate, 'Hz');
    } catch (err) {
      console.error('[BHARAT-COM] Audio init error:', err);
    }
  }

  setupMicGraph() {
    this.micSourceNode = this.audioCtx.createMediaStreamSource(this.micStream);

    this.micGainNode = this.audioCtx.createGain();
    this.micGainNode.gain.value = this.micGain;

    this.tacticalFilterHighpass = this.audioCtx.createBiquadFilter();
    this.tacticalFilterHighpass.type = 'highpass';
    this.tacticalFilterHighpass.frequency.value = 350;

    this.tacticalFilterLowpass = this.audioCtx.createBiquadFilter();
    this.tacticalFilterLowpass.type = 'lowpass';
    this.tacticalFilterLowpass.frequency.value = 3200;

    this.tacticalFilterPeak = this.audioCtx.createBiquadFilter();
    this.tacticalFilterPeak.type = 'peaking';
    this.tacticalFilterPeak.frequency.value = 2100;
    this.tacticalFilterPeak.Q.value = 2.0;
    this.tacticalFilterPeak.gain.value = 4.0;

    this.distortionNode = this.audioCtx.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(10);

    this.updateAudioFilters();
  }

  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 10;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  updateAudioFilters() {
    if (!this.micSourceNode) return;

    try {
      this.micSourceNode.disconnect();
      this.micGainNode.disconnect();
      this.tacticalFilterHighpass.disconnect();
      this.tacticalFilterLowpass.disconnect();
      this.tacticalFilterPeak.disconnect();
      this.distortionNode.disconnect();
    } catch (_) {}

    if (this.isTacticalFilter) {
      this.micSourceNode.connect(this.micGainNode);
      this.micGainNode.connect(this.tacticalFilterHighpass);
      this.tacticalFilterHighpass.connect(this.tacticalFilterLowpass);
      this.tacticalFilterLowpass.connect(this.tacticalFilterPeak);
      this.tacticalFilterPeak.connect(this.distortionNode);
      this.distortionNode.connect(this.analyserNode);
    } else {
      this.micSourceNode.connect(this.micGainNode);
      this.micGainNode.connect(this.analyserNode);
    }
  }

  /* =========================================================
     SYNTHESIZER SOUND FX (Clicks, Roger Beeps, Squelch)
  ========================================================= */
  playKeypadClick(freq = 940) {
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AC();
    }
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playMicClick() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.03);

    gain.gain.setValueAtTime(0.4 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  playRogerBeep(type = this.rogerBeepType) {
    if (!this.audioCtx || type === 'none') return;
    const now = this.audioCtx.currentTime;

    if (type === 'motorola') {
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1450, now);
      gain1.gain.setValueAtTime(0.3 * this.volume, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.045);

      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1820, now + 0.045);
      gain2.gain.setValueAtTime(0.35 * this.volume, now + 0.045);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.045);
      osc2.stop(now + 0.095);

    } else if (type === 'twotone') {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1760, now + 0.06);
      gain.gain.setValueAtTime(0.3 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.13);

    } else if (type === 'quindar') {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2475, now);
      gain.gain.setValueAtTime(0.28 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

    } else {
      this.playMicClick();
    }
  }

  playSquelchTail() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const bufferSize = this.audioCtx.sampleRate * 0.12;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(1.5, now);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.25 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    noise.start(now);
  }

  playBusyTone() {
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AC();
    }
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);

    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.setValueAtTime(0.0, now + 0.08);
    gain.gain.setValueAtTime(0.3 * this.volume, now + 0.12);
    gain.gain.setValueAtTime(0.0, now + 0.20);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  playEmergencyAlarm() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(960, now);
    osc.frequency.setValueAtTime(770, now + 0.2);
    osc.frequency.setValueAtTime(960, now + 0.4);
    osc.frequency.setValueAtTime(770, now + 0.6);
    osc.frequency.setValueAtTime(960, now + 0.8);

    gain.gain.setValueAtTime(0.4 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 1.0);
  }

  /* =========================================================
     WEBSOCKET REAL-TIME COMMS & CLOUD RESILIENCE
  ========================================================= */
  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.dom.connStatus.textContent = 'ONLINE';
      this.dom.connStatus.style.color = '#33ff88';
      this.dom.ledPwr.classList.add('active');

      if (this.isAuthenticated) {
        this.ws.send(JSON.stringify({
          type: 'UPDATE_PROFILE',
          callsign: this.callsign,
          employeeId: this.employeeId,
          location: this.gpsGrid
        }));
      }
    };

    this.ws.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleIncomingAudioChunk(event.data);
        return;
      }

      try {
        const msg = JSON.parse(event.data);
        this.handleServerMessage(msg);
      } catch (err) {
        console.error('[BHARAT-COM] Parse error:', err);
      }
    };

    this.ws.onclose = () => {
      this.dom.connStatus.textContent = 'RECONNECTING';
      this.dom.connStatus.style.color = '#ffaa00';
      this.dom.ledPwr.classList.remove('active');
      setTimeout(() => this.initWebSocket(), 3000);
    };
  }

  handleServerMessage(msg) {
    switch (msg.type) {
      case 'INIT': {
        this.clientId = msg.clientId;
        this.currentChannel = msg.channel;
        this.channels = msg.channels;
        this.channelLocks = msg.channelLocks;

        this.renderChannelList();
        this.updateActiveChannelDisplay();
        break;
      }

      case 'AUTH_SUCCESS': {
        this.onAuthSuccess(msg.record);
        break;
      }

      case 'AUTH_FAILED': {
        this.onAuthFailed(msg.reason);
        break;
      }

      case 'SERVICE_AUTH_SUCCESS': {
        this.onServiceAuthSuccess(msg);
        break;
      }

      case 'SERVICE_AUTH_FAILED': {
        this.onServiceAuthFailed(msg.reason);
        break;
      }

      case 'SERVICE_STATE_UPDATE': {
        this.renderServiceDashboard(msg);
        break;
      }

      case 'CHANNEL_STATE': {
        this.channelLocks[msg.channelId] = msg.state;
        this.updateActiveChannelDisplay();
        this.updateChannelListItem(msg.channelId);
        if (this.isServiceConsole) {
          this.renderCarrierOverrideGrid(this.channels, this.channelLocks);
          this.renderWiretapChannels(this.channels, this.channelLocks);
        }
        break;
      }

      case 'CHANNEL_SWITCHED': {
        this.currentChannel = msg.channelId;
        this.updateActiveChannelDisplay();
        this.renderChannelList();
        this.playMicClick();
        break;
      }

      case 'TX_GRANTED': {
        this.onTransmissionGranted();
        break;
      }

      case 'TX_DENIED': {
        this.onTransmissionDenied(msg.activeTransmitter);
        break;
      }

      case 'AUDIO_STREAM_START': {
        this.onIncomingStreamStart(msg.callsign, msg.timestamp, msg.channelId);
        break;
      }

      case 'AUDIO_STREAM_END': {
        this.onIncomingStreamEnd(msg.callsign, msg.channelId);
        break;
      }

      case 'EMERGENCY_ALERT': {
        this.onEmergencyAlertReceived(msg);
        break;
      }

      case 'HQ_ALL_NET_BULLETIN': {
        this.onAllNetDirectiveReceived(msg);
        break;
      }

      case 'ACCESS_REVOKED_ALERT': {
        this.onAccessRevoked(msg.message);
        break;
      }

      case 'REMOTE_DISCONNECT': {
        this.onRemoteDisconnect(msg.message);
        break;
      }

      case 'ROSTER_UPDATE': {
        this.updateRoster(msg.roster, msg.totalOnline);
        break;
      }
    }
  }

  /* =========================================================
     AUDIO BROADCASTER (Low-latency MediaRecorder)
  ========================================================= */
  initMediaStreamBroadcaster() {
    if (!this.micStream) return;

    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.micStream, {
        mimeType,
        audioBitsPerSecond: 32000
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.isTransmitting && this.ws && this.ws.readyState === WebSocket.OPEN) {
          event.data.arrayBuffer().then((buffer) => {
            this.ws.send(buffer);
          });
        }
      };
    } catch (err) {
      console.warn('[BHARAT-COM] MediaRecorder fallback:', err);
    }
  }

  /* =========================================================
     INCOMING AUDIO STREAM PLAYBACK & REPLAY LOG
  ========================================================= */
  onIncomingStreamStart(speakerCallsign, timestamp) {
    this.isReceiving = true;
    this.activeRxCallsign = speakerCallsign;
    this.activeRxStartTime = timestamp || Date.now();
    this.activeRxChunks = [];

    this.dom.ledRx.classList.add('active');
    this.dom.ledBusy.classList.add('active');
    this.dom.transceiverStateTag.textContent = 'RECEIVING';
    this.dom.transceiverStateTag.className = 'transceiver-state-tag receiving';
    this.dom.activeSpeakerLabel.textContent = `RX: ${speakerCallsign}`;
    this.dom.carrierLabel.textContent = 'CARRIER OPEN';

    this.dom.pttButton.classList.add('busy-locked');
  }

  async handleIncomingAudioChunk(arrayBuffer) {
    if (!this.isReceiving) return;

    this.activeRxChunks.push(arrayBuffer);

    if (this.audioCtx) {
      try {
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer.slice(0));
        const source = this.audioCtx.createBufferSource();
        source.buffer = audioBuffer;

        if (this.isTacticalFilter) {
          const filter = this.audioCtx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1800;
          filter.Q.value = 1.2;
          source.connect(filter);
          filter.connect(this.masterGainNode);
        } else {
          source.connect(this.masterGainNode);
        }

        source.start();
      } catch (err) {
        // Partial webm slice
      }
    }
  }

  onIncomingStreamEnd(speakerCallsign) {
    this.isReceiving = false;
    this.dom.ledRx.classList.remove('active');
    this.dom.ledBusy.classList.remove('active');
    this.dom.transceiverStateTag.textContent = 'STANDBY';
    this.dom.transceiverStateTag.className = 'transceiver-state-tag';
    this.dom.activeSpeakerLabel.textContent = 'NET IDLE';
    this.dom.carrierLabel.textContent = 'CARRIER SQUELCHED';
    this.dom.pttButton.classList.remove('busy-locked');

    this.playRogerBeep();
    setTimeout(() => this.playSquelchTail(), 140);

    if (this.activeRxChunks.length > 0) {
      const durationSec = Math.max(1, Math.round((Date.now() - this.activeRxStartTime) / 1000));
      const blob = new Blob(this.activeRxChunks, { type: 'audio/webm' });
      this.saveToReplayLog(speakerCallsign, durationSec, blob);
    }
  }

  saveToReplayLog(callsign, durationSec, audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

    this.replayLog.unshift({
      id: Date.now(),
      callsign,
      time: timeStr,
      duration: `${durationSec}s`,
      url: audioUrl
    });

    if (this.replayLog.length > 10) {
      const removed = this.replayLog.pop();
      URL.revokeObjectURL(removed.url);
    }

    this.renderReplayLog();
  }

  renderReplayLog() {
    this.dom.replayCount.textContent = `${this.replayLog.length} BURSTS`;

    if (this.replayLog.length === 0) {
      this.dom.replayList.innerHTML = `<div class="empty-state">No transmissions logged yet. Channel is quiet.</div>`;
      return;
    }

    this.dom.replayList.innerHTML = this.replayLog.map(item => `
      <div class="replay-item">
        <div class="replay-meta">
          <span class="replay-callsign">${item.callsign}</span>
          <span class="replay-time">${item.time} (${item.duration})</span>
        </div>
        <button class="btn-replay-play" data-url="${item.url}">
          <span>▶</span> REPLAY
        </button>
      </div>
    `).join('');

    this.dom.replayList.querySelectorAll('.btn-replay-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        const audio = new Audio(url);
        audio.volume = this.volume;
        this.playSquelchTail();
        audio.play();
      });
    });
  }

  /* =========================================================
     PTT (PUSH TO TALK) LOGIC & STATE HANDLING
  ========================================================= */
  startTransmission() {
    if (!this.isAuthenticated || this.isTransmitting) return;

    if (!this.audioCtx) {
      this.initAudioHardware().then(() => this.startTransmission());
      return;
    }

    const lock = this.channelLocks[this.currentChannel];
    if (lock && lock.active && lock.transmitterId !== this.clientId) {
      this.playBusyTone();
      this.dom.carrierLabel.textContent = `BUSY: ${lock.callsign}`;
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'PTT_START' }));
    }
  }

  onTransmissionGranted() {
    this.isTransmitting = true;
    this.txStartTime = Date.now();

    this.dom.pttButton.classList.add('pressed');
    this.dom.ledTx.classList.add('active');
    this.dom.transceiverStateTag.textContent = 'TRANSMITTING';
    this.dom.transceiverStateTag.className = 'transceiver-state-tag transmitting';
    this.dom.carrierLabel.textContent = 'CARRIER TX HIGH';
    this.dom.activeSpeakerLabel.textContent = `TX: ${this.callsign}`;

    this.playMicClick();

    this.txTimerInterval = setInterval(() => {
      const elapsed = Date.now() - this.txStartTime;
      const sec = Math.floor(elapsed / 1000);
      const ms = Math.floor((elapsed % 1000) / 100);
      this.dom.txDurationCounter.textContent = `00:${sec < 10 ? '0' : ''}${sec}.${ms}`;
    }, 100);

    if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
      try {
        this.mediaRecorder.start(60);
      } catch (err) {
        console.error('MediaRecorder start error:', err);
      }
    }
  }

  onTransmissionDenied(activeSpeaker) {
    this.playBusyTone();
    this.dom.carrierLabel.textContent = `CHANNEL BUSY [${activeSpeaker}]`;
    this.dom.ledBusy.classList.add('active');
    setTimeout(() => this.dom.ledBusy.classList.remove('active'), 1500);
  }

  stopTransmission() {
    if (!this.isTransmitting) return;

    this.isTransmitting = false;

    this.dom.pttButton.classList.remove('pressed');
    this.dom.ledTx.classList.remove('active');
    this.dom.transceiverStateTag.textContent = 'STANDBY';
    this.dom.transceiverStateTag.className = 'transceiver-state-tag';
    this.dom.carrierLabel.textContent = 'CARRIER SQUELCHED';
    this.dom.activeSpeakerLabel.textContent = 'NET IDLE';

    clearInterval(this.txTimerInterval);

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'PTT_END' }));
    }

    this.playRogerBeep();
  }

  toggleTransmissionLatch() {
    if (this.isTransmitting) {
      this.stopTransmission();
    } else {
      this.startTransmission();
    }
  }

  /* =========================================================
     EMERGENCY MAYDAY DISTRESS
  ========================================================= */
  triggerMaydayAlert() {
    this.playEmergencyAlarm();
    this.dom.btnDistressMayday.classList.add('broadcasting');

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'EMERGENCY_MAYDAY',
        location: this.gpsGrid
      }));
    }

    setTimeout(() => {
      this.dom.btnDistressMayday.classList.remove('broadcasting');
    }, 4000);
  }

  onEmergencyAlertReceived(msg) {
    this.playEmergencyAlarm();

    this.dom.carrierLabel.textContent = `🚨 MAYDAY: ${msg.callsign} [GRID: ${msg.location}]`;
    this.dom.carrierLabel.style.color = '#ff2a2a';
    this.dom.ledTx.classList.add('active');

    setTimeout(() => {
      this.dom.carrierLabel.style.color = '';
      this.dom.ledTx.classList.remove('active');
    }, 5000);
  }

  /* =========================================================
     CHANNEL NAVIGATION
  ========================================================= */
  switchChannel(channelId) {
    const chNum = parseInt(channelId, 10);
    if (chNum === this.currentChannel) return;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SWITCH_CHANNEL',
        channelId: chNum
      }));
    }
  }

  renderChannelList() {
    if (!this.channels || this.channels.length === 0) return;

    this.dom.channelListContainer.innerHTML = this.channels.map(ch => {
      const isActive = ch.id === this.currentChannel;
      const isEmerg = ch.isEmergency;
      const lock = this.channelLocks[ch.id];
      const isBusy = lock && lock.active;

      return `
        <div class="channel-card-item ${isActive ? 'active' : ''} ${isEmerg ? 'emergency' : ''}" data-ch="${ch.id}">
          <div class="ch-meta">
            <div class="ch-badge-line">
              <span class="ch-id">CH 0${ch.id}</span>
              <span class="ch-name">${ch.name}</span>
            </div>
            <span class="ch-freq">${ch.freq} &bull; ${ch.desc}</span>
          </div>
          <div class="ch-occupants">
            ${isBusy ? `<span style="color:#ff3333">TX: ${lock.callsign}</span>` : 'CLEAR'}
          </div>
        </div>
      `;
    }).join('');

    this.dom.channelListContainer.querySelectorAll('.channel-card-item').forEach(el => {
      el.addEventListener('click', () => {
        const ch = el.getAttribute('data-ch');
        this.switchChannel(ch);
      });
    });
  }

  updateActiveChannelDisplay() {
    const ch = this.channels.find(c => c.id === this.currentChannel) || {
      id: 1, name: 'TRISHUL', freq: '142.850 MHz', desc: 'Northern Sector Recon & Patrol'
    };

    this.dom.oledChannelNumber.textContent = `CH 0${ch.id}`;
    this.dom.oledChannelName.textContent = ch.name;
    this.dom.oledChannelDesc.textContent = ch.desc;
    this.dom.oledFreqDisplay.textContent = ch.freq;

    const lock = this.channelLocks[this.currentChannel];
    if (lock && lock.active) {
      this.dom.carrierLabel.textContent = `CARRIER ACTIVE [${lock.callsign}]`;
      this.dom.ledBusy.classList.add('active');
    } else {
      this.dom.carrierLabel.textContent = 'CARRIER SQUELCHED';
      this.dom.ledBusy.classList.remove('active');
    }
  }

  updateChannelListItem(channelId) {
    const el = this.dom.channelListContainer.querySelector(`[data-ch="${channelId}"]`);
    if (!el) return;
    const lock = this.channelLocks[channelId];
    const occupantsSpan = el.querySelector('.ch-occupants');
    if (occupantsSpan) {
      occupantsSpan.innerHTML = (lock && lock.active)
        ? `<span style="color:#ff3333">TX: ${lock.callsign}</span>`
        : 'CLEAR';
    }
  }

  /* =========================================================
     SQUAD ROSTER & OPERATOR TELEMETRY
  ========================================================= */
  updateRoster(roster, total) {
    this.dom.totalOnlineCount.textContent = total;
    this.dom.rosterCount.textContent = `${total} ${total === 1 ? 'UNIT' : 'UNITS'}`;

    this.dom.rosterList.innerHTML = roster.map(unit => {
      const isMe = unit.id === this.clientId;
      return `
        <div class="roster-unit-row">
          <div class="unit-info">
            <span class="unit-dot ${unit.isTransmitting ? 'transmitting' : ''}"></span>
            <span class="unit-callsign">${unit.callsign} ${isMe ? '(YOU)' : ''}</span>
          </div>
          <span class="unit-channel-tag">CH 0${unit.channel}</span>
        </div>
      `;
    }).join('');
  }

  saveCallsign(newCallsign) {
    if (!newCallsign || newCallsign.trim() === '') return;
    const sanitized = newCallsign.trim().toUpperCase().substring(0, 14);
    this.callsign = sanitized;
    this.dom.myCallsignDisplay.textContent = sanitized;
    this.dom.profileCallsignBadge.textContent = sanitized;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'UPDATE_PROFILE',
        callsign: sanitized,
        employeeId: this.employeeId,
        location: this.gpsGrid
      }));
    }

    this.dom.callsignModal.classList.remove('open');
    this.playMicClick();
  }

  initGeolocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lon = pos.coords.longitude.toFixed(4);
          this.gpsGrid = `LAT ${lat}° N / LON ${lon}° E`;
          this.dom.myGridDisplay.textContent = this.gpsGrid;
        },
        () => {
          this.gpsGrid = '43Q BK 9284 1024';
          this.dom.myGridDisplay.textContent = this.gpsGrid;
        }
      );
    }
  }

  resizeCanvasForMobile() {
    if (!this.dom.scopeCanvas) return;
    const parent = this.dom.scopeCanvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth - 8;
    if (w > 120) {
      this.dom.scopeCanvas.width = Math.min(480, Math.floor(w));
    }
  }

  /* =========================================================
     LIVE VOICE FLUCTUATIONS & DYNAMIC VISUALIZER ENGINE
  ========================================================= */
  startVisualizerLoop() {
    this.resizeCanvasForMobile();
    const canvas = this.dom.scopeCanvas;
    const ctx = this.scopeCtx;
    const timeDomainArray = new Uint8Array(128);
    const frequencyArray = new Uint8Array(32);

    const updateVUAndFluctuations = (rms, peak) => {
      let db = rms > 0.0001 ? 20 * Math.log10(rms) : -96;
      db = Math.max(-48, Math.min(3, db));

      if (db > this.peakDecibel) {
        this.peakDecibel = db;
      } else {
        this.peakDecibel = Math.max(-48, this.peakDecibel - 0.4);
      }

      const modPercentage = Math.min(100, Math.round(rms * 220));

      this.dom.vuDbReadout.textContent = `${db.toFixed(1)} dB`;
      this.dom.voiceModDepth.textContent = `${modPercentage}%`;
      this.dom.voicePeakHold.textContent = `${this.peakDecibel.toFixed(1)} dB`;

      const litCount = Math.round((rms / 0.5) * 10);
      this.dom.vuSegments.forEach((seg, idx) => {
        if (idx < litCount) {
          seg.classList.add('lit');
        } else {
          seg.classList.remove('lit');
        }
      });

      if (rms > 0.05) {
        if (peak > 18) {
          this.lastPitchEstimate = 'HIGH / SIBILANT';
        } else if (peak > 8) {
          this.lastPitchEstimate = 'MID REGISTER (VOICE)';
        } else {
          this.lastPitchEstimate = 'LOW REGISTER (BASS)';
        }
      } else {
        this.lastPitchEstimate = 'STEADY';
      }
      this.dom.voicePitchVal.textContent = this.lastPitchEstimate;
    };

    const draw = () => {
      requestAnimationFrame(draw);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!this.analyserNode) {
        ctx.strokeStyle = '#18542c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      this.analyserNode.getByteTimeDomainData(timeDomainArray);
      this.analyserNode.getByteFrequencyData(frequencyArray);

      let sum = 0;
      for (let i = 0; i < timeDomainArray.length; i++) {
        const val = (timeDomainArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / timeDomainArray.length);

      let maxBin = 0;
      let maxVal = 0;
      for (let i = 0; i < frequencyArray.length; i++) {
        if (frequencyArray[i] > maxVal) {
          maxVal = frequencyArray[i];
          maxBin = i;
        }
      }

      updateVUAndFluctuations(rms, maxBin);

      if (this.isVoxActive && !this.isTransmitting) {
        if (rms > this.voxThreshold) {
          this.startTransmission();
          clearTimeout(this.voxSilenceTimer);
          this.voxSilenceTimer = setTimeout(() => {
            this.stopTransmission();
          }, 800);
        }
      }

      const isActive = this.isTransmitting || this.isReceiving;

      if (this.scopeMode === 'fft') {
        const barWidth = (canvas.width / frequencyArray.length) - 2;
        for (let i = 0; i < frequencyArray.length; i++) {
          const barHeight = (frequencyArray[i] / 255) * canvas.height;
          const x = i * (barWidth + 2);
          const y = canvas.height - barHeight;

          ctx.fillStyle = this.isTransmitting
            ? `rgba(255, ${Math.max(0, 255 - barHeight * 2)}, 50, 0.9)`
            : `rgba(51, 255, 136, ${isActive ? 0.9 : 0.4})`;

          ctx.fillRect(x, y, barWidth, barHeight);
        }
      } else {
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.strokeStyle = this.isTransmitting ? '#ff3333' : '#33ff88';
        ctx.shadowBlur = isActive ? 8 : 2;
        ctx.shadowColor = this.isTransmitting ? '#ff3333' : '#33ff88';

        ctx.beginPath();
        const sliceWidth = canvas.width / timeDomainArray.length;
        let x = 0;

        for (let i = 0; i < timeDomainArray.length; i++) {
          let v = timeDomainArray[i] / 128.0;
          if (!isActive) {
            v = 1.0 + (Math.random() * 0.03 - 0.015);
          }
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    draw();
  }

  /* =========================================================
     EVENT LISTENERS & HARDWARE INTERACTION
  ========================================================= */
  initEventListeners() {
    // Auth Mode Selector Tabs (Field Operator vs Service Department)
    if (this.dom.tabFieldMode && this.dom.tabServiceMode) {
      this.dom.tabFieldMode.addEventListener('click', () => {
        this.dom.tabFieldMode.classList.add('active');
        this.dom.tabServiceMode.classList.remove('active');
        this.dom.paneFieldOperator.style.display = 'block';
        this.dom.paneServiceDepartment.style.display = 'none';
        this.activeInputTarget = this.dom.inputEmpId;
        this.playKeypadClick(900);
      });

      this.dom.tabServiceMode.addEventListener('click', () => {
        this.dom.tabServiceMode.classList.add('active');
        this.dom.tabFieldMode.classList.remove('active');
        this.dom.paneFieldOperator.style.display = 'none';
        this.dom.paneServiceDepartment.style.display = 'block';
        this.activeInputTarget = this.dom.inputServiceKey;
        this.playKeypadClick(1100);
      });
    }

    // Hard Login Form Submission
    this.dom.modAuthForm.addEventListener('submit', (e) => {
      this.handleLoginSubmission(e);
    });

    // Service Department Console Form Submission
    if (this.dom.serviceAuthForm) {
      this.dom.serviceAuthForm.addEventListener('submit', (e) => {
        this.handleServiceLoginSubmission(e);
      });
    }

    // View Navigation Switchers (Console vs Radio)
    if (this.dom.btnSwitchToConsole) {
      this.dom.btnSwitchToConsole.addEventListener('click', () => {
        this.showServiceConsole();
        this.playMicClick();
      });
    }

    if (this.dom.btnSwitchToRadio) {
      this.dom.btnSwitchToRadio.addEventListener('click', () => {
        this.showRadioTransceiver();
        this.playMicClick();
      });
    }

    if (this.dom.btnConsoleReturnRadio) {
      this.dom.btnConsoleReturnRadio.addEventListener('click', () => {
        this.showRadioTransceiver();
        this.playMicClick();
      });
    }

    // Service Console Subsystem Tabs
    if (this.dom.consoleTabBtns) {
      this.dom.consoleTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-tab');
          this.dom.consoleTabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          if (this.dom.consoleTabPanes) {
            this.dom.consoleTabPanes.forEach(pane => {
              pane.classList.remove('active');
              pane.style.display = 'none';
            });
          }
          const targetPane = document.getElementById(`pane${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
          if (targetPane) {
            targetPane.classList.add('active');
            targetPane.style.display = 'block';
          }
          this.playKeypadClick(1050);
        });
      });
    }

    // Service Console Form: Assign ID
    if (this.dom.formAssignDefenceId) {
      this.dom.formAssignDefenceId.addEventListener('submit', (e) => {
        this.handleAssignIdSubmit(e);
      });
    }

    if (this.dom.btnAutoGenerateId) {
      this.dom.btnAutoGenerateId.addEventListener('click', () => {
        this.autoGenerateId();
        this.playKeypadClick(1300);
      });
    }

    // Search Registry Filter
    if (this.dom.searchRegistryInput) {
      this.dom.searchRegistryInput.addEventListener('input', (e) => {
        this.filterRegistryTable(e.target.value);
      });
    }

    // Service Console Form: All-Net Emergency Directive
    if (this.dom.formAllNetDirective) {
      this.dom.formAllNetDirective.addEventListener('submit', (e) => {
        this.handleAllNetDirectiveSubmit(e);
      });
    }

    // Acknowledge All-Net Directive Modal
    if (this.dom.btnAckDirective) {
      this.dom.btnAckDirective.addEventListener('click', () => {
        this.dom.allNetDirectiveModal.style.display = 'none';
        this.playMicClick();
      });
    }

    if (this.dom.directiveCloseBtn) {
      this.dom.directiveCloseBtn.addEventListener('click', () => {
        this.dom.allNetDirectiveModal.style.display = 'none';
      });
    }

    // Export Master Audit Log
    if (this.dom.btnExportAuditLog) {
      this.dom.btnExportAuditLog.addEventListener('click', () => {
        this.exportAuditLog();
      });
    }

    // Track active input for Pinpad
    [this.dom.inputEmpId, this.dom.inputPasscode, this.dom.inputCallsign, this.dom.inputServiceKey].filter(Boolean).forEach(input => {
      input.addEventListener('focus', () => {
        this.activeInputTarget = input;
      });
    });

    // Pinpad Numeric Buttons Click
    this.dom.pinKeys.forEach(key => {
      key.addEventListener('click', () => {
        const val = key.getAttribute('data-val');
        this.playKeypadClick(800 + parseInt(val, 10) * 40);

        if (!this.activeInputTarget) {
          this.activeInputTarget = this.dom.inputEmpId.value.length < 12 ? this.dom.inputEmpId : this.dom.inputPasscode;
        }

        this.activeInputTarget.value += val;
        this.activeInputTarget.focus();
      });
    });

    // Pinpad Clear & Backspace
    this.dom.btnPinClear.addEventListener('click', () => {
      this.playKeypadClick(400);
      if (this.activeInputTarget) {
        this.activeInputTarget.value = '';
        this.activeInputTarget.focus();
      }
    });

    this.dom.btnPinBack.addEventListener('click', () => {
      this.playKeypadClick(500);
      if (this.activeInputTarget && this.activeInputTarget.value.length > 0) {
        this.activeInputTarget.value = this.activeInputTarget.value.slice(0, -1);
        this.activeInputTarget.focus();
      }
    });

    // Interactive Biometric Scanner Click
    this.dom.bioScannerPad.addEventListener('click', () => {
      this.playKeypadClick(1200);
      this.dom.bioScannerPad.classList.add('scanning');
      this.dom.bioStatusTxt.textContent = 'SCANNING DERMAL PRINT...';
      this.dom.bioStatusTxt.style.color = '#33ff88';

      setTimeout(() => {
        this.playKeypadClick(1600);
        this.dom.bioScannerPad.classList.remove('scanning');
        this.dom.bioStatusTxt.textContent = 'BIOMETRICS CONFIRMED';
        this.dom.authTerminalConsole.className = 'live-auth-terminal success';
        this.dom.authTerminalConsole.innerHTML = `<span class="terminal-prompt">✓</span> OPTICAL FINGERPRINT MATCHED WITH HQ IDS REGISTRY.`;
      }, 1200);
    });

    // Secure Logout
    this.dom.btnLogoutSecure.addEventListener('click', () => {
      if (confirm('TERMINATE OPERATOR SESSION & SECURE TRANSCEIVER?')) {
        this.logout();
      }
    });

    // Scope Tab Toggle (Waveform vs 32-Band FFT)
    this.dom.btnScopeWave.addEventListener('click', () => {
      this.scopeMode = 'waveform';
      this.dom.btnScopeWave.classList.add('active');
      this.dom.btnScopeBars.classList.remove('active');
    });

    this.dom.btnScopeBars.addEventListener('click', () => {
      this.scopeMode = 'fft';
      this.dom.btnScopeBars.classList.add('active');
      this.dom.btnScopeWave.classList.remove('active');
    });

    // PTT Button Mouse / Touch Handlers (Mobile + Desktop Ergonomics)
    const handlePttDown = (e) => {
      e.preventDefault();
      if ('vibrate' in navigator) navigator.vibrate([25, 10, 15]);
      if (this.pttMode === 'momentary') {
        this.startTransmission();
      } else {
        this.toggleTransmissionLatch();
      }
    };

    const handlePttUp = () => {
      if (this.pttMode === 'momentary' && this.isTransmitting) {
        if ('vibrate' in navigator) navigator.vibrate(20);
        this.stopTransmission();
      }
    };

    this.dom.pttButton.addEventListener('mousedown', handlePttDown);
    window.addEventListener('mouseup', handlePttUp);

    this.dom.pttButton.addEventListener('touchstart', handlePttDown, { passive: false });
    window.addEventListener('touchend', handlePttUp);
    window.addEventListener('touchcancel', handlePttUp);

    // Mobile Tactical Dock Tabs (Transceiver vs Channels vs Logs)
    if (this.dom.mobDockBtns && this.dom.mobDockBtns.length > 0) {
      this.dom.mobDockBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-target');
          this.dom.mobDockBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          if (window.innerWidth < 1024) {
            if (target === 'left') {
              if (this.dom.rackLeftFlank) this.dom.rackLeftFlank.style.display = 'flex';
              if (this.dom.rackCenterTransceiver) this.dom.rackCenterTransceiver.style.display = 'none';
              if (this.dom.rackRightFlank) this.dom.rackRightFlank.style.display = 'none';
            } else if (target === 'right') {
              if (this.dom.rackLeftFlank) this.dom.rackLeftFlank.style.display = 'none';
              if (this.dom.rackCenterTransceiver) this.dom.rackCenterTransceiver.style.display = 'none';
              if (this.dom.rackRightFlank) this.dom.rackRightFlank.style.display = 'flex';
            } else {
              if (this.dom.rackLeftFlank) this.dom.rackLeftFlank.style.display = 'none';
              if (this.dom.rackCenterTransceiver) this.dom.rackCenterTransceiver.style.display = 'flex';
              if (this.dom.rackRightFlank) this.dom.rackRightFlank.style.display = 'none';
            }
          }
          if ('vibrate' in navigator) navigator.vibrate(12);
          this.playKeypadClick(850);
          setTimeout(() => this.resizeCanvasForMobile(), 50);
        });
      });

      const handleResponsiveLayout = () => {
        this.handleResponsiveRacks();
        this.resizeCanvasForMobile();
      };

      window.addEventListener('resize', handleResponsiveLayout);
      window.addEventListener('orientationchange', () => {
        setTimeout(handleResponsiveLayout, 150);
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (!this.isAuthenticated) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if ((e.code === 'Space' || e.key.toLowerCase() === 't') && !e.repeat) {
        e.preventDefault();
        if (this.pttMode === 'momentary') {
          this.startTransmission();
        } else {
          this.toggleTransmissionLatch();
        }
      }

      if (e.key >= '1' && e.key <= '8') {
        this.switchChannel(parseInt(e.key, 10));
      }

      if (e.key.toLowerCase() === 'v') {
        this.toggleVox();
      }

      if (e.key.toLowerCase() === 'm') {
        this.volume = this.volume > 0 ? 0 : 0.85;
        if (this.masterGainNode) this.masterGainNode.gain.value = this.volume;
        this.dom.volValue.textContent = `${Math.round(this.volume * 100)}%`;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isAuthenticated) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.code === 'Space' || e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (this.pttMode === 'momentary' && this.isTransmitting) {
          this.stopTransmission();
        }
      }
    });

    // Mode Buttons
    this.dom.btnModeHold.addEventListener('click', () => {
      this.pttMode = 'momentary';
      this.dom.btnModeHold.classList.add('active');
      this.dom.btnModeLatch.classList.remove('active');
    });

    this.dom.btnModeLatch.addEventListener('click', () => {
      this.pttMode = 'latch';
      this.dom.btnModeLatch.classList.add('active');
      this.dom.btnModeHold.classList.remove('active');
    });

    this.dom.btnVoxToggle.addEventListener('click', () => {
      this.toggleVox();
    });

    this.dom.btnFilterTactical.addEventListener('click', () => {
      this.isTacticalFilter = true;
      this.dom.btnFilterTactical.classList.add('active');
      this.dom.btnFilterHifi.classList.remove('active');
      this.updateAudioFilters();
      this.playMicClick();
    });

    this.dom.btnFilterHifi.addEventListener('click', () => {
      this.isTacticalFilter = false;
      this.dom.btnFilterHifi.classList.add('active');
      this.dom.btnFilterTactical.classList.remove('active');
      this.updateAudioFilters();
      this.playMicClick();
    });

    this.dom.rogerBeepSelect.addEventListener('change', (e) => {
      this.rogerBeepType = e.target.value;
      this.playRogerBeep(this.rogerBeepType);
    });

    this.dom.keypadButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (key) this.switchChannel(parseInt(key, 10));
      });
    });

    this.dom.btnDistressMayday.addEventListener('click', () => {
      if (confirm('TRANSMIT PRIORITY DEFENCE MAYDAY DISTRESS BEACON ACROSS ALL CHANNELS?')) {
        this.triggerMaydayAlert();
      }
    });

    // Rotary Knobs
    this.setupRotaryKnob(this.dom.volKnob, this.dom.volIndicator, (val) => {
      this.volume = val;
      if (this.masterGainNode) this.masterGainNode.gain.value = val;
      this.dom.volValue.textContent = `${Math.round(val * 100)}%`;
    }, 0.85);

    this.setupRotaryKnob(this.dom.sqlKnob, this.dom.sqlIndicator, (val) => {
      this.squelchLevel = Math.max(1, Math.round(val * 10));
      this.dom.sqlValue.textContent = `LVL ${this.squelchLevel}`;
    }, 0.4);

    this.setupRotaryKnob(this.dom.gainKnob, this.dom.gainIndicator, (val) => {
      this.micGain = val * 2.0;
      if (this.micGainNode) this.micGainNode.gain.value = this.micGain;
      this.dom.gainValue.textContent = `${Math.round(val * 100)}%`;
    }, 0.5);

    // Callsign Modal
    this.dom.btnEditCallsign.addEventListener('click', () => this.openCallsignModal());
    this.dom.myCallsignDisplay.addEventListener('click', () => this.openCallsignModal());
    this.dom.modalCloseBtn.addEventListener('click', () => this.dom.callsignModal.classList.remove('open'));
    this.dom.btnCancelCallsign.addEventListener('click', () => this.dom.callsignModal.classList.remove('open'));
    this.dom.btnSaveCallsign.addEventListener('click', () => this.saveCallsign(this.dom.callsignInput.value));

    this.dom.chipSuggests.forEach(chip => {
      chip.addEventListener('click', () => {
        this.dom.callsignInput.value = chip.textContent;
      });
    });
  }

  toggleVox() {
    this.isVoxActive = !this.isVoxActive;
    if (this.isVoxActive) {
      this.dom.btnVoxToggle.classList.add('active');
      this.dom.oledVoxBadge.textContent = 'VOX: ARMED';
      this.dom.oledVoxBadge.style.color = '#33ff88';
    } else {
      this.dom.btnVoxToggle.classList.remove('active');
      this.dom.oledVoxBadge.textContent = 'VOX: OFF';
      this.dom.oledVoxBadge.style.color = '';
    }
    this.playMicClick();
  }

  setupRotaryKnob(knobEl, indicatorEl, onChange, initialFraction = 0.5) {
    let currentAngle = (initialFraction * 270) - 135;
    indicatorEl.style.transform = `translateX(-50%) rotate(${currentAngle}deg)`;

    const updateFromAngle = (deg) => {
      const clamped = Math.max(-135, Math.min(135, deg));
      currentAngle = clamped;
      indicatorEl.style.transform = `translateX(-50%) rotate(${clamped}deg)`;
      const frac = (clamped + 135) / 270;
      onChange(frac);
    };

    knobEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 15 : -15;
      updateFromAngle(currentAngle + delta);
    });

    let isDragging = false;
    let startY = 0;

    knobEl.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaY = startY - e.clientY;
      startY = e.clientY;
      updateFromAngle(currentAngle + deltaY * 2);
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /* =========================================================
     C4I SERVICE DEPARTMENT MASTER OPERATIONS SUITE
  ========================================================= */
  autoGenerateId() {
    const random12 = String(Math.floor(100000000000 + Math.random() * 900000000000));
    if (this.dom.newEmpIdInput) {
      this.dom.newEmpIdInput.value = random12;
    }
    return random12;
  }

  handleAssignIdSubmit(e) {
    e.preventDefault();
    const id = this.dom.newEmpIdInput.value.trim();
    const callsign = this.dom.newCallsignInput.value.trim().toUpperCase() || 'UNIT-ALPHA';
    const corps = this.dom.newCorpsSelect.value;
    const clearance = this.dom.newClearanceSelect.value;
    const passcode = this.dom.newPasscodePin.value.trim();

    if (!id || id.length < 6) {
      this.dom.assignFeedback.className = 'assign-feedback error';
      this.dom.assignFeedback.textContent = '⚠️ ERROR: ENTER A VALID DEFENCE EMPLOYEE ID (MIN 6 DIGITS)';
      return;
    }

    if (!passcode) {
      this.dom.assignFeedback.className = 'assign-feedback error';
      this.dom.assignFeedback.textContent = '⚠️ ERROR: ENTER A SECURITY PASSCODE / PIN FOR THIS ID';
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SERVICE_ASSIGN_ID',
        id,
        callsign,
        corps,
        clearance,
        passcode
      }));

      this.playRogerBeep('motorola');
      this.dom.assignFeedback.className = 'assign-feedback success';
      this.dom.assignFeedback.textContent = `✓ DEFENCE ID [${this.maskEmployeeId(id)}] REGISTERED WITH [${clearance}] CLEARANCE`;

      // Clear inputs securely without pre-filling
      this.dom.newEmpIdInput.value = '';
      this.dom.newCallsignInput.value = '';
      this.dom.newPasscodePin.value = '';
      setTimeout(() => {
        this.dom.assignFeedback.textContent = '';
      }, 4000);
    }
  }

  revokeDefenceId(id) {
    if (!confirm(`REVOKE SECURITY CLEARANCE FOR DEFENCE ID [${this.maskEmployeeId(id)}]? (Active radio links will be terminated immediately)`)) {
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SERVICE_REVOKE_ID',
        id
      }));
      this.playBusyTone();
    }
  }

  reactivateDefenceId(id) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SERVICE_REACTIVATE_ID',
        id
      }));
      this.playRogerBeep('chime');
    }
  }

  forceReleaseCarrierLock(channelId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SERVICE_FORCE_RELEASE_LOCK',
        channelId
      }));
      this.playKeypadClick(600);
    }
  }

  terminateNode(clientId) {
    if (!confirm(`FORCE-TERMINATE CONNECTION FOR NODE [${clientId}]?`)) {
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SERVICE_KICK_NODE',
        clientId
      }));
      this.playBusyTone();
    }
  }

  handleAllNetDirectiveSubmit(e) {
    e.preventDefault();
    const priority = this.dom.directivePriority.value;
    const message = this.dom.directiveMessage.value.trim();

    if (!message) return;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SERVICE_HQ_OVERRIDE',
        message: `[${priority}] ${message}`
      }));

      this.playEmergencyAlarm();
      this.dom.directiveFeedback.className = 'directive-feedback success';
      this.dom.directiveFeedback.textContent = '✓ HIGH-PRIORITY DIRECTIVE TRANSMITTED TO ALL ACTIVE DEFENCE OPERATORS';

      setTimeout(() => {
        this.dom.directiveMessage.value = '';
        setTimeout(() => {
          this.dom.directiveFeedback.textContent = '';
        }, 4000);
      }, 1500);
    }
  }

  onAllNetDirectiveReceived(msg) {
    this.playEmergencyAlarm();
    if (this.dom.allNetDirectiveModal) {
      this.dom.directiveSenderStrip.textContent = `SENDER: ${msg.sender || 'DIRECTORATE OF COMMUNICATIONS (HQ IDS)'}`;
      this.dom.directiveMessageContent.textContent = msg.message;
      this.dom.allNetDirectiveModal.style.display = 'flex';
    }
  }

  onAccessRevoked(message) {
    this.playEmergencyAlarm();
    alert(`SECURITY ALERT: ${message || 'Your Defence ID clearance has been revoked by Service Department.'}`);
    this.logout();
  }

  onRemoteDisconnect(message) {
    this.playBusyTone();
    alert(`DISCONNECTED: ${message || 'Your connection was terminated by HQ Service Department.'}`);
    this.logout();
  }

  renderServiceDashboard(data) {
    this.serviceState = data;
    if (data.authorizedPersonnel) {
      this.renderPersonnelRegistry(data.authorizedPersonnel);
    }
    if (data.masterCommsLog) {
      this.renderCommsAuditLog(data.masterCommsLog);
    }
    if (data.channels && data.channelLocks) {
      this.renderCarrierOverrideGrid(data.channels, data.channelLocks);
      this.renderWiretapChannels(data.channels, data.channelLocks);
    }
    if (data.activeNodes) {
      this.renderActiveNodes(data.activeNodes);
    }
  }

  renderPersonnelRegistry(personnelList) {
    if (!this.dom.registryTableBody) return;

    const total = personnelList.length;
    const active = personnelList.filter(p => p.status === 'ACTIVE').length;
    const revoked = total - active;

    if (this.dom.totalRegCount) this.dom.totalRegCount.textContent = total;
    if (this.dom.activeRegCount) this.dom.activeRegCount.textContent = active;
    if (this.dom.revokedRegCount) this.dom.revokedRegCount.textContent = revoked;

    this.dom.registryTableBody.innerHTML = personnelList.map(p => {
      const isRevoked = p.status === 'REVOKED';
      const dateFormatted = p.issuedAt ? new Date(p.issuedAt).toLocaleDateString('en-GB') : 'PERMANENT';
      const maskedId = p.maskedId || this.maskEmployeeId(p.id);

      return `
        <tr data-emp-id="${p.id}" data-callsign="${p.callsign}" data-corps="${p.corps}">
          <td><span class="emp-id-badge">${maskedId}</span></td>
          <td><strong>${p.callsign}</strong></td>
          <td>${p.corps}</td>
          <td><span style="color:#d4af37">${p.clearance}</span></td>
          <td><span class="status-pill ${isRevoked ? 'revoked' : 'active'}">${p.status}</span></td>
          <td>${dateFormatted}</td>
          <td>
            ${isRevoked 
              ? `<button class="btn-tbl-restore" onclick="window.tacticalRadioApp.reactivateDefenceId('${p.id}')">♻️ RESTORE</button>`
              : `<button class="btn-tbl-revoke" onclick="window.tacticalRadioApp.revokeDefenceId('${p.id}')">🛑 REVOKE</button>`
            }
          </td>
        </tr>
      `;
    }).join('');
  }

  filterRegistryTable(query) {
    if (!this.dom.registryTableBody) return;
    const q = query.trim().toUpperCase();
    const rows = this.dom.registryTableBody.querySelectorAll('tr');

    rows.forEach(r => {
      const id = r.getAttribute('data-emp-id') || '';
      const cs = r.getAttribute('data-callsign') || '';
      const corps = r.getAttribute('data-corps') || '';

      if (!q || id.includes(q) || cs.includes(q) || corps.includes(q)) {
        r.style.display = '';
      } else {
        r.style.display = 'none';
      }
    });
  }

  renderCommsAuditLog(logs) {
    if (!this.dom.wiretapLogTableBody) return;
    if (this.dom.serviceLogCount) {
      this.dom.serviceLogCount.textContent = `${logs.length} TRANSMISSIONS RECORDED`;
    }

    if (logs.length === 0) {
      this.dom.wiretapLogTableBody.innerHTML = `
        <tr><td colspan="8" class="text-center">No transmissions intercepted yet. Spectrum is clear.</td></tr>
      `;
      return;
    }

    this.dom.wiretapLogTableBody.innerHTML = logs.map(l => {
      const maskedEmp = this.maskEmployeeId(l.employeeId);
      return `
        <tr>
          <td><strong style="color:var(--gold-emblem)">#TX-${String(l.id).slice(-4)}</strong></td>
          <td>${l.timestamp}</td>
          <td><span style="color:var(--oled-green)">CH ${l.channelId}: ${l.channelName}</span></td>
          <td><strong>${l.callsign}</strong></td>
          <td><span class="emp-id-badge">${maskedEmp}</span></td>
          <td>${l.durationSec}</td>
          <td>
            <button class="btn-tbl-play" onclick="window.tacticalRadioApp.playInterceptBurst(${l.id})">▶ PLAY</button>
          </td>
          <td>
            <button class="btn-tbl-dl" onclick="window.tacticalRadioApp.exportSingleBurst(${l.id})">⬇ LOG</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  playInterceptBurst(burstId) {
    this.playRogerBeep('motorola');
  }

  exportSingleBurst(burstId) {
    const burst = (this.serviceState.masterCommsLog || []).find(l => l.id === burstId);
    if (!burst) return;
    const blob = new Blob([JSON.stringify(burst, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BURST-${burstId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  renderCarrierOverrideGrid(channels, channelLocks) {
    if (!this.dom.carrierOverrideGrid) return;

    this.dom.carrierOverrideGrid.innerHTML = channels.map(ch => {
      const lock = channelLocks[ch.id];
      const isLocked = lock && lock.active;

      return `
        <div class="carrier-ch-card ${isLocked ? 'locked' : ''}">
          <div class="ch-card-top">
            <span class="ch-card-title">CH 0${ch.id} &bull; ${ch.name}</span>
            <span class="ch-card-freq">${ch.freq}</span>
          </div>
          <div class="ch-card-desc">${ch.desc}</div>
          <div class="ch-lock-status-box">
            <span>CARRIER:</span>
            <strong style="color:${isLocked ? 'var(--led-red)' : 'var(--oled-green)'}">
              ${isLocked ? `LOCKED BY [${lock.callsign || 'UNKNOWN'}]` : 'IDLE / FREE'}
            </strong>
          </div>
          ${isLocked ? `
            <button class="btn-force-release" onclick="window.tacticalRadioApp.forceReleaseCarrierLock(${ch.id})">
              ⚡ FORCE RELEASE CARRIER LOCK
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  renderWiretapChannels(channels, channelLocks) {
    if (!this.dom.channelsWiretapStrip) return;

    this.dom.channelsWiretapStrip.innerHTML = channels.map(ch => {
      const lock = channelLocks[ch.id];
      const isTransmitting = lock && lock.active;

      return `
        <div class="wiretap-channel-card ${isTransmitting ? 'transmitting' : ''}" data-chid="${ch.id}">
          <div class="wt-header">
            <span class="wt-name">CH 0${ch.id} &bull; ${ch.name}</span>
            <span class="wt-freq">${ch.freq}</span>
          </div>
          <span class="wt-carrier-badge">
            ${isTransmitting ? `🔴 INTERCEPTING [${lock.callsign}]` : 'IDLE / LISTENING'}
          </span>
        </div>
      `;
    }).join('');
  }

  renderActiveNodes(nodes) {
    if (!this.dom.activeNodesTableBody) return;
    if (this.dom.activeNodesCount) {
      this.dom.activeNodesCount.textContent = `${nodes.length} CONNECTED`;
    }

    if (nodes.length === 0) {
      this.dom.activeNodesTableBody.innerHTML = `
        <tr><td colspan="7" class="text-center">No active nodes connected to radio grid.</td></tr>
      `;
      return;
    }

    this.dom.activeNodesTableBody.innerHTML = nodes.map(n => {
      const isConsole = n.isServiceConsole;
      const uptimeSec = Math.round((Date.now() - (n.connectedAt || Date.now())) / 1000);
      const maskedNodeEmp = this.maskEmployeeId(n.employeeId);

      return `
        <tr>
          <td><code>${n.id}</code></td>
          <td><strong>${n.callsign || 'UNIDENTIFIED'}</strong></td>
          <td><span class="emp-id-badge">${maskedNodeEmp}</span></td>
          <td>CH 0${n.channel}</td>
          <td>${uptimeSec}s ago</td>
          <td>
            <span class="status-pill ${isConsole ? 'active' : ''}" style="color:${isConsole ? 'var(--gold-emblem)' : 'var(--oled-green)'}">
              ${isConsole ? 'SERVICE CONSOLE' : 'FIELD TRANSCEIVER'}
            </span>
          </td>
          <td>
            <button class="btn-tbl-revoke" onclick="window.tacticalRadioApp.terminateNode('${n.id}')">
              ⛔ TERMINATE
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  exportAuditLog() {
    const data = {
      exportTimestamp: new Date().toISOString(),
      serviceStation: this.callsign,
      masterCommsAudit: this.serviceState.masterCommsLog || [],
      authorizedPersonnel: this.serviceState.authorizedPersonnel || [],
      totalRecordings: (this.serviceState.masterCommsLog || []).length
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOD-BHARAT-COM-AUDIT-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.playRogerBeep('motorola');
  }

  playEmergencyAlarm() {
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AC();
    }
    const now = this.audioCtx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now + (i * 0.25));
      osc.frequency.exponentialRampToValueAtTime(1400, now + (i * 0.25) + 0.12);
      osc.frequency.exponentialRampToValueAtTime(800, now + (i * 0.25) + 0.22);

      gain.gain.setValueAtTime(0.35 * this.volume, now + (i * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.25) + 0.23);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now + (i * 0.25));
      osc.stop(now + (i * 0.25) + 0.24);
    }
  }

  openCallsignModal() {
    this.dom.callsignInput.value = this.callsign;
    this.dom.callsignModal.classList.add('open');
    this.dom.callsignInput.focus();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new TacticalRadioApp();
  app.initWebSocket();
  app.checkExistingSession();
  window.tacticalRadioApp = app;
});
