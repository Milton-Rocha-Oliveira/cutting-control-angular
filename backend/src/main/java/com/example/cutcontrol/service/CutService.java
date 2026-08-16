package com.example.cutcontrol.service;

import com.example.cutcontrol.model.Cut;
import com.example.cutcontrol.model.Invoice;
import com.example.cutcontrol.model.SettlementItem;
import com.example.cutcontrol.model.Supplier;
import com.example.cutcontrol.repository.CutRepository;
import com.example.cutcontrol.repository.InvoiceRepository;
import com.example.cutcontrol.repository.SupplierRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CutService {
    private final CutRepository cutRepository;
    private final SupplierRepository supplierRepository;
    private final InvoiceRepository invoiceRepository;

    public CutService(CutRepository cutRepository, SupplierRepository supplierRepository, InvoiceRepository invoiceRepository) {
        this.cutRepository = cutRepository;
        this.supplierRepository = supplierRepository;
        this.invoiceRepository = invoiceRepository;
    }

    public List<Cut> listActiveCutsBySupplier(Long supplierId) {
        Supplier s = supplierRepository.findById(supplierId).orElseThrow();
        return cutRepository.findBySupplierAndActiveTrue(s);
    }

    @Transactional
    public Invoice createInvoiceFromActiveCuts(Long supplierId, OffsetDateTime periodStart, OffsetDateTime periodEnd, String createdBy) {
        Supplier supplier = supplierRepository.findById(supplierId).orElseThrow();
        List<Cut> active = cutRepository.findBySupplierAndActiveTrue(supplier);
        if (active.isEmpty()) throw new IllegalStateException("Nenhum corte ativo encontrado para faturamento");

        Invoice invoice = new Invoice();
        invoice.setSupplier(supplier);
        invoice.setPeriodStart(periodStart);
        invoice.setPeriodEnd(periodEnd);
        invoice.setCreatedBy(createdBy);

        int totalPieces = 0;
        BigDecimal totalValue = BigDecimal.ZERO;

        for (Cut c : active) {
            if (!c.getActive()) continue;
            SettlementItem item = new SettlementItem();
            item.setCut(c);
            item.setPieces(c.getTotalPieces());
            item.setValue(c.getTotalValue());
            invoice.addItem(item);

            totalPieces += c.getTotalPieces();
            totalValue = totalValue.add(c.getTotalValue());

            c.setActive(false);
            c.setInvoicedAt(OffsetDateTime.now());
        }

        invoice.setTotalPieces(totalPieces);
        invoice.setTotalValue(totalValue);

        Invoice saved = invoiceRepository.save(invoice);
        cutRepository.saveAll(active);
        return saved;
    }
}
