# 📱 Instalación en Termux (Android)

Esta guía te ayudará a instalar y ejecutar la Multi-League Football API en tu dispositivo Android usando Termux.

## 📋 Requisitos Previos

1. Instala **Termux** desde F-Droid (NO desde Google Play Store)
   - Descarga F-Droid: https://f-droid.org/
   - Instala Termux desde F-Droid

2. Abre Termux en tu dispositivo Android

## 🚀 Instalación Automática

### Opción 1: Si ya tienes el proyecto descargado

```bash
cd /ruta/del/proyecto
chmod +x install-termux.sh
./install-termux.sh
```

### Opción 2: Clonar desde Git (si aplica)

```bash
pkg install -y git
git clone <URL_DEL_REPOSITORIO>
cd <nombre-del-proyecto>
chmod +x install-termux.sh
./install-termux.sh
```

### Opción 3: Copiar archivos manualmente

Si tienes los archivos en tu dispositivo:

1. Copia la carpeta del proyecto a Termux:
```bash
cd /sdcard/Download/ligamx-api
cp -r . ~/ligamx-api/
cd ~/ligamx-api
chmod +x install-termux.sh
./install-termux.sh
```

## ▶️ Iniciar el Servidor

Después de la instalación, inicia el servidor con:

```bash
./start-server.sh
```

El script mostrará:
- ✅ Tu IP pública
- 🔗 La URL completa de la API para usar en tu web
- 📋 Lista de endpoints disponibles

## 🔄 Inicio Automático

Para que el servidor se inicie automáticamente al abrir Termux:

```bash
echo 'cd ~/ligamx-api && ./start-server.sh' >> ~/.bashrc
```

**Nota:** Esto iniciará el servidor cada vez que abras Termux. Si prefieres iniciarlo manualmente, omite este paso.

## 🌐 Usar la API en tu Página Web

Una vez que el servidor esté corriendo, verás algo como:

```
📡 IP PÚBLICA: 192.168.1.100
🔗 URL DE LA API: http://192.168.1.100:5000
```

Usa esa URL en tu página web para consumir la API:

```javascript
// Ejemplo en JavaScript
fetch('http://TU_IP_PUBLICA:5000/tabla')
  .then(response => response.json())
  .then(data => console.log(data));
```

## ⚠️ Consideraciones Importantes

### Conexión de Red

Para que tu página web pueda acceder a la API:

1. **Misma Red WiFi:** Tu teléfono y la computadora donde está tu web deben estar en la misma red WiFi
2. **IP Pública Externa:** Si necesitas acceso desde internet, necesitarás:
   - Configurar port forwarding en tu router (puerto 5000)
   - O usar un servicio como ngrok, localtunnel o Cloudflare Tunnel

### Mantener Termux Activo

Termux puede detenerse si cierras la app. Para evitarlo:

1. Instala **Termux:Boot** desde F-Droid para inicio automático
2. Usa **Termux:Widget** para crear un acceso directo
3. Adquiere **Termux Wake Lock** en la tienda de Termux:
   ```bash
   termux-wake-lock
   ```

### Uso de Datos

La API hace scraping de múltiples sitios web. Ten en cuenta el consumo de datos móviles si no estás en WiFi.

## 🛠️ Comandos Útiles

### Detener el servidor
Presiona `Ctrl + C` en Termux

### Ver logs en tiempo real
El servidor muestra logs automáticamente. Los verás al ejecutar `./start-server.sh`

### Actualizar dependencias
```bash
npm install
```

### Verificar que Node.js está instalado
```bash
node --version
npm --version
```

## 🔧 Solución de Problemas

### Error: "permission denied"
```bash
chmod +x install-termux.sh start-server.sh
```

### Error: "npm not found"
```bash
pkg install -y nodejs
```

### El servidor no inicia
```bash
# Reinstalar dependencias
rm -rf node_modules
npm install
```

### No puedo acceder desde otra computadora

1. Verifica que ambos dispositivos estén en la misma red WiFi
2. Desactiva el firewall temporalmente en la computadora
3. Verifica la IP con:
   ```bash
   curl https://api.ipify.org
   ```

### Puerto 5000 ocupado

Si el puerto 5000 está en uso, edita `index.js` y cambia el puerto:
```bash
nano index.js
# Busca: const PORT = 5000
# Cambia a: const PORT = 3000
```

## 📱 Acceso Remoto (Opcional)

Si necesitas acceder a la API desde internet (no solo tu red local):

### Opción 1: ngrok (Recomendado para pruebas)

```bash
pkg install -y wget
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz
tar xvzf ngrok-v3-stable-linux-arm64.tgz
chmod +x ngrok

# En otra sesión de Termux (desliza desde la izquierda y toca "New session")
./ngrok http 5000
```

ngrok te dará una URL pública como: `https://abc123.ngrok.io`

### Opción 2: localtunnel

```bash
npm install -g localtunnel

# En otra sesión de Termux
lt --port 5000
```

## 📞 Soporte

Si tienes problemas:

1. Verifica que Termux esté actualizado
2. Reinstala las dependencias: `rm -rf node_modules && npm install`
3. Revisa los logs del servidor para ver errores específicos

---

**¡Listo!** 🎉 Ahora tienes tu API de fútbol corriendo en tu dispositivo Android y puedes usarla en cualquier proyecto web.
