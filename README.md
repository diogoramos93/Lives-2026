
# ⚡ Tutorial de Implantação MaisJob

Este guia explica como colocar o sistema **MaisJob** online, dividindo-o em duas partes: o **Frontend** (Site) e o **Motor** (Backend de conexão).

---

## 1. Requisitos Prévios
- Uma conta no **GitHub**.
- Uma **VPS** (Recomendado: Ubuntu 22.04) para o Motor.
- Uma hospedagem para o site (**aaPanel, cPanel ou Vercel**).
- Um domínio com **SSL configurado** (Câmera e Microfone só funcionam em HTTPS).
- Uma chave de API do **Google Gemini** (opcional para moderação via IA).

---

## 2. Preparando o Código (Local)

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/maisjob.git
   cd maisjob
   ```

2. **Instalar dependências e gerar o Build:**
   ```bash
   npm install
   npm run build
   ```
   *Isso criará uma pasta chamada `dist`. Esta pasta contém os arquivos que vão para o seu site.*

---

## 3. Configurando o Site (Hospedagem)

### via aaPanel / cPanel
1. Crie um novo site com seu domínio.
2. Ative o **SSL (Let's Encrypt)** imediatamente.
3. Faça upload de **todo o conteúdo da pasta `dist`** para o diretório raiz do site (`public_html` ou similar).
4. No arquivo `RandomTab.tsx` e `LiveTab.tsx`, certifique-se de que a variável `MOTOR_DOMAIN` aponta para o domínio onde o seu **Motor** estará rodando.

---

## 4. Configurando o Motor (VPS)

O Motor é o coração que conecta os usuários via WebRTC e Socket.io.

1. **Acessar sua VPS via SSH:**
   ```bash
   ssh root@ip-da-sua-vps
   ```

2. **Instalar Node.js e PM2:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install pm2 -g
   ```

3. **Subir o arquivo `server.js`:**
   - Crie uma pasta `/opt/maisjob-motor`.
   - Coloque o arquivo `server.js` lá.

4. **Instalar as dependências do servidor:**
   ```bash
   cd /opt/maisjob-motor
   npm init -y
   npm install socket.io
   ```

5. **Iniciar o Motor com PM2 (para nunca desligar):**
   ```bash
   pm2 start server.js --name "maisjob-motor"
   pm2 save
   pm2 startup
   ```

6. **Liberar a Porta no Firewall:**
   Certifique-se de que a porta **3000** (ou a que você definiu) está aberta no painel da sua VPS e no firewall interno (`ufw allow 3000`).

---

## 5. Configuração de Proxy Reverso (DICA DE OURO)

Para que o site (HTTPS) fale com o Motor sem erros de segurança, você deve configurar um Proxy Reverso no seu Nginx/aaPanel:

**No painel do site onde está o Motor:**
Vá em **Proxy Reverso** e adicione:
- **Nome:** Motor
- **Target URL:** `http://127.0.0.1:3000`
- **Enviar Header:** Ativado.

Agora, no frontend, você poderá usar o domínio direto (ex: `motor.meudominio.com`) sem precisar especificar a porta :3000.

---

## 6. Verificação de Segurança
- Verifique se o `process.env.API_KEY` está configurado no seu ambiente de build se for usar moderação.
- O sistema usa **PeerJS** público para sinalização por padrão. Para escala massiva, considere instalar seu próprio `peerjs-server`.

**Feito! Seu MaisJob está online.** 🚀
