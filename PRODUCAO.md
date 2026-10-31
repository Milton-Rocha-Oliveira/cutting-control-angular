# Publicação em produção

## Pré-requisitos

- Docker e Docker Compose
- Domínios para frontend e API
- HTTPS configurado no proxy reverso (Nginx, Traefik ou serviço de hospedagem)

## Configuração

1. Copie `.env.production.example` para `.env.production`.
2. Altere as senhas e segredos de exemplo. Gere `APP_JWT_SECRET` e `APP_DATA_ENCRYPTION_KEY` com `openssl rand -base64 32` e guarde ambos em um gerenciador de segredos.
   A aplicação em perfil `prod` não inicia sem `APP_JWT_SECRET`; a chave precisa ter ao menos 32 bytes. O cadastro público fica habilitado por padrão (`APP_PUBLIC_REGISTRATION=true`): qualquer pessoa pode criar uma conta e entrar imediatamente, sem aprovação do administrador. Para uma instalação privada, defina `APP_PUBLIC_REGISTRATION=false`.
3. Informe o e-mail e a senha que serão usados pela primeira conta root em `APP_BOOTSTRAP_EMAIL` e `APP_BOOTSTRAP_PASSWORD`. A senha deve ter pelo menos 12 caracteres.
4. Preserve em `APP_BOOTSTRAP_USER_ID` o UUID da conta root anterior se quiser manter o proprietário dos registros existentes. Essa conta root é criada apenas quando o banco ainda não possui uma.
5. Suba os serviços:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

6. Verifique a API em `/actuator/health` e configure o proxy para encaminhar frontend para `web:80` e API para `api:8080`.

## Operação e segurança

- Nunca publique `.env.production`.
- Restrinja `CORS_ALLOWED_ORIGINS` ao domínio real do frontend.
- Use HTTPS antes de liberar o acesso externo.
- Faça backup do volume `postgres_data` e guarde cópias seguras e separadas de `APP_JWT_SECRET` e `APP_DATA_ENCRYPTION_KEY`.
- Qualquer pessoa pode se cadastrar e acessar a própria conta sem aprovação. A conta root também pode criar usuários e redefinir senhas pela seção **Usuários**; usuários podem trocar a própria senha. Não há recuperação automática por e-mail nem MFA. Login e cadastro recebem limite de tentativas por IP, aplicado por instância da API.
- Como o cadastro é público, proteja o serviço com HTTPS e restrinja `CORS_ALLOWED_ORIGINS` ao domínio do frontend. Se os usuários precisarem de recuperação de conta ou autenticação adicional, configure esses recursos antes de depender deles.
- O JWT tem validade de 8 horas. Trocar `APP_JWT_SECRET` invalida todas as sessões existentes.

As migrations Flyway são executadas automaticamente pela API. A migration V10 cifra dados de fornecedores, cortes, valores e itens de fechamento com AES-256-GCM. IDs, relações, status, datas usadas em filtros e número da fatura permanecem visíveis para permitir consultas. O backend precisa da chave para exibir e calcular os campos cifrados.

## Migração de dados existentes

Faça backup antes da primeira inicialização desta versão. A migration V9 interrompe o deploy se existirem fornecedores sem proprietário. A migration V10 cifra os campos de negócio; configure `APP_DATA_ENCRYPTION_KEY` antes de iniciar.

O UUID da conta root anterior pode ser mantido em `APP_BOOTSTRAP_USER_ID`. Senhas e contas do provedor de autenticação anterior não são migradas; o root deverá criar contas locais para os demais usuários. Para preservar os dados de cada conta secundária, mantenha os UUIDs existentes em `owner_id` ao migrar seus registros e crie as contas com esses mesmos UUIDs.
