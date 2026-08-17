# Livro de movimentacoes — Supabase + GitHub Pages

App simples (HTML/CSS/JS puro, sem build) para criar, editar e excluir registros
da sua tabela do Supabase, hospedado gratuitamente no GitHub Pages.

## Arquivos

- `index.html` — estrutura da página (formulário + tabela + modal de edição)
- `styles.css` — visual
- `app.js` — lógica de CRUD (create, read, update, delete) usando o Supabase JS
- `config.js` — **você edita este arquivo** com a URL e a chave do seu projeto

## 1. Configurar o Supabase

### 1.1. Pegar URL e chave anônima
1. Acesse [supabase.com](https://supabase.com) → abra seu projeto
2. Vá em **Project Settings → API**
3. Copie:
   - **Project URL** → cole em `SUPABASE_URL` no `config.js`
   - **anon public key** → cole em `SUPABASE_ANON_KEY` no `config.js`
4. **Nunca** use a chave `service_role` no front-end — ela dá acesso total e irrestrito ao banco, e o `config.js` vai ficar público no GitHub Pages.

### 1.2. Liberar acesso à tabela (Row Level Security)
Por padrão, o Supabase bloqueia todo acesso via chave anônima (RLS ligado).
Você precisa criar políticas permitindo select/insert/update/delete na tabela.

Vá em **SQL Editor** no painel do Supabase e rode (ajuste o nome da tabela se
não for `movimentacoes`):

```sql
-- Garante que RLS está ativo
alter table movimentacoes enable row level security;

-- Permite leitura pública
create policy "Permitir leitura" on movimentacoes
for select using (true);

-- Permite inserir
create policy "Permitir insercao" on movimentacoes
for insert with check (true);

-- Permite atualizar
create policy "Permitir atualizacao" on movimentacoes
for update using (true) with check (true);

-- Permite excluir
create policy "Permitir exclusao" on movimentacoes
for delete using (true);
```

> ⚠️ **Atenção de segurança:** essas políticas com `true` liberam a tabela para
> **qualquer pessoa** que tenha a URL e a chave anônima (ambas ficam visíveis
> no código do site, isso é normal e esperado no Supabase). Como o `config.js`
> vai estar num repositório GitHub Pages público, qualquer visitante do seu
> site conseguiria ler/editar/apagar os dados.
>
> Se esse formulário é só para uso pessoal, considere uma destas alternativas
> mais seguras:
> - Ativar **Supabase Auth** (login por e-mail/senha) e trocar `using (true)`
>   por `using (auth.uid() is not null)`, exigindo login antes de qualquer
>   operação.
> - Deixar o repositório do GitHub **privado** e publicar o Pages só para você
>   (funciona em planos GitHub Pro/Team/Enterprise) — mesmo assim, quem souber
>   a URL do site ainda acessa os dados, então isso sozinho não resolve.
>
> Se quiser, eu te ajudo a adicionar login (Supabase Auth) depois — é só pedir.

### 1.3. Conferir se a tabela já existe
Você mencionou que a tabela já existe no Supabase com as colunas: `id`, `conta`,
`tipo`, `data_compra`, `forma_pagamento`, `parcelas_total`, `parcela_atual`,
`categoria`, `sub_categoria`, `descricao`, `data_pagamento`, `valor`,
`confirmacao`. O app já está mapeado para esses nomes exatos. Se o nome da
tabela não for `movimentacoes`, ajuste `TABLE_NAME` em `config.js`.

## 2. Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (ex: `livro-de-movimentacoes`)
2. Faça upload dos 4 arquivos (`index.html`, `styles.css`, `app.js`, `config.js`)
   para a raiz do repositório — pelo site do GitHub mesmo (`Add file → Upload files`)
   ou via terminal:
   ```bash
   git init
   git add .
   git commit -m "app inicial"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/livro-de-movimentacoes.git
   git push -u origin main
   ```
3. No repositório, vá em **Settings → Pages**
4. Em **Source**, selecione a branch `main` e a pasta `/ (root)`
5. Clique em **Save** — em 1-2 minutos seu site estará em:
   `https://SEU-USUARIO.github.io/livro-de-movimentacoes/`

## 3. Editar `config.js` antes de publicar (ou depois, direto pelo GitHub)

```js
const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
const TABLE_NAME = "movimentacoes";
```

Depois de salvar essas alterações no GitHub, o Pages atualiza automaticamente
em cerca de 1 minuto.

## O que o app faz

- **Adicionar** registro pelo formulário no topo
- **Listar** todos os registros numa tabela, com busca por qualquer campo
- **Editar** clicando em "Editar" (abre um modal com os dados atuais)
- **Excluir** clicando em "Excluir" (pede confirmação antes)
- Mostra o **total somado** de `valor` no cabeçalho

## Problemas comuns

- **"Erro ao carregar: ..."** → normalmente é RLS bloqueando. Revise o passo 1.2.
- **Tela mostra aviso de configuração pendente** → você ainda não editou o `config.js`.
- **CORS** → não precisa configurar nada no Supabase para isso, a API já aceita
  chamadas de qualquer origem quando você usa a chave anônima corretamente.
