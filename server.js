const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {}

const DEFAULT_PORT = 3050;
const ROOT_FOLDER_ID = '1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P';
const CONFIG_FILE = path.join(__dirname, 'config.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json; charset=UTF-8',
  '.apk': 'application/vnd.android.package-archive'
};

const DATA_DIR = path.join(__dirname, 'data');
const ACTAS_DB_FILE = path.join(DATA_DIR, 'actas_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getStoredActas() {
  try {
    if (fs.existsSync(ACTAS_DB_FILE)) {
      return JSON.parse(fs.readFileSync(ACTAS_DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error al leer base de datos actas_db.json:', e);
  }
  return [];
}

function saveStoredActas(list) {
  try {
    fs.writeFileSync(ACTAS_DB_FILE, JSON.stringify(list, null, 2), 'utf8');
    syncToCloudDb(list);
  } catch (e) {
    console.error('Error al guardar base de datos actas_db.json:', e);
  }
}

const CLOUD_DB_ENDPOINT = 'https://api.restful-api.dev/objects/ff808181a067127101a08f30555871e8';

async function syncToCloudDb(list) {
  try {
    await fetch(CLOUD_DB_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AUTONOMA_ACTAS_DATABASE',
        data: {
          version: 1,
          lastSync: new Date().toISOString(),
          actas: list
        }
      })
    });
  } catch (e) {}
}

