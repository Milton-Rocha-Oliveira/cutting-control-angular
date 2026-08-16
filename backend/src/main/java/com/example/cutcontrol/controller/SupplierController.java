package com.example.cutcontrol.controller;

import com.example.cutcontrol.model.Supplier;
import com.example.cutcontrol.repository.SupplierRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {
    private final SupplierRepository repository;

    public SupplierController(SupplierRepository repository) { this.repository = repository; }

    @GetMapping
    public List<Supplier> list() { return repository.findAll(); }

    @PostMapping
    public ResponseEntity<Supplier> create(@Valid @RequestBody Supplier supplier) {
        var saved = repository.save(supplier);
        return ResponseEntity.created(URI.create("/api/suppliers/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Supplier> update(@PathVariable Long id, @Valid @RequestBody Supplier in) {
        return repository.findById(id).map(s -> {
            s.setName(in.getName());
            var saved = repository.save(s);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
