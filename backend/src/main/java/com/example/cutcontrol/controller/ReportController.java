package com.example.cutcontrol.controller;

import com.example.cutcontrol.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final ReportService reportService;

    public ReportController(ReportService reportService) { this.reportService = reportService; }

    @GetMapping("/monthly")
    public ResponseEntity<?> monthly(@RequestParam int year, @RequestParam int month) {
        try {
            Map<String,Object> r = reportService.monthlyReport(year, month);
            return ResponseEntity.ok(r);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/annual")
    public ResponseEntity<?> annual(@RequestParam int year) {
        try {
            Map<String,Object> r = reportService.annualReport(year);
            return ResponseEntity.ok(r);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }
}
