const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const altChrome = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const fs = require('fs');
const actualChrome = fs.existsSync(altChrome) ? altChrome : chromePath;

const userDataDir = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Temp\\chrome_debug_actas_real';

const chrome = spawn(actualChrome, [
  '--headless',
  '--remote-debugging-port=9231',
  '--user-data-dir=' + userDataDir,
  '--disable-gpu',
  'http://localhost:3050/'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9231/json', res => {
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
    console.log('Testing Send and History Card Inspection...');

    const res = await send('Runtime.evaluate', {
      expression: `(async () => {
        // 1. Fill collaborator data
        const colabName = document.getElementById('colab_nombre');
        if (colabName) colabName.value = 'Ing. Carlos Mendoza Rios';
        
        const colabDni = document.getElementById('colab_dni');
        if (colabDni) colabDni.value = '45892134';
        
        const colabEmail = document.getElementById('colab_email');
        if (colabEmail) colabEmail.value = 'carlos.mendoza@autonoma.pe';

        const repName = document.getElementById('rep_nombre');
        if (repName) repName.value = 'Ing. Bruno Paucar';

        // 2. Open email modal
        const btnOpen = document.getElementById('btnOpenEmailModal');
        btnOpen.click();
        await new Promise(r => setTimeout(r, 600));

        // 3. Click direct send
        const btnDirect = document.getElementById('btnSendDirectEmail');
        console.log('btnDirect disabled:', btnDirect.disabled);
        const startTime = Date.now();
        btnDirect.click();

        // 4. Poll until email modal closes
        let emailModalClosed = false;
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 500));
          const modal = document.getElementById('emailModal');
          if (modal && !modal.classList.contains('active')) {
            emailModalClosed = true;
            console.log('Email modal successfully closed after ms:', Date.now() - startTime);
            break;
          }
        }

        if (!emailModalClosed) {
          return {
            status: 'TIMEOUT_SENDING',
            progressTitle: document.getElementById('emailProgressTitle')?.textContent,
            progressSub: document.getElementById('emailProgressSub')?.textContent,
            resultTitle: document.getElementById('emailResultTitle')?.textContent,
            resultDesc: document.getElementById('emailResultDesc')?.textContent
          };
        }

        // 5. Open history modal
        await new Promise(r => setTimeout(r, 500));
        const btnHistory = document.getElementById('btnOpenHistoryModal');
        btnHistory.click();
        await new Promise(r => setTimeout(r, 800));

        // 6. Inspect history cards
        const listEl = document.getElementById('historyCardsList');
        const cards = listEl ? listEl.querySelectorAll('.history-item-card') : [];
        const cardSummaries = Array.from(cards).map(c => {
          const driveLink = c.querySelector('a[title*="Drive"]');
          return {
            title: c.querySelector('strong')?.innerText || '',
            fullText: c.innerText.replace(/\\s+/g, ' ').trim(),
            hasDriveButton: !!driveLink,
            driveHref: driveLink ? driveLink.href : null,
            hasEmailBadge: c.innerText.includes('Enviado')
          };
        });

        return {
          status: 'SUCCESS',
          cardCount: cards.length,
          cards: cardSummaries
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('FINAL HISTORY RESULT:', JSON.stringify(res, null, 2));
    ws.close();
    chrome.kill();
    process.exit(0);
  };
}
run();
