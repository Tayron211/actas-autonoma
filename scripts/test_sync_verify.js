const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const chromePath = fs.existsSync('C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Temp\\chrome_debug_sync_verify';

const chrome = spawn(chromePath, [
  '--headless',
  '--remote-debugging-port=9235',
  '--user-data-dir=' + userDataDir,
  '--disable-gpu',
  'http://localhost:3050/'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9235/json', res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTab = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);

  const evalRes = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        // Test saveActa
        const testActa = {
          id: 'TEST-REALTIME-' + Date.now(),
          colaborador: 'Dra. Maria Elena Sanchez',
          colabDni: '09876543',
          tipoActa: 'compromiso',
          titulo: 'Acta de Compromiso',
          fecha: '11/09/2026',
          equiposCount: 1,
          equipos: [{ etiqueta: 'AUT-PRUEBA-99', descripcion: 'Monitor Dell 24"', estado: 'Operativo' }]
        };
        await CloudDatabaseManager.saveActa(testActa);
        
        // Wait 1s and re-sync
        await new Promise(r => setTimeout(r, 1000));
        await CloudDatabaseManager.syncFromCloud();

        const actas = CloudDatabaseManager.getActas();
        const found = actas.find(a => a.id === testActa.id);

        // Delete test item
        if (found) {
          await CloudDatabaseManager.deleteActa(testActa.id);
        }

        return {
          savedSuccessfully: !!found,
          savedColab: found ? found.colaborador : null,
          totalCountAfterDelete: CloudDatabaseManager.getActas().length
        };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('EVAL RES:', evalRes);
  if (evalRes.result) console.log('RESULT VALUE:', evalRes.result.value);
  chrome.kill();
  process.exit(0);
}

run().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
