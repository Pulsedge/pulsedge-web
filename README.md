# Pulsedge - Termos e Privacidade

Deploy no Vercel para hospedar gratuitamente em `pulsedge.com.br/termos` e `/privacidade`

## Passo a passo:

### 1. Subir pro GitHub

```bash
# No seu computador, dentro desta pasta:
git init
git add .
git commit -m "Initial commit - termos e privacidade"

# Crie repositório no GitHub (pode ser privado)
# Depois:
git remote add origin https://github.com/SEU-USUARIO/pulsedge-legal.git
git push -u origin main
```

### 2. Deploy no Vercel

1. Acesse https://vercel.com e faça login com GitHub
2. Clique em "New Project"
3. Importe o repositório `pulsedge-legal`
4. Deploy automático (não precisa configurar nada)
5. Vercel vai gerar uma URL tipo: `pulsedge-legal.vercel.app`

### 3. Conectar seu domínio

No painel do Vercel:
1. Settings → Domains
2. Adicione `pulsedge.com.br`
3. Vercel mostrará os DNS records necessários

No Registro.br (ou onde seu domínio está):
1. Adicione os DNS records que o Vercel mostrou
2. Aguarde propagação (5-30 minutos)

### Resultado:

✅ `pulsedge.com.br/termos.html` → Termos de Serviço
✅ `pulsedge.com.br/privacidade.html` → Política de Privacidade

**Opcional:** Configurar redirects no Vercel para:
- `/termos` → `/termos.html`
- `/privacidade` → `/privacidade.html`

Crie arquivo `vercel.json`:
```json
{
  "redirects": [
    { "source": "/termos", "destination": "/termos.html" },
    { "source": "/privacidade", "destination": "/privacidade.html" }
  ]
}
```

## Atualizar conteúdo

1. Edite os arquivos `.html`
2. Commit e push pro GitHub
3. Vercel faz deploy automático

---

**Custo:** R$ 0/mês (Vercel free tier)
**SSL:** Automático (HTTPS grátis)
**Manutenção:** Zero
