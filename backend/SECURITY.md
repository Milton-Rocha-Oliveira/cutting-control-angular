Security integration notes

This project uses Spring Security and can be configured as an OAuth2 Resource Server to validate JWTs (e.g. issued by Supabase).

Set the environment variable `APP_JWKS_URI` to the issuer's JWK set URI (e.g. Supabase project's JWKs endpoint). Example in `application.properties` or env:

APP_JWKS_URI=https://<your-supabase-project>.supabase.co/auth/v1/.well-known/jwks.json

When configured, the backend will validate `Authorization: Bearer <token>` and secure `/api/**` endpoints.

You'll also want to map claims to authorities and extract username from `sub` or `email` claims depending on your auth provider.