function upsertActa(acta) {
  const list = getStoredActas();
  const idx = list.findIndex(a => (acta.id && a.id === acta.id) || (acta.filename && a.filename === acta.filename));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...acta, updatedAt: new Date().toISOString() };
  } else {
    list.unshift({
      id: acta.id || `ACTA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...acta
    });
  }
  saveStoredActas(list);
  return list;
}

const OFFICIAL_DEFAULT_GAS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbwPOJdX-P5aE6lHr8avK9EgVnQLFgciuNDjnXygor2giUmVya6MPgvJL-Uee6fafVj6ug/exec';

function getStoredConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (cfg && cfg.webhookUrl !== undefined) {
        return cfg;
      }
    }
  } catch (e) {}
  return { webhookUrl: OFFICIAL_DEFAULT_GAS_WEBHOOK, rootFolderId: ROOT_FOLDER_ID };
}

function saveStoredConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.error('Error al guardar config.json:', e);
  }
}

let currentPublicUrl = null;

function getStoredPublicUrl() {
  const f = path.join(DATA_DIR, 'public_url.txt');
  if (fs.existsSync(f)) {
    try { return fs.readFileSync(f, 'utf8').trim(); } catch(e){}
  }
  return currentPublicUrl;
}

function startServer(port) {
  const server = http.createServer((req, res) => {
    // Cabeceras CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let reqUrl = decodeURIComponent(req.url.split('?')[0]);

    // ============================================================
    // API: INFORMACIÓN DE ACCESO PÚBLICO Y MUNDIAL
    // ============================================================
    if (req.method === 'GET' && reqUrl === '/api/public-info') {
      const pUrl = currentPublicUrl || getStoredPublicUrl();
      const apkUrl = pUrl ? `${pUrl}/downloads/Actas_Autonoma.apk` : '/downloads/Actas_Autonoma.apk';
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({
        status: 'success',
        publicUrl: pUrl,
        shortUrl: 'https://ulvis.net/uactas',
        shortApkUrl: 'https://ulvis.net/actasapk',
        apkDownloadUrl: apkUrl,
        port: port,
        isLive: Boolean(currentPublicUrl)
      }));
      return;
    }

    // ============================================================
    // API: OBTENER CONFIGURACIÓN DE DRIVE
    // ============================================================
    if (req.method === 'GET' && reqUrl === '/api/drive-config') {
      const cfg = getStoredConfig();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify(cfg));
      return;
    }

    // ============================================================
    // API: GUARDAR CONFIGURACIÓN DE DRIVE
    // ============================================================
    if (req.method === 'POST' && reqUrl === '/api/drive-config') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const cfg = getStoredConfig();
          if (data.webhookUrl !== undefined) cfg.webhookUrl = data.webhookUrl.trim();
          saveStoredConfig(cfg);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ status: 'success', config: cfg }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ status: 'error', message: e.message }));
        }
      });
      return;
    }

    // ============================================================
    // API: BASE DE DATOS DE ACTAS EN TIEMPO REAL
    // ============================================================
    if (req.method === 'GET' && reqUrl === '/api/actas') {
      const actas = getStoredActas();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ status: 'success', count: actas.length, actas }));
      return;
    }

    if (req.method === 'POST' && reqUrl === '/api/actas') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const updated = upsertActa(data);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ status: 'success', count: updated.length }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ status: 'error', message: e.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE' && reqUrl === '/api/actas') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          const id = data.id;
          let list = getStoredActas();
          const target = list.find(a => a.id === id);
          if (target && target.localPath) {
            try {
              const fullLocal = path.join(__dirname, target.localPath.replace(/^\//, ''));
              if (fs.existsSync(fullLocal)) fs.unlinkSync(fullLocal);
            } catch (errLocal) {}
          }
          list = list.filter(a => a.id !== id);
          saveStoredActas(list);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ status: 'success', count: list.length }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ status: 'error', message: e.message }));
        }
      });
      return;
    }

    // ============================================================
    // API: GUARDADO INTELIGENTE EN SERVIDOR (CATEGORÍA + MES/AÑO)
    // ============================================================
    if (req.method === 'POST' && reqUrl === '/api/save-acta') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const isCompromiso = data.tipoActa === 'compromiso';
          const categoryName = isCompromiso ? 'Actas de Compromiso' : 'Actas de Devolución';
          
          const mes = data.mes || 'General';
          const anio = data.anio || new Date().getFullYear().toString();
          const monthFolderName = data.mesCarpeta || `${mes} ${anio}`;

          const targetDir = path.join(__dirname, 'actas', categoryName, monthFolderName);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          const filename = data.filename || `Acta_${Date.now()}.html`;
          const filePath = path.join(targetDir, filename);

          if (data.htmlContent) {
            fs.writeFileSync(filePath, data.htmlContent, 'utf8');
          } else if (data.fileBase64) {
            fs.writeFileSync(filePath, Buffer.from(data.fileBase64, 'base64'));
          } else {
            throw new Error('Sin contenido para guardar');
          }

          const relativePath = path.join('actas', categoryName, monthFolderName, filename).replace(/\\/g, '/');

          // Sincronizar automáticamente en la Base de Datos en Tiempo Real
          upsertActa({
            id: data.id || `ACTA-${Date.now()}`,
            tipoActa: isCompromiso ? 'compromiso' : 'entrega',
            titulo: isCompromiso ? 'Acta de Compromiso' : 'Acta de Devolución de Equipos',
            colaborador: data.colaborador || data.colab_nombre || '',
            colabDni: data.colabDni || data.colab_dni || '',
            colabEmail: data.colabEmail || data.colab_email || '',
            representante: data.representante || data.rep_nombre || '',
            repCargo: data.repCargo || data.rep_cargo || '',
            fecha: data.fecha || `${mes} ${anio}`,
            estadoGeneral: data.estadoGeneral || data.entrega_estado_gral || '',
            equiposCount: data.equipos ? data.equipos.length : (data.equiposCount || 0),
            equipos: data.equipos || [],
            category: categoryName,
            monthFolder: monthFolderName,
            filename: filename,
            localPath: relativePath,
            driveUrl: data.driveUrl || '',
            emailSent: data.emailSent || false,
            timestamp: Date.now()
          });

          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({
            status: 'success',
            message: 'Documento organizado y archivado correctamente en el servidor',
            category: categoryName,
            monthFolder: monthFolderName,
            filename: filename,
            localPath: relativePath
          }));

        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ status: 'error', message: e.message }));
        }
      });
      return;
    }

    // ============================================================
    // API: ENVÍO DE CORREO ELECTRÓNICO CON PDF ADJUNTO
    // ============================================================
    if (req.method === 'POST' && reqUrl === '/api/send-email') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const to = data.to;
          if (!to) throw new Error('No se especificó destinatario');

          const subject = data.subject || 'Acta Oficial DTI — Universidad Autónoma del Perú';
          const emailText = data.body || '';
          const pdfBase64 = data.pdfBase64;
          const filename = (data.filename || `Acta_${Date.now()}.pdf`).replace(/\.html$/i, '.pdf');

          // Guardar copia local del PDF adjunto en actas/correos/
          const emailsDir = path.join(__dirname, 'actas', 'correos');
          if (!fs.existsSync(emailsDir)) {
            fs.mkdirSync(emailsDir, { recursive: true });
          }

          const pdfPath = path.join(emailsDir, filename);
          if (pdfBase64) {
            fs.writeFileSync(pdfPath, Buffer.from(pdfBase64, 'base64'));
          }

          // Guardar registro del envío
          const logRecord = {
            fecha: new Date().toISOString(),
            destinatario: to,
            asunto: subject,
            archivoAdjunto: filename,
            rutaArchivo: pdfPath
          };
          fs.writeFileSync(path.join(emailsDir, `${filename}_envio.json`), JSON.stringify(logRecord, null, 2), 'utf8');

          let sentBySmtp = false;
          const cfg = getStoredConfig();

          // Si el usuario configuró credenciales SMTP en config.json
          if (cfg.smtp && cfg.smtp.host && cfg.smtp.auth && cfg.smtp.auth.user && nodemailer) {
            try {
              const transporter = nodemailer.createTransport(cfg.smtp);
              const mailOptions = {
                from: cfg.smtp.from || `"DTI - Universidad Autónoma del Perú" <${cfg.smtp.auth.user}>`,
                to: to,
                subject: subject,
                text: emailText,
                html: data.htmlBody || undefined,
                attachments: pdfBase64 ? [{
                  filename: filename,
                  content: Buffer.from(pdfBase64, 'base64'),
                  contentType: 'application/pdf'
                }] : []
              };
              await transporter.sendMail(mailOptions);
              sentBySmtp = true;
            } catch (smtpErr) {
              console.warn('Advertencia en envío SMTP local:', smtpErr.message);
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({
            status: 'success',
            message: 'PDF del acta adjuntado y procesado exitosamente',
            filename: filename,
            destinatario: to,
            sentBySmtp: sentBySmtp,
            localPath: path.join('actas', 'correos', filename).replace(/\\/g, '/')
          }));

        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ status: 'error', message: e.message }));
        }
      });
      return;
    }

    // ============================================================
    // API: PROXY SEGURO HACIA GOOGLE APPS SCRIPT (CERO CORS)
    // ============================================================
    if (req.method === 'POST' && reqUrl === '/api/gas-proxy') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const cfg = getStoredConfig();
          const targetUrl = cfg.webhookUrl;
          if (!targetUrl) {
            throw new Error('No hay URL de Webhook configurada en el sistema.');
          }

          let outgoingBody = body;
          try {
            const parsed = JSON.parse(body);
            if (parsed.to && typeof parsed.to === 'string') {
              let cleanedTo = parsed.to.trim();
              if (!cleanedTo.includes('@') && /\.(autonoma\.pe|gmail\.com|hotmail\.com|outlook\.com)$/i.test(cleanedTo)) {
                cleanedTo = cleanedTo.replace(/\.(autonoma\.pe|gmail\.com|hotmail\.com|outlook\.com)$/i, '@$1');
                parsed.to = cleanedTo;
                outgoingBody = JSON.stringify(parsed);
              }
            }
          } catch (ignore) {}

          let drivePromise = null;
          if (parsed.action === 'send_email' && (parsed.pdfBase64 || parsed.fileBase64)) {
            const drivePayload = {
              tipo: parsed.tipo || 'compromiso',
              mes: parsed.mes || '',
              anio: parsed.anio || '',
              mesCarpeta: parsed.mesCarpeta || '',
              filename: (parsed.filename || 'Acta_Oficial.pdf').replace(/\.html$/i, '.pdf'),
              fileBase64: parsed.pdfBase64 || parsed.fileBase64,
              mimeType: 'application/pdf'
            };
            drivePromise = fetch(targetUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(drivePayload)
            }).then(async r => {
              try {
                const txt = await r.text();
                return JSON.parse(txt);
              } catch(e) { return null; }
            }).catch(err => {
              console.warn('[Drive Auto-Backup] Aviso:', err.message);
              return null;
            });
          }

          const emailPromise = fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: outgoingBody
          });

          const [response, driveJson] = await Promise.all([
            emailPromise,
            drivePromise || Promise.resolve(null)
          ]);

          const resText = await response.text();
          let jsonResponse;
          try {
            jsonResponse = JSON.parse(resText);
          } catch (pe) {
            // Extraer el mensaje real de error de Google si devolvió HTML
            let errorDetail = '';
            const match = resText.match(/<div[^>]*style="text-align:center;font-family:monospace[^>]*>([\s\S]*?)<\/div>/i);
            if (match && match[1]) {
              errorDetail = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/<[^>]*>/g, '').trim();
            }

            if (errorDetail) {
              throw new Error(`Error en tu script de Google: "${errorDetail}". Revisa la línea 1 en script.google.com y borra cualquier texto antes de /**.`);
            }

            if (resText.includes('No se pudo abrir el archivo') || resText.includes('errorMessage')) {
              throw new Error('Google rechazó la conexión por permisos. En Google Apps Script debes seleccionar "Quién tiene acceso: Cualquier usuario" (Anyone).');
            }
            throw new Error('Respuesta no válida de Google Apps Script: ' + resText.substring(0, 150));
          }

          // Incorporar URL de Google Drive si se obtuvo
          if (driveJson && driveJson.fileUrl) {
            jsonResponse.driveFileUrl = driveJson.fileUrl;
            jsonResponse.driveMonthUrl = driveJson.monthFolderUrl;
            console.log(`[Drive Auto-Backup] Acta respaldada con éxito en Drive: ${driveJson.fileUrl}`);
          }

          // Si Google Drive devolvió URL del archivo, actualizar registro en DB
          try {
            const parsedReq = JSON.parse(outgoingBody || '{}');
            const fileUrlToSave = (jsonResponse && jsonResponse.driveFileUrl) || (jsonResponse && jsonResponse.fileUrl);
            if (fileUrlToSave && parsedReq.filename) {
              upsertActa({
                filename: parsedReq.filename,
                driveUrl: fileUrlToSave
              });
            }
            if (jsonResponse && jsonResponse.status === 'success' && parsedReq.action === 'send_email' && parsedReq.to) {
              upsertActa({
                colabEmail: parsedReq.to,
                emailSent: true
              });
            }
          } catch (e) {}

          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify(jsonResponse));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ status: 'error', message: err.message }));
        }
      });
      return;
    }

    // ============================================================
    // SERVIR ARCHIVOS ESTÁTICOS
    // ============================================================
    if (reqUrl === '/') reqUrl = '/index.html';
    const filePath = path.join(__dirname, reqUrl);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Puerto ${port} ocupado, probando ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Error del servidor:', err);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  SISTEMA DE GESTIÓN DE ACTAS — UNIVERSIDAD AUTÓNOMA`);
    console.log(`======================================================`);
    console.log(`  Servidor activo con Guardado Inteligente de Actas:`);
    console.log(`  - Local:   http://localhost:${port}`);

    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`  - Móvil:   http://${net.address}:${port}`);
        }
      }
    }
    console.log(`  Cloud 24/7 Webhook: ${OFFICIAL_DEFAULT_GAS_WEBHOOK}`);
    console.log(`======================================================\n`);
  });
}


startServer(DEFAULT_PORT);

