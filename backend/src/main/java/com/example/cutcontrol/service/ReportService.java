package com.example.cutcontrol.service;

import com.example.cutcontrol.model.Invoice;
import com.example.cutcontrol.model.Supplier;
import com.example.cutcontrol.repository.InvoiceRepository;
import com.example.cutcontrol.repository.SupplierRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportService {
    private final InvoiceRepository invoiceRepository;
    private final SupplierRepository supplierRepository;

    public ReportService(InvoiceRepository invoiceRepository, SupplierRepository supplierRepository) {
        this.invoiceRepository = invoiceRepository;
        this.supplierRepository = supplierRepository;
    }

    public Map<String, Object> monthlyReport(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        OffsetDateTime start = ym.atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = ym.atEndOfMonth().atTime(23,59,59).atOffset(ZoneOffset.UTC);

        List<Invoice> invoices = invoiceRepository.findBySettlementDateBetween(start, end);
        Map<Long, Supplier> suppliers = supplierRepository.findAll().stream().collect(Collectors.toMap(Supplier::getId, s->s));

        int totalPieces = invoices.stream().mapToInt(inv -> inv.getTotalPieces() == null ? 0 : inv.getTotalPieces()).sum();
        BigDecimal totalValue = invoices.stream().map(inv -> inv.getTotalValue() == null ? BigDecimal.ZERO : inv.getTotalValue()).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String,Object> result = new LinkedHashMap<>();
        result.put("year", year);
        result.put("month", month);
        result.put("totalPieces", totalPieces);
        result.put("totalValue", totalValue);

        // detail by supplier
        Map<String, Map<String, Object>> bySupplier = new LinkedHashMap<>();
        for (Invoice inv : invoices) {
            Supplier s = inv.getSupplier();
            if (s == null) continue;
            var key = s.getId().toString();
            var entry = bySupplier.computeIfAbsent(key, k -> { Map<String,Object> m = new LinkedHashMap<>(); m.put("supplierId", s.getId()); m.put("supplierName", s.getName()); m.put("totalPieces", 0); m.put("totalValue", BigDecimal.ZERO); return m; });
            int pieces = inv.getTotalPieces() == null ? 0 : inv.getTotalPieces();
            BigDecimal value = inv.getTotalValue() == null ? BigDecimal.ZERO : inv.getTotalValue();
            entry.put("totalPieces", (int)entry.get("totalPieces") + pieces);
            entry.put("totalValue", ((BigDecimal)entry.get("totalValue")).add(value));
        }
        result.put("bySupplier", bySupplier.values());
        return result;
    }

    public Map<String,Object> annualReport(int year) {
        OffsetDateTime start = YearMonth.of(year,1).atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = YearMonth.of(year,12).atEndOfMonth().atTime(23,59,59).atOffset(ZoneOffset.UTC);
        List<Invoice> invoices = invoiceRepository.findBySettlementDateBetween(start, end);

        int totalPieces = invoices.stream().mapToInt(inv -> inv.getTotalPieces() == null ? 0 : inv.getTotalPieces()).sum();
        BigDecimal totalValue = invoices.stream().map(inv -> inv.getTotalValue() == null ? BigDecimal.ZERO : inv.getTotalValue()).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<Long, BigDecimal> bySupplierValue = new HashMap<>();
        Map<Long, Integer> bySupplierPieces = new HashMap<>();
        for (Invoice inv: invoices) {
            if (inv.getSupplier() == null) continue;
            long id = inv.getSupplier().getId();
            bySupplierValue.put(id, bySupplierValue.getOrDefault(id, BigDecimal.ZERO).add(inv.getTotalValue() == null ? BigDecimal.ZERO : inv.getTotalValue()));
            bySupplierPieces.put(id, bySupplierPieces.getOrDefault(id,0) + (inv.getTotalPieces()==null?0:inv.getTotalPieces()));
        }

        // monthly averages for full year
        BigDecimal avgPieces = BigDecimal.valueOf(totalPieces).divide(BigDecimal.valueOf(12), 2, BigDecimal.ROUND_HALF_UP);
        BigDecimal avgValue = totalValue.divide(BigDecimal.valueOf(12), 2, BigDecimal.ROUND_HALF_UP);

        // ranking suppliers by value
        List<Map<String,Object>> ranking = bySupplierValue.entrySet().stream()
                .sorted((a,b)-> ((BigDecimal)b.getValue()).compareTo(a.getValue()))
                .map(e->{
                    Map<String,Object> m=new LinkedHashMap<>();
                    Long id=e.getKey();
                    m.put("supplierId", id);
                    m.put("totalValue", e.getValue());
                    m.put("totalPieces", bySupplierPieces.getOrDefault(id,0));
                    return m;
                }).collect(Collectors.toList());

        Map<String,Object> result = new LinkedHashMap<>();
        result.put("year", year);
        result.put("totalPieces", totalPieces);
        result.put("totalValue", totalValue);
        result.put("avgMonthlyPieces", avgPieces);
        result.put("avgMonthlyValue", avgValue);
        result.put("ranking", ranking);
        return result;
    }
}
