package com.example.cutcontrol.repository;

import com.example.cutcontrol.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
}
