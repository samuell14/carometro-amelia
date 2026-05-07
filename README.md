# Configuração Supabase para Carômetro Escolar

Este projeto usa o frontend estático em `index.html` e `script.js` e foi migrado para usar Supabase como backend gratuito.

## 1. Criar projeto no Supabase

1. Acesse https://app.supabase.com e faça login ou crie uma conta gratuita.
2. Crie um novo projeto.
3. Escolha um nome de projeto e senha de banco de dados.
4. Aguarde a criação do projeto.

## 2. Copiar URL e anon key

1. No painel do projeto Supabase, vá em `Settings` > `API`.
2. Copie o valor de `URL` e da `anon` key em `Project API keys`.
3. No arquivo `script.js`, substitua os placeholders:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const STORAGE_BUCKET = 'student-photos';
```

> Importante: use apenas a URL base do seu projeto Supabase, sem `/rest/v1/` ou outras rotas extras.

Use sua `URL` e `anon key` reais.

## 3. Criar tabela `students`

1. No painel do Supabase, abra `Database` > `Table Editor`.
2. Crie uma nova tabela com o nome `students`.
3. Defina as colunas:
   - `id` - tipo `text` - marque como `Primary Key`
   - `name` - tipo `text`
   - `photo_path` - tipo `text`
4. Não é necessário habilitar RLS para este uso simples.

Opcional: se preferir, também pode executar este SQL no editor SQL:

```sql
create table public.students (
  id text primary key,
  name text,
  photo_path text
);
```

## 4. Criar bucket de Storage

1. No painel do Supabase, abra `Storage`.
2. Clique em `Create a new bucket`.
3. Defina o nome do bucket como `student-photos` (ou outro nome, mas atualize `STORAGE_BUCKET` em `script.js`).
4. Marque `Public` para permitir acesso direto às imagens via URL pública.
5. Crie o bucket.

### 4.1. Permitir uploads com `anon`

Mesmo com o bucket público, o upload de arquivos com a chave `anon` pode ser bloqueado por políticas de storage.

No painel do Supabase, abra `SQL Editor` e execute este script para permitir uploads, atualizações e exclusões no bucket `student-photos` para usuários anônimos:

```sql
create policy "Anon insert storage objects" on storage.objects
  for insert
  with check (bucket_id = 'student-photos' and auth.role() = 'anon');

create policy "Anon update storage objects" on storage.objects
  for update
  using (bucket_id = 'student-photos' and auth.role() = 'anon')
  with check (bucket_id = 'student-photos' and auth.role() = 'anon');

create policy "Anon delete storage objects" on storage.objects
  for delete
  using (bucket_id = 'student-photos' and auth.role() = 'anon');
```

> Se preferir, adapte `bucket_id` para outro nome de bucket definido em `STORAGE_BUCKET`.

## 5. Ajustar o frontend

No arquivo `script.js`:

- Substitua `SUPABASE_URL` pela URL do seu projeto Supabase.
- Substitua `SUPABASE_ANON_KEY` pela chave `anon` do projeto.
- Confirme que `STORAGE_BUCKET` corresponde ao nome do bucket criado.

O código do app já está preparado para:

- buscar alunos na tabela `students`
- salvar/atualizar alunos
- enviar imagens para o bucket Supabase
- excluir registros e fotos

## 6. Testar localmente

1. Abra `index.html` em um navegador.
2. Adicione um novo aluno com foto.
3. Verifique se o aluno aparece na lista.
4. Edite o aluno e envie outra foto.
5. Exclua o aluno e confirme que a remoção funciona.

## 7. Observações

- O app usa a `anon` key do Supabase sem autenticação.
- Por isso o projeto deve ser usado em ambiente controlado ou de teste.
- Se quiser maior segurança no futuro, pode adicionar autenticação e políticas RLS.
