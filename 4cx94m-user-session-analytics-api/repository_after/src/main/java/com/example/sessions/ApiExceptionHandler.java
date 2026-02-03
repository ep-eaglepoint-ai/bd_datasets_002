package com.example.sessions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import javax.validation.ConstraintViolationException;
import java.util.*;

@ControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public ApiError handleConstraintViolation(ConstraintViolationException ex) {
        List<String> errors = new ArrayList<>();
        ex.getConstraintViolations().forEach(v -> errors.add(v.getPropertyPath().toString() + " " + v.getMessage()));
        Collections.sort(errors);
        return new ApiError("error", errors);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public ApiError handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        List<String> errors = new ArrayList<>();
        ex.getBindingResult().getFieldErrors().forEach(e -> errors.add(e.getField() + " " + e.getDefaultMessage()));
        Collections.sort(errors);
        return new ApiError("error", errors);
    }

    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ResponseBody
    public ApiError handleBindException(BindException ex) {
        List<String> errors = new ArrayList<>();
        for (FieldError e : ex.getFieldErrors()) {
            errors.add(e.getField() + " " + e.getDefaultMessage());
        }
        Collections.sort(errors);
        return new ApiError("error", errors);
    }
}
