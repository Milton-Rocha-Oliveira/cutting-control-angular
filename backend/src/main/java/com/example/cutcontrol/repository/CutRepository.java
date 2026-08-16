package com.example.cutcontrol.repository;

import com.example.cutcontrol.model.Cut;
import com.example.cutcontrol.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CutRepository extends JpaRepository<Cut, Long> {
    List<Cut> findBySupplierAndActiveTrue(Supplier supplier);
    Optional<Cut> findBySupplierAndCutNumber(Supplier supplier, String cutNumber);
    List<Cut> findBySupplier(Supplier supplier);
}
