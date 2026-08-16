package com.example.cutcontrol.controller;

import com.example.cutcontrol.model.Cut;
import com.example.cutcontrol.model.Supplier;
import com.example.cutcontrol.repository.CutRepository;
import com.example.cutcontrol.repository.SupplierRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/cuts")
public class CutController {
    private final CutRepository cutRepository;
    private final SupplierRepository supplierRepository;

    public CutController(CutRepository cutRepository, SupplierRepository supplierRepository) {
        this.cutRepository = cutRepository;
        this.supplierRepository = supplierRepository;
    }

    @GetMapping("/supplier/{supplierId}")
    public List<Cut> listBySupplier(@PathVariable Long supplierId) {
        var supplier = supplierRepository.findById(supplierId).orElseThrow();
        return cutRepository.findBySupplier(supplier);
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody Cut cut) {
        // validate supplier exists
        if (cut.getSupplier() == null || cut.getSupplier().getId() == null) return ResponseEntity.badRequest().body("Fornecedor obrigatório");
        Supplier s = supplierRepository.findById(cut.getSupplier().getId()).orElseThrow();
        // prevent duplicate cut number for same supplier
        var existing = cutRepository.findBySupplierAndCutNumber(s, cut.getCutNumber());
        if (existing.isPresent()) return ResponseEntity.badRequest().body("Número de corte duplicado para este fornecedor");
        cut.setSupplier(s);
        if (cut.getProductionDate() == null) cut.setProductionDate(OffsetDateTime.now());
        var saved = cutRepository.save(cut);
        return ResponseEntity.created(URI.create("/api/cuts/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody Cut in) {
        return cutRepository.findById(id).map(existing -> {
            if (!existing.getActive()) return ResponseEntity.status(409).body("Corte inativo e não pode ser editado");
            existing.setPackages(in.getPackages());
            existing.setPiecesPerPackage(in.getPiecesPerPackage());
            existing.setPiecePrice(in.getPiecePrice());
            existing.setProductionDate(in.getProductionDate());
            existing.setCutNumber(in.getCutNumber());
            var saved = cutRepository.save(existing);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
