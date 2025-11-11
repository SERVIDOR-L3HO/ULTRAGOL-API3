#!/data/data/com.termux/files/usr/bin/bash

clear
echo "⚽ Multi-League Football API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🌐 Obteniendo IP pública..."
PUBLIC_IP=$(curl -s https://api.ipify.org)

if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -s https://ifconfig.me)
fi

if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -s https://icanhazip.com)
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Servidor configurado correctamente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 IP PÚBLICA: $PUBLIC_IP"
echo "🔗 URL DE LA API: http://$PUBLIC_IP:5000"
echo ""
echo "Usa esta URL en tu página web para conectarte a la API"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Endpoints disponibles:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  http://$PUBLIC_IP:5000/ - Ver todos los endpoints"
echo "  http://$PUBLIC_IP:5000/tabla - Tabla de Liga MX"
echo "  http://$PUBLIC_IP:5000/marcadores - Marcadores en vivo"
echo "  http://$PUBLIC_IP:5000/premier/tabla - Tabla Premier League"
echo "  http://$PUBLIC_IP:5000/laliga/tabla - Tabla La Liga"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Iniciando servidor..."
echo ""

export PUBLIC_IP=$PUBLIC_IP
npm start
