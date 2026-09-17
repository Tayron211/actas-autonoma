const fs = require('fs');

const gasCode = fs.readFileSync('google_apps_script.js', 'utf8');
let appJs = fs.readFileSync('js/app.js', 'utf8');

// 1. Replace OFFICIAL_DEFAULT_GAS_SCRIPT_CODE
const startKey = '  const OFFICIAL_DEFAULT_GAS_SCRIPT_CODE = `';
const endKey = '`;\n\n  function getEffectiveWebhookUrl() {';
const altEndKey = '`;\r\n\r\n  function getEffectiveWebhookUrl() {';

let sIdx = appJs.indexOf(startKey);
let eIdx = appJs.indexOf(endKey);
let endLen = endKey.length;
if (eIdx === -1) {
  eIdx = appJs.indexOf(altEndKey);
  endLen = altEndKey.length;
}

if (sIdx === -1 || eIdx === -1) {
  console.error('Failed to locate OFFICIAL_DEFAULT_GAS_SCRIPT_CODE in js/app.js', { sIdx, eIdx });
  process.exit(1);
}

const beforeGas = appJs.substring(0, sIdx + startKey.length);
const afterGas = appJs.substring(eIdx);
appJs = beforeGas + gasCode + afterGas;

// 2. Add cloudFileId = ''
appJs = appJs.replace(
  "    let cloudFileUrl = '';\n    let cloudMonthFolderUrl = '';",
  "    let cloudFileUrl = '';\n    let cloudFileId = '';\n    let cloudMonthFolderUrl = '';"
);
appJs = appJs.replace(
  "    let cloudFileUrl = '';\r\n    let cloudMonthFolderUrl = '';",
  "    let cloudFileUrl = '';\r\n    let cloudFileId = '';\r\n    let cloudMonthFolderUrl = '';"
);

// 3. Capture cloudFileId
appJs = appJs.replace(
  "cloudFileUrl = gasData.fileUrl || '';\n              cloudMonthFolderUrl = gasData.monthFolderUrl || '';",
  "cloudFileUrl = gasData.fileUrl || '';\n              cloudFileId = gasData.fileId || '';\n              cloudMonthFolderUrl = gasData.monthFolderUrl || '';"
);
appJs = appJs.replace(
  "cloudFileUrl = gasData.fileUrl || '';\r\n              cloudMonthFolderUrl = gasData.monthFolderUrl || '';",
  "cloudFileUrl = gasData.fileUrl || '';\r\n              cloudFileId = gasData.fileId || '';\r\n              cloudMonthFolderUrl = gasData.monthFolderUrl || '';"
);

// 4. Add fileId: cloudFileId in saveActa
appJs = appJs.replace(
  "            filename: pdfFilename,\n            driveUrl: cloudFileUrl || '',",
  "            filename: pdfFilename,\n            fileId: cloudFileId || '',\n            driveUrl: cloudFileUrl || '',"
);
appJs = appJs.replace(
  "            filename: pdfFilename,\r\n            driveUrl: cloudFileUrl || '',",
  "            filename: pdfFilename,\r\n            fileId: cloudFileId || '',\r\n            driveUrl: cloudFileUrl || '',"
);

// 5. In send email: capture targetFileId and pass into saveActa
const targetDriveUrlOld = "const targetDriveUrl = (proxyOk && proxyResponseJson && (proxyResponseJson.driveFileUrl || proxyResponseJson.fileUrl))\n          || `https://drive.google.com/drive/search?q=${encodeURIComponent(filename)}`;";
const targetDriveUrlNew = "const targetDriveUrl = (proxyOk && proxyResponseJson && (proxyResponseJson.driveFileUrl || proxyResponseJson.fileUrl))\n          || `https://drive.google.com/drive/search?q=${encodeURIComponent(filename)}`;\n        const targetFileId = (proxyOk && proxyResponseJson && (proxyResponseJson.driveFileId || proxyResponseJson.fileId)) || '';";

if (appJs.includes(targetDriveUrlOld)) {
  appJs = appJs.replace(targetDriveUrlOld, targetDriveUrlNew);
} else {
  const targetDriveUrlOldCRLF = targetDriveUrlOld.replace(/\n/g, '\r\n');
  const targetDriveUrlNewCRLF = targetDriveUrlNew.replace(/\n/g, '\r\n');
  appJs = appJs.replace(targetDriveUrlOldCRLF, targetDriveUrlNewCRLF);
}

