const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const altChrome = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const fs = require('fs');
const actualChrome = fs.existsSync(altChrome) ? altChrome : chromePath;

const userDataDir = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Temp\\chrome_debug_actas_gh';

const chrome = spawn(actualChrome, [
  '--headless',
  '--remote-debugging-port=9228',
  '--user-data-dir=' + userDataDir,
  '--disable-gpu',
  'https://tayron211.github.io/actas-autonoma/'
]);

async function run() {
  await new Promise(r => setTimeout(r, 4000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9228/json', res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('github.io'));
  if (!pageTab) {
    console.error('No tab found for github.io', tabs);
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

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('BROWSER LOG:', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.log('BROWSER EXCEPTION:', JSON.stringify(msg.params.exceptionDetails, null, 2));
    }
  };

  ws.onopen = async () => {
    await send('Runtime.enable');
    console.log('Testing GitHub Pages live URL...');

    const res = await send('Runtime.evaluate', {
      expression: `(async () => {
        const colabName = document.getElementById('colab_nombre');
        if (colabName) colabName.value = 'Juan Perez Prueba';
        const colabEmail = document.getElementById('colab_email');
        if (colabEmail) colabEmail.value = 'juan.perez@autonoma.pe';
        
        // Open modal
        const btnOpen = document.getElementById('btnOpenEmailModal');
        btnOpen.click();
        await new Promise(r => setTimeout(r, 1000));
        
        const btnDirect = document.getElementById('btnSendDirectEmail');
        console.log('Found btnDirect, disabled:', btnDirect.disabled);
        const startTime = Date.now();
        btnDirect.click();
        
        for (let i = 0; i < 50; i++) {
          await new Promise(r => setTimeout(r, 500));
          const progressBox = document.getElementById('emailSendProgress');
          const resultBox = document.getElementById('emailSendResult');
          const modal = document.getElementById('emailModal');
          const active = modal ? modal.classList.contains('active') : false;
          if (!active) {
            return { status: 'MODAL_CLOSED_SUCCESS', elapsedMs: Date.now() - startTime };
          }
          if (resultBox && getComputedStyle(resultBox).display === 'flex') {
            return {
              status: 'ERROR_RESULT',
              title: document.getElementById('emailResultTitle')?.textContent,
              desc: document.getElementById('emailResultDesc')?.textContent,
              elapsedMs: Date.now() - startTime
            };
          }
        }
        return { status: 'TIMEOUT', elapsedMs: Date.now() - startTime };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('RESULT ON GITHUB PAGES:', JSON.stringify(res, null, 2));
    ws.close();
    chrome.kill();
    process.exit(0);
  };
}
run();
