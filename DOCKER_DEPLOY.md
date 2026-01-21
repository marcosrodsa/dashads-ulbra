# Guia de Deploy Docker - Hostinger

## Pré-requisitos

1. **Credenciais do Supabase**:
   - URL do projeto: `https://seu-projeto.supabase.co`
   - Anon Key (chave pública)
   
   Para obter essas credenciais:
   - Acesse [Supabase Dashboard](https://app.supabase.com)
   - Selecione seu projeto
   - Vá em **Project Settings** > **API**
   - Copie **Project URL** e **anon/public key**

2. **Dockerfile** (se ainda não tiver, crie na raiz do projeto):

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for Vite environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set environment variables for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (opcional)
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Testando Localmente com Docker

### 1. Criar arquivo `.env.local` (NÃO commitar!)

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 2. Build da imagem Docker localmente

```bash
# Opção 1: Usando arquivo .env.local
docker build \
  --build-arg VITE_SUPABASE_URL=$(grep VITE_SUPABASE_URL .env.local | cut -d '=' -f2) \
  --build-arg VITE_SUPABASE_ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2) \
  -t dashads-ulbra:test .

# Opção 2: Passando diretamente (substitua os valores)
docker build \
  --build-arg VITE_SUPABASE_URL=https://seu-projeto.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=sua-anon-key \
  -t dashads-ulbra:test .
```

### 3. Executar o container localmente

```bash
docker run -p 8080:80 dashads-ulbra:test
```

### 4. Testar no navegador

Abra http://localhost:8080 e verifique:

✅ **Dashboard carrega sem erros**
✅ **Não aparece "Sem conexão Supabase" no sidebar**
✅ **Dados são carregados corretamente**

### 5. Verificar se as variáveis foram injetadas

Abra o console do navegador (F12) e execute:

```javascript
// Verificar se o código compilado contém as URLs
fetch('/assets/index-*.js')
  .then(r => r.text())
  .then(code => {
    if (code.includes('supabase.co')) {
      console.log('✅ Variáveis de ambiente foram injetadas no build!');
    } else {
      console.log('❌ Variáveis NÃO foram injetadas!');
    }
  });
```

Ou simplesmente inspecione a aba **Network** e veja se há requisições para `seu-projeto.supabase.co`.

## Deploy na Hostinger

### Opção 1: Via Hostinger Panel (Recomendado)

1. **Acesse o painel da Hostinger**
2. **Vá para a seção de Deploy/Build**
3. **Configure as variáveis de ambiente**:
   - Nome: `VITE_SUPABASE_URL`
   - Valor: `https://seu-projeto.supabase.co`
   
   - Nome: `VITE_SUPABASE_ANON_KEY`
   - Valor: `sua-anon-key`

4. **Configure o Dockerfile** (se necessário, ajuste o caminho)
5. **Faça o deploy**

### Opção 2: Via GitHub Actions + Hostinger

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: |
        docker build \
          --build-arg VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }} \
          --build-arg VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }} \
          -t dashads-ulbra:latest .
    
    # Adicione aqui os steps para push para Hostinger
```

**Importante**: Configure os secrets no GitHub:
- Settings > Secrets and variables > Actions
- Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

### Opção 3: Build local e push para registry

```bash
# 1. Build com as variáveis
docker build \
  --build-arg VITE_SUPABASE_URL=https://seu-projeto.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=sua-anon-key \
  -t seu-registry/dashads-ulbra:latest .

# 2. Push para o registry da Hostinger
docker push seu-registry/dashads-ulbra:latest
```

## Verificação Pós-Deploy

### 1. Verificar se o app está rodando

```bash
curl https://seu-dominio.hostinger.com
```

### 2. Verificar logs do container (via painel Hostinger)

Procure por:
- ✅ Nginx iniciado com sucesso
- ❌ Erros de conexão com Supabase
- ❌ Erros 404 para assets

### 3. Testar no navegador

Acesse `https://seu-dominio.hostinger.com` e:

1. **Abra o DevTools (F12)**
2. **Vá para a aba Console**
3. **Procure por erros**:
   - ❌ `Failed to fetch` para Supabase = variáveis não foram injetadas
   - ❌ `Invalid API key` = anon key incorreta
   - ✅ Sem erros = tudo funcionando!

4. **Verifique a aba Network**:
   - Deve haver requisições para `seu-projeto.supabase.co`
   - Status 200 = sucesso
   - Status 401/403 = problema com a chave

### 4. Verificar sidebar

Se aparecer **"Sem conexão Supabase"** no sidebar:
- ❌ As variáveis NÃO foram injetadas corretamente
- Refaça o build com as variáveis corretas

## Troubleshooting

### Problema: "Sem conexão Supabase" aparece

**Causa**: Variáveis de ambiente não foram injetadas no build.

**Solução**:
1. Verifique se as variáveis estão configuradas no painel da Hostinger
2. Refaça o build
3. Verifique se o Dockerfile usa `ARG` e `ENV` corretamente

### Problema: Erro 401 nas requisições Supabase

**Causa**: Anon key incorreta ou expirada.

**Solução**:
1. Verifique a anon key no Supabase Dashboard
2. Atualize a variável `VITE_SUPABASE_ANON_KEY`
3. Refaça o build

### Problema: Assets não carregam (404)

**Causa**: Nginx não está servindo os arquivos corretamente.

**Solução**:
Crie `nginx.conf` na raiz do projeto:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

E atualize o Dockerfile:

```dockerfile
# Copiar configuração nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

## Checklist de Deploy

- [ ] Credenciais do Supabase obtidas
- [ ] `.env.example` atualizado (para referência)
- [ ] Dockerfile criado
- [ ] Build local testado com sucesso
- [ ] Variáveis configuradas na Hostinger
- [ ] Deploy realizado
- [ ] App acessível via URL
- [ ] Sem erro "Sem conexão Supabase"
- [ ] Dados carregam corretamente
- [ ] Filtros funcionam
- [ ] Responsividade mobile OK

## Comandos Úteis

```bash
# Ver logs do container (local)
docker logs <container-id>

# Entrar no container para debug
docker exec -it <container-id> sh

# Verificar arquivos buildados
docker run --rm dashads-ulbra:test ls -la /usr/share/nginx/html

# Verificar se as variáveis estão no código compilado
docker run --rm dashads-ulbra:test grep -r "supabase.co" /usr/share/nginx/html/assets/
```

## Segurança

> [!IMPORTANT]
> - **NUNCA** commite arquivos `.env` ou `.env.local` no Git
> - A **anon key** é pública e pode ser exposta no código do frontend
> - Configure **Row Level Security (RLS)** no Supabase para proteger seus dados
> - Use **secrets** do GitHub Actions para CI/CD

## Próximos Passos

Após o deploy bem-sucedido:
1. Configure um domínio customizado na Hostinger
2. Configure SSL/HTTPS (geralmente automático na Hostinger)
3. Configure monitoramento e alertas
4. Configure backup automático do banco Supabase
