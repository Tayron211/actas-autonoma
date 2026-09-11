# Tipografía — Guía de Uso
Universidad Autónoma · Manual de Marca 2026

---

## Fuentes de la marca

| Fuente               | Tipo              | Pesos                        | Uso permitido                         |
|----------------------|-------------------|------------------------------|---------------------------------------|
| **Rebond Grotesque** | Principal (marca) | Regular · Semibold · Bold    | Titulares, cuerpo, todo soporte       |
| **Bricolage Grotesque** | Auxiliar web   | Regular · Semibold · Bold    | Web, apps, intranet — NO impreso      |
| **Verdana**          | Auxiliar sistema  | Regular · Semibold · Bold    | Solo PowerPoint — NUNCA digital/web   |

> **Rebond Grotesque** es una fuente de **licencia comercial**. Debe adquirirse a través del proveedor autorizado por el equipo de Marketing de la Autónoma.
>
> **Bricolage Grotesque** está disponible gratis en Google Fonts.

---

## Obtener Bricolage Grotesque

```html
<!-- En el <head> de cada página HTML -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&display=swap" rel="stylesheet">
```

```css
/* O en el CSS */
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&display=swap');
```

---

## Jerarquía tipográfica

| Nivel         | Peso      | Uso                                        |
|---------------|-----------|--------------------------------------------|
| Titular hero  | Semibold  | Mensajes principales, grandes titulares    |
| Display       | Semibold  | Secciones destacadas                       |
| H1            | Semibold  | Título principal de página                 |
| H2            | Bold      | Secciones y subtítulos importantes         |
| H3            | Bold      | Subsecciones                               |
| H4            | Bold      | Títulos de componentes                     |
| Cuerpo largo  | Regular   | Párrafos de texto corrido                  |
| Cuerpo grande | Regular   | Texto introductorio o destacado            |
| Leyenda       | Regular   | Notas, pies de foto, texto auxiliar        |
| CTA / Link    | Bold      | Botones, enlaces, calls to action          |

---

## Ejemplo de jerarquía visual

```
[Semibold — Titular grande]
Transforma tu pasión en oportunidades

[Bold — Subtítulo]
Elige entre modalidades presencial, semipresencial y virtual

[Regular — Cuerpo de texto]
Lorem ipsum dolor sit amet, consectetuer adipiscing elit,
sed diam nonummy nibh euismod tincidunt ut laoreet dolore
magna aliqua erat volutpat.

[Bold — CTA/link]
autonoma.pe
```

---

## Escala de tamaños (CSS)

```css
--ua-text-hero:    clamp(2.5rem, 8vw, 6rem);      /* ~40–96px */
--ua-text-display: clamp(1.75rem, 5vw, 3.5rem);   /* ~28–56px */
--ua-text-h1:      clamp(1.5rem, 3.5vw, 2.5rem);  /* ~24–40px */
--ua-text-h2:      clamp(1.25rem, 2.5vw, 2rem);   /* ~20–32px */
--ua-text-h3:      clamp(1.125rem, 2vw, 1.5rem);  /* ~18–24px */
--ua-text-h4:      1.25rem;                        /* 20px     */
--ua-text-body-lg: 1.125rem;                       /* 18px     */
--ua-text-body:    1rem;                           /* 16px     */
--ua-text-body-sm: 0.875rem;                       /* 14px     */
--ua-text-caption: 0.75rem;                        /* 12px     */
--ua-text-btn:     1rem;                           /* 16px     */
--ua-text-badge:   0.75rem;                        /* 12px     */
```

---

## Reglas de uso

1. **Rebond Grotesque** es la fuente de marca para cualquier pieza visual.
2. **Bricolage Grotesque** reemplaza a Rebond en entornos web/apps cuando no se puede cargar la fuente principal.
3. **Verdana** está restringida exclusivamente a presentaciones PowerPoint corporativas.
4. El texto dentro de botones siempre va en peso **Bold**.
5. El símbolo de la marca (isotipo) puede combinarse con tipografía al **final** de una oración, nunca al inicio ni en el medio.

---

## Combinaciones tipografía + color aprobadas

Ver `color-combinations.md` para las combinaciones tipográficas exactas por sistema de marca.
