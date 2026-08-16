Backend Spring Boot

Setup:
- Configure variables `JDBC_DATABASE_URL`, `JDBC_DATABASE_USERNAME`, `JDBC_DATABASE_PASSWORD` (point to Postgres/Supabase DB).
- Build: `mvn -f backend/ clean package`
- Run: `java -jar backend/target/cut-control-0.0.1-SNAPSHOT.jar` or `mvn -f backend/ spring-boot:run`

Notes:
- Uses JPA entities `Supplier`, `Cut`, `Invoice`, `SettlementItem` (see source).
- Faturamento é implementado em `CutService.createInvoiceFromActiveCuts` como operação transacional.
- Security and auth placeholders are present; integrate with Supabase JWT or other provider.
