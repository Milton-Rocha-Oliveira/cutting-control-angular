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

    public InvoiceController(CutService cutService) { this.cutService = cutService; }

    @PostMapping("/create/{supplierId}")
    public ResponseEntity<?> createInvoice(@PathVariable Long supplierId, @RequestParam(required = false) String periodStart, @RequestParam(required = false) String periodEnd, @RequestParam String createdBy) {
        OffsetDateTime ps = periodStart == null ? null : OffsetDateTime.parse(periodStart);
        OffsetDateTime pe = periodEnd == null ? null : OffsetDateTime.parse(periodEnd);
        try {
            Invoice invoice = cutService.createInvoiceFromActiveCuts(supplierId, ps, pe, createdBy);
            return ResponseEntity.ok(invoice);
        } catch (Exception ex) {
            return ResponseEntity.status(409).body(ex.getMessage());
        }
    }
}