appJs = appJs.replace(
  "            filename: filename,\n            driveUrl: targetDriveUrl,",
  "            filename: filename,\n            fileId: targetFileId,\n            driveUrl: targetDriveUrl,"
);
appJs = appJs.replace(
  "            filename: filename,\r\n            driveUrl: targetDriveUrl,",
  "            filename: filename,\r\n            fileId: targetFileId,\r\n            driveUrl: targetDriveUrl,"
);

// 6. deleteActa with no-cors fallback
const oldDeleteBlock = `      // 5. Enviar eliminación a Google Apps Script para papelera de Drive
      const gasUrl = this.getGasWebhookUrl();
      if (gasUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const gasRes = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'delete_acta',
              id: id,
              filename: targetActa ? targetActa.filename : '',
              driveUrl: targetActa ? targetActa.driveUrl : '',
              fileId: targetActa ? targetActa.fileId : '',
              tipo: targetActa ? targetActa.tipoActa : ''
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (gasRes.ok) {
            try {
              const gasJson = await gasRes.json();
              const authoritative = Array.isArray(gasJson.actas) ? gasJson.actas : null;
              const cloudDeleted = Array.isArray(gasJson.deletedIds) ? gasJson.deletedIds : [];
              if (authoritative !== null) {
                this.applyAuthoritativeSync(authoritative, cloudDeleted);
              }
            } catch(e) {}
          }
        } catch(e) {}
      }`;

const newDeleteBlock = `      // 5. Enviar eliminación a Google Apps Script para papelera de Drive
      const gasUrl = this.getGasWebhookUrl();
      if (gasUrl) {
        const deletePayloadStr = JSON.stringify({
          action: 'delete_acta',
          id: id,
          filename: targetActa ? targetActa.filename : '',
          driveUrl: targetActa ? targetActa.driveUrl : '',
          fileId: targetActa ? targetActa.fileId : '',
          tipo: targetActa ? targetActa.tipoActa : ''
        });

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const gasRes = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: deletePayloadStr,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (gasRes.ok) {
            try {
              const gasJson = await gasRes.json();
              const authoritative = Array.isArray(gasJson.actas) ? gasJson.actas : null;
              const cloudDeleted = Array.isArray(gasJson.deletedIds) ? gasJson.deletedIds : [];
              if (authoritative !== null) {
                this.applyAuthoritativeSync(authoritative, cloudDeleted);
              }
            } catch(e) {}
          }
        } catch(eGas) {
          // Fallback no-cors para garantizar que el webhook de Google Drive ejecute la eliminación
          try {
            await fetch(gasUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: deletePayloadStr
            });
          } catch(eFallback) {}
        }
      }`;

if (appJs.includes(oldDeleteBlock)) {
  appJs = appJs.replace(oldDeleteBlock, newDeleteBlock);
} else {
  const oldDeleteCRLF = oldDeleteBlock.replace(/\n/g, '\r\n');
  const newDeleteCRLF = newDeleteBlock.replace(/\n/g, '\r\n');
  if (appJs.includes(oldDeleteCRLF)) {
    appJs = appJs.replace(oldDeleteCRLF, newDeleteCRLF);
  } else {
    console.warn('Could not match oldDeleteBlock directly, checking manually');
  }
}

// 7. clearAllHistory with no-cors fallback
const oldClearBlock = `      const gasUrl = this.getGasWebhookUrl();
      if (gasUrl) {
        try {
          fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'clear_all_actas',
              deletedIds: [...this.deletedIds]
            })
          }).catch(() => {});
        } catch(e) {}
      }`;

const newClearBlock = `      const gasUrl = this.getGasWebhookUrl();
      if (gasUrl) {
        const clearPayloadStr = JSON.stringify({
          action: 'clear_all_actas',
          deletedIds: [...this.deletedIds]
        });
        try {
          fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: clearPayloadStr
          }).catch(() => {
            try {
              fetch(gasUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: clearPayloadStr
              }).catch(() => {});
            } catch(e2) {}
          });
        } catch(e) {}
      }`;

if (appJs.includes(oldClearBlock)) {
  appJs = appJs.replace(oldClearBlock, newClearBlock);
} else {
  const oldClearCRLF = oldClearBlock.replace(/\n/g, '\r\n');
  const newClearCRLF = newClearBlock.replace(/\n/g, '\r\n');
  if (appJs.includes(oldClearCRLF)) {
    appJs = appJs.replace(oldClearCRLF, newClearCRLF);
  } else {
    console.warn('Could not match oldClearBlock directly, checking manually');
  }
}

fs.writeFileSync('js/app.js', appJs, 'utf8');
fs.writeFileSync('dist_web/js/app.js', appJs, 'utf8');
console.log('Successfully updated js/app.js and dist_web/js/app.js');
