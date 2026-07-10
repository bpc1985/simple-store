package com.simplestore.identity.repository;

import com.simplestore.identity.model.ApplicationUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<ApplicationUser, String> {

    Optional<ApplicationUser> findByEmail(String email);
}
