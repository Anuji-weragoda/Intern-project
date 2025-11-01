package com.staffmanagement.authservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignRolesRequest {
    private List<String> roleNames;
    // Optional incremental operations
    private List<String> addRoles;
    private List<String> removeRoles;

    public List<String> getAddRoles() { return addRoles; }
    public void setAddRoles(List<String> addRoles) { this.addRoles = addRoles; }
    public List<String> getRemoveRoles() { return removeRoles; }
    public void setRemoveRoles(List<String> removeRoles) { this.removeRoles = removeRoles; }
}