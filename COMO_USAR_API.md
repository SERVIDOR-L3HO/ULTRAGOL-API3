# 📘 Cómo Usar tu API de Liga MX

## ✅ Estado Actual
Tu API está **funcionando correctamente** con datos reales:
- ✅ **18 equipos** en la tabla de posiciones
- ✅ **15 noticias** actuales de Liga MX
- ✅ **20 goleadores** del torneo
- ✅ **18 equipos** con información completa

## 🌐 URL de tu API

**URL base:** `https://workspace-sgo719398.replit.app`

Tus endpoints disponibles:
- `GET https://workspace-sgo719398.replit.app/` - Información de la API
- `GET https://workspace-sgo719398.replit.app/tabla` - Tabla de posiciones
- `GET https://workspace-sgo719398.replit.app/noticias` - Noticias
- `GET https://workspace-sgo719398.replit.app/goleadores` - Goleadores
- `GET https://workspace-sgo719398.replit.app/equipos` - Equipos
- `GET https://workspace-sgo719398.replit.app/todo` - Todos los datos

---

## 🔧 Cómo Probar tu API

### Opción 1: Desde el Navegador
Simplemente abre estas URLs en tu navegador:

```
https://workspace-sgo719398.replit.app/tabla
https://workspace-sgo719398.replit.app/noticias
https://workspace-sgo719398.replit.app/goleadores
```

### Opción 2: Desde la Terminal
```bash
curl https://workspace-sgo719398.replit.app/tabla
```

---

## 💻 Cómo Usar en tu Página Web

### Ejemplo 1: JavaScript Vanilla (Fetch API)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Tabla Liga MX</title>
</head>
<body>
    <h1>Tabla de Posiciones Liga MX</h1>
    <div id="tabla"></div>

    <script>
        // Obtener tabla de posiciones
        fetch('https://workspace-sgo719398.replit.app/tabla')
            .then(response => response.json())
            .then(data => {
                const tablaDiv = document.getElementById('tabla');
                let html = '<table border="1"><tr><th>Pos</th><th>Equipo</th><th>PJ</th><th>PTS</th></tr>';
                
                data.tabla.forEach(equipo => {
                    html += `<tr>
                        <td>${equipo.posicion}</td>
                        <td>${equipo.equipo}</td>
                        <td>${equipo.estadisticas.pj}</td>
                        <td>${equipo.estadisticas.pts}</td>
                    </tr>`;
                });
                
                html += '</table>';
                tablaDiv.innerHTML = html;
            })
            .catch(error => console.error('Error:', error));
    </script>
</body>
</html>
```

### Ejemplo 2: Mostrar Goleadores

```javascript
async function mostrarGoleadores() {
    const response = await fetch('https://workspace-sgo719398.replit.app/goleadores');
    const data = await response.json();
    
    const container = document.getElementById('goleadores');
    let html = '<h2>Top Goleadores</h2><ul>';
    
    data.goleadores.slice(0, 10).forEach(goleador => {
        html += `<li>
            <strong>${goleador.posicion}. ${goleador.jugador}</strong> 
            (${goleador.equipo}) - ${goleador.goles} goles
        </li>`;
    });
    
    html += '</ul>';
    container.innerHTML = html;
}

