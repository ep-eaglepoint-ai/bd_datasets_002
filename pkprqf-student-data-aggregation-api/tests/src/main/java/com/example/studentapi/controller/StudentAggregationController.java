package com.example.studentapi.controller;

import com.example.studentapi.dto.AggregationResult;
import com.example.studentapi.dto.Student;
import com.example.studentapi.service.StudentAggregationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/students")
public class StudentAggregationController {
    
    private final StudentAggregationService aggregationService;
    
    public StudentAggregationController(StudentAggregationService aggregationService) {
        this.aggregationService = aggregationService;
    }
    
    @PostMapping("/aggregate")
    public ResponseEntity<?> aggregateStudents(@Valid @RequestBody List<Student> students, 
                                               BindingResult bindingResult) {
        
        if (bindingResult.hasErrors()) {
            Map<String, Object> errorResponse = createValidationErrorResponse(bindingResult);
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        if (students == null) {
            Map<String, Object> errorResponse = Map.of("error", "Students list cannot be null");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        try {
            AggregationResult result = aggregationService.aggregateStudents(students);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> errorResponse = Map.of("error", "Internal server error occurred");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    private Map<String, Object> createValidationErrorResponse(BindingResult bindingResult) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Validation failed");
        
        List<String> validationErrors = bindingResult.getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.toList());
        
        errorResponse.put("validationErrors", validationErrors);
        return errorResponse;
    }
}