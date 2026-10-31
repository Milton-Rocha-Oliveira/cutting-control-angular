package com.controldecortes.repository;
import com.controldecortes.domain.Settlement; import org.springframework.data.jpa.repository.JpaRepository; import java.time.OffsetDateTime; import java.util.*;
public interface SettlementRepository extends JpaRepository<Settlement,Long>{ List<Settlement> findTop50BySupplierOwnerIdOrderBySettledAtDesc(String owner); List<Settlement> findBySupplierOwnerIdAndSettledAtBetweenOrderBySettledAtDesc(String owner,OffsetDateTime from,OffsetDateTime to); long countBySupplierOwnerIdAndSettledAtBetween(String owner,OffsetDateTime from,OffsetDateTime to); }
