package com.example.users;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/users")
public class UserBatchController {

    @PostMapping("/process")
    public Map<String, Object> process(@RequestBody List<User> users) {
        List<String> processed = new ArrayList<>();

        for (User user : users) {
            if (user.getEmail() == null || !user.getEmail().contains("@")) {
                throw new IllegalArgumentException("Invalid email: " + user.getEmail());
            }

            processed.add(user.getId());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("processedCount", processed.size());
        response.put("processedIds", processed);
        return response;
    }

    static class User {
        private String id;
        private String email;

        public String getId() {
            return id;
        }

        public String getEmail() {
            return email;
        }
    }
}
