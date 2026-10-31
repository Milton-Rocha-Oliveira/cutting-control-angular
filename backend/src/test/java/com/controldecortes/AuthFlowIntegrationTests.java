package com.controldecortes;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
  "spring.profiles.active=local",
  "spring.datasource.url=jdbc:h2:mem:auth-tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
  "spring.jpa.hibernate.ddl-auto=create-drop",
  "app.auth.public-registration=true",
  "app.auth.rate-limit.capacity=100",
  "app.bootstrap.email=integration-root@example.com",
  "app.bootstrap.password=integration-root-password-123",
  "app.bootstrap.user-id=aa6d9c21-56b1-48d9-a6bb-9e57d1409a61"
})
@AutoConfigureMockMvc
class AuthFlowIntegrationTests {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired JdbcTemplate jdbc;

  @BeforeEach
  void addProductionUniquenessConstraintsToH2Schema() {
    jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS test_supplier_owner_document ON suppliers(owner_id, document_fingerprint)");
  }

  @Test
  void registerLoginAndChangePassword() throws Exception {
    String email = "auth-" + UUID.randomUUID() + "@example.com";
    String originalPassword = "initial-password-123";
    String token = register(email, originalPassword);

    mvc.perform(post("/api/auth/change-password").header("Authorization", "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"currentPassword\":\"" + originalPassword + "\",\"newPassword\":\"replacement-password-456\"}"))
      .andExpect(status().isNoContent());

    mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"" + email + "\",\"password\":\"replacement-password-456\"}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isNotEmpty());

    String rootToken = login("integration-root@example.com", "integration-root-password-123");
    mvc.perform(post("/api/admin/users/reset-password").header("Authorization", "Bearer " + rootToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"" + email + "\",\"newPassword\":\"admin-reset-password-789\"}"))
      .andExpect(status().isNoContent());
    mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"" + email + "\",\"password\":\"admin-reset-password-789\"}"))
      .andExpect(status().isOk());

    mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"" + email + "\",\"password\":\"replacement-password-456\"}"))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void usersCannotReadAnotherAccountsSuppliers() throws Exception {
    String firstToken = register("first-" + UUID.randomUUID() + "@example.com", "initial-password-123");
    String secondToken = register("second-" + UUID.randomUUID() + "@example.com", "initial-password-123");

    mvc.perform(post("/api/suppliers").header("Authorization", "Bearer " + firstToken)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Fornecedor restrito\",\"phone\":\"11999999999\"}"))
      .andExpect(status().isCreated());

    mvc.perform(get("/api/suppliers").header("Authorization", "Bearer " + secondToken))
      .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
  }

  @Test
  void rejectsDuplicateSupplierDocumentsButAllowsRepeatedCutNumbers() throws Exception {
    String token = register("unique-" + UUID.randomUUID() + "@example.com", "initial-password-123");
    MvcResult supplier = mvc.perform(post("/api/suppliers").header("Authorization", "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Fornecedor único\",\"document\":\"11.222.333/0001-44\",\"phone\":\"11999999999\"}"))
      .andExpect(status().isCreated()).andReturn();
    mvc.perform(post("/api/suppliers").header("Authorization", "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Fornecedor repetido\",\"document\":\"11222333000144\",\"phone\":\"11999999999\"}"))
      .andExpect(status().isConflict());

    long supplierId = mapper.readTree(supplier.getResponse().getContentAsString()).get("id").asLong();
    String cut = "{\"supplierId\":" + supplierId + ",\"cutNumber\":\"C-100\",\"description\":\"Jeans\",\"packages\":1,\"piecesPerPackage\":10,\"unitPricePerPiece\":2.50,\"productionDate\":\"2026-01-01\"}";
    mvc.perform(post("/api/cuts").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(cut))
      .andExpect(status().isCreated());
    mvc.perform(post("/api/cuts").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(cut))
      .andExpect(status().isCreated());
  }

  @Test
  void concurrentBillingCanBillACutOnlyOnce() throws Exception {
    String token = register("billing-" + UUID.randomUUID() + "@example.com", "initial-password-123");
    MvcResult supplier = mvc.perform(post("/api/suppliers").header("Authorization", "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"Fornecedor concorrente\",\"phone\":\"11999999999\"}"))
      .andExpect(status().isCreated()).andReturn();
    long supplierId = mapper.readTree(supplier.getResponse().getContentAsString()).get("id").asLong();
    MvcResult cut = mvc.perform(post("/api/cuts").header("Authorization", "Bearer " + token)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"supplierId\":" + supplierId + ",\"cutNumber\":\"RACE-1\",\"description\":\"Jeans\",\"packages\":1,\"piecesPerPackage\":10,\"unitPricePerPiece\":2.50,\"productionDate\":\"2026-01-01\"}"))
      .andExpect(status().isCreated()).andReturn();
    long cutId = mapper.readTree(cut.getResponse().getContentAsString()).get("id").asLong();
    String billing = "{\"supplierId\":" + supplierId + ",\"items\":[{\"cutId\":" + cutId + "}]}";

    var pool = Executors.newFixedThreadPool(2);
    try {
      var first = CompletableFuture.supplyAsync(() -> performBilling(token, billing), pool);
      var second = CompletableFuture.supplyAsync(() -> performBilling(token, billing), pool);
      var codes = java.util.List.of(first.get().getResponse().getStatus(), second.get().getResponse().getStatus());
      org.junit.jupiter.api.Assertions.assertEquals(1, codes.stream().filter(code -> code == 200).count(), "statuses=" + codes);
      org.junit.jupiter.api.Assertions.assertEquals(1, codes.stream().filter(code -> code == 409).count(), "statuses=" + codes);
    } finally {
      pool.shutdownNow();
    }
  }

  private String register(String email, String password) throws Exception {
    MvcResult result = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"" + email + "\",\"name\":\"Integration test\",\"password\":\"" + password + "\"}"))
      .andExpect(status().isCreated()).andReturn();
    JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
    return body.get("accessToken").asText();
  }

  private String login(String email, String password) throws Exception {
    MvcResult result = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
      .andExpect(status().isOk()).andReturn();
    return mapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
  }

  private MvcResult performBilling(String token, String content) {
    try {
      return mvc.perform(post("/api/settlements").header("Authorization", "Bearer " + token)
          .contentType(MediaType.APPLICATION_JSON).content(content)).andReturn();
    } catch (Exception exception) {
      throw new RuntimeException(exception);
    }
  }
}
