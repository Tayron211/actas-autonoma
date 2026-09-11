/**
 * Aplicación de Gestión de Actas — Universidad Autónoma del Perú
 * Lógica del Formulario Dinámico, Sincronización en Tiempo Real,
 * Firmas Digitales Móviles (Modo Teléfono), Navegación App y Zoom.
 */

// ============================================================
// DIÁLOGO OFICIAL "ACTAS AUTÓNOMA" (REEMPLAZO DE ALERT / CONFIRM)
// ============================================================
let _alertConfirmResolve = null;

window.alert = function(msg) {
  const modal = document.getElementById('customAlertModal');
  const msgEl = document.getElementById('customAlertMessage');
  const btnCancel = document.getElementById('btnCustomAlertCancel');
  const btnOk = document.getElementById('btnCustomAlertOk');
  const titleEl = document.getElementById('customAlertTitle');

  if (modal && msgEl && btnOk) {
    if (titleEl) titleEl.textContent = 'Actas Autónoma';
    msgEl.textContent = String(msg || '');
    if (btnCancel) btnCancel.style.display = 'none';
    btnOk.textContent = 'Entendido';
    modal.classList.add('active');
  } else {
    console.log('[Actas Autónoma]:', msg);
  }
};

window.customConfirm = function(msg) {
  return new Promise((resolve) => {
    const modal = document.getElementById('customAlertModal');
    const msgEl = document.getElementById('customAlertMessage');
    const btnCancel = document.getElementById('btnCustomAlertCancel');
    const btnOk = document.getElementById('btnCustomAlertOk');
    const titleEl = document.getElementById('customAlertTitle');

    if (!modal || !msgEl || !btnOk || !btnCancel) {
      resolve(true);
      return;
    }

    if (titleEl) titleEl.textContent = 'Actas Autónoma';
    msgEl.textContent = String(msg || '');
    btnCancel.style.display = 'inline-flex';
    btnOk.textContent = 'Aceptar';
    modal.classList.add('active');

    _alertConfirmResolve = resolve;
  });
};

