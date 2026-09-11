const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const chromePath = fs.existsSync('C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Temp\\chrome_debug_jsonp_test';

const chrome = spawn(chromePath, [
  '--headless',
  '--remote-debugging-port=9234',
  '--user-data-dir=' + userDataDir,
  '--disable-gpu',
  'http://localhost:3050/'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9234/json', res => {
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
      new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://script.google.com/macros/s/AKfycbwPOJdX-P5aE6lHr8avK9EgVnQLFgciuNDjnXygor2giUmVya6MPgvJL-Uee6fafVj6ug/exec';
        s.onload = () => resolve({ loaded: true });
        s.onerror = (e) => resolve({ loaded: false, error: 'Script error' });
        document.head.appendChild(s);
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('SCRIPT TAG RESULT:', evalRes.result.value);
  chrome.kill();
  process.exit(0);
}

run().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
