/**
 * Gestor de Lienzo de Firmas Digitales (SignaturePad)
 * Soporta eventos táctiles (teléfono/tablet), mouse, stylus y anti-aliasing con escalado de DPI.
 */
class SignaturePad {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.strokeColor = options.strokeColor || '#1A0901';
    this.lineWidth = options.lineWidth || 2.5;
    this.isDrawing = false;
    this.hasDrawn = false;
    this.points = [];
    this.onChange = options.onChange || null;

    this.init();
  }

  init() {
    this.resizeCanvas();
    this.bindEvents();
    window.addEventListener('resize', () => {
      // Guardar datos temporales para no perder la firma en un resize accidental
      const data = this.toDataURL();
      this.resizeCanvas();
      if (this.hasDrawn) {
        this.fromDataURL(data);
      }
    });
  }

  resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || this.canvas.offsetWidth || 300;
    const height = rect.height || this.canvas.offsetHeight || 150;

    // Solo redimensionar si las dimensiones cambiaron
    if (this.canvas.width !== width * ratio || this.canvas.height !== height * ratio) {
      this.canvas.width = width * ratio;
      this.canvas.height = height * ratio;
      this.ctx.scale(ratio, ratio);
      this.setupContext();
    }
  }

  setupContext() {
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  bindEvents() {
    const canvas = this.canvas;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      this.points = [];
      const pos = getPos(e);
      this.points.push(pos);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.points.push(pos);

      // Dibujo con curva cuadrática para trazo suave
      if (this.points.length >= 3) {
        const p1 = this.points[this.points.length - 2];
        const p2 = this.points[this.points.length - 1];
        const midPoint = {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2
        };

        this.ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
        this.ctx.stroke();
      } else {
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
      }

      this.hasDrawn = true;
    };

    const stopDraw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      this.isDrawing = false;
      this.ctx.closePath();
      if (typeof this.onChange === 'function') {
        this.onChange(this.toDataURL());
      }
    };

    // Mouse events
    canvas.addEventListener('mousedown', startDraw);
    window.addEventListener('mousemove', (e) => {
      if (this.isDrawing) draw(e);
    });
    window.addEventListener('mouseup', stopDraw);

    // Touch events
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw, { passive: false });
    canvas.addEventListener('touchcancel', stopDraw, { passive: false });
  }

  clear() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    this.ctx.clearRect(0, 0, this.canvas.width / ratio, this.canvas.height / ratio);
    this.hasDrawn = false;
    this.points = [];
    if (typeof this.onChange === 'function') {
      this.onChange('');
    }
  }

  isEmpty() {
    return !this.hasDrawn;
  }

  toDataURL() {
    if (!this.hasDrawn) return '';
    return this.canvas.toDataURL('image/png');
  }

  fromDataURL(dataUrl) {
    if (!dataUrl) {
      this.clear();
      return;
    }
    const img = new Image();
    img.onload = () => {
      this.clear();
      const rect = this.canvas.getBoundingClientRect();
      const w = rect.width || this.canvas.offsetWidth;
      const h = rect.height || this.canvas.offsetHeight;
      this.ctx.drawImage(img, 0, 0, w, h);
      this.hasDrawn = true;
      if (typeof this.onChange === 'function') {
        this.onChange(this.toDataURL());
      }
    };
    img.src = dataUrl;
  }
}

// Exportar globalmente
window.SignaturePad = SignaturePad;
