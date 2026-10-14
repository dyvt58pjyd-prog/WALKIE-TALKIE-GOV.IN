const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3030;

// Strict anti-caching middleware so browsers never cache credentials, forms, or scripts
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile('sw.js', { root: path.join(__dirname, 'public') });
});

app.use(express.static(path.join(__dirname, 'public'), { etag: false, maxAge: 0 }));

// Channels definition: Indian Armed Forces & Ministry of Defence Tactical Networks
const CHANNELS = [
  { id: 1, name: 'TRISHUL', freq: '142.850 MHz', desc: 'Northern Sector Recon & Border Patrol' },
  { id: 2, name: 'BRAHMOS', freq: '148.125 MHz', desc: 'Western Sector Tactical Strike Comms' },
  { id: 3, name: 'GARUD', freq: '151.400 MHz', desc: 'Air Defence & Airborne Interceptor Net' },
  { id: 4, name: 'MARCOS', freq: '155.675 MHz', desc: 'Maritime & Coastal Quick Reaction' },
  { id: 5, name: 'DHANUSH', freq: '162.025 MHz', desc: 'Artillery & Fire Direction Control' },
  { id: 6, name: 'AGNI', freq: '168.350 MHz', desc: 'Integrated Defence Staff Joint HQ' },
  { id: 7, name: 'SURYAKIRAN', freq: '171.900 MHz', desc: 'Special Forces Direct Action Team' },
  { id: 8, name: 'SANJEEVANI 9', freq: '121.500 MHz', desc: 'Search & Rescue / Medevac Guard', isEmergency: true },
];

// Track channel states (half-duplex lock)
const channelLocks = {};
CHANNELS.forEach(ch => {
  channelLocks[ch.id] = { active: false, transmitterId: null, callsign: null, employeeId: null, startedAt: null };
});

// Dynamic Registry of Authorized Personnel IDs (Managed by Service Department)
const authorizedPersonnel = new Map([
  ['242570066948', { id: '242570066948', passcode: 'MOD@2026', callsign: 'GARUD-1', clearance: 'LEVEL 5 (TOP SECRET)', corps: 'HQ INTEGRATED DEFENCE STAFF', status: 'ACTIVE', issuedAt: new Date().toISOString() }],
  ['242570088192', { id: '242570088192', passcode: 'MOD@2026', callsign: 'PARA-SF-3', clearance: 'LEVEL 4 (SECRET)', corps: 'ARMY SPECIAL FORCES', status: 'ACTIVE', issuedAt: new Date().toISOString() }],
  ['242570099411', { id: '242570099411', passcode: 'MOD@2026', callsign: 'MARCOS-6', clearance: 'LEVEL 4 (SECRET)', corps: 'NAVY COMBAT DIVERS', status: 'ACTIVE', issuedAt: new Date().toISOString() }],
]);

// Master Communications Wiretap & Recording Log (Maintained for Service Dept)
const masterCommsLog = [];

// Connected clients mapping: ws => { id, callsign, employeeId, channel, location, isAlive, isServiceConsole, ip }
const clients = new Map();
let clientCounter = 1;

function broadcastChannelStatus(channelId) {
  const payload = JSON.stringify({
    type: 'CHANNEL_STATE',
    channelId,
    state: channelLocks[channelId]
  });

  for (const [clientWs] of clients) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(payload);
    }
  }
}

function maskId(id) {
  if (!id || id === 'UNASSIGNED' || id === 'UNRECORDED') return 'AUTHENTICATED';
  if (id.startsWith('MOD-SERVICE')) return 'C4I-SERVICE-MASTER';
  if (id.length <= 4) return '••••';
  return '•••• •••• ' + id.slice(-4);
}

function broadcastRoster() {
  const roster = [];
  for (const [ws, info] of clients) {
    roster.push({
      id: info.id,
      callsign: info.callsign,
      employeeId: maskId(info.employeeId),
      channel: info.channel,
      isServiceConsole: !!info.isServiceConsole,
      isTransmitting: channelLocks[info.channel]?.transmitterId === info.id
    });
  }

  const payload = JSON.stringify({
    type: 'ROSTER_UPDATE',
    roster,
    totalOnline: roster.length
  });

  for (const [clientWs] of clients) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(payload);
    }
  }
}

