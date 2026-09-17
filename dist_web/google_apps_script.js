/**
 * ============================================================
 * SERVICIO EN LA NUBE 24/7 — UNIVERSIDAD AUTÓNOMA DEL PERÚ
 * GESTIÓN INTELIGENTE DE ACTAS DTI & BASE DE DATOS DRIVE
 * ============================================================
 * 
 * INSTRUCCIONES DE ACTUALIZACIÓN EN 1 MINUTO:
 * 1. Ingresa a https://script.google.com/ con tu cuenta institucional de Google.
 * 2. Abre el proyecto existente ("Gestión de Actas DTI").
 * 3. Selecciona todo el código (Ctrl+A), bórralo y pega este archivo completo.
 * 4. Haz clic en "Implementar" (arriba a la derecha) > "Administrar implementaciones".
 * 5. Haz clic en el icono del lápiz (Editar) en la implementación activa.
 * 6. En el menú desplegable "Versión", selecciona "Nueva versión".
 * 7. Haz clic en "Implementar" y listo. La URL se mantendrá idéntica y 100% activa 24/7.
 */

var ROOT_FOLDER_ID = "1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P";
var DB_FILE_NAME = "actas_cloud_db.json";

// Semilla inicial con las actas oficiales existentes
var INITIAL_SEED_ACTAS = [
  {
    "id": "ACTA-1789143268576-682",
    "createdAt": "2026-09-11T16:14:28.576Z",
    "updatedAt": "2026-09-11T16:14:28.576Z",
    "tipoActa": "compromiso",
    "titulo": "Acta de Compromiso",
    "colaborador": "tayron.salinas",
    "colabDni": "",
    "colabEmail": "tayron.salinas@autonoma.pe",
    "representante": "",
    "repCargo": "",
    "fecha": "11/9/2026",
    "estadoGeneral": "OPERATIVO Y EN BUEN ESTADO FÍSICO",
    "equiposCount": 1,
    "equipos": [
      {
        "etiqueta": "AUT-LAP-0482",
        "descripcion": "Laptop ThinkPad L14 Gen 3",
        "marca": "Lenovo",
        "modelo": "21C2S03C00",
        "serie": "PF3Z2K81",
        "estado": "Bueno"
      }
    ],
    "filename": "Acta_Compromiso_Colaborador_2026-09-11.pdf",
    "driveUrl": "https://drive.google.com/drive/folders/1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P",
    "driveFolderUrl": "https://drive.google.com/drive/folders/1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P",
    "emailSent": true,
    "driveUploaded": true
  },
  {
    "id": "ACTA-1789141202260-945",
    "createdAt": "2026-09-11T15:40:02.260Z",
    "updatedAt": "2026-09-11T15:40:02.262Z",
    "tipoActa": "compromiso",
    "titulo": "Acta de Compromiso",
    "colaborador": "Ing. Carlos Mendoza Rios",
    "colabDni": "45892134",
    "colabEmail": "carlos.mendoza@autonoma.pe",
    "representante": "Ing. Bruno Paucar",
    "repCargo": "",
    "fecha": "11/9/2026",
    "estadoGeneral": "OPERATIVO Y EN BUEN ESTADO FÍSICO",
    "equiposCount": 1,
    "equipos": [
      {
        "etiqueta": "AUT-LAP-0482",
        "descripcion": "Laptop ThinkPad L14 Gen 3",
        "marca": "Lenovo",
        "modelo": "21C2S03C00",
        "serie": "PF3Z2K81",
        "estado": "Bueno"
      }
    ],
    "category": "Actas de Devolución",
    "monthFolder": "Septiembre 2026",
    "filename": "Acta_Compromiso_Ing_Carlos_Mendoza_Rios_2026-09-11.pdf",
    "driveUrl": "https://drive.google.com/drive/folders/1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P",
    "driveFolderUrl": "https://drive.google.com/drive/folders/1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P",
    "emailSent": true,
    "driveUploaded": true
  },
  {
    "id": "ACTA-SAMPLE-01",
    "createdAt": "2026-09-10T07:41:40.627Z",
    "updatedAt": "2026-09-10T07:41:40.627Z",
    "tipoActa": "entrega",
    "titulo": "Acta de Devolución de Equipos",
    "colaborador": "Luz Eileen Emilia Zevallos Avalos",
    "colabDni": "70167159",
    "colabEmail": "luz.zevallos@autonoma.pe",
    "representante": "Bruno Paucar",
    "repCargo": "Coordinador de DTI",
    "fecha": "20 de Agosto del 2026",
    "estadoGeneral": "OPERATIVO Y EN BUEN ESTADO FÍSICO",
    "equiposCount": 2,
    "filename": "Acta_Devolucion_Luz_Zevallos.pdf",
    "driveUrl": "https://drive.google.com/drive/folders/1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P",
    "driveFolderUrl": "https://drive.google.com/drive/folders/1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P",
    "emailSent": true,
    "driveUploaded": true
  }
];

