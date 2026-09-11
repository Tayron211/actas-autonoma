# Brand — Universidad Autónoma
Sistema de Marca 2026 · Archivos consumibles para desarrollo

---

## Estructura de carpetas

```
brand/
├── README.md                   ← este archivo
├── css/
│   ├── variables.css           ← design tokens (colores, tipografía, espaciado, logos)
│   ├── typography.css          ← @font-face, jerarquía, utilidades de texto
│   ├── buttons.css             ← botones CTA, UI/UX y badges de modalidad
│   ├── components.css          ← fondos, cajas de info, contenedor de soporte, layouts
│   ├── forms.css               ← inputs, selects, checkboxes, radio, validación
│   ├── alerts.css              ← alertas, toasts, banners del sistema
│   ├── navigation.css          ← header, nav, sidebar, breadcrumb
│   ├── tables.css              ← tablas de datos, paginación, estados vacío/carga
│   └── states.css              ← focus, hover, loading, skeleton, tooltip, disabled
└── docs/
    ├── colors.md               ← paleta completa con HEX/RGB/Pantone/CMYK
    ├── logo-guidelines.md      ← versiones, márgenes, tamaños mínimos, usos incorrectos
    ├── typography-guide.md     ← familias, pesos, jerarquía, instrucciones de instalación
    └── color-combinations.md  ← combinaciones aprobadas por línea de marca
```

---

## Cómo usar en un proyecto PHP/HTML

```html
<!-- En el <head> de tu layout principal -->
<link rel="stylesheet" href="/brand/css/variables.css">
<link rel="stylesheet" href="/brand/css/typography.css">
<link rel="stylesheet" href="/brand/css/buttons.css">
<link rel="stylesheet" href="/brand/css/components.css">
<link rel="stylesheet" href="/brand/css/forms.css">
<link rel="stylesheet" href="/brand/css/alerts.css">
<link rel="stylesheet" href="/brand/css/navigation.css">
<link rel="stylesheet" href="/brand/css/tables.css">
<link rel="stylesheet" href="/brand/css/states.css">
```

O importar desde un archivo CSS central:

```css
@import url('/brand/css/variables.css');    /* SIEMPRE primero */
@import url('/brand/css/typography.css');
@import url('/brand/css/buttons.css');
@import url('/brand/css/components.css');
@import url('/brand/css/forms.css');
@import url('/brand/css/alerts.css');
@import url('/brand/css/navigation.css');
@import url('/brand/css/tables.css');
@import url('/brand/css/states.css');
```

---

## Sistemas de marca

| Sistema              | Color principal      | Uso                              |
|----------------------|----------------------|----------------------------------|
| **Pregrado**         | Naranja `#FF6600`    | Carreras de pregrado             |
| **Posgrado**         | Camel `#A38961`      | Maestrías y segunda especialidad |
| **Educación Continua** | Morado `#A27EFB`  | Diplomados, cursos, talleres     |

El **Naranja Autónoma `#FF6600`** es el color madre compartido por los tres sistemas.

---

## Tipografía rápida

| Fuente                | Variable CSS            | Contexto                       |
|-----------------------|-------------------------|--------------------------------|
| Rebond Grotesque      | `--ua-font-principal`   | Marca, impreso, todos los soportes |
| Bricolage Grotesque   | `--ua-font-web`         | Web, apps, intranet (Google Fonts) |
| Verdana               | `--ua-font-sistema`     | Solo PowerPoint                |

---

## Colores principales — referencia rápida

```css
--ua-naranja:        #FF6600;   /* Naranja Autónoma — color madre   */
--ua-amarillo:       #FFE357;   /* Pregrado secundario              */
--ua-morado-claro:   #CBC7FF;   /* Pregrado secundario              */
--ua-celeste:        #92E8FF;   /* Pregrado secundario              */
--ua-verde-claro:    #BAF597;   /* Pregrado secundario              */
--ua-camel:          #A38961;   /* Posgrado principal               */
--ua-marron-oscuro:  #1A0901;   /* Posgrado / E.C. secundario       */
--ua-morado-intenso: #A27EFB;   /* Educación Continua principal     */
```

---

## Documentación completa

- Paleta de colores → `docs/colors.md`
- Logotipo y reglas → `docs/logo-guidelines.md`
- Tipografía y uso → `docs/typography-guide.md`
- Combinaciones aprobadas → `docs/color-combinations.md`

---

> Para dudas sobre el sistema de marca, contactar al equipo de Marketing de la Universidad Autónoma.
