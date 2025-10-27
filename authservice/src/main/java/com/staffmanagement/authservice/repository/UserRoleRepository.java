package com.staffmanagement.authservice.repository;

import com.staffmanagement.authservice.entity.AppUser;
import com.staffmanagement.authservice.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.staffmanagement.authservice.entity.Role;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    List<UserRole> findByUserId(Long userId);

    Optional<UserRole> findByUserIdAndRoleId(Long userId, Long roleId);

    void deleteByUserIdAndRoleId(Long userId, Long roleId);
    void deleteAllByUser(AppUser user);
    Optional<UserRole> findByUserAndRole(AppUser user, Role role);
    List<UserRole> findByUser(AppUser user);
}
