#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Instalador automático de Multi-League Football API para Termux"
echo "=================================================================="
echo ""

echo "📦 Paso 1/5: Actualizando paquetes de Termux..."
pkg update -y
pkg upgrade -y

echo ""
echo "📦 Paso 2/5: Instalando Node.js y dependencias necesarias..."
pkg install -y nodejs git wget curl

echo ""
echo "📦 Paso 3/5: Instalando dependencias del proyecto..."
npm install

echo ""
echo "📦 Paso 4/5: Configurando permisos..."
chmod +x start-server.sh
chmod +x install-termux.sh

echo ""
echo "📦 Paso 5/5: Configurando inicio automático..."
echo ""
echo "✅ ¡Instalación completada exitosamente!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 INSTRUCCIONES DE USO:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para iniciar el servidor, ejecuta:"
echo "  ./start-server.sh"
echo ""
echo "El servidor mostrará tu IP pública para que la uses en tu web."
echo ""
echo "Para que se inicie automáticamente al abrir Termux:"
echo "  echo './start-server.sh' >> ~/.bashrc"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
