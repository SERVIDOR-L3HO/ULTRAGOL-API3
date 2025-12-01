/**
 * GLZ PROXY - Reproductor de Video Sin Publicidad
 * ================================================
 * 
 * Funciona igual que https://cmrroto01.blogspot.com/p/aldoblock.html?get=
 * 
 * CÓMO FUNCIONA:
 * 1. Recibe una URL de streaming vía ?get=
 * 2. Genera una página HTML con un iframe que carga la URL
 * 3. El iframe tiene sandbox para seguridad
 * 4. Si no hay URL, muestra "Canal no disponible"
 */

const L3HO_LOGO = "https://1decf535-8568-4d5b-a465-49c57f29158d-00-zsdyil03tw7a.worf.replit.dev/attached_assets/1001854641-removebg-preview_1764572556092.png";

/**
 * Genera el HTML del reproductor
 * @param {string} url - URL a cargar en el iframe (o null si no hay)
 * @param {string} logoUrl - URL del logo (opcional)
 * @param {string} baseUrl - URL base del servidor (opcional)
 * @returns {string} - HTML completo de la página
 */
function generatePlayerHtml(url, logoUrl = null, baseUrl = null) {
  const defaultLogo = "https://www.appcreator24.com/srv/imgs/gen/2022196_fondo.png";
  const logo = logoUrl || defaultLogo;
  const errorLogo = baseUrl ? `${baseUrl}/attached_assets/1001854641-removebg-preview_1764572556092.png` : L3HO_LOGO;
  
  if (!url) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Canal no disponible - L3HO Interactive</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background-color: black;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px;
    }
    .logo {
      width: 150px;
      max-width: 80%;
      margin-bottom: 20px;
    }
    h2 {
      color: red;
      margin: 10px 0;
      font-size: 1.5em;
    }
    .contact {
      color: #aaaaaa;
      font-size: 0.9em;
      margin-top: 15px;
    }
    .email {
      color: #4da6ff;
      text-decoration: none;
    }
    .email:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${errorLogo}" alt="L3HO Interactive" class="logo">
    <h2>Canal no disponible.</h2>
    <p class="contact">En caso de que detecte problemas<br>Contacte a este correo: <a href="mailto:servidorl3ho@gmail.com" class="email">servidorl3ho@gmail.com</a></p>
  </div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reproductor de Video Sin Publicidad</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background-color: black;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    #videoPlayer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background-color: black;
    }

    #logo {
      position: fixed;
      top: 10px;
      right: 10px;
      width: 20%;
      max-width: 80px;
      z-index: 2;
      opacity: 0.8;
    }

    @media (max-width: 600px) {
      #logo {
        width: 35px;
      }
    }
  </style>
</head>
<body>
  <div id="videoPlayer">
    <a href="#" target="_blank">
      <img alt="Logo" id="logo" src="${logo}">
    </a>
    <iframe 
      src="${url}" 
      allowfullscreen="true"
      sandbox="allow-same-origin allow-scripts"
      allow="autoplay; fullscreen; encrypted-media"
    ></iframe>
  </div>
</body>
</html>`;
}

/**
 * Verifica si una URL es válida
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Procesa la solicitud del proxy
 * @param {string} targetUrl - URL a cargar (puede ser null o undefined)
 * @param {Object} options - Opciones adicionales
 * @returns {Object} - { type: 'html', content: string, headers: Object }
 */
function processUrl(targetUrl, options = {}) {
  const logoUrl = options.logoUrl || null;
  
  // Si no hay URL o está vacía, mostrar mensaje de error
  if (!targetUrl || targetUrl.trim() === '') {
    return {
      type: 'html',
      content: generatePlayerHtml(null),
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    };
  }

  // Decodificar URL si viene codificada
  let decodedUrl = targetUrl;
  try {
    decodedUrl = decodeURIComponent(targetUrl);
  } catch (e) {
    // Si falla la decodificación, usar la URL original
    decodedUrl = targetUrl;
  }

  // Validar que sea una URL válida
  if (!isValidUrl(decodedUrl)) {
    return {
      type: 'html',
      content: generatePlayerHtml(null),
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    };
  }

  // Generar página con el reproductor
  return {
    type: 'html',
    content: generatePlayerHtml(decodedUrl, logoUrl),
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'X-Frame-Options': 'ALLOWALL',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  processUrl,
  generatePlayerHtml,
  isValidUrl
};
