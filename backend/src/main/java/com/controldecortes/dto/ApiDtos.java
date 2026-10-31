package com.controldecortes.dto;
import com.controldecortes.domain.ActiveStatus; import jakarta.validation.Valid; import jakarta.validation.constraints.*; import java.math.BigDecimal; import java.time.*; import java.util.*;
public final class ApiDtos { private ApiDtos(){}
 public record SupplierRequest(@NotBlank @Size(max=160) String name,@Size(max=30) String document,@Email String email,@NotBlank @Size(max=40) String phone){}
 public record SupplierResponse(Long id,String name,String document,String email,String phone,boolean active,OffsetDateTime createdAt){}
 public record CutRequest(@NotNull Long supplierId,@NotBlank @Size(max=80) String cutNumber,@NotBlank @Size(max=255) String description,@NotNull @Min(1) Integer packages,@NotNull @Min(1) Integer piecesPerPackage,@NotNull @DecimalMin("0.01") BigDecimal unitPricePerPiece,@NotNull LocalDate productionDate){}
 public record CutResponse(Long id,Long supplierId,String supplierName,String cutNumber,String description,Integer packages,Integer piecesPerPackage,BigDecimal unitPricePerPiece,LocalDate productionDate,Long totalPieces,BigDecimal totalAmount,ActiveStatus status,OffsetDateTime billedAt){}
 public record SettlementItemRequest(@NotNull Long cutId){}
 public record SettlementRequest(@NotNull Long supplierId,@NotEmpty List<@Valid SettlementItemRequest> items){}
 public record SettlementItemResponse(Long cutId,String cutNumber,String description,Integer packages,Integer piecesPerPackage,BigDecimal unitPricePerPiece,LocalDate productionDate,Long totalPieces,BigDecimal totalAmount){}
 public record SettlementResponse(Long id,String invoiceNumber,Long supplierId,String supplierName,OffsetDateTime settledAt,Long totalPieces,BigDecimal totalAmount,String createdBy,List<SettlementItemResponse> items){}
 public record DashboardResponse(long suppliers,long activeCuts,long settlementsThisMonth,BigDecimal invoicedThisMonth,List<SettlementResponse> recentSettlements){}
 public record OfflineBackupResponse(int version,OffsetDateTime exportedAt,List<SupplierResponse> suppliers,List<CutResponse> cuts,List<SettlementResponse> settlements){}
 public record AdminStatus(boolean rootUser,boolean userManagementEnabled,boolean accountAuthorized){}
 public record CreateUserRequest(@Pattern(regexp="(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$") String id,@NotBlank @Email @Size(max=320) String email,@NotBlank @Size(max=100) String name,@NotBlank @Size(min=12,max=128) String password){}
 public record CreateUserResponse(String id,String email,String status){}
 public record ResetUserPasswordRequest(@NotBlank @Email @Size(max=320) String email,@NotBlank @Size(min=12,max=128) String newPassword){}
 public record LoginRequest(@NotBlank @Email @Size(max=320) String email,@NotBlank @Size(max=128) String password){}
 public record RegisterRequest(@NotBlank @Email @Size(max=320) String email,@NotBlank @Size(max=100) String name,@NotBlank @Size(min=12,max=128) String password){}
 public record ChangePasswordRequest(@NotBlank @Size(max=128) String currentPassword,@NotBlank @Size(min=12,max=128) String newPassword){}
 public record AuthUserResponse(String id,String email,String name,boolean root){}
 public record LoginResponse(String accessToken,String tokenType,long expiresIn,AuthUserResponse user){}
}
