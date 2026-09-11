const { spawn } = require('child_process');
const http = require('http');

const fs = require('fs');
const chromePath = fs.existsSync('C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Temp\\chrome_debug_gas_test';

const chrome = spawn(chromePath, [
  '--headless',
  '--remote-debugging-port=9233',
  '--user-data-dir=' + userDataDir,
  '--disable-gpu',
  'http://localhost:3050/'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9233/json', res => {
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
        try {
          const url = 'https://array-exports-organizer-existence.trycloudflare.com/api/actas';
          const postRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'TEST_PHONE_SYNC', colaborador: 'Test Sync Cloud', colabDni: '11112222' })
          });
          const postJson = await postRes.json();
          const r = await fetch(url);
          const t = await r.json();
          return { postStatus: postRes.status, getCount: t.count };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('EVAL RESULT:', evalRes.result.value);
  chrome.kill();
  process.exit(0);
}

run().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
