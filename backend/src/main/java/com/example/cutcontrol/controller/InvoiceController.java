package com.example.cutcontrol.controller;

import com.example.cutcontrol.model.Invoice;
import com.example.cutcontrol.service.CutService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {
    private final CutService cutService;
    private final InvoiceRepository invoiceRepository;
    private final SupplierRepository supplierRepository;

    public InvoiceController(CutService cutService, InvoiceRepository invoiceRepository, SupplierRepository supplierRepository) {
        this.cutService = cutService;
        this.invoiceRepository = invoiceRepository;
        this.supplierRepository = supplierRepository;
    }

    @PostMapping("/create/{supplierId}")
    public ResponseEntity<?> createInvoice(@PathVariable Long supplierId, @RequestParam(required = false) String periodStart, @RequestParam(required = false) String periodEnd, @RequestParam(required = false) String createdBy) {
        OffsetDateTime ps = periodStart == null ? null : OffsetDateTime.parse(periodStart);
        OffsetDateTime pe = periodEnd == null ? null : OffsetDateTime.parse(periodEnd);
        // prefer authenticated user if present
        String user = createdBy;
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getName() != null && !auth.getName().isBlank()) {
                user = auth.getName();
            }
        } catch (Exception ignored) {}

        try {
            Invoice invoice = cutService.createInvoiceFromActiveCuts(supplierId, ps, pe, user);
            return ResponseEntity.ok(invoice);
        } catch (Exception ex) {
            return ResponseEntity.status(409).body(ex.getMessage());
        }
    }

    @GetMapping
    public List<Invoice> listAll() { return invoiceRepository.findAll(); }

    @GetMapping("/supplier/{supplierId}")
    public ResponseEntity<?> listBySupplier(@PathVariable Long supplierId) {
        Supplier s = supplierRepository.findById(supplierId).orElse(null);
        if (s == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(invoiceRepository.findBySupplier(s));
    }

    @GetMapping("/period")
    public List<Invoice> listByPeriod(@RequestParam String start, @RequestParam String end) {
        OffsetDateTime ps = OffsetDateTime.parse(start);
        OffsetDateTime pe = OffsetDateTime.parse(end);
        return invoiceRepository.findBySettlementDateBetween(ps, pe);
    }
}