// ============================================================
// FUNCIONES AUXILIARES DE BASE DE DATOS EN GOOGLE DRIVE
// ============================================================
function getOrCreateDbFile(rootFolder) {
  var files = rootFolder.getFilesByName(DB_FILE_NAME);
  if (files.hasNext()) {
    return files.next();
  }
  var initialData = {
    version: 2,
    lastUpdated: new Date().toISOString(),
    actas: INITIAL_SEED_ACTAS,
    deletedIds: []
  };
  return rootFolder.createFile(DB_FILE_NAME, JSON.stringify(initialData, null, 2), "application/json");
}

function loadDbData(rootFolder) {
  try {
    var file = getOrCreateDbFile(rootFolder);
    var content = file.getBlob().getDataAsString("UTF-8");
    var parsed = JSON.parse(content || "{}");
    if (Array.isArray(parsed)) {
      return { actas: parsed, deletedIds: [] };
    }
    if (parsed && typeof parsed === "object") {
      return {
        version: parsed.version || 2,
        lastUpdated: parsed.lastUpdated || "",
        actas: Array.isArray(parsed.actas) ? parsed.actas : [],
        deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : []
      };
    }
    return { actas: [], deletedIds: [] };
  } catch (err) {
    console.error("Error al leer actas de Google Drive:", err);
    return { actas: [], deletedIds: [] };
  }
}

function loadActasFromDb(rootFolder) {
  return loadDbData(rootFolder).actas;
}

function saveDbData(rootFolder, dbData) {
  try {
    var file = getOrCreateDbFile(rootFolder);
    var toSave = {
      version: 2,
      lastUpdated: new Date().toISOString(),
      actas: Array.isArray(dbData.actas) ? dbData.actas : [],
      deletedIds: Array.isArray(dbData.deletedIds) ? dbData.deletedIds : []
    };
    file.setContent(JSON.stringify(toSave, null, 2));
    return true;
  } catch (err) {
    console.error("Error al escribir actas en Google Drive:", err);
    return false;
  }
}

function saveActasToDb(rootFolder, actasList) {
  var current = loadDbData(rootFolder);
  current.actas = actasList;
  return saveDbData(rootFolder, current);
}

function upsertActaInList(actasList, newActa) {
  if (!newActa) return actasList;
  var targetId = newActa.id;
  var targetFilename = newActa.filename;
  var found = false;

  for (var i = 0; i < actasList.length; i++) {
    var item = actasList[i];
    if ((targetId && item.id === targetId) || (targetFilename && item.filename === targetFilename)) {
      actasList[i] = Object.assign({}, item, newActa);
      found = true;
      break;
    }
  }

  if (!found) {
    actasList.unshift(newActa);
  }

  // Ordenar por fecha descendente
  actasList.sort(function(a, b) {
    var timeA = new Date(a.createdAt || a.fecha || 0).getTime();
    var timeB = new Date(b.createdAt || b.fecha || 0).getTime();
    return timeB - timeA;
  });

  return actasList;
}