mostrarGoleadores();
```

### Ejemplo 3: Mostrar Noticias

```javascript
async function mostrarNoticias() {
    const response = await fetch('https://workspace-sgo719398.replit.app/noticias');
    const data = await response.json();
    
    const container = document.getElementById('noticias');
    let html = '<h2>Últimas Noticias</h2>';
    
    data.noticias.slice(0, 5).forEach(noticia => {
        html += `
            <div class="noticia">
                ${noticia.imagen ? `<img src="${noticia.imagen}" width="200">` : ''}
                <h3><a href="${noticia.url}" target="_blank">${noticia.titulo}</a></h3>
                <p>${noticia.descripcion}</p>
                <small>${noticia.fecha}</small>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

mostrarNoticias();
```

### Ejemplo 4: React

```jsx
import React, { useState, useEffect } from 'react';

function TablaLigaMX() {
    const [tabla, setTabla] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('https://workspace-sgo719398.replit.app/tabla')
            .then(res => res.json())
            .then(data => {
                setTabla(data.tabla);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    if (loading) return <div>Cargando...</div>;

    return (
        <div>
            <h1>Tabla de Posiciones</h1>
            <table>
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>Equipo</th>
                        <th>PJ</th>
                        <th>PG</th>
                        <th>PE</th>
                        <th>PP</th>
                        <th>PTS</th>
                    </tr>
                </thead>
                <tbody>
                    {tabla.map(equipo => (
                        <tr key={equipo.posicion}>
                            <td>{equipo.posicion}</td>
                            <td>{equipo.equipo}</td>
                            <td>{equipo.estadisticas.pj}</td>
                            <td>{equipo.estadisticas.pg}</td>
                            <td>{equipo.estadisticas.pe}</td>
                            <td>{equipo.estadisticas.pp}</td>
                            <td><strong>{equipo.estadisticas.pts}</strong></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default TablaLigaMX;
```

### Ejemplo 5: jQuery

```javascript
$(document).ready(function() {
    // Obtener todos los datos
    $.getJSON('https://workspace-sgo719398.replit.app/todo', function(data) {
        // Tabla
        let tablaHTML = '<h3>Tabla de Posiciones</h3><table>';
        data.tabla.forEach(equipo => {
            tablaHTML += `<tr><td>${equipo.posicion}</td><td>${equipo.equipo}</td><td>${equipo.estadisticas.pts}</td></tr>`;
        });
        tablaHTML += '</table>';
        $('#tabla-container').html(tablaHTML);
        
        // Goleadores
        let golesHTML = '<h3>Goleadores</h3><ul>';
        data.goleadores.slice(0, 5).forEach(g => {
            golesHTML += `<li>${g.jugador} - ${g.goles} goles</li>`;
        });
        golesHTML += '</ul>';
        $('#goleadores-container').html(golesHTML);
    });
});
```

### Ejemplo 6: Vue.js

```vue
<template>
  <div>
    <h1>Liga MX - Tabla de Posiciones</h1>
    <table>
      <tr v-for="equipo in tabla" :key="equipo.posicion">
        <td>{{ equipo.posicion }}</td>
        <td>{{ equipo.equipo }}</td>
        <td>{{ equipo.estadisticas.pts }}</td>
      </tr>
    </table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      tabla: []
    }
  },
  async mounted() {
    const response = await fetch('https://workspace-sgo719398.replit.app/tabla');
    const data = await response.json();
    this.tabla = data.tabla;
  }
}
</script>
```

---

## 🔄 Actualización de Datos

Los datos se actualizan **automáticamente cada 30 minutos** mediante scraping.

No necesitas hacer nada, solo consume los endpoints y siempre tendrás datos frescos.

---

## 📊 Estructura de Respuestas

### Tabla (`/tabla`)
```json
{
  "actualizado": "14/10/2025, 9:30:00 p.m.",
  "total": 18,
  "tabla": [
    {
      "posicion": 1,
      "equipo": "Toluca",
      "estadisticas": {
        "pj": 12,
        "pg": 9,
        "pe": 1,
        "pp": 2,
        "gf": 35,
        "gc": 16,
        "dif": 19,
        "pts": 28
      }
    }
  ]
}
```

### Goleadores (`/goleadores`)
```json
{
  "actualizado": "14/10/2025, 9:30:00 p.m.",
  "total": 20,
  "goleadores": [
    {
      "posicion": 1,
      "jugador": "Paulinho",
      "equipo": "Toluca",
      "goles": 9
    }
  ]
}
```

### Noticias (`/noticias`)
```json
{
  "actualizado": "14/10/2025, 9:30:00 p.m.",
  "total": 15,
  "noticias": [
    {
      "titulo": "...",
      "descripcion": "...",
      "url": "...",
      "imagen": "...",
      "fecha": "14/10/2025"
    }
  ]
}
```

---

## 🚀 Para Publicar tu API

1. **Opción 1: Usar la URL de Replit** (ya disponible)
   ```
   https://workspace-sgo719398.replit.app
   ```

2. **Opción 2: Publicar con dominio personalizado**
   - Click en "Deploy" en Replit
   - Configura tu dominio personalizado
   - La API estará disponible 24/7

---

## ⚠️ Notas Importantes

1. **CORS**: La API ya está configurada para aceptar peticiones desde cualquier dominio
2. **Rate Limiting**: No hay límite de requests, pero el scraping se hace cada 30 min
3. **Caché**: Los datos se cachean por 30 minutos para mejor rendimiento
4. **Disponibilidad**: Mientras el Repl esté activo, la API funciona 24/7

---

## 📞 ¿Necesitas ayuda?

Si tienes problemas, verifica:
1. Que la URL esté correcta: `https://workspace-sgo719398.replit.app`
2. Que el endpoint exista: `/tabla`, `/noticias`, `/goleadores`, `/equipos`, `/todo`
3. Que tu navegador permita peticiones CORS
