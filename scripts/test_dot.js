const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const altChrome = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const actualChrome = fs.existsSync(altChrome) ? altChrome : chromePath;

const userDataDir = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Temp\\chrome_debug_actas_dot';

const chrome = spawn(actualChrome, [
  '--headless',
  '--remote-debugging-port=9232',
  '--user-data-dir=' + userDataDir,
  '--disable-gpu',
  'http://localhost:3050/'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9232/json', res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('3050'));
  if (!pageTab) {
    console.error('No tab found', tabs);
    chrome.kill();
    process.exit(1);
  }

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

  await send('Page.enable');
  await send('DOM.enable');

  // Click open modal
  await send('Runtime.evaluate', {
    expression: `
      document.getElementById('btnOpenHistoryModal').click();
    `
  });

  await new Promise(r => setTimeout(r, 800));

  // Capture screenshot of modal header
  const clip = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const modal = document.getElementById('historyModal');
        modal.classList.add('active');
        const h = document.querySelector('#historyModal .modal-header');
        if (!h) return null;
        const rect = h.getBoundingClientRect();
        return { x: rect.left, y: rect.top, width: rect.width, height: rect.height, scale: 1 };
      })()
    `,
    returnByValue: true
  });

  if (clip.result.value) {
    const screenshot = await send('Page.captureScreenshot', {
      clip: clip.result.value
    });

    const outPath = 'C:/Users/AUTONOMA/.gemini/antigravity-ide/brain/f22b165b-fd7c-453b-ad00-7d31600ae49b/modal_header_dot.png';
    fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
    console.log('SUCCESS: Saved header screenshot to', outPath);
  } else {
    console.log('Modal header not found');
  }

  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  try { chrome.kill(); } catch (e) {}
  process.exit(1);
});