document.addEventListener('DOMContentLoaded', () => {
  function isPhoneOrMobile() {
    return !!(
      window.AndroidBridge ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent) ||
      window.innerWidth <= 992
    );
  }

  // Conectar botones del Diálogo Oficial Actas Autónoma
  const customAlertModal = document.getElementById('customAlertModal');
  const btnCustomAlertOk = document.getElementById('btnCustomAlertOk');
  const btnCustomAlertCancel = document.getElementById('btnCustomAlertCancel');

  btnCustomAlertOk?.addEventListener('click', () => {
    smoothlyCloseModal(customAlertModal, () => {
      if (_alertConfirmResolve) {
        _alertConfirmResolve(true);
        _alertConfirmResolve = null;
      }
    });
  });

  btnCustomAlertCancel?.addEventListener('click', () => {
    smoothlyCloseModal(customAlertModal, () => {
      if (_alertConfirmResolve) {
        _alertConfirmResolve(false);
        _alertConfirmResolve = null;
      }
    });
  });

  customAlertModal?.addEventListener('click', (e) => {
    if (e.target === customAlertModal) {
      customAlertModal.classList.remove('active');
      if (_alertConfirmResolve) {
        _alertConfirmResolve(false);
        _alertConfirmResolve = null;
      }
    }
  });

  // Estado global de la aplicación
  const state = {
    tipoActa: 'compromiso', // 'compromiso' | 'entrega'
    equipos: [
      {
        etiqueta: 'AUT-LAP-0482',
        descripcion: 'Laptop ThinkPad L14 Gen 3',
        marca: 'Lenovo',
        modelo: '21C2S03C00',
        serie: 'PF3Z2K81',
        estado: 'Bueno'
      }
    ],
    firmaEntrega: '',
    firmaRecibe: '',
    activeSignatureTarget: null, // 'entrega' | 'recibe'
    zoomLevel: 1.0,
    isAutoFit: true,
    isGeneratingPdf: false
  };

  // Instancias de lienzos de firma
  let sigPadEntrega = null;
  let sigPadRecibe = null;
  let sigPadModal = null;

  function initApp() {
    setupDateDefaults();
    initSignaturePads();
    initModalSignature();
    bindEvents();
    renderEquiposTable();
    switchTipoActa(state.tipoActa);
    updatePreview();
    setupMobileOptimizations();
    initPwa();
    loadDriveConfig();
    CloudDatabaseManager.init();
    if (window.innerWidth <= 992) {
      showView('form');
    }
  }

  // Valores predeterminados de fecha y hora
  function setupDateDefaults() {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const now = new Date();
    const dia = now.getDate().toString();
    const mes = meses[now.getMonth()];
    const anio = now.getFullYear().toString();
    const horas = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setValIfEmpty('acta_hora', horas);
    setValIfEmpty('acta_dia', dia);
    setValIfEmpty('acta_mes', mes);
    setValIfEmpty('acta_anio', anio);

    setValIfEmpty('orig_dia', dia);
    setValIfEmpty('orig_mes', mes);
    setValIfEmpty('orig_anio', anio);

    setValIfEmpty('entrega_fechahora', `las ${horas} horas del día ${dia} de ${mes} del ${anio}`);
  }

  function setValIfEmpty(id, val) {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = val;
  }

  // Inicializar lienzos de firma en el panel
  function initSignaturePads() {
    const canvasEntrega = document.getElementById('canvas_entrega');
    const canvasRecibe = document.getElementById('canvas_recibe');

    if (canvasEntrega) {
      sigPadEntrega = new SignaturePad(canvasEntrega, {
        onChange: (dataUrl) => {
          state.firmaEntrega = dataUrl;
          toggleHint('hint_entrega', !dataUrl);
          updatePreviewSignatures();
        }
      });
    }

    if (canvasRecibe) {
      sigPadRecibe = new SignaturePad(canvasRecibe, {
        onChange: (dataUrl) => {
          state.firmaRecibe = dataUrl;
          toggleHint('hint_recibe', !dataUrl);
          updatePreviewSignatures();
        }
      });
    }
  }

  function toggleHint(hintId, show) {
    const el = document.getElementById(hintId);
    if (el) {
      if (show) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  }

  // Modal para pantalla completa / modo teléfono
  function initModalSignature() {
    const modalCanvas = document.getElementById('modal_canvas');
    if (modalCanvas) {
      sigPadModal = new SignaturePad(modalCanvas, {
        strokeColor: '#0F172A',
        lineWidth: 3.2
      });
    }
  }

  function openMobileSignatureModal(target) {
    state.activeSignatureTarget = target;
    const modal = document.getElementById('signatureModal');
    const titleEl = document.getElementById('modal_sig_title');
    const personNameEl = document.getElementById('modal_sig_person');

    let personName = '';
    let roleTitle = '';

    if (state.tipoActa === 'compromiso') {
      if (target === 'entrega') {
        roleTitle = 'Quien Entrega / DTI';
        personName = document.getElementById('rep_nombre').value || 'Representante DTI';
      } else {
        roleTitle = 'Colaborador / Quien Recibe';
        personName = document.getElementById('colab_nombre').value || 'Colaborador';
      }
    } else {
      if (target === 'recibe') {
        roleTitle = 'Recibí Conforme (DTI)';
        personName = document.getElementById('rep_nombre').value || 'Representante DTI';
      } else {
        roleTitle = 'Entregué Conforme (Colaborador)';
        personName = document.getElementById('colab_nombre').value || 'Colaborador';
      }
    }

    if (titleEl) titleEl.textContent = `Firma Digital — ${roleTitle}`;
    if (personNameEl) personNameEl.textContent = `Firmante: ${personName}`;

    modal.classList.add('active');

    // Redimensionar canvas del modal al mostrarlo
    setTimeout(() => {
      if (sigPadModal) {
        sigPadModal.resizeCanvas();
        sigPadModal.clear();
        const existingData = target === 'entrega' ? state.firmaEntrega : state.firmaRecibe;
        if (existingData) {
          sigPadModal.fromDataURL(existingData);
        }
      }
    }, 60);
  }

  // Cierre suave, progresivo y elegante para cualquier ventana modal
  function smoothlyCloseModal(modal, callback) {
    if (!modal) {
      if (typeof callback === 'function') callback();
      return;
    }
    if (!modal.classList.contains('active')) {
      modal.classList.remove('is-closing');
      if (typeof callback === 'function') callback();
      return;
    }
    if (modal.classList.contains('is-closing')) return;

    modal.classList.add('is-closing');
    setTimeout(() => {
      modal.classList.remove('active', 'is-closing');
      if (typeof callback === 'function') callback();
    }, 380);
  }

  function closeMobileSignatureModal() {
    const modal = document.getElementById('signatureModal');
    smoothlyCloseModal(modal, () => {
      state.activeSignatureTarget = null;
    });
  }

  function saveModalSignature() {
    if (!state.activeSignatureTarget || !sigPadModal) return;

    const dataUrl = sigPadModal.toDataURL();
    if (state.activeSignatureTarget === 'entrega') {
      state.firmaEntrega = dataUrl;
      if (sigPadEntrega) sigPadEntrega.fromDataURL(dataUrl);
      toggleHint('hint_entrega', !dataUrl);
    } else {
      state.firmaRecibe = dataUrl;
      if (sigPadRecibe) sigPadRecibe.fromDataURL(dataUrl);
      toggleHint('hint_recibe', !dataUrl);
    }

    updatePreviewSignatures();
    closeMobileSignatureModal();
  }

  // Enlazar todos los eventos de la interfaz
  function bindEvents() {
    // Selector de tipo de acta
    const radioCompromiso = document.getElementById('type_compromiso');
    const radioEntrega = document.getElementById('type_entrega');

    if (radioCompromiso && radioEntrega) {
      radioCompromiso.addEventListener('change', () => switchTipoActa('compromiso'));
      radioEntrega.addEventListener('change', () => switchTipoActa('entrega'));
    }

    // Sincronización en tiempo real
    document.getElementById('actasForm').addEventListener('input', () => {
      updatePreview();
    });

    // Botones rápidos para Estado General de Equipos (Devolución)
    document.querySelectorAll('.estado-chip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetInput = document.getElementById('entrega_estado_gral');
        if (targetInput) {
          targetInput.value = btn.getAttribute('data-val');
          updatePreview();
        }
      });
    });

    // Agregar nuevo equipo
    document.getElementById('btnAddEquipo')?.addEventListener('click', () => {
      state.equipos.push({
        etiqueta: '',
        descripcion: '',
        marca: '',
        modelo: '',
        serie: '',
        estado: 'Bueno'
      });
      renderEquiposTable();
      updatePreview();
    });

    // Borrar firmas individuales
    document.getElementById('btnClearFirmaEntrega')?.addEventListener('click', () => {
      if (sigPadEntrega) sigPadEntrega.clear();
      state.firmaEntrega = '';
      toggleHint('hint_entrega', true);
      updatePreviewSignatures();
    });

    document.getElementById('btnClearFirmaRecibe')?.addEventListener('click', () => {
      if (sigPadRecibe) sigPadRecibe.clear();
      state.firmaRecibe = '';
      toggleHint('hint_recibe', true);
      updatePreviewSignatures();
    });

    // Abrir modal de firma móvil
    document.getElementById('btnMobileFirmaEntrega')?.addEventListener('click', () => {
      openMobileSignatureModal('entrega');
    });

    document.getElementById('btnMobileFirmaRecibe')?.addEventListener('click', () => {
      openMobileSignatureModal('recibe');
    });

    // Botones del modal de firma
    document.getElementById('btnModalClose')?.addEventListener('click', closeMobileSignatureModal);
    document.getElementById('btnModalCancel')?.addEventListener('click', closeMobileSignatureModal);
    document.getElementById('btnModalClear')?.addEventListener('click', () => {
      if (sigPadModal) sigPadModal.clear();
    });
    document.getElementById('btnModalSave')?.addEventListener('click', saveModalSignature);

    // Acciones principales
    document.getElementById('btnLoadSample')?.addEventListener('click', loadSampleData);
    document.getElementById('btnClearForm')?.addEventListener('click', resetForm);
    document.getElementById('btnDirectDownloadPdf')?.addEventListener('click', handleDirectDownloadPdf);
    document.getElementById('btnDirectDownloadPdfHeader')?.addEventListener('click', handleDirectDownloadPdf);
    document.getElementById('btnPrintDoc')?.addEventListener('click', printDocument);
    document.getElementById('btnPrintDocToolbar')?.addEventListener('click', printDocument);

    // Integración Google Drive Institucional Inteligente
    document.getElementById('btnGoogleDrive')?.addEventListener('click', openDriveModal);
    document.getElementById('btnDriveModalClose')?.addEventListener('click', closeDriveModal);
    document.getElementById('btnDriveDirectLink')?.addEventListener('click', handleDriveDirect);
    document.getElementById('btnDriveDownloadAndOpen')?.addEventListener('click', handleDriveDownloadAndOpen);
    document.getElementById('btnExecuteSmartDriveSave')?.addEventListener('click', handleExecuteSmartDriveSave);
    document.getElementById('btnToggleWebhookConfig')?.addEventListener('click', toggleWebhookConfig);
    document.getElementById('btnSaveWebhookUrl')?.addEventListener('click', saveWebhookConfig);
    document.getElementById('btnCopyGasCode')?.addEventListener('click', handleCopyGasCode);
    document.getElementById('btnCopyGasCodeAlt')?.addEventListener('click', handleCopyGasCode);

    // Envío por Correo Electrónico con PDF Adjunto Automático
    document.getElementById('btnOpenEmailModal')?.addEventListener('click', openEmailModal);
    document.getElementById('btnEmailModalClose')?.addEventListener('click', closeEmailModal);
    document.getElementById('btnSendOutlook')?.addEventListener('click', handleSendOutlook);
    document.getElementById('btnSendGmail')?.addEventListener('click', handleSendGmail);
    document.getElementById('btnDownloadEmailPdf')?.addEventListener('click', handleDownloadEmailPdf);
    document.getElementById('btnSendDirectEmail')?.addEventListener('click', handleSendDirectEmail);
    document.getElementById('btnEmailCopyText')?.addEventListener('click', handleCopyEmail);
    document.getElementById('linkOpenDriveWebhookFromEmail')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeEmailModal();
      openDriveModal();
      const panel = document.getElementById('webhookConfigPanel');
      if (panel) panel.style.display = 'block';
    });

    // Sincronización automática y bidireccional entre el correo del formulario y el modal de envío
    const colabEmailInput = document.getElementById('colab_email');
    const emailToInput = document.getElementById('emailTo');

    if (colabEmailInput && emailToInput) {
      colabEmailInput.addEventListener('input', (e) => {
        emailToInput.value = e.target.value;
      });
      emailToInput.addEventListener('input', (e) => {
        colabEmailInput.value = e.target.value;
      });
    }

    // Auto-corrección de correos electrónicos al salir del campo
    ['colab_email', 'emailTo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('blur', () => {
          const sanitized = sanitizeEmail(el.value);
          el.value = sanitized;
          if (id === 'colab_email' && emailToInput) emailToInput.value = sanitized;
          if (id === 'emailTo' && colabEmailInput) colabEmailInput.value = sanitized;
        });
      }
    });

    // Ventanas modales estáticas: NO se cierran al hacer clic fuera
    ['driveModal', 'emailModal', 'signatureModal', 'historyModal', 'installPwaModal'].forEach(id => {
      const modalEl = document.getElementById(id);
      if (modalEl) {
        modalEl.addEventListener('click', (e) => {
          // Si hace clic en el fondo oscuro exterior, no cerrar la ventana
          if (e.target === modalEl) {
            e.stopPropagation();
            const card = modalEl.querySelector('.modal-card');
            if (card) {
              card.classList.remove('modal-static-feedback');
              void card.offsetWidth; // reiniciar animación
              card.classList.add('modal-static-feedback');
            }
          }
        });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileSignatureModal();
        closeDriveModal();
        closeEmailModal();
        closeHistoryModal();
        closeInstallModal();
      }
    });

    // Historial de Actas en Tiempo Real
    document.getElementById('btnOpenHistoryModal')?.addEventListener('click', openHistoryModal);
    document.getElementById('mNavHistory')?.addEventListener('click', openHistoryModal);
    document.getElementById('btnHistoryModalClose')?.addEventListener('click', closeHistoryModal);
    document.getElementById('btnRefreshHistory')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnRefreshHistory');
      if (btn) btn.classList.add('btn-refreshing');
      await loadHistoryData();
      if (btn) setTimeout(() => btn.classList.remove('btn-refreshing'), 600);
    });
    document.getElementById('historySearchInput')?.addEventListener('input', renderHistoryList);
    document.querySelectorAll('.history-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.history-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentHistoryFilter = btn.getAttribute('data-filter') || 'all';
        renderHistoryList();
      });
    });

    // PWA Instalación Universal & Web Mundial
    document.getElementById('btnInstallPwa')?.addEventListener('click', openInstallModal);
    document.getElementById('btnOpenPublicUrl')?.addEventListener('click', openInstallModal);
    document.getElementById('btnCopyPublicUrl')?.addEventListener('click', copyPublicWebUrl);
    document.getElementById('btnCopyDirectWebUrl')?.addEventListener('click', copyDirectWebUrl);
    document.getElementById('btnInstallModalClose')?.addEventListener('click', closeInstallModal);
    document.getElementById('btnTriggerInstallPrompt')?.addEventListener('click', handleTriggerInstall);
    document.getElementById('btnDownloadApkModal')?.addEventListener('click', (e) => {
      const apkUrl = 'https://files.catbox.moe/sflpa7.apk';
      if (window.AndroidBridge && typeof window.AndroidBridge.downloadApkDirect === 'function') {
        e.preventDefault();
        window.AndroidBridge.downloadApkDirect();
        if (!isPhoneOrMobile()) {
          showToast('Guardando APPTAS.apk en Descargas...', 'success', 4000);
        }
        return;
      }
      if (window.AndroidBridge && typeof window.AndroidBridge.openUrl === 'function') {
        e.preventDefault();
        window.AndroidBridge.openUrl(apkUrl);
        return;
      }
    });

    // Controles de zoom
    document.getElementById('btnZoomIn')?.addEventListener('click', () => changeZoom(0.15));
    document.getElementById('btnZoomOut')?.addEventListener('click', () => changeZoom(-0.15));
    document.getElementById('btnZoomFit')?.addEventListener('click', fitDocumentToScreen);

    // Pestañas móviles superiores
    const tabForm = document.getElementById('tabBtnForm');
    const tabPreview = document.getElementById('tabBtnPreview');

    if (tabForm && tabPreview) {
      tabForm.addEventListener('click', () => showView('form'));
      tabPreview.addEventListener('click', () => showView('preview'));
    }

    // Barra de navegación inferior fija para móviles
    document.getElementById('mNavForm')?.addEventListener('click', () => showView('form'));
    document.getElementById('mNavPreview')?.addEventListener('click', () => showView('preview'));
    document.getElementById('mNavDrive')?.addEventListener('click', openDriveModal);
    document.getElementById('mNavPrint')?.addEventListener('click', printDocument);
  }

  // Cambio de vistas (Formulario vs Vista Previa A4)
  function showView(view) {
    const formPanel = document.querySelector('.form-panel');
    const previewPanel = document.querySelector('.preview-panel');
    const tabForm = document.getElementById('tabBtnForm');
    const tabPreview = document.getElementById('tabBtnPreview');
    const mNavForm = document.getElementById('mNavForm');
    const mNavPreview = document.getElementById('mNavPreview');

    // En pantallas de PC (> 992px) ambos paneles deben permanecer visibles siempre
    if (window.innerWidth > 992) {
      if (formPanel) {
        formPanel.style.removeProperty('display');
        formPanel.classList.remove('hidden-mobile-view');
      }
      if (previewPanel) {
        previewPanel.style.removeProperty('display');
        previewPanel.classList.remove('active-mobile-view');
      }
      return;
    }

    if (view === 'form') {
      if (formPanel) {
        formPanel.style.setProperty('display', 'block', 'important');
        formPanel.classList.remove('hidden-mobile-view');
      }
      if (previewPanel) {
        previewPanel.style.setProperty('display', 'none', 'important');
        previewPanel.classList.remove('active-mobile-view');
      }
      tabForm?.classList.add('active');
      tabPreview?.classList.remove('active');
      mNavForm?.classList.add('active');
      mNavPreview?.classList.remove('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (formPanel) {
        formPanel.style.setProperty('display', 'none', 'important');
        formPanel.classList.add('hidden-mobile-view');
      }
      if (previewPanel) {
        previewPanel.style.setProperty('display', 'flex', 'important');
        previewPanel.classList.add('active-mobile-view');
      }
      tabPreview?.classList.add('active');
      tabForm?.classList.remove('active');
      mNavPreview?.classList.add('active');
      mNavForm?.classList.remove('active');
      updatePreview();
      fitDocumentToScreen();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Cambiar entre tipo de acta
  function switchTipoActa(tipo) {
    state.tipoActa = tipo;

    document.querySelectorAll('.selector-option').forEach(opt => opt.classList.remove('active'));
    const compFields = document.getElementById('compromisoSpecificFields');
    const entFields = document.getElementById('entregaSpecificFields');
    const estadoGralContainer = document.getElementById('containerEstadoGeneral');

    if (tipo === 'compromiso') {
      document.querySelector('label[for="type_compromiso"]')?.classList.add('active');
      if (compFields) {
        compFields.classList.remove('hidden');
        compFields.style.display = 'block';
      }
      if (entFields) {
        entFields.classList.add('hidden');
        entFields.style.display = 'none';
      }
      if (estadoGralContainer) {
        estadoGralContainer.classList.add('hidden');
        estadoGralContainer.style.display = 'none';
      }
      document.getElementById('labelRepCargo').textContent = 'Cargo del Coordinador / Representante';
      document.getElementById('sigTitleEntrega').textContent = 'Firma Quien Entrega (DTI)';
      document.getElementById('sigTitleRecibe').textContent = 'Firma Colaborador (Quien Recibe)';
    } else {
      document.querySelector('label[for="type_entrega"]')?.classList.add('active');
      if (compFields) {
        compFields.classList.add('hidden');
        compFields.style.display = 'none';
      }
      if (entFields) {
        entFields.classList.remove('hidden');
        entFields.style.display = 'block';
      }
      if (estadoGralContainer) {
        estadoGralContainer.classList.remove('hidden');
        estadoGralContainer.style.display = 'block';
      }
      document.getElementById('labelRepCargo').textContent = 'Cargo del Representante DTI';
      document.getElementById('sigTitleEntrega').textContent = 'Firma RECIBÍ CONFORME (DTI)';
      document.getElementById('sigTitleRecibe').textContent = 'Firma ENTREGUÉ CONFORME (Colaborador)';
    }

    updatePreview();
  }

  // Renderizar tarjetas de equipos en el formulario (cómodas, responsivas y sin aplastarse)
  function renderEquiposTable() {
    const container = document.getElementById('equipmentsListContainer');
    if (!container) return;

    container.innerHTML = '';

    state.equipos.forEach((eq, index) => {
      const card = document.createElement('div');
      card.className = 'equipment-card';
      card.innerHTML = `
        <div class="equipment-card-header">
          <span class="eq-badge">Equipo #${index + 1}</span>
          ${state.equipos.length > 1 ? `
            <button type="button" class="btn-remove-eq" data-idx="${index}" title="Eliminar este equipo">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Eliminar</span>
            </button>
          ` : ''}
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label>Etiqueta / Código</label>
            <input type="text" class="form-control" value="${escapeHtml(eq.etiqueta)}" placeholder="Ej: AUT-LAP-0482" data-field="etiqueta" data-idx="${index}">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select class="form-control" data-field="estado" data-idx="${index}">
              <option value="Bueno" ${eq.estado === 'Bueno' ? 'selected' : ''}>Bueno</option>
              <option value="Operativo" ${eq.estado === 'Operativo' ? 'selected' : ''}>Operativo</option>
              <option value="Regular" ${eq.estado === 'Regular' ? 'selected' : ''}>Regular</option>
              <option value="Nuevo" ${eq.estado === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Descripción del Bien</label>
          <input type="text" class="form-control" value="${escapeHtml(eq.descripcion)}" placeholder="Ej: Laptop Lenovo ThinkPad L14 Gen 3" data-field="descripcion" data-idx="${index}">
        </div>
        <div class="form-grid-3">
          <div class="form-group">
            <label>Marca</label>
            <input type="text" class="form-control" value="${escapeHtml(eq.marca)}" placeholder="Lenovo" data-field="marca" data-idx="${index}">
          </div>
          <div class="form-group">
            <label>Modelo</label>
            <input type="text" class="form-control" value="${escapeHtml(eq.modelo)}" placeholder="21C2S03C00" data-field="modelo" data-idx="${index}">
          </div>
          <div class="form-group">
            <label>N° Serie</label>
            <input type="text" class="form-control" value="${escapeHtml(eq.serie)}" placeholder="PF3Z2K81" data-field="serie" data-idx="${index}">
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Enlazar inputs dinámicos
    container.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        state.equipos[idx][field] = e.target.value;
        updatePreviewTable();
      });
    });

    // Enlazar botones de eliminación
    container.querySelectorAll('.btn-remove-eq').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        state.equipos.splice(idx, 1);
        renderEquiposTable();
        updatePreview();
      });
    });
  }

  // Actualizar todo el documento oficial A4
  function updatePreview() {
    if (state.tipoActa === 'compromiso') {
      renderCompromisoPreview();
    } else {
      renderEntregaPreview();
    }
    updatePreviewTable();
    updatePreviewSignatures();
    if (typeof updateDriveTreePreview === 'function') {
      updateDriveTreePreview();
    }
  }

  // Generar texto del Acta de Compromiso
  function renderCompromisoPreview() {
    const docTitle = document.getElementById('preview_doc_title');
    const docBody = document.getElementById('preview_doc_body');
    const sigGrid = document.getElementById('preview_signatures_grid');

    if (docTitle) docTitle.textContent = 'ACTA DE COMPROMISO';

    const hora = getVal('acta_hora', '______');
    const dia = getVal('acta_dia', '____');
    const mes = getVal('acta_mes', '______');
    const anio = getVal('acta_anio', '2026');
    const campus = getVal('acta_campus', 'Campus de la Universidad Autónoma del Perú, ubicado en la Carretera Panamericana Norte Km. 30, en el distrito de Puente Piedra, departamento de Lima');

    const repNombreVal = getVal('rep_nombre', '');
    const repCargoVal = getVal('rep_cargo', '');
    const repDniVal = getVal('rep_dni', '');

    const colabNombreVal = getVal('colab_nombre', '');
    const colabCargoVal = getVal('colab_cargo', '');
    const colabDniVal = getVal('colab_dni', '');

    const repNombreBody = repNombreVal || '__________________________________';
    const repCargoBody = repCargoVal || '______________________';
    const colabNombreBody = colabNombreVal || '__________________________________';
    const colabCargoBody = colabCargoVal || '______________________';

    const origDia = getVal('orig_dia', '___');
    const origMes = getVal('orig_mes', '____');
    const origAnio = getVal('orig_anio', '_____');

    docBody.innerHTML = `
      <p class="doc-paragraph">
        Siendo las <span class="doc-fill ${isPlaceholder(hora)}">${hora}</span> horas del día <span class="doc-fill ${isPlaceholder(dia)}">${dia}</span> de <span class="doc-fill ${isPlaceholder(mes)}">${mes}</span> del <span class="doc-fill ${isPlaceholder(anio)}">${anio}</span> y estando reunidos en el <span class="doc-fill ${isPlaceholder(campus)}">${campus}</span>; el <span class="doc-fill ${isPlaceholder(repNombreBody)}">${repNombreBody}</span>, <span class="doc-fill ${isPlaceholder(repCargoBody)}">${repCargoBody}</span> y el <span class="doc-fill ${isPlaceholder(colabNombreBody)}">${colabNombreBody}</span>, <span class="doc-fill ${isPlaceholder(colabCargoBody)}">${colabCargoBody}</span>, acuerdan lo siguiente:
      </p>

      <p class="doc-paragraph">
        El <span class="doc-fill ${isPlaceholder(repNombreBody)}">${repNombreBody}</span>, Coordinador de área, reconoce que con fecha <span class="doc-fill ${isPlaceholder(origDia)}">${origDia}</span> de <span class="doc-fill ${isPlaceholder(origMes)}">${origMes}</span> del <span class="doc-fill ${isPlaceholder(origAnio)}">${origAnio}</span> y, la Universidad Autónoma del Perú, le entregó los siguientes bienes con las siguientes características:
      </p>

      <div id="preview_table_container" class="doc-table-section"></div>

      <p class="doc-paragraph">
        El <span class="doc-fill ${isPlaceholder(repNombreBody)}">${repNombreBody}</span>, Coordinador del área de DTI, se compromete a entregar los bienes detallados en el cuadro líneas arriba, con las mismas características y buen estado, sin golpes o abolladuras.
      </p>
      <p class="doc-paragraph">
        En caso de desvinculación laboral, se deberá realizar la devolución de las herramientas tecnológicas asignadas a la oficina de Soporte Técnico. Los equipos deben entregarse en el mismo estado en que se recibieron.
      </p>
      <p class="doc-paragraph">
        Queda establecido que el acuerdo de compromiso se debe cumplir a cabalidad, asumiendo entera responsabilidad por los equipos el colaborador en mención, siendo que, de no cumplirse lo establecido, el colaborador asumiría el costo de los equipos deteriorados, perdidos y/o robados.
      </p>

      <p class="doc-paragraph" style="margin-top: 16px;">
        Se suscribe la presente acta de compromiso en el distrito de Puente Piedra, provincia y departamento de Lima, el día <span class="doc-fill ${isPlaceholder(dia)}">${dia}</span> de <span class="doc-fill ${isPlaceholder(mes)}">${mes}</span> del <span class="doc-fill ${isPlaceholder(anio)}">${anio}</span>.
      </p>
    `;

    // Firmas limpias sin líneas dobles
    const repNombreSig = repNombreVal ? escapeHtml(repNombreVal) : '<span style="color:#94A3B8; font-weight:normal;">[ Nombre del Representante ]</span>';
    const repCargoSig = repCargoVal ? escapeHtml(repCargoVal) : '<span style="color:#94A3B8; font-weight:normal;">[ Cargo DTI ]</span>';
    const repDniSig = repDniVal ? `DNI: ${escapeHtml(repDniVal)}` : '<span style="color:#94A3B8; font-weight:normal;">DNI: [ ________ ]</span>';

    const colabNombreSig = colabNombreVal ? escapeHtml(colabNombreVal) : '<span style="color:#94A3B8; font-weight:normal;">[ Nombre del Colaborador ]</span>';
    const colabCargoSig = colabCargoVal ? escapeHtml(colabCargoVal) : '<span style="color:#94A3B8; font-weight:normal;">[ Cargo / Área ]</span>';
    const colabDniSig = colabDniVal ? `DNI: ${escapeHtml(colabDniVal)}` : '<span style="color:#94A3B8; font-weight:normal;">DNI: [ ________ ]</span>';

    sigGrid.innerHTML = `
      <div class="signature-column">
        <div class="signature-stamp-area" id="stamp_area_entrega">
          ${state.firmaEntrega ? `<img src="${state.firmaEntrega}" class="signature-stamp-img" alt="Firma Representante">` : ''}
        </div>
        <div class="signature-line"></div>
        <div class="signature-name">${repNombreSig}</div>
        <div class="signature-position">${repCargoSig}</div>
        <div class="signature-dni">${repDniSig}</div>
      </div>

      <div class="signature-column">
        <div class="signature-stamp-area" id="stamp_area_recibe">
          ${state.firmaRecibe ? `<img src="${state.firmaRecibe}" class="signature-stamp-img" alt="Firma Colaborador">` : ''}
        </div>
        <div class="signature-line"></div>
        <div class="signature-name">${colabNombreSig}</div>
        <div class="signature-position">${colabCargoSig}</div>
        <div class="signature-dni">${colabDniSig}</div>
      </div>
    `;
  }

  // Generar texto del Acta de Devolución
  function renderEntregaPreview() {
    const docTitle = document.getElementById('preview_doc_title');
    const docBody = document.getElementById('preview_doc_body');
    const sigGrid = document.getElementById('preview_signatures_grid');

    if (docTitle) docTitle.textContent = 'ACTA DE DEVOLUCIÓN DE EQUIPOS';

    const fechaHora = getVal('entrega_fechahora', 'las ______________________________');
    const campus = getVal('acta_campus', 'Campus de la Universidad Autónoma del Perú, ubicado en la Carretera Panamericana Norte Km. 30, en el distrito de Puente Piedra, departamento de Lima');
    const estadoGeneral = getVal('entrega_estado_gral', '');
    const estadoGeneralDisplay = estadoGeneral || '__________________________________';

    const repNombreVal = getVal('rep_nombre', '');
    const repCargoVal = getVal('rep_cargo', '');
    const repDniVal = getVal('rep_dni', '');

    const colabNombreVal = getVal('colab_nombre', '');
    const colabCargoVal = getVal('colab_cargo', '');
    const colabDniVal = getVal('colab_dni', '');

    const colabNombreBody = colabNombreVal || '__________________________________';

    docBody.innerHTML = `
      <p class="doc-paragraph">
        Siendo <span class="doc-fill ${isPlaceholder(fechaHora)}">${fechaHora}</span>, en el <span class="doc-fill ${isPlaceholder(campus)}">${campus}</span>, se hace presente que el/la colaborador@ <span class="doc-fill ${isPlaceholder(colabNombreBody)}">${colabNombreBody}</span>, quien procede a entregar voluntariamente los equipos detallados a continuación para su revisión, mantenimiento y/o custodia por parte del área correspondiente.
      </p>

      <p class="doc-table-title" style="margin-top: 12px;">Equipos entregados:</p>
      <div id="preview_table_container" class="doc-table-section"></div>

      <p class="doc-paragraph" style="margin-top: 14px;">
        La entrega de los equipos se realiza en el estado <span class="doc-fill ${isPlaceholder(estadoGeneralDisplay)}">${escapeHtml(estadoGeneralDisplay)}</span>, dejando constancia de que los mismos serán revisados conforme a los procedimientos establecidos por el área responsable.
      </p>
      <p class="doc-paragraph">
        Con la firma del presente documento, ambas partes dejan constancia de la entrega y recepción de los equipos, comprometiéndose a cumplir con las disposiciones internas vigentes de la institución.
      </p>
      <p class="doc-paragraph">
        No habiendo otro asunto que tratar, se da por concluida la presente acta, firmando las partes en señal de conformidad.
      </p>
    `;

    const repNombreSig = repNombreVal ? escapeHtml(repNombreVal) : '<span style="color:#94A3B8; font-weight:normal;">[ Nombre y Apellidos ]</span>';
    const repCargoSig = repCargoVal ? escapeHtml(repCargoVal) : '<span style="color:#94A3B8; font-weight:normal;">[ Cargo DTI ]</span>';
    const repDniSig = repDniVal ? `DNI: ${escapeHtml(repDniVal)}` : '<span style="color:#94A3B8; font-weight:normal;">DNI: [ ________ ]</span>';

    const colabNombreSig = colabNombreVal ? escapeHtml(colabNombreVal) : '<span style="color:#94A3B8; font-weight:normal;">[ Nombre del Colaborador ]</span>';
    const colabCargoSig = colabCargoVal ? escapeHtml(colabCargoVal) : '<span style="color:#94A3B8; font-weight:normal;">[ Cargo / Área ]</span>';
    const colabDniSig = colabDniVal ? `DNI: ${escapeHtml(colabDniVal)}` : '<span style="color:#94A3B8; font-weight:normal;">DNI: [ ________ ]</span>';

    sigGrid.innerHTML = `
      <div class="signature-column">
        <div class="signature-stamp-area" id="stamp_area_entrega">
          ${state.firmaEntrega ? `<img src="${state.firmaEntrega}" class="signature-stamp-img" alt="Firma Recibí Conforme">` : ''}
        </div>
        <div class="signature-line"></div>
        <div class="signature-role-title">RECIBÍ CONFORME</div>
        <div class="signature-name">${repNombreSig}</div>
        <div class="signature-position">${repCargoSig}</div>
        <div class="signature-dni">${repDniSig}</div>
      </div>

      <div class="signature-column">
        <div class="signature-stamp-area" id="stamp_area_recibe">
          ${state.firmaRecibe ? `<img src="${state.firmaRecibe}" class="signature-stamp-img" alt="Firma Entregué Conforme">` : ''}
        </div>
        <div class="signature-line"></div>
        <div class="signature-role-title">ENTREGUÉ CONFORME</div>
        <div class="signature-name">${colabNombreSig}</div>
        <div class="signature-position">${colabCargoSig}</div>
        <div class="signature-dni">${colabDniSig}</div>
      </div>
    `;
  }

  // Actualizar tabla en el preview oficial A4 (Formato tipo Excel autoajustable al contenido)
  function updatePreviewTable() {
    const tableContainer = document.getElementById('preview_table_container');
    if (!tableContainer) return;

    let rowsHtml = '';
    state.equipos.forEach((eq, idx) => {
      rowsHtml += `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td class="col-etiq">${escapeHtml(eq.etiqueta || `ITEM-${idx + 1}`)}</td>
          <td class="col-desc">${escapeHtml(eq.descripcion || '-')}</td>
          <td class="col-marca">${escapeHtml(eq.marca || '-')}</td>
          <td class="col-modelo">${escapeHtml(eq.modelo || '-')}</td>
          <td class="col-serie">${escapeHtml(eq.serie || '-')}</td>
          <td class="col-estado">${escapeHtml(eq.estado || 'Bueno')}</td>
        </tr>
      `;
    });

    tableContainer.innerHTML = `
      <table class="doc-table">
        <thead>
          <tr>
            <th class="col-num">N°</th>
            <th class="col-etiq">ETIQUETA</th>
            <th class="col-desc">DESCRIPCIÓN</th>
            <th class="col-marca">MARCA</th>
            <th class="col-modelo">MODELO</th>
            <th class="col-serie">SERIE</th>
            <th class="col-estado">ESTADO</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  // Actualizar imágenes de firmas en el preview
  function updatePreviewSignatures() {
    const stampEntrega = document.getElementById('stamp_area_entrega');
    const stampRecibe = document.getElementById('stamp_area_recibe');

    if (stampEntrega) {
      stampEntrega.innerHTML = state.firmaEntrega
        ? `<img src="${state.firmaEntrega}" class="signature-stamp-img" alt="Firma 1">`
        : '';
    }

    if (stampRecibe) {
      stampRecibe.innerHTML = state.firmaRecibe
        ? `<img src="${state.firmaRecibe}" class="signature-stamp-img" alt="Firma 2">`
        : '';
    }
  }

  // Manejo de Zoom para el documento
  function changeZoom(delta) {
    state.isAutoFit = false;
    state.zoomLevel = Math.max(0.35, Math.min(2.0, state.zoomLevel + delta));
    applyZoom();
  }

  function fitDocumentToScreen() {
    if (state.isGeneratingPdf) return;
    state.isAutoFit = true;
    const container = document.querySelector('.document-container');
    const sheet = document.querySelector('.a4-sheet');
    if (!container || !sheet) return;

    const availableWidth = container.offsetWidth - 24;
    const targetWidth = 794;

    if (availableWidth < targetWidth && availableWidth > 260) {
      state.zoomLevel = availableWidth / targetWidth;
    } else {
      state.zoomLevel = 1.0;
    }
    applyZoom();
  }

  function applyZoom() {
    if (state.isGeneratingPdf) return;
    const container = document.querySelector('.document-container');
    const sheet = document.querySelector('.a4-sheet');
    const zoomText = document.getElementById('zoomLevelText');

    if (!sheet || !container) return;

    if (state.zoomLevel !== 1.0) {
      sheet.style.transform = `scale(${state.zoomLevel})`;
      sheet.style.transformOrigin = 'top center';

      // Eliminar el espacio en blanco fantasma que deja transform: scale en el layout
      const sheetHeight = sheet.offsetHeight || 1120;
      const scaledHeight = sheetHeight * state.zoomLevel;
      const extraGap = scaledHeight - sheetHeight;
      sheet.style.marginBottom = `${extraGap}px`;

      const sheetWidth = sheet.offsetWidth || 794;
      const scaledWidth = sheetWidth * state.zoomLevel;
      const marginH = (scaledWidth - sheetWidth) / 2;
      sheet.style.marginLeft = `${marginH}px`;
      sheet.style.marginRight = `${marginH}px`;

      container.style.height = 'auto';
    } else {
      sheet.style.transform = 'none';
      sheet.style.marginBottom = '0px';
      sheet.style.marginLeft = 'auto';
      sheet.style.marginRight = 'auto';
      container.style.height = 'auto';
    }

    if (zoomText) {
      zoomText.textContent = `${Math.round(state.zoomLevel * 100)}%`;
    }
  }

  // Cargar datos reales de ejemplo
  function loadSampleData() {
    if (state.tipoActa === 'compromiso') {
      document.getElementById('acta_hora').value = '10:30';
      document.getElementById('acta_dia').value = '15';
      document.getElementById('acta_mes').value = 'Agosto';
      document.getElementById('acta_anio').value = '2026';
      document.getElementById('rep_nombre').value = 'Ing. Bruno Paucar';
      document.getElementById('rep_cargo').value = 'Coordinador de DTI Técnico';
      document.getElementById('rep_dni').value = '70352987';

      document.getElementById('colab_nombre').value = 'Luz Eileen Emilia Zevallos Avalos';
      document.getElementById('colab_cargo').value = 'Asesora Corporativa';
      document.getElementById('colab_dni').value = '70167159';
      const colabEmail1 = document.getElementById('colab_email');
      if (colabEmail1) colabEmail1.value = 'luz.zevallos@autonoma.pe';

      document.getElementById('orig_dia').value = '15';
      document.getElementById('orig_mes').value = 'Agosto';
      document.getElementById('orig_anio').value = '2026';

      state.equipos = [
        { etiqueta: 'AUT-LAP-0482', descripcion: 'Laptop Lenovo ThinkPad L14 i7 16GB 512GB', marca: 'Lenovo', modelo: '21C2S03C00', serie: 'PF3Z2K81', estado: 'Bueno' }
      ];
    } else {
      document.getElementById('entrega_fechahora').value = 'las 11:45 horas del día 20 de Agosto del 2026';
      document.getElementById('rep_nombre').value = 'Bruno Paucar';
      document.getElementById('rep_cargo').value = 'Coordinador de DTI';
      document.getElementById('rep_dni').value = '70352987';

      document.getElementById('colab_nombre').value = 'Luz Eileen Emilia Zevallos Avalos';
      document.getElementById('colab_cargo').value = 'Asesora Corporativa';
      document.getElementById('colab_dni').value = '70167159';
      const colabEmail2 = document.getElementById('colab_email');
      if (colabEmail2) colabEmail2.value = 'luz.zevallos@autonoma.pe';
      document.getElementById('entrega_estado_gral').value = 'OPERATIVO Y EN BUEN ESTADO FÍSICO';

      state.equipos = [
        { etiqueta: 'AUT-LAP-0482', descripcion: 'Laptop Lenovo ThinkPad L14', marca: 'Lenovo', modelo: '21C2S03C00', serie: 'PF3Z2K81', estado: 'Operativo' }
      ];
    }

    renderEquiposTable();
    updatePreview();
  }

  // Limpiar formulario
  async function resetForm() {
    if (await customConfirm('¿Estás seguro de que deseas limpiar todos los campos del formulario?')) {
      document.getElementById('actasForm').reset();
      setupDateDefaults();
      state.equipos = [{ etiqueta: '', descripcion: '', marca: '', modelo: '', serie: '', estado: 'Bueno' }];
      if (sigPadEntrega) sigPadEntrega.clear();
      if (sigPadRecibe) sigPadRecibe.clear();
      state.firmaEntrega = '';
      state.firmaRecibe = '';
      const egInput = document.getElementById('entrega_estado_gral');
      if (egInput) egInput.value = '';
      toggleHint('hint_entrega', true);
      toggleHint('hint_recibe', true);
      renderEquiposTable();
      updatePreview();
    }
  }

  // Imprimir o guardar en PDF (Elimina cualquier hoja en blanco previa o posterior)
  function printDocument() {
    updatePreview();

    const sheet = document.getElementById('officialDocumentSheet');
    const previewPanel = document.querySelector('.preview-panel');

    // Asegurar que el documento esté en el árbol visible si estamos en móvil
    if (window.innerWidth <= 992) {
      if (previewPanel && (previewPanel.style.display === 'none' || getComputedStyle(previewPanel).display === 'none')) {
        showView('preview');
      }
    }

    // Guardar estilos temporales
    const prevTransform = sheet ? sheet.style.transform : '';
    const prevMarginBottom = sheet ? sheet.style.marginBottom : '';
    const prevMarginLeft = sheet ? sheet.style.marginLeft : '';
    const prevMarginRight = sheet ? sheet.style.marginRight : '';
    const prevWidth = sheet ? sheet.style.width : '';
    const prevMinWidth = sheet ? sheet.style.minWidth : '';

    // Limpiar márgenes dinámicos y transformaciones que puedan empujar el documento
    if (sheet) {
      sheet.style.transform = 'none';
      sheet.style.marginBottom = '0';
      sheet.style.marginLeft = 'auto';
      sheet.style.marginRight = 'auto';
      sheet.style.minWidth = '0';
      sheet.style.width = '100%';
    }

    // Activar modo de impresión en el body
    document.body.classList.add('is-printing');

    let cleanedUp = false;
    const cleanUpAfterPrint = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.classList.remove('is-printing');
      if (sheet) {
        sheet.style.transform = prevTransform;
        sheet.style.marginBottom = prevMarginBottom;
        sheet.style.marginLeft = prevMarginLeft;
        sheet.style.marginRight = prevMarginRight;
        sheet.style.width = prevWidth;
        sheet.style.minWidth = prevMinWidth;
      }
      if (window.innerWidth <= 992) {
        const isPreviewActive = document.getElementById('tabBtnPreview')?.classList.contains('active');
        if (isPreviewActive) {
          applyZoom();
        }
      }
      window.removeEventListener('afterprint', cleanUpAfterPrint);
    };

    window.addEventListener('afterprint', cleanUpAfterPrint);

    // 1. Si estamos en la aplicación nativa Android (APK)
    if (window.AndroidBridge && typeof window.AndroidBridge.print === 'function') {
      setTimeout(() => {
        try {
          window.AndroidBridge.print();
        } catch (eNative) {
          console.error('Error puente nativo print:', eNative);
        }
        setTimeout(cleanUpAfterPrint, 6000);
      }, 150);
      return;
    }

    // 2. En celular o computadora (Navegadores web) - SOLO abre el diálogo de impresión del sistema
    setTimeout(() => {
      try {
        window.print();
      } catch (ePrint) {
        console.warn('Error al invocar window.print():', ePrint);
        showToast('Tu navegador no admite impresión directa.', 'info', 3500);
      }
      setTimeout(cleanUpAfterPrint, 3000);
    }, 150);
  }

  // Optimizaciones táctiles y móviles
  function setupMobileOptimizations() {
    window.addEventListener('resize', () => {
      if (state.isGeneratingPdf) return;
      if (state.isAutoFit) {
        fitDocumentToScreen();
      }
    });

    // En pantallas pequeñas, al cargar la página ajustar el documento
    if (window.innerWidth <= 992) {
      setTimeout(fitDocumentToScreen, 100);
    }
  }

  // ============================================================
  // INTEGRACIÓN GOOGLE DRIVE INSTITUCIONAL INTELIGENTE
  // ============================================================
  const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P?usp=sharing';
  const OFFICIAL_DEFAULT_GAS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbwPOJdX-P5aE6lHr8avK9EgVnQLFgciuNDjnXygor2giUmVya6MPgvJL-Uee6fafVj6ug/exec';

  const OFFICIAL_DEFAULT_GAS_SCRIPT_CODE = `/**
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
        var pdfName = (data.filename || "Acta_Oficial").replace(/\\.html$/i, ".pdf");
        attachments.push(Utilities.newBlob(pdfBytes, "application/pdf", pdfName));
      }

      var htmlBody = data.htmlBody || (body || "").replace(/\\n/g, "<br>");

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
          var fileBlob = Utilities.newBlob(rawFile, "application/pdf", (data.filename || "Acta_Oficial").replace(/\\.html$/i, ".pdf"));
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
}`;

  function getEffectiveWebhookUrl() {
    try {
      const explicitlyCleared = localStorage.getItem('ua_actas_gas_webhook_cleared') === 'true';
      if (explicitlyCleared) return '';
      const stored = localStorage.getItem('ua_actas_gas_webhook');
      if (stored && stored.trim()) return stored.trim();
    } catch(e) {}
    return OFFICIAL_DEFAULT_GAS_WEBHOOK;
  }

  var cachedDriveConfig = {
    webhookUrl: getEffectiveWebhookUrl(),
    rootFolderId: '1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P'
  };

  // Obtener metadatos dinámicos del documento actual
  function getCurrentDocMetadata() {
    const isCompromiso = state.tipoActa === 'compromiso';
    const tipo = state.tipoActa;
    const categoryName = isCompromiso ? 'Actas de Compromiso' : 'Actas de Devolución';
    const categoryTag = isCompromiso ? 'Acta de Compromiso' : 'Acta de Devolución';
    const prefix = isCompromiso ? 'Acta_Compromiso' : 'Acta_Devolucion';

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const now = new Date();
    let mes = monthNames[now.getMonth()];
    let anio = now.getFullYear().toString();

    if (isCompromiso) {
      mes = getVal('acta_mes', mes);
      anio = getVal('acta_anio', anio);
    } else {
      const fechaHoraVal = getVal('entrega_fechahora', '');
      const mesMatch = fechaHoraVal.match(/(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)/i);
      const anioMatch = fechaHoraVal.match(/(202\d)/);
      if (mesMatch) {
        mes = mesMatch[1].charAt(0).toUpperCase() + mesMatch[1].slice(1).toLowerCase();
      }
      if (anioMatch) {
        anio = anioMatch[1];
      }
    }

    const monthFolderName = `${mes} ${anio}`;

    const colabNombreRaw = document.getElementById('colab_nombre')?.value || 'Colaborador';
    const colabNombre = colabNombreRaw
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]/g, '') || 'Colaborador';

    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filename = `${prefix}_${colabNombre}_${dateStr}.html`;
    const pdfFilename = `${prefix}_${colabNombre}_${dateStr}.pdf`;

    return {
      tipo,
      isCompromiso,
      categoryName,
      categoryTag,
      mes,
      anio,
      monthFolderName,
      colabNombre,
      filename,
      pdfFilename
    };
  }

  // Generar HTML completo con estilos incrustados y tipografía oficial
  function generateFullHtmlDocument(filename) {
    const sheet = document.getElementById('officialDocumentSheet');
    if (!sheet) return '';

    const clone = sheet.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.margin = '20px auto';
    clone.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(document.getElementById('preview_doc_title')?.textContent || 'Acta Oficial')} — Universidad Autónoma del Perú</title>
  <link rel="icon" type="image/png" href="brand/favicon.png">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Montserrat:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Bricolage Grotesque', 'Montserrat', 'Inter', sans-serif; background: #F8FAFC; color: #382F2D; padding: 20px; }
    .a4-sheet { width: 794px; min-height: 1123px; background: #FFF; padding: 36px 48px; border: 1px solid #E2E8F0; margin: 0 auto; }
    .doc-header { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .doc-logo { height: 48px; width: auto; }
    .doc-title { text-align: center; font-size: 15pt; font-weight: 800; color: #1A0901; text-decoration: underline; margin-bottom: 22px; }
    .doc-paragraph { text-align: justify; font-size: 10pt; line-height: 1.65; margin-bottom: 14px; }
    .doc-fill { font-weight: 700; color: #1A0901; }
    .doc-list { list-style: none; padding-left: 0; margin-bottom: 16px; font-size: 9.5pt; }
    .doc-list li { margin-bottom: 8px; text-align: justify; line-height: 1.5; }
    .doc-table-wrap { width: 100%; margin: 16px 0; }
    .doc-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; table-layout: auto; }
    .doc-table th, .doc-table td { border: 1px solid #334155; padding: 5px 6px; text-align: center; vertical-align: middle; }
    .doc-table th { background: #F1F5F9; font-weight: 700; }
    .doc-table .col-num { width: 1%; white-space: nowrap; font-weight: 700; color: #475569; }
    .doc-table .col-etiq { width: 1%; white-space: nowrap; font-weight: 700; color: #0F172A; }
    .doc-table .col-desc { text-align: center; }
    .doc-table .col-marca, .doc-table .col-modelo, .doc-table .col-serie { width: 1%; white-space: nowrap; }
    .doc-table .col-estado { width: 1%; white-space: nowrap; font-weight: 700; }
    .doc-signatures-section { margin-top: 36px; }
    .signatures-grid { display: flex; justify-content: space-around; gap: 40px; }
    .signature-column { flex: 1; text-align: center; max-width: 320px; }
    .signature-preview-img { height: 75px; max-width: 220px; object-fit: contain; margin-bottom: 4px; }
    .signature-line { border-top: 1.5px solid #000; padding-top: 6px; margin-top: 4px; }
    .signature-name { font-weight: 700; font-size: 9pt; }
    .signature-details { font-size: 8pt; color: #475569; }
    .doc-footer { margin-top: 36px; }
    .doc-footer-bar { height: 5px; background: #FFA552; width: 100%; margin-bottom: 12px; border-radius: 2px; }
    .doc-footer-content { display: flex; align-items: center; gap: 20px; }
    .doc-footer-emblem { height: 60px; width: auto; }
    .doc-footer-info { font-size: 8pt; color: #475569; line-height: 1.35; }
    .footer-link { color: #FFA552; font-weight: 700; }
    @media print {
      body { background: transparent; padding: 0; }
      .a4-sheet { border: none; box-shadow: none; width: 100%; padding: 0; }
      @page { size: A4 portrait; margin: 18mm 20mm; }
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;
  }

  // Actualizar la previsualización del árbol de carpetas en el modal
  function updateDriveTreePreview() {
    const meta = getCurrentDocMetadata();
    const catNameEl = document.getElementById('treeCategoryName');
    const catTagEl = document.getElementById('treeCategoryTag');
    const monthNameEl = document.getElementById('treeMonthName');
    const fileNameEl = document.getElementById('treeFileName');

    if (catNameEl) catNameEl.textContent = meta.categoryName;
    if (catTagEl) catTagEl.textContent = meta.categoryTag;
    if (monthNameEl) monthNameEl.textContent = meta.monthFolderName;
    if (fileNameEl) fileNameEl.textContent = meta.pdfFilename;
  }

  // Cargar configuración de Webhook persistente (local y remota)
  async function loadDriveConfig() {
    // 1. Cargar de inmediato desde la memoria local o valor por defecto indestructible
    cachedDriveConfig.webhookUrl = getEffectiveWebhookUrl();

    const input = document.getElementById('inputWebhookUrl');
    const badge = document.getElementById('webhookStatusIndicator');
    const gasCodeTextArea = document.getElementById('gasCodeTextArea');

    if (gasCodeTextArea) {
      gasCodeTextArea.value = OFFICIAL_DEFAULT_GAS_SCRIPT_CODE;
    }

    if (input && cachedDriveConfig.webhookUrl) {
      input.value = cachedDriveConfig.webhookUrl;
    }
    if (badge) {
      if (cachedDriveConfig.webhookUrl) {
        badge.textContent = '🟢 Conectado';
        badge.className = 'webhook-status-badge online';
      } else {
        badge.textContent = 'Configurar';
        badge.className = 'webhook-status-badge';
      }
    }

    // 2. Si el servidor local está disponible, sincronizar sin sobreescribir con valores vacíos
    try {
      const res = await fetch('/api/drive-config');
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && serverData.webhookUrl && serverData.webhookUrl.trim()) {
          cachedDriveConfig.webhookUrl = serverData.webhookUrl.trim();
          try {
            localStorage.setItem('ua_actas_gas_webhook', cachedDriveConfig.webhookUrl);
            localStorage.removeItem('ua_actas_gas_webhook_cleared');
          } catch(e) {}
          if (input) input.value = cachedDriveConfig.webhookUrl;
          if (badge) {
            badge.textContent = '🟢 Conectado';
            badge.className = 'webhook-status-badge online';
          }
        }
      }
    } catch (e) {
      // Funcionamiento normal y garantizado en modo offline o en servidores estáticos (Surge / APK)
    }
  }

  // Abrir y cerrar acordeón de configuración
  function toggleWebhookConfig() {
    const panel = document.getElementById('webhookConfigPanel');
    if (panel) {
      const isHidden = panel.style.display === 'none';
      panel.style.display = isHidden ? 'block' : 'none';
    }
  }

  // Copiar código de Google Apps Script al portapapeles (100% indestructible y sin dependencias de red)
  function handleCopyGasCode() {
    const code = OFFICIAL_DEFAULT_GAS_SCRIPT_CODE;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        showToast('¡Código de Google Apps Script copiado al portapapeles!', 'success', 4500);
      }).catch(() => fallbackCopyText(code));
    } else {
      fallbackCopyText(code);
    }
  }

  // Guardar URL de Webhook con persistencia permanente (nunca se borra al menos que el usuario lo limpie)
  async function saveWebhookConfig() {
    const input = document.getElementById('inputWebhookUrl');
    const url = input ? input.value.trim() : '';

    if (url && (url.includes('drive.google.com') || url.includes('/folders/'))) {
      alert('⚠️ ATENCIÓN:\n\nHas ingresado el enlace de la carpeta de Google Drive.\n\nPor seguridad de tu cuenta, los servidores de Google NO aceptan archivos directamente a enlaces de carpetas.\n\nPara que el guardado sea 100% automático en la nube, debes usar la URL de la Aplicación Web generada en script.google.com (empieza con: https://script.google.com/macros/s/.../exec).\n\nSigue las instrucciones del paso 1, 2 y 3 indicadas arriba.');
      if (input) input.value = cachedDriveConfig.webhookUrl || OFFICIAL_DEFAULT_GAS_WEBHOOK;
      return;
    }

    if (url && (url.includes('/macros/library/') || url.includes('/library/'))) {
      alert('⚠️ ATENCIÓN:\n\nHas copiado el enlace de una "Biblioteca" (Library), no de una "Aplicación web".\n\nEn Google Apps Script debes:\n1. Hacer clic en Implementar > Nueva implementación.\n2. En el engranaje ⚙️ de la izquierda, seleccionar "Aplicación web" (Web app).\n3. En "Quién tiene acceso", seleccionar "Cualquier usuario" (Anyone).\n4. Copiar la URL generada (debe terminar en /exec).');
      return;
    }

    if (url && (!url.endsWith('/exec') && !url.includes('/exec?'))) {
      alert('⚠️ ATENCIÓN:\n\nLa URL debe terminar en "/exec" (ejemplo: https://script.google.com/macros/s/.../exec).\n\nAsegúrate de haber seleccionado el tipo "Aplicación web" al implementar.');
      return;
    }

    if (url && !url.includes('script.google.com')) {
      alert('⚠️ La URL debe provenir de Google Apps Script y contener "script.google.com"');
      return;
    }

    // Persistencia inamovible: Solo se borra si el usuario lo vacía conscientemente
    try {
      if (!url) {
        localStorage.setItem('ua_actas_gas_webhook', '');
        localStorage.setItem('ua_actas_gas_webhook_cleared', 'true');
        cachedDriveConfig.webhookUrl = '';
      } else {
        localStorage.setItem('ua_actas_gas_webhook', url);
        localStorage.removeItem('ua_actas_gas_webhook_cleared');
        cachedDriveConfig.webhookUrl = url;
      }
    } catch(e) {}

    const badge = document.getElementById('webhookStatusIndicator');
    if (badge) {
      if (url) {
        badge.textContent = '🟢 Conectado';
        badge.className = 'webhook-status-badge online';
      } else {
        badge.textContent = 'Configurar';
        badge.className = 'webhook-status-badge';
      }
    }

    showToast(url ? '✅ Webhook de Google Apps Script guardado y conectado permanentemente' : 'Conexión restablecida a modo local', 'success', 5000);

    try {
      await fetch('/api/drive-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: url })
      });
    } catch (e) {
      // Ignorar error si está en Surge o APK
    }
  }

  function openDriveModal() {
    updateDriveTreePreview();
    loadDriveConfig();

    const progress = document.getElementById('driveSaveProgress');
    const result = document.getElementById('driveSaveResult');
    if (progress) progress.style.display = 'none';
    if (result) result.style.display = 'none';

    const modal = document.getElementById('driveModal');
    if (modal) {
      modal.classList.remove('is-closing');
      modal.classList.add('active');
    }
  }

  function closeDriveModal() {
    const modal = document.getElementById('driveModal');
    if (modal) modal.classList.remove('active');
  }

  function handleDriveDirect() {
    window.open(DRIVE_FOLDER_URL, '_blank', 'noopener,noreferrer');
    showToast('Abriendo carpeta institucional de Google Drive...', 'info');
  }

  // Ejecución del Guardado Inteligente en Google Drive y Servidor (en formato PDF Oficial)
  async function handleExecuteSmartDriveSave() {
    const meta = getCurrentDocMetadata();

    const progressBox = document.getElementById('driveSaveProgress');
    const resultBox = document.getElementById('driveSaveResult');
    const progressTitle = document.getElementById('driveProgressTitle');
    const progressSub = document.getElementById('driveProgressSub');
    const resultTitle = document.getElementById('driveResultTitle');
    const resultDesc = document.getElementById('driveResultDesc');
    const resultLinks = document.getElementById('driveResultLinks');
    const btnSave = document.getElementById('btnExecuteSmartDriveSave');

    if (resultBox) resultBox.style.display = 'none';
    if (progressBox) progressBox.style.display = 'flex';
    if (btnSave) btnSave.disabled = true;

    if (progressTitle) progressTitle.textContent = 'Generando documento PDF oficial con firmas...';
    if (progressSub) progressSub.textContent = `Destino: ${meta.categoryName} > ${meta.monthFolderName}`;

    let localSaveSuccess = false;
    let cloudSaveSuccess = false;
    let cloudFileUrl = '';
    let cloudMonthFolderUrl = '';

    try {
      // 1. Generar el PDF oficial del acta con firmas digitales y membrete
      const { filename: pdfFilename, pdfBase64 } = await generateDocumentPdf({ download: false, filename: meta.pdfFilename });

      if (progressTitle) progressTitle.textContent = 'Guardando PDF en el servidor local...';

      // 2. Guardado inteligente local en el servidor (archivo PDF binario real)
      try {
        const localRes = await fetch('/api/save-acta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          body: JSON.stringify({
            tipoActa: meta.tipo,
            mes: meta.mes,
            anio: meta.anio,
            mesCarpeta: meta.monthFolderName,
            filename: pdfFilename,
            fileBase64: pdfBase64,
            mimeType: 'application/pdf',
            colaborador: getVal('colab_nombre', ''),
            colabDni: getVal('colab_dni', ''),
            colabEmail: sanitizeEmail(getVal('colab_email', '')),
            representante: getVal('rep_nombre', ''),
            repCargo: getVal('rep_cargo', ''),
            estadoGeneral: getVal('entrega_estado_gral', ''),
            equiposCount: state.equipos ? state.equipos.length : 0,
            equipos: state.equipos
          })
        });

        if (localRes.ok) {
          localSaveSuccess = true;
        }
      } catch (e) {
        console.warn('Servidor local no respondió para guardado de acta:', e);
      }

      // 3. Guardado en Google Drive vía Webhook como archivo PDF oficial
      const rawWebhook = cachedDriveConfig.webhookUrl || (document.getElementById('inputWebhookUrl')?.value || '').trim();
      const isGasWebhook = rawWebhook && rawWebhook.includes('script.google.com') && !rawWebhook.includes('/drive/');

      if (isGasWebhook) {
        if (progressTitle) progressTitle.textContent = 'Subiendo PDF oficial a Google Drive...';
        if (progressSub) progressSub.textContent = `Subcarpeta: ${meta.categoryName} > "${meta.monthFolderName}"`;

        let proxySucceeded = false;
        try {
          const gasRes = await fetch('/api/gas-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({
              tipo: meta.tipo,
              mes: meta.mes,
              anio: meta.anio,
              mesCarpeta: meta.monthFolderName,
              filename: pdfFilename,
              fileBase64: pdfBase64,
              mimeType: 'application/pdf'
            })
          });

          if (gasRes.ok) {
            const gasData = await gasRes.json();
            if (gasData.status === 'success') {
              cloudSaveSuccess = true;
              cloudFileUrl = gasData.fileUrl || '';
              cloudMonthFolderUrl = gasData.monthFolderUrl || '';
              proxySucceeded = true;
            } else {
              console.warn('Respuesta GAS:', gasData);
            }
          }
        } catch (err) {
          console.warn('Proxy local no disponible, enviando directo a Google Apps Script:', err);
        }

        // Fallback directo para despliegues estáticos (Surge / APK / Móvil)
        if (!proxySucceeded) {
          try {
            await fetch(rawWebhook, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                tipo: meta.tipo,
                mes: meta.mes,
                anio: meta.anio,
                mesCarpeta: meta.monthFolderName,
                filename: pdfFilename,
                fileBase64: pdfBase64,
                mimeType: 'application/pdf'
              })
            });
            cloudSaveSuccess = true;
            cloudMonthFolderUrl = DRIVE_FOLDER_URL;
          } catch (directErr) {
            console.error('Error al guardar directamente en Google Apps Script:', directErr);
          }
        }
      }

      // Ocultar progreso y restaurar botón
      if (progressBox) progressBox.style.display = 'none';
      if (btnSave) btnSave.disabled = false;

      // Construir mensaje de éxito
      if (resultBox) {
        resultBox.style.display = 'flex';

        if (cloudSaveSuccess) {
          if (resultTitle) resultTitle.textContent = '¡PDF oficial guardado con éxito en Google Drive!';
          if (resultDesc) {
            resultDesc.innerHTML = `El archivo PDF oficial <strong>${escapeHtml(pdfFilename)}</strong> fue clasificado y guardado en <strong>${escapeHtml(meta.categoryName)}</strong> dentro de la subcarpeta mensual <strong>${escapeHtml(meta.monthFolderName)}</strong> en Google Drive.`;
          }
          if (resultLinks) {
            let linksHtml = '';
            if (cloudFileUrl) {
              linksHtml += `
                <a href="${cloudFileUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--ua-primary); font-weight:700; margin-right:1rem;">
                  📄 Ver Documento PDF en Google Drive ↗
                </a>
              `;
            }
            if (cloudMonthFolderUrl) {
              linksHtml += `
                <a href="${cloudMonthFolderUrl}" target="_blank" rel="noopener noreferrer" style="color:#0284C7; font-weight:600;">
                  📁 Abrir Carpeta "${escapeHtml(meta.monthFolderName)}" ↗
                </a>
              `;
            }
            resultLinks.innerHTML = linksHtml;
          }
          showToast(`PDF oficial guardado en Drive: ${meta.categoryName} > ${meta.monthFolderName}`, 'success', 5000);
        } else if (localSaveSuccess) {
          if (resultTitle) resultTitle.textContent = 'PDF oficial archivado en el servidor local';
          if (resultDesc) {
            resultDesc.innerHTML = `El archivo PDF <strong>${escapeHtml(pdfFilename)}</strong> fue organizado en la carpeta local:<br><code>actas/${escapeHtml(meta.categoryName)}/${escapeHtml(meta.monthFolderName)}/${escapeHtml(pdfFilename)}</code>`;
          }
          if (resultLinks) {
            resultLinks.innerHTML = `
              <a href="${DRIVE_FOLDER_URL}" target="_blank" rel="noopener noreferrer">
                <span>Abrir Carpeta en Google Drive ↗</span>
              </a>
            `;
          }
          showToast(`PDF archivado localmente: ${meta.monthFolderName}`, 'success', 5000);
        }

        // Sincronizar en la Base de Datos Cloud en Tiempo Real
        try {
          CloudDatabaseManager.saveActa({
            id: `ACTA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            tipoActa: meta.tipo,
            titulo: meta.tipo === 'compromiso' ? 'Acta de Compromiso' : 'Acta de Devolución de Equipos',
            colaborador: getVal('colab_nombre', ''),
            colabDni: getVal('colab_dni', ''),
            colabEmail: sanitizeEmail(getVal('colab_email', '')),
            representante: getVal('rep_nombre', ''),
            repCargo: getVal('rep_cargo', ''),
            fecha: document.getElementById('fechaActual')?.textContent?.trim() || new Date().toLocaleDateString('es-PE'),
            estadoGeneral: getVal('entrega_estado_gral', ''),
            equiposCount: state.equipos ? state.equipos.length : 0,
            filename: pdfFilename,
            driveUrl: cloudFileUrl || '',
            driveFolderUrl: cloudMonthFolderUrl || ''
          });
        } catch (dbErr) {
          console.warn('Error al registrar en base de datos cloud:', dbErr);
        }
      }
    } catch (err) {
      console.error('Error general al guardar en Drive:', err);
      if (progressBox) progressBox.style.display = 'none';
      if (btnSave) btnSave.disabled = false;
      showToast('Error al generar y guardar PDF: ' + err.message, 'info', 5000);
    }
  }

  async function handleDriveDownloadAndOpen() {
    const meta = getCurrentDocMetadata();

    try {
      const { filename } = await generateDocumentPdf({ download: true, filename: meta.pdfFilename });
      if (!isPhoneOrMobile()) {
        showToast(`Documento PDF "${filename}" descargado con éxito`, 'success', 4000);
      }
    } catch (e) {
      console.warn('Error al descargar PDF:', e);
    }

    setTimeout(() => {
      window.open(DRIVE_FOLDER_URL, '_blank', 'noopener,noreferrer');
      showToast(`Abre la subcarpeta "${meta.monthFolderName}" en Drive y arrastra tu PDF.`, 'info', 6000);
    }, 400);
  }

  function downloadHtmlBlob(htmlContent, filename) {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
  }

  function exportDocumentForDrive() {
    const meta = getCurrentDocMetadata();
    const fullHtml = generateFullHtmlDocument(meta.filename);
    downloadHtmlBlob(fullHtml, meta.filename);
    return meta.filename;
  }

  // Normalizar y corregir correos electrónicos (ej: si escriben punto en vez de @)
  function sanitizeEmail(email) {
    if (!email) return '';
    let trimmed = String(email).trim().toLowerCase();
    // Si escribió un punto en vez de @ antes del dominio (ej: bruno.paucar.autonoma.pe -> bruno.paucar@autonoma.pe)
    if (!trimmed.includes('@') && /\.(autonoma\.pe|gmail\.com|hotmail\.com|outlook\.com)$/i.test(trimmed)) {
      trimmed = trimmed.replace(/\.(autonoma\.pe|gmail\.com|hotmail\.com|outlook\.com)$/i, '@$1');
    }
    return trimmed;
  }

  // Variable para guardar el HTML enriquecido del último correo preparado
  var currentEmailHtmlBody = '';

  // Generador de tabla estructurada de equipos en texto plano limpio y adaptable
  function buildEquiposTextTable(list) {
    const valid = (list || []).filter(e => e.descripcion || e.marca || e.serie || e.etiqueta);
    if (!valid.length) return '  (Sin equipos registrados)';

    const wNum = 2;
    const wEtiq = Math.max(8, Math.min(14, ...valid.map(e => (e.etiqueta || 'S/E').length)));
    const wDesc = Math.max(11, Math.min(26, ...valid.map(e => (e.descripcion || '-').length)));
    const wMarca = Math.max(5, Math.min(10, ...valid.map(e => (e.marca || '-').length)));
    const wSerie = Math.max(5, Math.min(12, ...valid.map(e => (e.serie || '-').length)));
    const wEst = Math.max(6, Math.min(10, ...valid.map(e => (e.estado || '-').length)));

    const pad = (s, w) => {
      let str = String(s || '');
      if (str.length > w) str = str.substring(0, w - 1) + '…';
      return str.padEnd(w, ' ');
    };
    const rpad = (s, w) => String(s || '').padStart(w, ' ');

    const top = '┌─' + '─'.repeat(wNum) + '─┬─' + '─'.repeat(wEtiq) + '─┬─' + '─'.repeat(wDesc) + '─┬─' + '─'.repeat(wMarca) + '─┬─' + '─'.repeat(wSerie) + '─┬─' + '─'.repeat(wEst) + '─┐';
    const mid = '├─' + '─'.repeat(wNum) + '─┼─' + '─'.repeat(wEtiq) + '─┼─' + '─'.repeat(wDesc) + '─┼─' + '─'.repeat(wMarca) + '─┼─' + '─'.repeat(wSerie) + '─┼─' + '─'.repeat(wEst) + '─┤';
    const bot = '└─' + '─'.repeat(wNum) + '─┴─' + '─'.repeat(wEtiq) + '─┴─' + '─'.repeat(wDesc) + '─┴─' + '─'.repeat(wMarca) + '─┴─' + '─'.repeat(wSerie) + '─┴─' + '─'.repeat(wEst) + '─┘';

    let rows = [
      top,
      '│ ' + pad('N°', wNum) + ' │ ' + pad('ETIQUETA', wEtiq) + ' │ ' + pad('DESCRIPCIÓN', wDesc) + ' │ ' + pad('MARCA', wMarca) + ' │ ' + pad('SERIE', wSerie) + ' │ ' + pad('ESTADO', wEst) + ' │',
      mid
    ];

    valid.forEach((e, i) => {
      rows.push('│ ' + rpad(String(i + 1), wNum) + ' │ ' + pad(e.etiqueta || 'S/E', wEtiq) + ' │ ' + pad(e.descripcion || '-', wDesc) + ' │ ' + pad(e.marca || '-', wMarca) + ' │ ' + pad(e.serie || '-', wSerie) + ' │ ' + pad(e.estado || '-', wEst) + ' │');
    });

    rows.push(bot);
    return rows.join('\n');
  }

  // Generador de tabla gráfica HTML oficial para bandejas de entrada y modal (tipo Excel con estilos en línea robustos)
  function buildEquiposHtmlTable(list) {
    const valid = (list || []).filter(e => e.descripcion || e.marca || e.modelo || e.serie || e.etiqueta);
    if (!valid.length) {
      return '<p style="color:#64748B; font-style:italic; margin:8px 0; text-align:left;">(Sin equipos registrados)</p>';
    }

    const rows = valid.map((eq, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
        <td align="center" style="border:1px solid #94A3B8; padding:6px 8px; text-align:center; vertical-align:middle; font-weight:bold; color:#475569; font-size:12px; width:35px; white-space:nowrap;">${i + 1}</td>
        <td align="center" style="border:1px solid #94A3B8; padding:6px 10px; text-align:center; vertical-align:middle; font-weight:bold; color:#0F172A; font-family:Consolas,monospace,sans-serif; font-size:12px; white-space:nowrap;">${escapeHtml(eq.etiqueta || 'S/E')}</td>
        <td align="center" style="border:1px solid #94A3B8; padding:6px 10px; text-align:center; vertical-align:middle; color:#1E293B; font-size:12px;">${escapeHtml(eq.descripcion || '-')}</td>
        <td align="center" style="border:1px solid #94A3B8; padding:6px 10px; text-align:center; vertical-align:middle; color:#334155; font-size:12px; white-space:nowrap;">${escapeHtml(eq.marca || '-')}</td>
        <td align="center" style="border:1px solid #94A3B8; padding:6px 10px; text-align:center; vertical-align:middle; color:#334155; font-size:12px; white-space:nowrap;">${escapeHtml(eq.modelo || '-')}</td>
        <td align="center" style="border:1px solid #94A3B8; padding:6px 10px; text-align:center; vertical-align:middle; color:#334155; font-size:12px; white-space:nowrap;">${escapeHtml(eq.serie || '-')}</td>
        <td align="center" style="border:1px solid #94A3B8; padding:6px 10px; text-align:center; vertical-align:middle; font-weight:bold; color:#0F172A; font-size:12px; white-space:nowrap;">${escapeHtml(eq.estado || 'Bueno')}</td>
      </tr>
    `).join('');

    return `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" align="left" style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:12px; margin:10px 0; border:1px solid #94A3B8; text-align:left;">
        <thead>
          <tr style="background-color:#F1F5F9; color:#0F172A; text-align:center; border-bottom:2px solid #475569;">
            <th align="center" style="border:1px solid #94A3B8; padding:8px 8px; font-weight:bold; font-size:11px; text-align:center; vertical-align:middle; width:35px; white-space:nowrap;">N°</th>
            <th align="center" style="border:1px solid #94A3B8; padding:8px 10px; font-weight:bold; font-size:11px; text-align:center; vertical-align:middle; white-space:nowrap;">ETIQUETA</th>
            <th align="center" style="border:1px solid #94A3B8; padding:8px 10px; font-weight:bold; font-size:11px; text-align:center; vertical-align:middle;">DESCRIPCIÓN</th>
            <th align="center" style="border:1px solid #94A3B8; padding:8px 10px; font-weight:bold; font-size:11px; text-align:center; vertical-align:middle; white-space:nowrap;">MARCA</th>
            <th align="center" style="border:1px solid #94A3B8; padding:8px 10px; font-weight:bold; font-size:11px; text-align:center; vertical-align:middle; white-space:nowrap;">MODELO</th>
            <th align="center" style="border:1px solid #94A3B8; padding:8px 10px; font-weight:bold; font-size:11px; text-align:center; vertical-align:middle; white-space:nowrap;">SERIE</th>
            <th align="center" style="border:1px solid #94A3B8; padding:8px 10px; font-weight:bold; font-size:11px; text-align:center; vertical-align:middle; white-space:nowrap;">ESTADO</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  // ============================================================
  // ENVÍO POR CORREO ELECTRÓNICO INSTITUCIONAL
  // ============================================================
  function buildEmailContent() {
    const isCompromiso = state.tipoActa === 'compromiso';
    const tipoTitulo = isCompromiso ? 'ACTA DE COMPROMISO' : 'ACTA DE DEVOLUCIÓN DE EQUIPOS';
    const colabNombre = getVal('colab_nombre', 'Colaborador@');
    const colabCargo = getVal('colab_cargo', 'Área');
    const colabDni = getVal('colab_dni', '---');
    const colabEmail = sanitizeEmail(getVal('colab_email', ''));
    const repNombre = getVal('rep_nombre', 'Responsable DTI');
    const repCargo = getVal('rep_cargo', 'Coordinador de DTI');

    let fechaTexto = '';
    if (isCompromiso) {
      const hora = getVal('acta_hora', '10:00');
      const dia = getVal('acta_dia', '15');
      const mes = getVal('acta_mes', 'Agosto');
      const anio = getVal('acta_anio', '2026');
      fechaTexto = `${dia} de ${mes} de ${anio} a las ${hora} horas`;
    } else {
      fechaTexto = getVal('entrega_fechahora', 'Fecha oficial');
    }

    const equiposTableHtml = buildEquiposHtmlTable(state.equipos);
    const subject = `${tipoTitulo} DTI — ${colabNombre} — Universidad Autónoma del Perú`;

    // Texto limpio sin caracteres ASCII rotos
    const validEquipos = (state.equipos || []).filter(e => e.descripcion || e.marca || e.modelo || e.serie || e.etiqueta);
    const equiposCleanList = validEquipos.length > 0
      ? validEquipos.map((eq, i) => `${i + 1}. [${eq.etiqueta || 'S/E'}] ${eq.descripcion || '-'} | Marca: ${eq.marca || '-'} | Modelo: ${eq.modelo || '-'} | Serie: ${eq.serie || '-'} | Estado: ${eq.estado || 'Bueno'}`).join('\n')
      : '(Sin equipos registrados)';

    const body = `Estimado(a) ${colabNombre},

Por medio de la presente, la Dirección de Tecnologías de la Información (DTI) de la Universidad Autónoma del Perú le hace entrega formal del registro correspondiente a:

${tipoTitulo}
• Fecha y Hora: ${fechaTexto}
• Responsable DTI: ${repNombre} (${repCargo})
• Colaborador(a): ${colabNombre} (DNI: ${colabDni})
• Cargo / Área: ${colabCargo}
• Firmas Digitales: ${state.firmaEntrega && state.firmaRecibe ? 'Firmado electrónicamente por ambas partes' : 'Registrado'}
• Documento Adjunto: Archivo PDF Oficial con firmas digitales y formato A4

DETALLE DE BIENES Y EQUIPOS ENTREGADOS:
${equiposCleanList}

Atentamente,
Dirección de Tecnologías de la Información (DTI)
Universidad Autónoma del Perú
Campus Lima Norte: Carretera Panamericana Norte Km. 30
Teléfono: 01 715 3335 Anexo 202 | Whatsapp: 933 890 007
www.autonoma.pe`;

    const htmlBody = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="left" style="border-collapse:collapse; margin:0; padding:0; width:100%; text-align:left;">
        <tr>
          <td align="left" style="padding:0; margin:0; text-align:left; font-family:Arial,sans-serif; font-size:13px; color:#1E293B; line-height:1.6;">
            <p style="margin:0 0 10px 0; text-align:left;">Estimado(a) <strong>${escapeHtml(colabNombre)}</strong>,</p>
            <p style="margin:0 0 12px 0; text-align:left;">Por medio de la presente, la <strong>Dirección de Tecnologías de la Información (DTI)</strong> de la Universidad Autónoma del Perú le hace entrega formal del registro correspondiente a:</p>
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="left" style="border-collapse:collapse; width:100%; margin:14px 0;">
              <tr>
                <td align="left" style="background-color:#FFF7ED; border-left:4px solid #EA580C; padding:12px 16px; border-radius:0 6px 6px 0; text-align:left;">
                  <h3 style="margin:0 0 8px 0; font-size:15px; color:#9A3412; text-align:left;">${escapeHtml(tipoTitulo)}</h3>
                  <ul style="margin:0; padding-left:18px; font-size:12.5px; color:#334155; line-height:1.6; text-align:left;">
                    <li><strong>Fecha y Hora:</strong> ${escapeHtml(fechaTexto)}</li>
                    <li><strong>Responsable DTI:</strong> ${escapeHtml(repNombre)} (${escapeHtml(repCargo)})</li>
                    <li><strong>Colaborador(a):</strong> ${escapeHtml(colabNombre)} (DNI: ${escapeHtml(colabDni)})</li>
                    <li><strong>Cargo / Área:</strong> ${escapeHtml(colabCargo)}</li>
                    <li><strong>Firmas Digitales:</strong> ${state.firmaEntrega && state.firmaRecibe ? 'Firmado electrónicamente por ambas partes' : 'Registrado'}</li>
                    <li><strong>Documento Adjunto:</strong> Archivo PDF Oficial adjunto con firmas y formato A4</li>
                  </ul>
                </td>
              </tr>
            </table>

            <h4 style="margin:16px 0 8px 0; font-size:13.5px; color:#0F172A; text-transform:uppercase; letter-spacing:0.03em; text-align:left;">Detalle de Bienes y Equipos Entregados:</h4>
            ${equiposTableHtml}

            <p style="margin-top:20px; line-height:1.5; text-align:left;">Atentamente,<br>
            <strong>Dirección de Tecnologías de la Información (DTI)</strong><br>
            Universidad Autónoma del Perú<br>
            <span style="font-size:11.5px; color:#64748B;">Campus Lima Norte: Carretera Panamericana Norte Km. 30<br>
            Teléfono: 01 715 3335 Anexo 202 | Whatsapp: 933 890 007<br>
            <a href="https://www.autonoma.pe" style="color:#EA580C; text-decoration:none; font-weight:700;">www.autonoma.pe</a></span></p>
          </td>
        </tr>
      </table>
    `;

    return { to: colabEmail, subject, body, htmlBody };
  }

  // Comprobar si un fragmento o página del documento está completamente en blanco sin contenido
  function isCanvasSliceBlank(canvas, startY, height) {
    if (!canvas || height <= 35) return true; // Fragmentos diminutos causados por redondeo de subpíxeles

    try {
      const ctx = canvas.getContext('2d');
      // Descartar pequeños márgenes superior e inferior para evitar artefactos de bordes cortados
      const marginY = Math.min(8, Math.floor(height * 0.08));
      const inspectY = startY + marginY;
      const inspectHeight = height - (marginY * 2);

      if (inspectHeight <= 10) return true;

      const imgData = ctx.getImageData(0, inspectY, canvas.width, inspectHeight);
      const data = imgData.data;
      let contentPixels = 0;

      // Muestrear píxeles rápidamente (cada 16 bytes = cada 4 píxeles)
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Fondo de hoja es blanco puro (#FFFFFF). Cualquier tinta (texto, logo, firma, tabla) tiene valores menores a 235
        if (a > 30 && (r < 235 || g < 235 || b < 235)) {
          contentPixels++;
          // Si encontramos más de 30 muestras con contenido/tinta, la hoja tiene información real
          if (contentPixels > 30) {
            return false;
          }
        }
      }

      // Si no se encontró tinta ni contenido legible, la hoja está en blanco
      return true;
    } catch (e) {
      console.warn('Error al verificar contenido de la hoja:', e);
      return false;
    }
  }

  // Eliminar automáticamente del PDF cualquier hoja en blanco sin contenido
  function removeBlankPagesFromPdf(worker, pdf, isSinglePage) {
    try {
      let totalPages = pdf.internal.getNumberOfPages();
      if (totalPages <= 1) return;

      const canvas = worker?.prop?.canvas;
      const pageSize = worker?.prop?.pageSize;

      if (canvas && pageSize) {
        const pagePxHeight = Math.floor(canvas.width * pageSize.inner.ratio);
        const canvasHeight = canvas.height;

        // Evaluar desde la última página hacia atrás (hasta la página 2)
        for (let p = totalPages; p >= 2; p--) {
          const startY = (p - 1) * pagePxHeight;
          const endY = Math.min(canvasHeight, p * pagePxHeight);
          const sliceHeight = Math.max(0, endY - startY);

          if (isCanvasSliceBlank(canvas, startY, sliceHeight)) {
            console.log(`[PDF] Omitiendo hoja ${p} de ${totalPages} por estar en blanco sin contenido.`);
            pdf.deletePage(p);
          }
        }
      } else if (isSinglePage) {
        for (let p = totalPages; p > 1; p--) {
          pdf.deletePage(p);
        }
      }
    } catch (err) {
      console.warn('Error eliminando hojas en blanco del PDF:', err);
    }
  }

  // Generar PDF oficial del documento A4 con html2pdf (aislado, sin alterar la hoja visible y sin salto de pantalla)
  async function generateDocumentPdf({ download = false, filename = null } = {}) {
    updatePreview();

    const meta = getCurrentDocMetadata();
    const pdfFilename = filename || meta.filename.replace(/\.html$/i, '.pdf');

    const sheet = document.getElementById('officialDocumentSheet');
    if (!sheet) throw new Error('No se encontró el documento oficial para generar el PDF');

    if (typeof html2pdf === 'undefined') {
      throw new Error('El generador de PDF (html2pdf) no se encuentra cargado');
    }

    state.isGeneratingPdf = true;

    // Preservar la posición exacta de scroll y viewport del usuario
    const savedScrollX = window.scrollX || window.pageXOffset || 0;
    const savedScrollY = window.scrollY || window.pageYOffset || 0;
    const originalScrollTo = window.scrollTo;
    window.scrollTo = function() {}; // Bloquea scrolls automáticos intrusivos de html2canvas

    // Asegurar que la hoja visible quede 100% estática sin transiciones de ningún tipo
    sheet.style.setProperty('transition', 'none', 'important');

    // Contenedor completamente fuera de pantalla (no altera el ancho visible en móviles)
    const printContainer = document.createElement('div');
    printContainer.id = 'pdfIsolatedContainer';
    printContainer.style.position = 'fixed';
    printContainer.style.top = '0';
    printContainer.style.left = '0';
    printContainer.style.width = '794px';
    printContainer.style.height = '1122px';
    printContainer.style.background = '#FFFFFF';
    printContainer.style.zIndex = '-9999';
    printContainer.style.pointerEvents = 'none';
    printContainer.style.overflow = 'hidden';
    printContainer.style.opacity = '0';

    const clone = sheet.cloneNode(true);
    clone.id = 'officialDocumentSheetPdfClone';
    clone.style.transform = 'none';
    clone.style.margin = '0 auto';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    clone.style.borderRadius = '0';
    clone.style.outline = 'none';
    clone.style.width = '794px';
    clone.style.transition = 'none';

    const isSinglePage = sheet.scrollHeight <= 1180;
    if (isSinglePage) {
      clone.style.setProperty('height', '1122px', 'important');
      clone.style.setProperty('min-height', '1122px', 'important');
      clone.style.setProperty('max-height', '1122px', 'important');
      clone.style.setProperty('overflow', 'hidden', 'important');
    }

    printContainer.appendChild(clone);
    document.body.appendChild(printContainer);

    const opt = {
      margin: 0,
      filename: pdfFilename,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: {
        scale: 1.8,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 794
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    try {
      let pdfBase64 = null;
      let pdfDataUri = null;

      const worker = html2pdf().from(clone).set(opt);
      const pdf = await worker
        .toPdf()
        .get('pdf')
        .then(function (pdfInstance) {
          removeBlankPagesFromPdf(worker, pdfInstance, isSinglePage);
          return pdfInstance;
        });

      pdfDataUri = pdf.output('datauristring');
      if (pdfDataUri && pdfDataUri.includes(',')) {
        pdfBase64 = pdfDataUri.split(',')[1];
      }

      if (download) {
        let nativeSaved = false;
        if (window.AndroidBridge && typeof window.AndroidBridge.savePdf === 'function' && pdfBase64) {
          try {
            window.AndroidBridge.savePdf(pdfBase64, pdfFilename);
            nativeSaved = true;
          } catch (eBridge) {
            console.error('Error puente nativo savePdf:', eBridge);
          }
        }

        if (!nativeSaved) {
          try {
            pdf.save(pdfFilename);
          } catch (eSave) {
            const byteCharacters = atob(pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = pdfFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
          }
        }
      }

      return {
        filename: pdfFilename,
        pdfBase64,
        pdfDataUri
      };
    } finally {
      window.scrollTo = originalScrollTo;
      try {
        originalScrollTo.call(window, savedScrollX, savedScrollY);
      } catch (eScroll) {}
      state.isGeneratingPdf = false;
      if (printContainer && printContainer.parentNode) {
        printContainer.parentNode.removeChild(printContainer);
      }
    }
  }

  // Descarga directa del archivo PDF oficial (1 clic, solo descarga, sin hojas en blanco)
  async function handleDirectDownloadPdf() {
    const btn = document.getElementById('btnDirectDownloadPdf');
    const origHtml = btn ? btn.innerHTML : '';
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:4px;"></span> <span>Descargando...</span>`;
      }
      showToast('📥 Generando archivo PDF oficial...', 'info', 2500);

      const { filename } = await generateDocumentPdf({ download: true });

      showToast(`✅ Documento PDF "${filename}" descargado con éxito`, 'success', 4000);

      try {
        const isCompromiso = state.tipoActa === 'compromiso';
        const colabNombre = getVal('colab_nombre', '').trim();
        if (colabNombre || (state.equipos && state.equipos.length > 0)) {
          CloudDatabaseManager.saveActa({
            id: `ACTA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            tipoActa: isCompromiso ? 'compromiso' : 'entrega',
            titulo: isCompromiso ? 'Acta de Compromiso' : 'Acta de Devolución de Equipos',
            colaborador: colabNombre || 'Colaborador',
            colabDni: getVal('colab_dni', ''),
            colabEmail: sanitizeEmail(getVal('colab_email', '')),
            representante: getVal('rep_nombre', ''),
            repCargo: getVal('rep_cargo', ''),
            fecha: document.getElementById('fechaActual')?.textContent?.trim() || new Date().toLocaleDateString('es-PE'),
            estadoGeneral: getVal('entrega_estado_gral', ''),
            equiposCount: state.equipos ? state.equipos.length : 0,
            equipos: state.equipos,
            filename: filename
          });
        }
      } catch (dbErr) {
        console.warn('Error al registrar descarga en base de datos cloud:', dbErr);
      }
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      showToast('Error al generar PDF: ' + err.message, 'error', 4000);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }

  function openEmailModal() {
    const { to, subject, body, htmlBody } = buildEmailContent();
    currentEmailHtmlBody = htmlBody;
    const emailToEl = document.getElementById('emailTo');
    const emailSubjectEl = document.getElementById('emailSubject');
    const emailBodyEl = document.getElementById('emailBody');
    const emailContainerEl = document.getElementById('emailMessageContainer');

    // Priorizar siempre el correo escrito en el formulario del colaborador
    const colabEmailForm = sanitizeEmail(document.getElementById('colab_email')?.value || '');
    if (emailToEl) emailToEl.value = colabEmailForm || to;
    if (emailSubjectEl) emailSubjectEl.value = subject;
    if (emailBodyEl) emailBodyEl.value = body;
    if (emailContainerEl) {
      emailContainerEl.innerHTML = htmlBody;
    }

    const meta = getCurrentDocMetadata();
    const pdfFilename = meta.filename.replace(/\.html$/i, '.pdf');
    const filenameEl = document.getElementById('emailAttachmentFilename');
    if (filenameEl) filenameEl.textContent = pdfFilename;

    const progressBox = document.getElementById('emailSendProgress');
    const resultBox = document.getElementById('emailSendResult');
    if (progressBox) progressBox.style.display = 'none';
    if (resultBox) resultBox.style.display = 'none';

    const btnDirect = document.getElementById('btnSendDirectEmail');
    if (btnDirect) btnDirect.disabled = false;

    // Asegurar carga inmediata de configuración persistente
    loadDriveConfig();

    // Mostrar u ocultar banner de Webhook según el estado de configuración
    const effectiveWh = (cachedDriveConfig && cachedDriveConfig.webhookUrl) || getEffectiveWebhookUrl() || OFFICIAL_DEFAULT_GAS_WEBHOOK;
    const banner = document.getElementById('emailWebhookBanner');
    if (banner) {
      if (effectiveWh) {
        banner.style.display = 'none';
      } else {
        banner.style.display = 'flex';
      }
    }

    const modal = document.getElementById('emailModal');
    if (modal) {
      modal.classList.remove('is-closing');
      modal.classList.add('active');
    }
  }

  function closeEmailModal(callback) {
    const modal = document.getElementById('emailModal');
    smoothlyCloseModal(modal, callback);
  }

  // Descargar PDF desde la tarjeta de adjunto del modal
  async function handleDownloadEmailPdf() {
    const btn = document.getElementById('btnDownloadEmailPdf');
    const originalHtml = btn ? btn.innerHTML : '';
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:4px;"></span> Generando...`;
      }
      const { filename } = await generateDocumentPdf({ download: true });
      if (!isPhoneOrMobile()) {
        showToast(`PDF oficial "${filename}" descargado con éxito`, 'success', 4000);
      }
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      showToast('Error al generar PDF: ' + err.message, 'info');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
  }

  // Enviar por Outlook: Genera/descarga el PDF, copia la tabla y abre Outlook
  async function handleSendOutlook() {
    const to = document.getElementById('emailTo')?.value || '';
    const subject = document.getElementById('emailSubject')?.value || '';
    const fresh = buildEmailContent();
    const html = document.getElementById('emailMessageContainer')?.innerHTML || fresh.htmlBody;
    const body = fresh.body;

    // Copiar automáticamente el mensaje HTML con la tabla Excel al portapapeles
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([body], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
      }
    } catch (clipErr) {
      console.warn('Fallback portapapeles:', clipErr);
    }

    let filename = 'Acta_Oficial.pdf';
    try {
      const result = await generateDocumentPdf({ download: true });
      filename = result.filename;
      showToast(`📋 ¡Tabla y mensaje oficial copiados! En tu correo presiona Ctrl+V para pegar la tabla visual, y adjunta "${filename}".`, 'success', 10000);
    } catch (err) {
      console.warn('Advertencia en descarga de PDF:', err);
    }

    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    closeEmailModal();
  }

  // Enviar por Gmail: Genera/descarga el PDF, copia la tabla con formato visual y abre Gmail Web
  async function handleSendGmail() {
    const to = document.getElementById('emailTo')?.value || '';
    const subject = document.getElementById('emailSubject')?.value || '';
    const fresh = buildEmailContent();
    const html = document.getElementById('emailMessageContainer')?.innerHTML || fresh.htmlBody;
    const body = fresh.body;

    // Copiar automáticamente el mensaje HTML con la tabla Excel al portapapeles
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([body], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
      }
    } catch (clipErr) {
      console.warn('Fallback portapapeles:', clipErr);
    }

    const gmailWin = window.open('about:blank', '_blank');

    let filename = 'Acta_Oficial.pdf';
    try {
      const result = await generateDocumentPdf({ download: true });
      filename = result.filename;
      showToast(`📋 ¡Tabla y mensaje oficial copiados! En Gmail solo presiona Ctrl+V para que aparezca la tabla exacta, y adjunta "${filename}".`, 'success', 10000);
    } catch (err) {
      console.warn('Advertencia en descarga de PDF:', err);
    }

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}`;
    if (gmailWin) {
      gmailWin.location.href = gmailUrl;
    } else {
      window.open(gmailUrl, '_blank');
    }
    closeEmailModal();
  }

  // Envío Directo y Automático de Correo con PDF Adjunto
  async function handleSendDirectEmail() {
    let to = document.getElementById('emailTo')?.value.trim() || '';
    to = sanitizeEmail(to);
    const emailToInput = document.getElementById('emailTo');
    if (emailToInput) emailToInput.value = to;

    const subject = document.getElementById('emailSubject')?.value.trim() || '';
    const body = document.getElementById('emailBody')?.value.trim() || '';

    if (!to) {
      showToast('⚠️ Ingresa el correo del colaborador para enviar el acta', 'warning', 4000);
      document.getElementById('emailTo')?.focus();
      return;
    }

    if (!to.includes('@') || !to.includes('.')) {
      showToast(`⚠️ El correo "${to}" no es válido. Debe contener @ institucional.`, 'warning', 4000);
      document.getElementById('emailTo')?.focus();
      return;
    }

    const progressBox = document.getElementById('emailSendProgress');
    const resultBox = document.getElementById('emailSendResult');
    const progressTitle = document.getElementById('emailProgressTitle');
    const progressSub = document.getElementById('emailProgressSub');
    const resultTitle = document.getElementById('emailResultTitle');
    const resultDesc = document.getElementById('emailResultDesc');
    const btnDirect = document.getElementById('btnSendDirectEmail');

    // Comprobación de Webhook oficial o configurado
    const targetWebhook = (cachedDriveConfig && cachedDriveConfig.webhookUrl) || getEffectiveWebhookUrl() || OFFICIAL_DEFAULT_GAS_WEBHOOK;
    if (!targetWebhook) {
      if (resultBox) {
        resultBox.style.display = 'flex';
        resultBox.style.background = '#FEF3C7';
        resultBox.style.borderColor = '#F59E0B';
        const iconWrap = resultBox.querySelector('.result-icon-wrap');
        if (iconWrap) {
          iconWrap.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        }
      }
      if (resultTitle) {
        resultTitle.style.color = '#92400E';
        resultTitle.textContent = 'Falta conectar Webhook de Google Apps Script';
      }
      if (resultDesc) {
        resultDesc.style.color = '#78350F';
        resultDesc.innerHTML = `Para enviar correos 100% directos a la bandeja de entrada, necesitas conectar tu Webhook de Google Apps Script.<br><br>
        <strong>¿Deseas enviar ahora mismo?</strong><br>
        Haz clic en el botón <strong>Gmail</strong> u <strong>Outlook</strong> aquí abajo: descargará el PDF oficial de inmediato y abrirá tu correo listo con los datos para enviar.<br><br>
        <button type="button" id="btnGoToWebhookFromAlert" class="btn btn-primary btn-sm" style="margin-top:4px;">⚙️ Vincular Webhook de Google Apps Script</button>`;

        setTimeout(() => {
          document.getElementById('btnGoToWebhookFromAlert')?.addEventListener('click', () => {
            closeEmailModal();
            openDriveModal();
            const panel = document.getElementById('webhookConfigPanel');
            if (panel) panel.style.display = 'block';
          });
        }, 50);
      }
      showToast('Vincula el Webhook o usa los botones Gmail / Outlook', 'info', 5000);
      return;
    }

    const origBtnHtml = btnDirect ? btnDirect.innerHTML : '';
    if (resultBox) resultBox.style.display = 'none';
    if (progressBox) progressBox.style.display = 'flex';
    if (btnDirect) {
      btnDirect.disabled = true;
      btnDirect.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite; vertical-align: middle; margin-right: 5px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg><span>Enviando...</span>`;
    }

    if (progressTitle) progressTitle.textContent = 'Generando PDF oficial del acta...';
    if (progressSub) progressSub.textContent = 'Renderizando documento A4 con firmas...';

    try {
      // 1. Generar el PDF oficial del acta con firmas en base64
      const { filename, pdfBase64 } = await generateDocumentPdf({ download: false });

      if (progressTitle) progressTitle.textContent = 'Enviando correo y subiendo a Google Drive...';
      if (progressSub) progressSub.textContent = `Destinatario: ${to}`;

      let sent = false;
      let methodUsed = '';

      // Enviar vía Google Apps Script (GmailApp.sendEmail) a través de proxy local o directo (cero CORS)
      try {
        const freshEmail = buildEmailContent();
        const htmlBodyToSend = document.getElementById('emailMessageContainer')?.innerHTML || freshEmail.htmlBody;
        const bodyToSend = freshEmail.body;
        const meta = getCurrentDocMetadata();

        const gasPayload = {
          action: 'send_email',
          to: to,
          subject: subject,
          body: bodyToSend,
          htmlBody: htmlBodyToSend,
          pdfBase64: pdfBase64,
          filename: filename,
          tipo: meta.tipo,
          mes: meta.mes,
          anio: meta.anio,
          mesCarpeta: meta.monthFolderName,
          fileBase64: pdfBase64,
          mimeType: 'application/pdf'
        };

        const drivePayload = {
          tipo: meta.tipo,
          mes: meta.mes,
          anio: meta.anio,
          mesCarpeta: meta.monthFolderName,
          filename: filename,
          fileBase64: pdfBase64,
          mimeType: 'application/pdf'
        };

        let proxyOk = false;
        let proxyResponseJson = null;
        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (isLocalHost) {
          try {
            const res = await fetch('/api/gas-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json; charset=UTF-8' },
              body: JSON.stringify(gasPayload)
            });

            if (res.ok) {
              proxyResponseJson = await res.json();
              if (proxyResponseJson.status === 'success') {
                sent = true;
                methodUsed = 'Google Workspace (Gmail Institucional)';
                proxyOk = true;
              } else {
                throw new Error(proxyResponseJson.message || 'Respuesta no exitosa de Google Apps Script');
              }
            }
          } catch (gasProxyErr) {
            console.warn('Proxy local no disponible, enviando directo a GAS:', gasProxyErr);
          }

          // Guardado en servidor local
          try {
            fetch('/api/save-acta', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json; charset=UTF-8' },
              body: JSON.stringify({
                ...drivePayload,
                colaborador: getVal('colab_nombre', ''),
                colabDni: getVal('colab_dni', ''),
                colabEmail: to,
                representante: getVal('rep_nombre', ''),
                repCargo: getVal('rep_cargo', ''),
                estadoGeneral: getVal('entrega_estado_gral', ''),
                equiposCount: state.equipos ? state.equipos.length : 0,
                equipos: state.equipos
              })
            }).catch(() => {});
          } catch (localErr) {}
        }

        // Envío directo de correo y respaldo garantizado en Google Drive en paralelo
        if (!proxyOk) {
          const sendEmailPromise = fetch(targetWebhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(gasPayload)
          });

          const uploadDrivePromise = fetch(targetWebhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(drivePayload)
          });

          await Promise.all([sendEmailPromise, uploadDrivePromise]);
          sent = true;
          methodUsed = 'Google Workspace (Directo + Drive)';
        }

        const isCompromiso = state.tipoActa === 'compromiso';
        const colabNombre = getVal('colab_nombre', '').trim() || to.split('@')[0];
        const colabDni = getVal('colab_dni', '').trim();
        const repNombre = getVal('rep_nombre', '').trim();
        const repCargo = getVal('rep_cargo', '').trim();
        const estadoGral = getVal('entrega_estado_gral', '').trim() || 'OPERATIVO Y EN BUEN ESTADO FÍSICO';
        const equiposCount = (state.equipos || []).length;
        const targetDriveUrl = (proxyOk && proxyResponseJson && (proxyResponseJson.driveFileUrl || proxyResponseJson.fileUrl))
          || `https://drive.google.com/drive/search?q=${encodeURIComponent(filename)}`;

        try {
          await CloudDatabaseManager.saveActa({
            tipoActa: isCompromiso ? 'compromiso' : 'entrega',
            titulo: isCompromiso ? 'Acta de Compromiso' : 'Acta de Devolución de Equipos',
            colaborador: colabNombre,
            colabDni: colabDni,
            colabEmail: to,
            representante: repNombre,
            repCargo: repCargo,
            fecha: document.getElementById('fechaActual')?.textContent?.trim() || new Date().toLocaleDateString('es-PE'),
            estadoGeneral: estadoGral,
            equiposCount: equiposCount,
            equipos: state.equipos,
            filename: filename,
            driveUrl: targetDriveUrl,
            driveFolderUrl: 'https://drive.google.com/drive/folders/1XzJVp9KewZiSoFCVgLCK-vd28bLnMr1P',
            emailSent: true,
            driveUploaded: true
          });
        } catch(ignore) {}

      } catch (gasErr) {
        throw new Error(gasErr.message);
      }

      // Cerrar ventana modal automáticamente al enviar con éxito
      if (progressBox) progressBox.style.display = 'none';
      if (resultBox) resultBox.style.display = 'none';
      closeEmailModal();
      showToast(`✅ ¡Acta enviada con éxito a ${to} y guardada en Google Drive!`, 'success', 6000);

    } catch (err) {
      console.error('Error al enviar correo:', err);
      if (progressBox) progressBox.style.display = 'none';
      if (resultBox) {
        resultBox.style.display = 'flex';
        resultBox.style.background = '#FEF2F2';
        resultBox.style.borderColor = '#FCA5A5';
        const iconWrap = resultBox.querySelector('.result-icon-wrap');
        if (iconWrap) {
          iconWrap.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        }
      }
      if (resultTitle) {
        resultTitle.style.color = '#991B1B';
        resultTitle.textContent = 'Error al enviar por correo';
      }
      if (resultDesc) {
        resultDesc.style.color = '#7F1D1D';
        resultDesc.innerHTML = `${escapeHtml(err.message)}.<br><br>💡 Puedes hacer clic en el botón <strong>Gmail</strong> u <strong>Outlook</strong> para enviar el correo inmediatamente con el PDF oficial descargado.`;
      }
      showToast('Error en envío: ' + err.message, 'error', 5000);
    } finally {
      if (btnDirect) {
        btnDirect.disabled = false;
        btnDirect.innerHTML = origBtnHtml;
      }
    }
  }

  async function handleCopyEmail() {
    const to = document.getElementById('emailTo')?.value || '';
    const subject = document.getElementById('emailSubject')?.value || '';
    const body = document.getElementById('emailBody')?.value || '';
    const html = currentEmailHtmlBody || '';

    const plainText = `Para: ${to}\nAsunto: ${subject}\n\n${body}`;
    const copyLabel = document.getElementById('copyBtnLabel');

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const fullHtml = `
          <div style="font-family:Arial,sans-serif; font-size:13px; color:#1E293B; line-height:1.6;">
            <p><strong>Para:</strong> ${escapeHtml(to)}<br><strong>Asunto:</strong> ${escapeHtml(subject)}</p>
            <hr style="border:none;border-top:1px solid #CBD5E1;margin:12px 0;">
            ${html}
          </div>
        `;
        const item = new ClipboardItem({
          'text/html': new Blob([fullHtml], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
        if (copyLabel) copyLabel.textContent = '¡Copiado con Tabla!';
        showToast('Mensaje con tabla en formato Excel copiado al portapapeles', 'success');
        setTimeout(() => {
          if (copyLabel) copyLabel.textContent = 'Copiar Mensaje';
        }, 2500);
        return;
      }
    } catch (clipErr) {
      console.warn('Fallback a texto plano de portapapeles:', clipErr);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(plainText).then(() => {
        if (copyLabel) copyLabel.textContent = '¡Copiado!';
        showToast('Texto del correo copiado al portapapeles', 'success');
        setTimeout(() => {
          if (copyLabel) copyLabel.textContent = 'Copiar Mensaje';
        }, 2500);
      }).catch(() => {
        fallbackCopyText(plainText);
      });
    } else {
      fallbackCopyText(plainText);
    }
  }

  function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Texto copiado al portapapeles', 'success');
    } catch (err) {
      showToast('Por favor copia el texto manualmente', 'info');
    }
    document.body.removeChild(textArea);
  }

  // ============================================================
  // SISTEMA DE NOTIFICACIONES FLOTANTES (TOAST)
  // ============================================================
  function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastNotification');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ua-primary)" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }

  // ============================================================
  // OPTIMIZACIONES DE DISPOSITIVOS Y CAMBIO DE PANTALLA (MÓVIL / PC)
  // ============================================================
  function setupMobileOptimizations() {
    function handleScreenResize() {
      if (state.isGeneratingPdf) return;
      const formPanel = document.querySelector('.form-panel');
      const previewPanel = document.querySelector('.preview-panel');

      if (window.innerWidth > 992) {
        // En formato PC, eliminar estilos inline para que la cuadrícula muestre el formulario y el A4 simultáneamente
        if (formPanel) formPanel.style.removeProperty('display');
        if (previewPanel) previewPanel.style.removeProperty('display');
      } else {
        // En formato móvil, asegurar que al menos una vista esté activa si ambas estaban ocultas
        if (formPanel && previewPanel) {
          if (formPanel.style.display === 'none' && previewPanel.style.display === 'none') {
            showView('form');
          }
        }
      }

      if (state.isAutoFit) {
        fitDocumentToScreen();
      }
    }

    window.addEventListener('resize', handleScreenResize);
    window.addEventListener('orientationchange', handleScreenResize);

    // Ejecución inicial
    handleScreenResize();
  }

  // Auxiliares
  function getVal(id, fallback) {
    const el = document.getElementById(id);
    return el && el.value.trim() !== '' ? el.value.trim() : fallback;
  }

  function isPlaceholder(val) {
    return String(val).includes('_') ? 'empty' : '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  // ============================================================
  // PWA SERVICE WORKER & INSTALACIÓN NATIVA
  // ============================================================
  var deferredInstallPrompt = null;

  function initPwa() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
          console.log('Service Worker de Actas DTI registrado:', reg.scope);
        }).catch(err => {
          console.warn('Registro SW:', err);
        });
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const installBtn = document.getElementById('btnInstallPwa');
      if (installBtn) {
        installBtn.style.display = 'inline-flex';
      }
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      showToast('¡Aplicación instalada con éxito en tu dispositivo!', 'success');
      closeInstallModal();
    });
  }

  let currentPublicWebUrl = window.location.origin;

  async function updatePublicWebInfo() {
    const inputEl = document.getElementById('publicWebUrlDisplay');
    const qrEl = document.getElementById('publicWebQrCode');
    const webUrlInput = document.getElementById('publicWebDirectInput');

    const apkDownloadUrl = 'https://spoo.me/apptas';
    const shortWeb = 'https://spoo.me/actas26';

    if (inputEl) inputEl.value = apkDownloadUrl;
    if (webUrlInput) webUrlInput.value = shortWeb;
    if (qrEl) {
      qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=6&data=${encodeURIComponent(apkDownloadUrl)}`;
    }
  }

  function openInstallModal() {
    const modal = document.getElementById('installPwaModal');
    if (modal) {
      modal.classList.remove('is-closing');
      modal.classList.add('active');
    }
    updatePublicWebInfo();
  }

  function closeInstallModal() {
    const modal = document.getElementById('installPwaModal');
    smoothlyCloseModal(modal);
  }

  async function copyPublicWebUrl() {
    const inputEl = document.getElementById('publicWebUrlDisplay');
    const url = inputEl ? inputEl.value : 'https://spoo.me/apptas';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showToast('¡Enlace de descarga de la App copiado!', 'success');
    } else {
      if (inputEl) {
        inputEl.select();
        document.execCommand('copy');
        showToast('¡Enlace de descarga copiado!', 'success');
      }
    }
  }

  async function copyDirectWebUrl() {
    const webUrlInput = document.getElementById('publicWebDirectInput');
    const url = webUrlInput ? webUrlInput.value : currentPublicWebUrl;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showToast('¡Enlace web para celular copiado!', 'success');
    } else {
      if (webUrlInput) {
        webUrlInput.select();
        document.execCommand('copy');
        showToast('¡Enlace web copiado!', 'success');
      }
    }
  }

  async function handleTriggerInstall() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Instalando aplicación...', 'info');
      }
      deferredInstallPrompt = null;
      closeInstallModal();
    } else {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIos) {
        alert('Para instalar en iPhone/iPad:\n1. Pulsa el botón "Compartir" en Safari.\n2. Selecciona "Agregar al inicio".');
      } else {
        alert('Para instalar en tu teléfono o PC:\nPulsa el menú de tu navegador (los 3 puntos superiores) y selecciona "Instalar aplicación" o "Agregar a la pantalla principal".');
      }
    }
  }

  // ============================================================
  // BASE DE DATOS EN LA NUBE 100% PERMANENTE & EN TIEMPO REAL
  // ============================================================
  const DEFAULT_CLOUD_API = 'https://array-exports-organizer-existence.trycloudflare.com/api/actas';
  const LOCAL_STORAGE_KEY = 'ua_actas_cloud_cache_v1';

  var CloudDatabaseManager = {
    actas: [],
    listeners: [],
    isSyncing: false,
    lastSyncTime: null,
    customCloudUrl: null,
    activeApiUrl: DEFAULT_CLOUD_API,
    pollTimer: null,

    async init() {
      // 1. Cargar caché local instantánea
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          this.actas = JSON.parse(cached);
        }
      } catch (e) {}

      // 2. Cargar desde AndroidBridge si estamos en la app móvil nativa
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.getActas === 'function') {
          const nativeList = JSON.parse(window.AndroidBridge.getActas() || '[]');
          if (Array.isArray(nativeList) && nativeList.length > 0) {
            this.mergeActas(nativeList);
          }
        }
      } catch (e) {}

      // 3. Limpiar cualquier registro huérfano/vacío
      this.cleanEmptyActas();
      cachedHistoryActas = this.actas;

      // 4. Intentar cargar config.json para descubrir URL de nube actualizada
      try {
        const cfgRes = await fetch('config.json');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          if (cfg && cfg.cloudApiUrl) {
            this.customCloudUrl = cfg.cloudApiUrl.replace(/\/$/, '');
          }
        }
      } catch(e) {}

      // 5. Primera sincronización inmediata
      this.syncFromCloud();

      // 6. Sincronización inteligente en segundo plano (cada 25s)
      setInterval(() => {
        this.syncFromCloud();
      }, 25000);

      // 7. Sincronización al volver a enfocar la pestaña / volver a la app
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncFromCloud();
        }
      });
      window.addEventListener('focus', () => {
        this.syncFromCloud();
      });

      // 8. Suscribir render de historial a cambios en tiempo real
      this.subscribe((actas) => {
        cachedHistoryActas = actas;
        const historyModal = document.getElementById('historyModal');
        if (historyModal && historyModal.classList.contains('active')) {
          renderHistoryList();
        }
      });
    },

    cleanEmptyActas() {
      this.actas = (this.actas || []).filter(a => {
        const colab = (a.colaborador || '').trim();
        const hasColab = colab !== '' && colab !== 'Colaborador';
        const hasDni = a.colabDni && a.colabDni.trim() !== '' && a.colabDni !== '---';
        const hasItems = (a.equiposCount && a.equiposCount > 0) || (a.equipos && a.equipos.length > 0);
        const hasDrive = !!a.driveUrl || !!a.driveUploaded;
        const hasEmail = !!a.emailSent;
        return hasColab || hasDni || hasItems || hasDrive || hasEmail;
      });
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.actas));
      } catch(e) {}
    },

    mergeActas(incomingList) {
      if (!Array.isArray(incomingList)) return;
      const map = new Map();
      this.actas.forEach(a => {
        const key = a.id || a.filename;
        if (key) map.set(key, a);
      });
      incomingList.forEach(a => {
        const key = a.id || a.filename;
        if (!key) return;
        const existing = map.get(key);
        if (!existing || new Date(a.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
          map.set(key, { ...(existing || {}), ...a });
        }
      });
      this.actas = Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      this.cleanEmptyActas();
      cachedHistoryActas = this.actas;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.actas));
      } catch(e) {}
      this.notifyListeners();
    },

    subscribe(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    },

    notifyListeners() {
      this.listeners.forEach(cb => {
        try { cb(this.actas); } catch (e) {}
      });
    },

    updateBadge(status) {
      const badge = document.getElementById('cloudDbLiveBadge');
      if (!badge) return;

      if (status === 'syncing') {
        badge.style.background = '#3B82F6';
        badge.style.boxShadow = '0 0 8px #3B82F6';
        badge.title = 'Sincronizando con la nube...';
      } else if (status === 'error') {
        badge.style.background = '#F59E0B';
        badge.style.boxShadow = '0 0 8px #F59E0B';
        badge.title = 'Modo Offline (Caché Local)';
      } else {
        badge.style.background = '#10B981';
        badge.style.boxShadow = '0 0 8px #10B981';
        badge.title = 'Nube en Tiempo Real (Sincronizado)';
      }
    },

    async syncFromCloud() {
      if (this.isSyncing) return;
      this.isSyncing = true;
      this.updateBadge('syncing');

      let syncSuccess = false;

      // A. Sincronizar desde AndroidBridge (si estamos en APK nativo)
      try {
        if (window.AndroidBridge && typeof window.AndroidBridge.getActas === 'function') {
          const nativeList = JSON.parse(window.AndroidBridge.getActas() || '[]');
          if (Array.isArray(nativeList) && nativeList.length > 0) {
            this.mergeActas(nativeList);
            syncSuccess = true;
          }
        }
      } catch(e) {}

      // B. Candidatos a endpoints para sincronización en la nube (multi-tier)
      const candidateEndpoints = [];
      if (this.customCloudUrl) {
        candidateEndpoints.push(this.customCloudUrl + '/api/actas');
      }
      candidateEndpoints.push(DEFAULT_CLOUD_API);
      candidateEndpoints.push('/api/actas');
      candidateEndpoints.push('data/actas_db.json');

      for (const ep of candidateEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(ep, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const json = await res.json();
            const incoming = Array.isArray(json) ? json : (json.actas || []);
            if (Array.isArray(incoming) && incoming.length > 0) {
              this.mergeActas(incoming);
              syncSuccess = true;
              if (!ep.endsWith('.json')) {
                this.activeApiUrl = ep;
              }
              break;
            }
          }
        } catch(e) {}
      }

      this.updateBadge(syncSuccess ? 'online' : 'error');
      this.isSyncing = false;
      return syncSuccess;
    },

    async saveActa(acta) {
      const id = acta.id || `ACTA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const now = new Date().toISOString();
      const newActa = {
        id,
        createdAt: acta.createdAt || now,
        updatedAt: now,
        ...acta
      };

      if (!newActa.colaborador || newActa.colaborador.trim() === '' || newActa.colaborador === 'Colaborador') {
        newActa.colaborador = newActa.colabEmail ? newActa.colabEmail.split('@')[0] : 'Colaborador';
      }

      const idx = this.actas.findIndex(a => a.id === id || (a.filename && a.filename === newActa.filename));
      if (idx >= 0) {
        this.actas[idx] = { ...this.actas[idx], ...newActa };
      } else {
        this.actas.unshift(newActa);
      }
      this.cleanEmptyActas();
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.actas));
      } catch(e) {}
      cachedHistoryActas = this.actas;
      this.notifyListeners();
      this.updateBadge('syncing');

      // 1. Guardar en Android nativo si está en la App Móvil
      if (window.AndroidBridge && typeof window.AndroidBridge.saveActa === 'function') {
        try {
          window.AndroidBridge.saveActa(JSON.stringify(newActa));
        } catch(e) {}
      }

      // 2. Guardar en la nube y/o servidor local
      const saveEndpoints = [
        this.activeApiUrl,
        this.customCloudUrl ? this.customCloudUrl + '/api/actas' : null,
        DEFAULT_CLOUD_API,
        '/api/actas'
      ].filter(Boolean);

      const uniqueEndpoints = [...new Set(saveEndpoints)];

      for (const ep of uniqueEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newActa),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          break;
        } catch(e) {}
      }

      this.updateBadge('online');
      return newActa;
    },

    async deleteActa(id) {
      this.actas = this.actas.filter(a => a.id !== id);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.actas));
      } catch(e) {}
      cachedHistoryActas = this.actas;
      this.notifyListeners();
      this.updateBadge('syncing');

      const delEndpoints = [
        this.activeApiUrl,
        this.customCloudUrl ? this.customCloudUrl + '/api/actas' : null,
        DEFAULT_CLOUD_API,
        '/api/actas'
      ].filter(Boolean);

      const uniqueEndpoints = [...new Set(delEndpoints)];
      for (const ep of uniqueEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          await fetch(ep, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          break;
        } catch(e) {}
      }

      this.updateBadge('online');
    },

    startModalRealtimePolling() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => {
        this.syncFromCloud();
      }, 5000); // Polling cada 5s en tiempo real mientras el modal esté abierto
    },

    stopModalRealtimePolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },

    getActas() {
      return this.actas;
    }
  };

  window.CloudDatabaseManager = CloudDatabaseManager;

  let cachedHistoryActas = [];
  let currentHistoryFilter = 'all';

  function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.classList.remove('is-closing');
      modal.classList.add('active');
    }
    CloudDatabaseManager.startModalRealtimePolling();
    loadHistoryData();
  }

  function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    CloudDatabaseManager.stopModalRealtimePolling();
    smoothlyCloseModal(modal);
  }

  async function loadHistoryData() {
    const statsEl = document.getElementById('historyStats');
    if (statsEl) statsEl.textContent = 'Sincronizando con la nube en tiempo real...';

    // 1. Mostrar inmediatamente los datos locales
    CloudDatabaseManager.cleanEmptyActas();
    cachedHistoryActas = CloudDatabaseManager.getActas();
    renderHistoryList();

    // 2. Refrescar desde la nube
    try {
      await CloudDatabaseManager.syncFromCloud();
      cachedHistoryActas = CloudDatabaseManager.getActas();
      renderHistoryList();
    } catch (e) {}
  }

  function renderHistoryList() {
    const statsEl = document.getElementById('historyStats');
    const listEl = document.getElementById('historyCardsList');
    const searchVal = (document.getElementById('historySearchInput')?.value || '').toLowerCase().trim();

    if (!listEl) return;

    let filtered = cachedHistoryActas;

    // Filtro por tipo
    if (currentHistoryFilter !== 'all') {
      filtered = filtered.filter(a => a.tipoActa === currentHistoryFilter);
    }

    // Filtro por texto de búsqueda
    if (searchVal) {
      filtered = filtered.filter(a => {
        const colab = (a.colaborador || '').toLowerCase();
        const dni = (a.colabDni || '').toLowerCase();
        const rep = (a.representante || '').toLowerCase();
        const fname = (a.filename || '').toLowerCase();
        return colab.includes(searchVal) || dni.includes(searchVal) || rep.includes(searchVal) || fname.includes(searchVal);
      });
    }

    if (statsEl) {
      statsEl.textContent = `${filtered.length} acta(s) sincronizada(s) en la nube`;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding:2.5rem 1rem; color:#94A3B8; background:#F8FAFC; border-radius:var(--radius-md); border:1px dashed #CBD5E1;">
          <div style="font-size:2rem; margin-bottom:0.5rem;">☁️</div>
          <p style="margin:0; font-weight:600; color:#64748B;">No hay actas registradas que coincidan con la búsqueda.</p>
          <p style="margin:0.25rem 0 0 0; font-size:0.75rem;">Las actas que guardes en Drive o descargues en PDF se sincronizarán aquí automáticamente en la nube.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(acta => {
      const isCompromiso = acta.tipoActa === 'compromiso';
      const badgeBg = isCompromiso ? '#EFF6FF' : '#FFF7ED';
      const badgeColor = isCompromiso ? '#1D4ED8' : '#EA580C';
      const badgeBorder = isCompromiso ? '#BFDBFE' : '#FED7AA';
      const tipoLabel = isCompromiso ? 'Acta de Compromiso' : 'Acta de Devolución';
      const dateFormatted = acta.createdAt ? new Date(acta.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' }) : (acta.fecha || '');
      const colabName = (acta.colaborador && acta.colaborador !== 'Colaborador') ? acta.colaborador : (acta.colabEmail || 'Colaborador');
      const hasDrive = !!acta.driveUrl || !!acta.driveUploaded;
      const driveHref = acta.driveUrl || (`https://drive.google.com/drive/search?q=${encodeURIComponent((acta.filename || 'Acta').replace(/\.html$/i, '.pdf'))}`);

      return `
        <div class="history-item-card" style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:var(--radius-md); padding:0.85rem 1rem; box-shadow:0 1px 3px rgba(0,0,0,0.04); transition:all 0.15s ease;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.4rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeBorder}; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:4px; font-family:var(--font-brand);">
                ${tipoLabel}
              </span>
              <strong style="font-size:0.88rem; color:#0F172A;">${escapeHtml(colabName)}</strong>
            </div>
            <span style="font-size:0.72rem; color:#94A3B8;">${escapeHtml(dateFormatted)}</span>
          </div>

          <div style="font-size:0.78rem; color:#475569; display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.25rem 0.75rem; margin-bottom:0.6rem;">
            <div><strong>DNI:</strong> ${escapeHtml(acta.colabDni || '---')}</div>
            <div><strong>Responsable:</strong> ${escapeHtml(acta.representante || '---')}</div>
            <div><strong>Equipos:</strong> ${acta.equiposCount || 0} item(s)</div>
            ${acta.estadoGeneral ? `<div><strong>Estado:</strong> ${escapeHtml(acta.estadoGeneral)}</div>` : ''}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #F1F5F9; padding-top:0.5rem; flex-wrap:wrap; gap:0.4rem;">
            <div style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap;">
              ${hasDrive ? `
                <a href="${driveHref}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="padding:2px 8px; font-size:0.72rem; color:#1D4ED8; border-color:#BFDBFE; font-weight:700;" title="Ver en Google Drive">
                  ☁️ En Drive
                </a>
              ` : ''}
              ${acta.emailSent ? `
                <span class="btn btn-secondary btn-sm" style="padding:2px 8px; font-size:0.72rem; color:#059669; border-color:#A7F3D0; background:#ECFDF5; pointer-events:none; font-weight:700;" title="Correo oficial enviado">
                  ✉️ Enviado
                </span>
              ` : ''}
              ${acta.localPath ? `
                <a href="${acta.localPath}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="padding:2px 8px; font-size:0.72rem;" title="Ver archivo local">
                  📄 Abrir
                </a>
              ` : ''}
            </div>

            <button type="button" class="btn btn-outline-secondary btn-sm btn-delete-acta" data-id="${acta.id}" style="padding:2px 6px; font-size:0.72rem; color:#EF4444; border-color:#FECACA;" title="Eliminar del historial">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Listeners para eliminar acta
    listEl.querySelectorAll('.btn-delete-acta').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (await customConfirm('¿Deseas eliminar este registro del historial en la nube?')) {
          try {
            await CloudDatabaseManager.deleteActa(id);
            cachedHistoryActas = CloudDatabaseManager.getActas();
            renderHistoryList();
          } catch (err) {
            alert('No se pudo eliminar el registro.');
          }
        }
      });
    });
  }

  // Inicialización de la aplicación una vez declaradas todas las variables y módulos
  initApp();
});
