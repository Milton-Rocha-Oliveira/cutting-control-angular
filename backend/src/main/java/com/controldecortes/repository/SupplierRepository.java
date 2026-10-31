package com.controldecortes.repository;
import com.controldecortes.domain.Supplier; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface SupplierRepository extends JpaRepository<Supplier,Long>{ List<Supplier> findAllByOwnerIdOrderByNameAsc(String ownerId); Optional<Supplier> findByIdAndOwnerId(Long id,String ownerId); boolean existsByDocument(String document); long countByOwnerId(String ownerId); }
