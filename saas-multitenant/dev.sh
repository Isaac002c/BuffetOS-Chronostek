#!/bin/bash

# Script para rodar Frontend + Backend em desenvolvimento

echo "🚀 BuffetOS - Iniciando ambiente de desenvolvimento..."
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para matar processos ao sair
cleanup() {
    echo -e "\n${YELLOW}⏹️  Encerrando processos...${NC}"
    pkill -P $$ 2>/dev/null
    exit 0
}

trap cleanup EXIT INT TERM

# 1️⃣ Rodar Backend
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}1️⃣  Iniciando Backend (Express)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cd backend
if [ -f "app.js" ]; then
    echo -e "${GREEN}✅ Backend encontrado${NC}"
    npm run dev &
    BACKEND_PID=$!
    echo -e "${GREEN}Backend rodando em http://localhost:3000 (PID: $BACKEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  Backend não encontrado em $(pwd)${NC}"
    cd ..
fi

cd ..

# Esperar um pouco para o backend iniciar
sleep 3

# 2️⃣ Rodar Frontend
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}2️⃣  Iniciando Frontend (Next.js)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "package.json" ] && grep -q "next" package.json; then
    echo -e "${GREEN}✅ Frontend encontrado${NC}"
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}Frontend rodando em http://localhost:3001 (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend não encontrado em $(pwd)${NC}"
fi

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Ambiente pronto!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Backend:  http://localhost:3000${NC}"
echo -e "${BLUE}Frontend: http://localhost:3001${NC}"
echo -e "\n${YELLOW}Pressione Ctrl+C para parar${NC}"
echo ""

# Manter script rodando
wait
