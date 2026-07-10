package com.simplestore.catalog.repository;

import com.simplestore.catalog.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {
}
