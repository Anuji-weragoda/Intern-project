package com.staffmanagement.authservice.dto.request;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignRolesRequest {
    private Long userId;
    private List<String> roleNames; 
    private String assignedBy;
    private List<String> addRoles;
    private List<String> removeRoles;

}