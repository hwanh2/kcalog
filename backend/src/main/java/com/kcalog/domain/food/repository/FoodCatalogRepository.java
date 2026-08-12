package com.kcalog.domain.food.repository;

import com.kcalog.domain.food.entity.FoodCatalog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FoodCatalogRepository extends JpaRepository<FoodCatalog, Long> {

    List<FoodCatalog> findAllByOrderBySortOrderAsc();
}
