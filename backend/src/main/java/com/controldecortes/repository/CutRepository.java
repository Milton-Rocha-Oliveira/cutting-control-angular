package com.controldecortes.repository;
import com.controldecortes.domain.*; import jakarta.persistence.LockModeType; import org.springframework.data.jpa.repository.*; import org.springframework.data.repository.query.Param; import java.util.*;
public interface CutRepository extends JpaRepository<Cut,Long>{
 @Query("select c from Cut c where c.supplier.ownerId=:owner order by c.productionDate desc,c.cutNumber asc") List<Cut> findAllForOwner(@Param("owner") String owner);
 @Query("select c from Cut c where c.supplier.id=:supplierId and c.supplier.ownerId=:owner order by c.productionDate desc,c.cutNumber asc") List<Cut> findForOwnerAndSupplier(@Param("supplierId") Long supplierId,@Param("owner") String owner);
 @Query("select c from Cut c where c.supplier.id=:supplierId and c.supplier.ownerId=:owner and c.status=:status order by c.productionDate desc,c.cutNumber asc") List<Cut> findActiveForOwner(@Param("supplierId") Long supplierId,@Param("owner") String owner,@Param("status") ActiveStatus status);
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from Cut c join fetch c.supplier where c.id=:id") Optional<Cut> findByIdForUpdate(@Param("id") Long id);
 @Query("select count(c) from Cut c where c.status=:status and c.supplier.ownerId=:owner") long countByStatusAndOwner(@Param("status") ActiveStatus status,@Param("owner") String owner);
}
