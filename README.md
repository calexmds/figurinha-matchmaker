# Figurinha Matchmaker

App de troca de figurinhas da Copa do Mundo 2026 com match automático dentro de grupos.

**Domínio:** https://figurinhamatchmaker.com.br

## Stack

- Next.js 16 + TypeScript + Tailwind
- Supabase (Auth Google + e-mail magic link + PostgreSQL + RLS)
- Vercel (deploy)

## Setup rápido

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No **SQL Editor**, execute na ordem:
   - `supabase/schema.sql`
   - `supabase/seed.sql`
   - `supabase/migrations/002_user_needs.sql` *(se o projeto já existia antes desta versão)*
   - `supabase/migrations/003_trades.sql` *(trocas combinadas / pendentes)*
   - `supabase/migrations/004_group_trade_snapshot.sql` *(match de trocas entre membros)*
3. Em **Authentication → Providers**, ative **Google** e **Email** (magic link)
4. Em **Authentication → URL Configuration**, adicione:
   - Site URL: `https://www.figurinhamatchmaker.com.br`
   - Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://www.figurinhamatchmaker.com.br/auth/callback`
     - `https://figurinhamatchmaker.com.br/auth/callback`

### 2. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → Credentials → OAuth Client
2. Authorized redirect URI: `https://SEU_PROJETO.supabase.co/auth/v1/callback`
3. Copie Client ID e Secret para o Supabase (Google provider)

### 3. Ambiente local

```bash
cp .env.example .env.local
# Preencha NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 4. Deploy Vercel

1. Importe o repositório na Vercel
2. Configure as mesmas env vars
3. Domínio: `figurinhamatchmaker.com.br` (CNAME para Vercel)
4. Atualize redirect URLs no Supabase com o domínio final

## Scripts

```bash
npm run dev          # desenvolvimento
npm run build        # build produção
npm run db:seed      # regenerar supabase/seed.sql (980 figurinhas)
```

## Fluxo do usuário

1. Landing → Entrar com Google ou e-mail
2. Criar grupo ou abrir link `/join/CODIGO` (entra no grupo automaticamente após login)
3. Marcar repetidas e preciso no gabarito
4. Ver ranking de trocas no grupo
5. Compartilhar convite ou proposta no WhatsApp

## Catálogo

- 980 figurinhas: `00`, `FWC1–FWC19`, 48 seleções × 20
- Seed gerado em `supabase/seed.sql`

## Estrutura

```
src/app/
  page.tsx              Landing
  login/                Login
  join/[code]/          Convite de grupo
  auth/callback/        OAuth callback
  (app)/home/           Dashboard
  (app)/onboarding/     Cadastro de figurinhas
  (app)/grupo/          Grupos e convite
  (app)/trocas/         Ranking de match
```
