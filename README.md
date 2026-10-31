# Controle de Cortes

Aplicação full-stack para controlar fornecedores, cortes e faturamento de forma rastreável. A autenticação e o controle de contas são feitos pela API Java; no uso local os dados ficam em H2 e em produção ficam em PostgreSQL.

## Arquitetura

- **backend/** — Spring Boot 3.3, Java 17, REST, JPA, Flyway, autenticação JWT local e senhas com hash PBKDF2.
- **frontend/** — Angular standalone responsivo em português-BR, login pela API Java e integração REST autenticada.
- **H2** — banco persistente em arquivo para desenvolvimento local sem Docker.
- **PostgreSQL** — banco recomendado para produção, executado em serviço ou container Docker.

## Executar localmente

O modo local usa H2 em arquivo (`backend/data/cortes.mv.db`), sem precisar iniciar Docker ou instalar PostgreSQL. Os dados ficam no computador entre reinicializações e não são enviados para nenhum serviço externo. Para iniciar:

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Em outro terminal:

```bash
cd frontend
npm ci
npm start -- --host 0.0.0.0 --port 4300
```

Acesse http://localhost:4300. O Angular usa a API em `http://localhost:8080/api` por padrão. O H2 local guarda os dados de teste no disco; não apague `backend/data` se quiser mantê-los.

Para executar os testes do frontend em modo não interativo, use `npm test`. Os testes usam Vitest e Angular TestBed.

No backend, execute `cd backend && ./mvnw test`. A suíte de integração cobre cadastro/login, troca e redefinição de senha, isolamento entre contas, duplicidade de fornecedor/corte e faturamento concorrente. Os testes do frontend também validam a restauração de backups offline.

## Autenticação e contas

O cadastro público está habilitado por padrão: qualquer pessoa pode criar uma conta pela tela inicial, sem aprovação do administrador, e recebe acesso imediatamente. Os registros de cada conta são isolados por usuário. O root também pode criar contas e redefinir senhas na seção **Usuários**. Para restringir o cadastro em uma instalação privada, configure `APP_PUBLIC_REGISTRATION=false` no backend e no frontend.

Opcionalmente, configure `APP_BOOTSTRAP_EMAIL` e `APP_BOOTSTRAP_PASSWORD` para criar uma conta root na primeira inicialização. Use pelo menos 12 caracteres na senha e, para preservar os registros existentes, configure também `APP_BOOTSTRAP_USER_ID` com o UUID da conta anterior. O root pode criar contas para outras pessoas e redefinir senhas na seção **Usuários**. Senhas são armazenadas como hash PBKDF2; a API emite tokens JWT com validade de 8 horas.

Gere um segredo JWT de pelo menos 32 bytes para produção com `openssl rand -base64 32` e configure-o como `APP_JWT_SECRET`. Mantenha-o privado e estável: trocar o segredo invalida as sessões existentes.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DB_URL` | JDBC do PostgreSQL |
| `DB_USERNAME` / `DB_PASSWORD` | credenciais do PostgreSQL |
| `APP_BOOTSTRAP_EMAIL` | e-mail da primeira conta root |
| `APP_BOOTSTRAP_PASSWORD` | senha inicial da primeira conta root |
| `APP_BOOTSTRAP_NAME` | nome da conta root |
| `APP_BOOTSTRAP_USER_ID` | UUID da conta root; preserve o UUID existente para manter a propriedade dos registros |
| `APP_JWT_SECRET` | segredo HMAC privado, com pelo menos 32 bytes |
| `APP_PUBLIC_REGISTRATION` | libera `POST /api/auth/register`; padrão `true` |
| `AUTH_RATE_LIMIT_CAPACITY` / `AUTH_RATE_LIMIT_WINDOW_SECONDS` | limite de chamadas de autenticação por IP e rota; padrão 10 por 60 segundos |
| `APP_DATA_ENCRYPTION_KEY` | chave Base64 de 32 bytes para criptografia dos dados; gere com `openssl rand -base64 32` |
| `CORS_ALLOWED_ORIGINS` | origens web autorizadas, separadas por vírgula |

Veja `.env.example` e `.env.production.example` para os modelos de configuração.

### Criptografia e cópias de segurança

O backend cifra dados de fornecedores, cortes e itens/valores de fechamentos com AES-256-GCM antes de gravá-los no PostgreSQL. A chave fica somente no ambiente do backend. Guarde-a separada dos backups do banco. Perder ou trocar a chave sem uma migração torna os campos cifrados irrecuperáveis.

IDs, relações entre tabelas, status, datas usadas em filtros e número da fatura permanecem visíveis para permitir consultas. A criptografia protege dumps do banco, mas não é ponta a ponta: o backend precisa da chave para exibir e calcular os campos.

## Deploy

Configure `.env.production` a partir de `.env.production.example`, altere todas as senhas e segredos de exemplo e use HTTPS. O Docker Compose de produção executa PostgreSQL, API e frontend:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

As migrations Flyway são executadas pela API. Verifique `/actuator/health`, configure o proxy para `web:80` e `api:8080` e faça backup dos volumes PostgreSQL e das chaves de criptografia/JWT.

### Migração de usuários e dados

O UUID do root pode ser preservado por `APP_BOOTSTRAP_USER_ID`, mantendo os registros cujo `owner_id` usa esse UUID. Senhas e contas de provedores anteriores não são copiadas automaticamente; usuários secundários deverão ser recriados pelo root. Registros de outros usuários precisam manter seus UUIDs de proprietário durante uma migração de dados para continuarem associados às contas corretas.

As migrations V7 e V9 exigem proprietário em todos os fornecedores. Antes de iniciar com um banco de dados existente, faça backup e atribua registros antigos sem proprietário a uma conta administrativa. A migration V10 cifra campos de negócio na primeira inicialização desta versão; faça backup e configure `APP_DATA_ENCRYPTION_KEY` antes do deploy.

## APIs principais

- `POST /api/auth/login` — autenticação local e emissão de JWT.
- `POST /api/auth/register` — cadastro público; cria a conta ativa e inicia a sessão imediatamente. Pode ser desativado com `APP_PUBLIC_REGISTRATION=false`.
- `GET /api/admin/status`, `POST /api/admin/users`, `POST /api/admin/users/reset-password` — status, criação de contas e redefinição de senha pelo root.
- `GET/POST /api/suppliers`, `PUT/PATCH/DELETE /api/suppliers/{id}` — fornecedores.
- `GET/POST /api/cuts`, `GET /api/cuts/active`, `PUT/PATCH/DELETE /api/cuts/{id}` — cortes.
- `GET/POST /api/settlements` — fechamentos e faturamento.
- `GET /api/dashboard`, `/api/reports/*` — indicadores e relatórios.
