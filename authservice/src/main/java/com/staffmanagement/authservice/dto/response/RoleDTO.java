package com.staffmanagement.authservice.dto.response;

import lombok.Data;

@Data
public class RoleDTO {
    private Long id;
    private String roleName;
    private String description;
}
