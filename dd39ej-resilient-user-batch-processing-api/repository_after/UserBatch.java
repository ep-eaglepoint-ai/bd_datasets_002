package com.example.users;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/users")
public class UserBatchController {

    @PostMapping("/process")
    public Map<String, Object> process(@RequestBody List<User> users) {
        List<String> processedIds = new ArrayList<>();
        List<Map<String, String>> invalidUsers = new ArrayList<>();
        List<String> reportedInvalidIds = new ArrayList<>();

        for (int i = 0; i < users.size(); i++) {
            User user = users.get(i);
            
            ValidationResult validation = validateUser(user);
            
            if (validation.isValid()) {
                processedIds.add(user.getId());
            } else {
                boolean alreadyReported = false;
                String userId = user.getId();
                
                if (userId != null && !userId.isEmpty()) {
                    for (int j = 0; j < reportedInvalidIds.size(); j++) {
                        if (reportedInvalidIds.get(j).equals(userId)) {
                            alreadyReported = true;
                            break;
                        }
                    }
                }
                
                if (!alreadyReported) {
                    Map<String, String> invalidEntry = new LinkedHashMap<>();
                    invalidEntry.put("id", userId);
                    invalidEntry.put("email", user.getEmail());
                    invalidEntry.put("reason", validation.getReason());
                    invalidUsers.add(invalidEntry);
                    
                    if (userId != null && !userId.isEmpty()) {
                        reportedInvalidIds.add(userId);
                    }
                }
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("processedCount", processedIds.size());
        response.put("processedIds", processedIds);
        response.put("invalidCount", invalidUsers.size());
        response.put("invalidUsers", invalidUsers);
        return response;
    }
    
    private ValidationResult validateUser(User user) {
        if (user.getId() == null || user.getId().trim().isEmpty()) {
            return new ValidationResult(false, "null or empty id");
        }
        
        if (user.getEmail() == null || !user.getEmail().contains("@")) {
            return new ValidationResult(false, "invalid email");
        }
        
        return new ValidationResult(true, null);
    }

    private static class ValidationResult {
        private final boolean valid;
        private final String reason;
        
        public ValidationResult(boolean valid, String reason) {
            this.valid = valid;
            this.reason = reason;
        }
        
        public boolean isValid() {
            return valid;
        }
        
        public String getReason() {
            return reason;
        }
    }

    public static class User {
        private String id;
        private String email;

        public User() {}

        public User(String id, String email) {
            this.id = id;
            this.email = email;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }
}