function broadcastServiceConsoleUpdate() {
  // Strip passcodes and mask IDs so private credentials are never exposed
  const personnelArray = Array.from(authorizedPersonnel.values()).map(p => ({
    id: p.id,
    maskedId: maskId(p.id),
    callsign: p.callsign,
    clearance: p.clearance,
    corps: p.corps,
    status: p.status,
    issuedAt: p.issuedAt
  }));

  const activeNodes = [];
  for (const [ws, info] of clients) {
    activeNodes.push({
      id: info.id,
      callsign: info.callsign,
      employeeId: maskId(info.employeeId),
      channel: info.channel,
      isServiceConsole: info.isServiceConsole,
      connectedAt: info.connectedAt
    });
  }

  const payload = JSON.stringify({
    type: 'SERVICE_STATE_UPDATE',
    authorizedPersonnel: personnelArray,
    masterCommsLog: masterCommsLog.slice(0, 50),
    activeNodes,
    channels: CHANNELS,
    channelLocks
  });

  for (const [clientWs, info] of clients) {
    if (info.isServiceConsole && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(payload);
    }
  }
}

// Keep-alive heartbeat every 25s
const heartbeatInterval = setInterval(() => {
  for (const [ws, info] of clients) {
    if (info.isAlive === false) {
      ws.terminate();
      clients.delete(ws);
      continue;
    }
    info.isAlive = false;
    ws.ping();
  }
}, 25000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

wss.on('connection', (ws, req) => {
  const clientId = `mod_unit_${Date.now()}_${clientCounter++}`;
  const defaultChannel = 1;

  clients.set(ws, {
    id: clientId,
    callsign: 'UNIDENTIFIED',
    employeeId: null,
    channel: defaultChannel,
    location: null,
    isAlive: true,
    isServiceConsole: false,
    connectedAt: Date.now()
  });

  ws.on('pong', () => {
    const info = clients.get(ws);
    if (info) info.isAlive = true;
  });

  ws.send(JSON.stringify({
    type: 'INIT',
    clientId,
    channel: defaultChannel,
    channels: CHANNELS,
    channelLocks
  }));

  broadcastRoster();

  ws.on('message', (message, isBinary) => {
    const client = clients.get(ws);
    if (!client) return;

    if (isBinary) {
      const lock = channelLocks[client.channel];
      if (lock && lock.active && lock.transmitterId === client.id) {
        for (const [otherWs, otherClient] of clients) {
          // Relay to peers on the same channel OR service consoles monitoring wiretaps
          const isPeer = otherClient.channel === client.channel;
          const isConsole = otherClient.isServiceConsole;

          if (otherWs !== ws && (isPeer || isConsole) && otherWs.readyState === WebSocket.OPEN) {
            otherWs.send(message, { binary: true });
          }
        }
      }
      return;
    }

    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        // Field Operator Authentication Request
        case 'AUTH_REQUEST': {
          const { employeeId, passcode, callsign } = data;
          const cleanId = (employeeId || '').trim();
          const cleanPass = (passcode || '').trim();

          if (!authorizedPersonnel.has(cleanId)) {
            ws.send(JSON.stringify({
              type: 'AUTH_FAILED',
              reason: 'DEFENCE ID NOT RECOGNIZED IN ACTIVE REGISTRY'
            }));
            return;
          }

          const rec = authorizedPersonnel.get(cleanId);
          if (rec.status !== 'ACTIVE') {
            ws.send(JSON.stringify({
              type: 'AUTH_FAILED',
              reason: 'CLEARANCE SUSPENDED // DEFENCE ID REVOKED'
            }));
            return;
          }

          const expectedPass = rec.passcode || 'MOD@2026';
          if (cleanPass !== expectedPass) {
            ws.send(JSON.stringify({
              type: 'AUTH_FAILED',
              reason: 'SECURITY PASSCODE / PIN VERIFICATION FAILED'
            }));
            return;
          }

          client.employeeId = cleanId;
          client.callsign = (callsign && callsign.trim()) ? callsign.trim().toUpperCase() : rec.callsign;
          client.clearance = rec.clearance;
          client.corps = rec.corps;

          ws.send(JSON.stringify({
            type: 'AUTH_SUCCESS',
            record: {
              id: maskId(rec.id),
              callsign: client.callsign,
              clearance: rec.clearance,
              corps: rec.corps
            }
          }));

          broadcastRoster();
          broadcastServiceConsoleUpdate();
          break;
        }

        // Operator Profile Update (post-auth)
        case 'UPDATE_PROFILE': {
          if (data.callsign && typeof data.callsign === 'string') {
            client.callsign = data.callsign.trim().substring(0, 16).toUpperCase();
          }
          if (data.employeeId && typeof data.employeeId === 'string') {
            const cleanId = data.employeeId.trim();
            const authRecord = authorizedPersonnel.get(cleanId);
            if (authRecord && authRecord.status === 'ACTIVE') {
              client.employeeId = cleanId;
            }
          }
          if (data.location) {
            client.location = data.location;
          }
          broadcastRoster();
          broadcastServiceConsoleUpdate();
          break;
        }

        case 'SWITCH_CHANNEL': {
          const newChannel = parseInt(data.channelId, 10);
          if (CHANNELS.some(c => c.id === newChannel)) {
            if (channelLocks[client.channel]?.transmitterId === client.id) {
              channelLocks[client.channel] = { active: false, transmitterId: null, callsign: null, employeeId: null, startedAt: null };
              broadcastChannelStatus(client.channel);
            }

            client.channel = newChannel;
            ws.send(JSON.stringify({
              type: 'CHANNEL_SWITCHED',
              channelId: newChannel,
              state: channelLocks[newChannel]
            }));
            broadcastRoster();
            broadcastServiceConsoleUpdate();
          }
          break;
        }

        case 'PTT_START': {
          const chId = client.channel;
          const currentLock = channelLocks[chId];

          if (currentLock.active && currentLock.transmitterId !== client.id) {
            ws.send(JSON.stringify({
              type: 'TX_DENIED',
              reason: 'CHANNEL_BUSY',
              activeTransmitter: currentLock.callsign
            }));
            return;
          }

          channelLocks[chId] = {
            active: true,
            transmitterId: client.id,
            callsign: client.callsign,
            employeeId: client.employeeId,
            startedAt: Date.now()
          };

          ws.send(JSON.stringify({
            type: 'TX_GRANTED',
            channelId: chId
          }));

          const startBroadcast = JSON.stringify({
            type: 'AUDIO_STREAM_START',
            transmitterId: client.id,
            callsign: client.callsign,
            employeeId: client.employeeId,
            channelId: chId,
            timestamp: Date.now()
          });

          for (const [otherWs, otherClient] of clients) {
            if ((otherClient.channel === chId || otherClient.isServiceConsole) && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(startBroadcast);
            }
          }

          broadcastChannelStatus(chId);
          broadcastRoster();
          broadcastServiceConsoleUpdate();
          break;
        }

        case 'PTT_END': {
          const chId = client.channel;
          const currentLock = channelLocks[chId];

          if (currentLock.active && currentLock.transmitterId === client.id) {
            const startedAt = currentLock.startedAt || Date.now();
            const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
            const chObj = CHANNELS.find(c => c.id === chId) || { name: `CH ${chId}` };

            // Log transmission to Master Comms Audit
            masterCommsLog.unshift({
              id: Date.now(),
              channelId: chId,
              channelName: chObj.name,
              transmitterId: client.id,
              callsign: client.callsign,
              employeeId: maskId(client.employeeId),
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              durationSec: `${durationSec}s`
            });

            if (masterCommsLog.length > 100) masterCommsLog.pop();

            channelLocks[chId] = {
              active: false,
              transmitterId: null,
              callsign: null,
              employeeId: null,
              startedAt: null
            };

            const endBroadcast = JSON.stringify({
              type: 'AUDIO_STREAM_END',
              transmitterId: client.id,
              callsign: client.callsign,
              channelId: chId,
              timestamp: Date.now()
            });

            for (const [otherWs, otherClient] of clients) {
              if ((otherClient.channel === chId || otherClient.isServiceConsole) && otherWs.readyState === WebSocket.OPEN) {
                otherWs.send(endBroadcast);
              }
            }

            broadcastChannelStatus(chId);
            broadcastRoster();
            broadcastServiceConsoleUpdate();
          }
          break;
        }

        case 'EMERGENCY_MAYDAY': {
          const alertPayload = JSON.stringify({
            type: 'EMERGENCY_ALERT',
            senderId: client.id,
            callsign: client.callsign,
            employeeId: client.employeeId,
            originChannel: client.channel,
            location: data.location || client.location,
            timestamp: Date.now()
          });

          for (const [anyWs] of clients) {
            if (anyWs.readyState === WebSocket.OPEN) {
              anyWs.send(alertPayload);
            }
          }
          break;
        }

        // =========================================================
        // SERVICE DEPARTMENT CONSOLE COMMANDS
        // =========================================================
        case 'SERVICE_LOGIN': {
          const { masterKey, unitDesignation, stationId } = data;
          const cleanKey = (masterKey || '').trim();

          // Accept Master Service Key or Custom Defence PIN
          if (cleanKey !== 'MOD@SERVICE#2026' && cleanKey !== 'MOD@2026') {
            ws.send(JSON.stringify({
              type: 'SERVICE_AUTH_FAILED',
              reason: 'INVALID SERVICE MASTER ACCESS KEY. ATTEMPT LOGGED.'
            }));
            return;
          }

          client.isServiceConsole = true;
          client.callsign = (stationId && stationId.trim()) ? stationId.trim().toUpperCase() : 'HQ-DCCD-CONSOLE-01';
          client.employeeId = 'MOD-SERVICE-MASTER';
          client.clearance = 'LEVEL 5 (COSMIC TOP SECRET)';
          client.corps = unitDesignation || 'HQ IDS // DIRECTORATE OF COMMS & SURVEILLANCE';

          ws.send(JSON.stringify({
            type: 'SERVICE_AUTH_SUCCESS',
            message: 'Service Department Master Access Granted',
            stationId: client.callsign,
            unitDesignation: client.corps
          }));

          broadcastRoster();
          broadcastServiceConsoleUpdate();
          break;
        }

        case 'SERVICE_GET_DATA': {
          broadcastServiceConsoleUpdate();
          break;
        }

        case 'SERVICE_ASSIGN_ID': {
          if (!client.isServiceConsole) return;
          const { id, callsign, clearance, corps, passcode } = data;
          if (id && id.trim()) {
            const cleanId = id.trim();
            authorizedPersonnel.set(cleanId, {
              id: cleanId,
              passcode: (passcode && passcode.trim()) ? passcode.trim() : 'MOD@2026',
              callsign: (callsign || 'UNIT-ALPHA').trim().toUpperCase(),
              clearance: clearance || 'LEVEL 4 (SECRET)',
              corps: corps || 'DEFENCE FIELD CORPS',
              status: 'ACTIVE',
              issuedAt: new Date().toISOString()
            });
            broadcastServiceConsoleUpdate();
          }
          break;
        }

        case 'SERVICE_REVOKE_ID': {
          if (!client.isServiceConsole) return;
          const { id } = data;
          if (id && authorizedPersonnel.has(id)) {
            const rec = authorizedPersonnel.get(id);
            rec.status = 'REVOKED';

            // Immediately disconnect any active client with this revoked ID
            for (const [targetWs, targetClient] of clients) {
              if (targetClient.employeeId === id) {
                targetWs.send(JSON.stringify({
                  type: 'ACCESS_REVOKED_ALERT',
                  message: 'Your Defence ID clearance has been revoked by Service Department.'
                }));
                targetWs.terminate();
                clients.delete(targetWs);
              }
            }

            broadcastRoster();
            broadcastServiceConsoleUpdate();
          }
          break;
        }

        case 'SERVICE_REACTIVATE_ID': {
          if (!client.isServiceConsole) return;
          const { id } = data;
          if (id && authorizedPersonnel.has(id)) {
            const rec = authorizedPersonnel.get(id);
            rec.status = 'ACTIVE';
            broadcastServiceConsoleUpdate();
          }
          break;
        }

        case 'SERVICE_FORCE_RELEASE_LOCK': {
          if (!client.isServiceConsole) return;
          const chId = parseInt(data.channelId, 10);
          if (channelLocks[chId]) {
            channelLocks[chId] = { active: false, transmitterId: null, callsign: null, employeeId: null, startedAt: null };
            broadcastChannelStatus(chId);
            broadcastServiceConsoleUpdate();
          }
          break;
        }

        case 'SERVICE_KICK_NODE': {
          if (!client.isServiceConsole) return;
          const targetId = data.clientId;
          for (const [targetWs, targetClient] of clients) {
            if (targetClient.id === targetId) {
              targetWs.send(JSON.stringify({
                type: 'REMOTE_DISCONNECT',
                message: 'Your connection was terminated by HQ Service Department.'
              }));
              targetWs.terminate();
              clients.delete(targetWs);
              break;
            }
          }
          broadcastRoster();
          broadcastServiceConsoleUpdate();
          break;
        }

        case 'SERVICE_HQ_OVERRIDE': {
          if (!client.isServiceConsole) return;
          const broadcastMsg = JSON.stringify({
            type: 'HQ_ALL_NET_BULLETIN',
            message: data.message || 'HQ PRIORITY DIRECTIVE TRANSMITTED',
            sender: 'DIRECTORATE OF COMMUNICATIONS',
            timestamp: Date.now()
          });

          for (const [targetWs] of clients) {
            if (targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(broadcastMsg);
            }
          }
          break;
        }
      }
    } catch (err) {
      console.error('[BHARAT-COM] Server message parse error:', err);
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      if (channelLocks[client.channel]?.transmitterId === client.id) {
        channelLocks[client.channel] = { active: false, transmitterId: null, callsign: null, employeeId: null, startedAt: null };
        broadcastChannelStatus(client.channel);
      }
      clients.delete(ws);
      broadcastRoster();
      broadcastServiceConsoleUpdate();
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🇮🇳 BHARAT-COM // MINISTRY OF DEFENCE & HQ IDS`);
  console.log(`Tactical SDR & Service Department Console Server`);
  console.log(`Listening on http://0.0.0.0:${PORT}`);
  console.log(`=======================================================`);
});
