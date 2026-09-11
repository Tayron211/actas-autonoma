const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\AUTONOMA\\AppData\\Local\\Temp\\chrome_debug_actas_real';

const chrome = spawn(chromePath, [
  '--headless',
  '--remote-debugging-port=9226',
  '--user-data-dir=' + userDataDir,
  '--disable-gpu',
  'http://localhost:3050/'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));

  const tabs = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9226/json', res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('3050'));
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
    if (msg.method === 'Runtime.exceptionThrown') {
      console.log('EXCEPTION:', JSON.stringify(msg.params.exceptionDetails, null, 2));
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('CONSOLE API:', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
    }
  };

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');

    console.log('Filling form and clicking email button...');
    const result = await send('Runtime.evaluate', {
      expression: `(async () => {
        // Set collaborator info
        const colabName = document.getElementById('colab_nombre');
        if (colabName) colabName.value = 'Juan Perez Prueba';
        const colabEmail = document.getElementById('colab_email');
        if (colabEmail) colabEmail.value = 'juan.perez@autonoma.pe';
        
        // Click bottom bar 'Enviar Correo'
        const btnOpen = document.getElementById('btnOpenEmailModal');
        btnOpen.click();
        
        await new Promise(r => setTimeout(r, 600));
        
        const emailTo = document.getElementById('emailTo');
        console.log('emailTo in modal:', emailTo ? emailTo.value : 'null');
        
        // Click modal 'Enviar Correo'
        const btnDirect = document.getElementById('btnSendDirectEmail');
        console.log('btnDirect disabled:', btnDirect.disabled);
        
        const startTime = Date.now();
        btnDirect.click();
        
        // Poll for completion or error up to 30 seconds
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 500));
          const progressBox = document.getElementById('emailSendProgress');
          const resultBox = document.getElementById('emailSendResult');
          const modal = document.getElementById('emailModal');
          
          const progressDisp = progressBox ? getComputedStyle(progressBox).display : 'none';
          const resultDisp = resultBox ? getComputedStyle(resultBox).display : 'none';
          const modalActive = modal ? modal.classList.contains('active') : false;
          
          if (!modalActive) {
            return {
              status: 'MODAL_CLOSED_SUCCESS',
              elapsedMs: Date.now() - startTime
            };
          }
          if (resultDisp === 'flex') {
            return {
              status: 'ERROR_RESULT_SHOWN',
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

    console.log('EVAL RESULT:', JSON.stringify(result, null, 2));

    ws.close();
    chrome.kill();
    process.exit(0);
  };
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