// ============================================================
// MANEJADOR PRINCIPAL DE PETICIONES POST
// ============================================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
      var dbData = loadDbData(rootFolder);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Google Apps Script 24/7 activo",
        count: dbData.actas.length,
        actas: dbData.actas,
        deletedIds: dbData.deletedIds
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);

    // ------------------------------------------------------------
    // ACCIÓN 1: CONSULTA DE HISTORIAL (GET / SYNC ACTAS)
    // ------------------------------------------------------------
    if (data.action === "get_actas" || data.action === "sync_actas" || data.action === "sync") {
      var dbData = loadDbData(rootFolder);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        count: dbData.actas.length,
        actas: dbData.actas,
        deletedIds: dbData.deletedIds
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ------------------------------------------------------------
    // ACCIÓN 2: GUARDAR ACTA EN HISTORIAL CLOUD (SAVE ACTA)
    // ------------------------------------------------------------
    if (data.action === "save_acta") {
      var incomingActa = data.acta || data;
      var dbData = loadDbData(rootFolder);

      // Si el acta fue eliminada previamente por el admin, no revivirla por sincronización accidental
      var deletedMap = {};
      (dbData.deletedIds || []).forEach(function(did) { deletedMap[did] = true; });
      if (incomingActa && (deletedMap[incomingActa.id] || deletedMap[incomingActa.filename])) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "ignored",
          message: "Acta ignorada: fue eliminada permanentemente por un administrador",
          count: dbData.actas.length,
          actas: dbData.actas,
          deletedIds: dbData.deletedIds
        })).setMimeType(ContentService.MimeType.JSON);
      }

      dbData.actas = upsertActaInList(dbData.actas, incomingActa);
      saveDbData(rootFolder, dbData);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Acta registrada y sincronizada en Google Drive 24/7",
        count: dbData.actas.length,
        actas: dbData.actas,
        deletedIds: dbData.deletedIds
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ------------------------------------------------------------
    // ACCIÓN 3: ELIMINAR ACTA DE HISTORIAL Y ARCHIVO DE GOOGLE DRIVE
    // ------------------------------------------------------------
    if (data.action === "delete_acta") {
      var targetId = data.id || "";
      var targetFilename = data.filename || "";
      var dbData = loadDbData(rootFolder);
      var targetActa = null;

      for (var i = 0; i < dbData.actas.length; i++) {
        if ((targetId && dbData.actas[i].id === targetId) || (targetFilename && dbData.actas[i].filename === targetFilename)) {
          targetActa = dbData.actas[i];
          break;
        }
      }

      // Eliminar de la lista de actas
      dbData.actas = dbData.actas.filter(function(a) { 
        if (targetId && a.id === targetId) return false;
        if (targetFilename && a.filename === targetFilename) return false;
        return true; 
      });

      // Registrar en la lista de eliminados permanentes (tombstones)
      var dSet = {};
      (dbData.deletedIds || []).forEach(function(id) { dSet[id] = true; });
      if (targetId) dSet[targetId] = true;
      if (targetFilename) dSet[targetFilename] = true;
      if (targetActa && targetActa.id) dSet[targetActa.id] = true;
      if (targetActa && targetActa.filename) dSet[targetActa.filename] = true;

      var allDeleted = Object.keys(dSet);
      if (allDeleted.length > 500) {
        allDeleted = allDeleted.slice(allDeleted.length - 500);
      }
      dbData.deletedIds = allDeleted;

      saveDbData(rootFolder, dbData);

      // Borrar archivo correspondiente en Google Drive de forma exhaustiva
      var deletedFromDrive = false;
      try {
        var filename = (data.filename || (targetActa && targetActa.filename) || "").replace(/\.html$/i, ".pdf");
        var driveUrl = data.driveUrl || (targetActa && targetActa.driveUrl) || "";
        var fileId = data.fileId || (targetActa && targetActa.fileId) || "";

        if (!fileId && driveUrl) {
          var matchId = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
          if (matchId && matchId[1]) {
            fileId = matchId[1];
          }
        }

        // 1. Borrado directo por ID de archivo de Google Drive
        if (fileId) {
          try {
            var targetFile = DriveApp.getFileById(fileId);
            if (targetFile) {
              targetFile.setTrashed(true);
              deletedFromDrive = true;
            }
          } catch(eFile) {
            console.warn("Aviso al mover archivo a la papelera por ID:", eFile);
          }
        }

        // 2. Búsqueda y eliminación por nombre en todo Google Drive
        if (filename) {
          try {
            var fIter = DriveApp.getFilesByName(filename);
            while (fIter.hasNext()) {
              var fItem = fIter.next();
              if (!fItem.isTrashed()) {
                fItem.setTrashed(true);
                deletedFromDrive = true;
              }
            }
            var htmlAlt = filename.replace(/\.pdf$/i, ".html");
            if (htmlAlt !== filename) {
              var fHtmlIter = DriveApp.getFilesByName(htmlAlt);
              while (fHtmlIter.hasNext()) {
                var fHtml = fHtmlIter.next();
                if (!fHtml.isTrashed()) {
                  fHtml.setTrashed(true);
                  deletedFromDrive = true;
                }
              }
            }
          } catch(eGlobal) {
            console.warn("Aviso en búsqueda global por nombre:", eGlobal);
          }
        }

        // 3. Búsqueda recursiva dentro de la carpeta raíz oficial y subcarpetas mensuales
        if (filename) {
          try {
            function trashMatchingFilesInFolder(folder, targetName) {
              var count = 0;
              var targetLower = targetName.toLowerCase().trim();
              var files = folder.getFiles();
              while (files.hasNext()) {
                var f = files.next();
                var fName = f.getName().toLowerCase().trim();
                if (fName === targetLower || fName.replace(/\.html$/, ".pdf") === targetLower) {
                  try {
                    f.setTrashed(true);
                    count++;
                  } catch(eT) {}
                }
              }
              var subfolders = folder.getFolders();
              while (subfolders.hasNext()) {
                count += trashMatchingFilesInFolder(subfolders.next(), targetName);
              }
              return count;
            }

            var trashedInFolder = trashMatchingFilesInFolder(rootFolder, filename);
            if (trashedInFolder > 0) deletedFromDrive = true;
          } catch(eRec) {
            console.warn("Aviso en búsqueda recursiva en carpeta:", eRec);
          }
        }
      } catch (errDriveDel) {
        console.warn("Error al eliminar archivo de Drive:", errDriveDel);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: deletedFromDrive ? "Acta y archivo de Google Drive eliminados correctamente" : "Acta eliminada del historial en la nube",
        deletedFromDrive: deletedFromDrive,
        count: dbData.actas.length,
        actas: dbData.actas,
        deletedIds: dbData.deletedIds
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ------------------------------------------------------------
    // ACCIÓN 3B: VACIAR HISTORIAL COMPLETO (SOLO ADMINISTRADOR)
    // ------------------------------------------------------------
    if (data.action === "clear_all_actas") {
      var dbData = loadDbData(rootFolder);
      (data.deletedIds || []).forEach(function(did) {
        if (did) {
          if (!dbData.deletedIds) dbData.deletedIds = [];
          if (dbData.deletedIds.indexOf(did) === -1) dbData.deletedIds.push(did);
        }
      });

      // Mover a la papelera todos los archivos asociados a las actas
      (dbData.actas || []).forEach(function(acta) {
        if (acta.fileId) {
          try { DriveApp.getFileById(acta.fileId).setTrashed(true); } catch(e) {}
        }
        if (acta.filename) {
          try {
            var fIter = DriveApp.getFilesByName(acta.filename);
            while (fIter.hasNext()) { fIter.next().setTrashed(true); }
          } catch(e) {}
        }
      });

      // Limpiar recursivamente todos los PDFs en las subcarpetas mensuales
      try {
        var subCat = rootFolder.getFolders();
        while (subCat.hasNext()) {
          var cFolder = subCat.next();
          var monthF = cFolder.getFolders();
          while (monthF.hasNext()) {
            var mFolder = monthF.next();
            var mFiles = mFolder.getFiles();
            while (mFiles.hasNext()) {
              var mf = mFiles.next();
              if (mf.getName().toLowerCase().endsWith(".pdf") || mf.getName().toLowerCase().endsWith(".html")) {
                try { mf.setTrashed(true); } catch(e) {}
              }
            }
          }
        }
      } catch(eTrashAll) {
        console.warn("Aviso al vaciar archivos de carpetas:", eTrashAll);
      }

      dbData.actas = [];
      saveDbData(rootFolder, dbData);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Historial y archivos de Google Drive vaciados correctamente",
        count: 0,
        actas: [],
        deletedIds: dbData.deletedIds
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ------------------------------------------------------------
    // ACCIÓN 4: ENVÍO DIRECTO POR CORREO ELECTRÓNICO CON PDF ADJUNTO
    // ------------------------------------------------------------
    if (data.action === "send_email" || data.sendEmail) {
      var to = (data.to || "").trim();
      if (!to) throw new Error("No se especificó destinatario de correo");

      var subject = data.subject || "Acta Oficial DTI — Universidad Autónoma del Perú";
      var body = data.body || "";
      var attachments = [];
      var singlePdfBase64 = data.pdfBase64 || data.fileBase64;
      if (singlePdfBase64) {
        var pdfBytes = Utilities.base64Decode(singlePdfBase64);
        var pdfName = (data.filename || "Acta_Oficial").replace(/\.html$/i, ".pdf");
        attachments.push(Utilities.newBlob(pdfBytes, "application/pdf", pdfName));
      }
      // Garantizar estrictamente 1 solo documento adjunto
      if (attachments.length > 1) {
        attachments = [attachments[0]];
      }

      var htmlBody = data.htmlBody || (body || "").replace(/\n/g, "<br>");

      GmailApp.sendEmail(to, subject, body, {
        name: "Dirección de Tecnologías de la Información (DTI) — Universidad Autónoma del Perú",
        htmlBody: htmlBody,
        attachments: attachments
      });

      // Subida automática a Google Drive simultánea
      var driveFileUrl = "";
      var driveMonthUrl = "";
      try {
        if (data.pdfBase64 || data.fileBase64) {
          var categoryName = data.tipo === "compromiso" ? "Actas de Compromiso" : "Actas de Devolución";
          var catIter = rootFolder.getFoldersByName(categoryName);
          var categoryFolder = catIter.hasNext() ? catIter.next() : rootFolder.createFolder(categoryName);

          var monthName = data.mesCarpeta || (data.mes + " " + data.anio);
          var monthIter = categoryFolder.getFoldersByName(monthName);
          var monthFolder = monthIter.hasNext() ? monthIter.next() : categoryFolder.createFolder(monthName);

          var rawFile = Utilities.base64Decode(data.pdfBase64 || data.fileBase64);
          var fileBlob = Utilities.newBlob(rawFile, "application/pdf", (data.filename || "Acta_Oficial").replace(/\.html$/i, ".pdf"));
          var uploadedFile = monthFolder.createFile(fileBlob);
          driveFileUrl = uploadedFile.getUrl();
          driveFileId = uploadedFile.getId();
          driveMonthUrl = monthFolder.getUrl();
        }
      } catch (driveErr) {
        console.warn("Aviso al respaldar en Drive: " + driveErr.toString());
      }

      // Registro automático del acta en el historial 24/7
      try {
        var autoActa = {
          id: data.id || ("ACTA-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tipoActa: data.tipo || "compromiso",
          titulo: data.tipo === "compromiso" ? "Acta de Compromiso" : "Acta de Devolución de Equipos",
          colaborador: data.colaborador || (to.split("@")[0]),
          colabDni: data.colabDni || "",
          colabEmail: to,
          fecha: data.fecha || (data.mes + " " + data.anio),
          filename: (data.filename || "Acta_Oficial").replace(/\.html$/i, ".pdf"),
          fileId: driveFileId || "",
          driveUrl: driveFileUrl || ("https://drive.google.com/drive/folders/" + ROOT_FOLDER_ID),
          driveFolderUrl: driveMonthUrl || ("https://drive.google.com/drive/folders/" + ROOT_FOLDER_ID),
          emailSent: true,
          driveUploaded: !!driveFileUrl
        };
        var currentActas = loadActasFromDb(rootFolder);
        currentActas = upsertActaInList(currentActas, autoActa);
        saveActasToDb(rootFolder, currentActas);
      } catch (errAuto) {
        console.warn("Aviso al registrar acta en historial:", errAuto);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Correo enviado y acta respaldada automáticamente en Google Drive 24/7",
        sentTo: to,
        driveFileId: driveFileId || "",
        driveFileUrl: driveFileUrl,
        driveMonthUrl: driveMonthUrl,
        attachmentsCount: attachments.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ------------------------------------------------------------
    // ACCIÓN 5: GUARDADO MANUAL DE ARCHIVO PDF EN GOOGLE DRIVE
    // ------------------------------------------------------------
    var categoryName = data.tipo === "compromiso" ? "Actas de Compromiso" : "Actas de Devolución";
    var catIter = rootFolder.getFoldersByName(categoryName);
    var categoryFolder = catIter.hasNext() ? catIter.next() : rootFolder.createFolder(categoryName);

    var monthName = data.mesCarpeta || (data.mes + " " + data.anio);
    var monthIter = categoryFolder.getFoldersByName(monthName);
    var monthFolder = monthIter.hasNext() ? monthIter.next() : categoryFolder.createFolder(monthName);

    var blob;
    if (data.fileBase64) {
      var decoded = Utilities.base64Decode(data.fileBase64);
      blob = Utilities.newBlob(decoded, data.mimeType || "application/pdf", data.filename);
    } else if (data.htmlContent) {
      blob = Utilities.newBlob(data.htmlContent, "text/html", data.filename);
    } else {
      throw new Error("No se recibieron datos de archivo ni acción válida");
    }

    var file = monthFolder.createFile(blob);

    // Registro automático del acta en historial
    try {
      var autoActaSave = {
        id: data.id || ("ACTA-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tipoActa: data.tipo || "compromiso",
        titulo: data.tipo === "compromiso" ? "Acta de Compromiso" : "Acta de Devolución de Equipos",
        colaborador: data.colaborador || "Colaborador",
        colabDni: data.colabDni || "",
        colabEmail: data.colabEmail || "",
        fecha: data.fecha || (data.mes + " " + data.anio),
        filename: data.filename,
        fileId: file.getId(),
        driveUrl: file.getUrl(),
        driveFolderUrl: monthFolder.getUrl(),
        driveUploaded: true
      };
      var currentActas2 = loadActasFromDb(rootFolder);
      currentActas2 = upsertActaInList(currentActas2, autoActaSave);
      saveActasToDb(rootFolder, currentActas2);
    } catch (errAuto2) {
      console.warn("Aviso al registrar acta en historial:", errAuto2);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Guardado correctamente en Google Drive 24/7",
      fileName: file.getName(),
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      monthFolderName: monthName,
      monthFolderUrl: monthFolder.getUrl(),
      categoryName: categoryName
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// MANEJADOR DE PETICIONES GET (LECTURA DIRECTA Y JSONP)
// ============================================================
function doGet(e) {
  try {
    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var dbData = loadDbData(rootFolder);
    var callback = e && e.parameter && e.parameter.callback;

    var responseObj = {
      status: "success",
      online: true,
      message: "Sincronización 24/7 en tiempo real Actas DTI activa",
      count: dbData.actas.length,
      actas: dbData.actas,
      deletedIds: dbData.deletedIds || [],
      rootFolderId: ROOT_FOLDER_ID
    };

    var jsonStr = JSON.stringify(responseObj);

    if (callback) {
      return ContentService.createTextOutput(callback + "(" + jsonStr + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(jsonStr)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
