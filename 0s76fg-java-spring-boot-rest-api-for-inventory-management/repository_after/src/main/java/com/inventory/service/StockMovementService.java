package com.inventory.service;

import com.inventory.dto.StockMovementDto;
import com.inventory.mapper.StockMovementMapper;
import com.inventory.model.StockMovement;
import com.inventory.repository.StockMovementRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class StockMovementService {

    private final StockMovementRepository stockMovementRepository;
    private final StockMovementMapper stockMovementMapper;

    public StockMovementService(StockMovementRepository stockMovementRepository, StockMovementMapper stockMovementMapper) {
        this.stockMovementRepository = stockMovementRepository;
        this.stockMovementMapper = stockMovementMapper;
    }

    @Transactional(readOnly = true)
    public Page<StockMovementDto> getMovements(LocalDate startDate, LocalDate endDate, Long productId, Long locationId, StockMovement.Type type, Pageable pageable) {
        Specification<StockMovement> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (startDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("performedAt"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("performedAt"), endDate.atTime(23, 59, 59)));
            }
            if (productId != null) {
                predicates.add(criteriaBuilder.equal(root.get("product").get("id"), productId));
            }
            if (locationId != null) {
                Predicate fromLoc = criteriaBuilder.equal(root.get("fromLocation").get("id"), locationId);
                Predicate toLoc = criteriaBuilder.equal(root.get("toLocation").get("id"), locationId);
                predicates.add(criteriaBuilder.or(fromLoc, toLoc));
            }
            if (type != null) {
                predicates.add(criteriaBuilder.equal(root.get("type"), type));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        return stockMovementRepository.findAll(spec, pageable).map(stockMovementMapper::toDto);
    }
}
