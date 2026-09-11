const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static server
const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, '..', req.url.split('?')[0]);
  if (filePath.endsWith(path.sep) || req.url === '/') filePath = path.join(__dirname, '..', 'index.html');
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png'
    };
    res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3055, async () => {
  console.log('Test server running on port 3055');

  const chromePath = fs.existsSync('C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const chrome = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9245',
    '--user-data-dir=C:\\Users\\AUTONOMA\\AppData\\Local\\Temp\\chrome_debug_sync_test',
    '--disable-gpu',
    'http://localhost:3055/'
  ]);

  await new Promise(r => setTimeout(r, 3000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9245/json', res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTab = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onopen = async () => {
    await send('Runtime.enable');
    console.log('Chrome debugging connected. Evaluating CloudDatabaseManager...');

    const res = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          await new Promise(r => setTimeout(r, 1500));
          const mgr = window.CloudDatabaseManager;
          const webhook = mgr ? mgr.getGasWebhookUrl() : null;
          const count = mgr ? mgr.actas.length : 0;
          const badge = document.getElementById('cloudDbLiveBadge');
          const badgeBg = badge ? badge.style.background : null;
          const badgeTitle = badge ? badge.title : null;

          // Test saveActa in memory/cloud
          let savedItem = null;
          if (mgr) {
            savedItem = await mgr.saveActa({
              id: 'ACTA-AUTOMATED-TEST-' + Date.now(),
              colaborador: 'Prueba Sincronizacion 24/7',
              colabDni: '12345678',
              colabEmail: 'prueba.sync@autonoma.pe',
              tipoActa: 'compromiso',
              titulo: 'Acta de Compromiso',
              fecha: '11/9/2026',
              equiposCount: 1
            });
          }

          const countAfter = mgr ? mgr.actas.length : 0;

          return {
            hasManager: !!mgr,
            webhook,
            initialCount: count,
            badgeBg,
            badgeTitle,
            savedItemId: savedItem ? savedItem.id : null,
            countAfter
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('BROWSER EVAL RESULT:', JSON.stringify(res.result.value, null, 2));

    ws.close();
    chrome.kill();
    server.close();
    process.exit(0);
  };
});
