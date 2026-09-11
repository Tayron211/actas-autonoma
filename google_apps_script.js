/**
 * ============================================================
 * SCRIPT PARA GUARDADO INTELIGENTE EN GOOGLE DRIVE
 * UNIVERSIDAD AUTÓNOMA DEL PERÚ — GESTIÓN DE ACTAS DTI
 * ============================================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN EN 1 MINUTO:
 * 1. Ingresa a https://script.google.com/ con tu cuenta institucional de Google.
 * 2. Haz clic en "Nuevo proyecto" (arriba a la izquierda).
 * 3. Borra todo el código que aparezca y pega este archivo completo.
 * 4. Haz clic en el botón azul "Implementar" > "Nueva implementación".
 * 5. Selecciona tipo: "Aplicación web" (Web App).
 * 6. En "Quién tiene acceso", selecciona: "Cualquier usuario" (Anyone).
 * 7. Haz clic en "Implementar" y autoriza los permisos de Drive.
 * 8. Copia la "URL de la aplicación web" resultante y pégala en el sistema de actas.
 * 
 * ¡Listo! Cada vez que guardes, el script creará automáticamente
 * la subcarpeta del mes y guardará el acta en la categoría correspondiente.
 */

var ROOT_FOLDER_ID = "1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Endpoint de Google Apps Script funcionando correctamente"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);

    // ============================================================
    // CASO A: ENVÍO DIRECTO POR CORREO ELECTRÓNICO CON PDF ADJUNTO
    // ============================================================
    if (data.action === "send_email" || data.sendEmail) {
      var to = (data.to || "").trim();
      if (!to) throw new Error("No se especificó destinatario de correo");

      var subject = data.subject || "Acta Oficial DTI — Universidad Autónoma del Perú";
      var body = data.body || "";
      var attachments = [];

      if (data.pdfBase64) {
        var pdfBytes = Utilities.base64Decode(data.pdfBase64);
        var pdfName = (data.filename || "Acta_Oficial").replace(/\.html$/i, ".pdf");
        attachments.push(Utilities.newBlob(pdfBytes, "application/pdf", pdfName));
      }

      var htmlBody = data.htmlBody || (body || "").replace(/\n/g, "<br>");

      GmailApp.sendEmail(to, subject, body, {
        name: "Dirección de Tecnologías de la Información (DTI) — Universidad Autónoma del Perú",
        htmlBody: htmlBody,
        attachments: attachments
      });

      // ============================================================
      // SUBIDA AUTOMÁTICA A GOOGLE DRIVE SIMULTÁNEA
      // ============================================================
      var driveFileUrl = "";
      var driveMonthUrl = "";
      try {
        if (data.pdfBase64 || data.fileBase64) {
          var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
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
          driveMonthUrl = monthFolder.getUrl();
        }
      } catch (driveErr) {
        console.warn("Aviso al respaldar en Drive: " + driveErr.toString());
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Correo enviado y acta respaldada automáticamente en Google Drive",
        sentTo: to,
        driveFileUrl: driveFileUrl,
        driveMonthUrl: driveMonthUrl,
        attachmentsCount: attachments.length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ============================================================
    // CASO B: GUARDADO INTELIGENTE EN GOOGLE DRIVE
    // ============================================================
    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);

    // 1. Determinar y obtener/crear carpeta de categoría
    var categoryName = data.tipo === "compromiso" ? "Actas de Compromiso" : "Actas de Devolución";
    var catIter = rootFolder.getFoldersByName(categoryName);
    var categoryFolder = catIter.hasNext() ? catIter.next() : rootFolder.createFolder(categoryName);

    // 2. Determinar y obtener/crear subcarpeta del mes
    var monthName = data.mesCarpeta || (data.mes + " " + data.anio);
    var monthIter = categoryFolder.getFoldersByName(monthName);
    var monthFolder = monthIter.hasNext() ? monthIter.next() : categoryFolder.createFolder(monthName);

    // 3. Crear el archivo en la subcarpeta del mes
    var blob;
    if (data.fileBase64) {
      var decoded = Utilities.base64Decode(data.fileBase64);
      blob = Utilities.newBlob(decoded, data.mimeType || "application/pdf", data.filename);
    } else if (data.htmlContent) {
      blob = Utilities.newBlob(data.htmlContent, "text/html", data.filename);
    } else {
      throw new Error("No se recibieron datos de archivo");
    }

    var file = monthFolder.createFile(blob);

    var response = {
      status: "success",
      message: "Guardado correctamente en Google Drive",
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      monthFolderName: monthName,
      monthFolderUrl: monthFolder.getUrl(),
      categoryName: categoryName
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Servicio de almacenamiento inteligente de Actas DTI activo",
    rootFolderId: ROOT_FOLDER_ID
  })).setMimeType(ContentService.MimeType.JSON);
}
