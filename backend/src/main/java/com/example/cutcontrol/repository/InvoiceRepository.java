package com.example.cutcontrol.repository;

import com.example.cutcontrol.model.Invoice;
import com.example.cutcontrol.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
	List<Invoice> findBySupplier(Supplier supplier);
	List<Invoice> findBySettlementDateBetween(OffsetDateTime start, OffsetDateTime end);
}
