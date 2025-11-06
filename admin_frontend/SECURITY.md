# Security Configuration Guide

This document addresses the security findings from OWASP ZAP scans and provides guidance for secure deployment.

## ZAP Security Findings

### Summary
The following alerts were identified in ZAP scans on the development environment:
- Content Security Policy (CSP) Header Not Set (2)
- Hidden File Found (4)
- Missing Anti-clickjacking Header (1)
- X-Content-Type-Options Header Missing (1)

### Development vs Production

#### Development Environment (Vite Dev Server)
**Status**: Findings are EXPECTED and ACCEPTABLE

The Vite development server (`npm run dev`):
- Returns `index.html` (200 OK) for all unknown paths for SPA routing
- Does not include security headers by default
- Prioritizes developer convenience and hot-reload functionality
- Should NEVER be exposed to the internet

**Action Required**: None - this is normal development behavior.

#### Production Environment
**Status**: Security headers and file protection REQUIRED

All ZAP findings must be addressed in production deployment:

1. **Security Headers** - See `nginx-production.conf` for complete configuration
2. **File Protection** - Sensitive files must be excluded from builds
3. **Proper 404 Responses** - Return actual 404s for non-existent resources

## Security Checklist for Production

### 1. Security Headers (nginx-production.conf)

✅ **Content-Security-Policy**
- Restricts resource loading to prevent XSS attacks
- Customize `script-src`, `style-src`, `connect-src` based on your requirements

✅ **X-Frame-Options: DENY**
- Prevents clickjacking attacks
- Blocks your site from being embedded in iframes

✅ **X-Content-Type-Options: nosniff**
- Prevents MIME-sniffing attacks
- Forces browsers to respect declared content types

✅ **X-XSS-Protection: 1; mode=block**
- Legacy XSS protection for older browsers

✅ **Referrer-Policy: strict-origin-when-cross-origin**
- Controls referrer information sent to other sites

✅ **Strict-Transport-Security** (when using HTTPS)
- Forces browsers to use HTTPS only
- Enable after SSL certificate is configured

### 2. File Protection

#### Build Configuration
Verify `.gitignore` excludes sensitive files:
```
.env
.env.local
.env.production
*.key
*.pem
id_rsa
id_dsa
config/*.local.yml
```

#### Nginx Configuration
The production nginx config blocks:
- Hidden files/directories: `location ~ /\.`
- Version control: `.git`, `.svn`, `.hg`, `.bzr`, `_darcs`, `BitKeeper`, `CVS`
- Config files: `.env`, `.ini`, `.conf`, `.config`
- SSH keys: `id_rsa`, `id_dsa`, `*.key`, `*.pem`

#### Verification Steps
Before deploying to production:
1. Build the production bundle: `npm run build`
2. Verify build output in `dist/` directory
3. Confirm no sensitive files in `dist/`:
   ```powershell
   # Check for common sensitive patterns
   Get-ChildItem -Path dist -Recurse -Force | Where-Object { $_.Name -match '\.(env|key|pem|ini)$' }
   ```

### 3. CSP Configuration

The default CSP in `nginx-production.conf` includes:

```nginx
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://cognito-idp.*.amazonaws.com; 
  style-src 'self' 'unsafe-inline'; 
  connect-src 'self' https://*.amazonaws.com https://api.mailslurp.com;
  frame-ancestors 'none';
```

**Customize based on your requirements:**
- Add CDN domains to `script-src` or `style-src` if using external resources
- Add analytics/monitoring domains to `connect-src`
- Test thoroughly after deployment to catch CSP violations

### 4. HTTPS Configuration (Recommended)

For production, use HTTPS with Let's Encrypt or commercial SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Enable HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # ... rest of config from nginx-production.conf
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Deployment Verification

After deploying to production, verify security:

### 1. Test Security Headers
```powershell
curl -I https://your-domain.com
```

Expected headers in response:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`

### 2. Test File Protection
```powershell
# Should return 404 or 403
curl -I https://your-domain.com/.env
curl -I https://your-domain.com/.git/config
curl -I https://your-domain.com/server.key
```

### 3. Run ZAP Scan Against Production
```powershell
# Re-run ZAP against production URL (not localhost:5173)
# All previous alerts should be resolved
```

### 4. Use SecurityHeaders.com
Visit https://securityheaders.com and scan your production domain for a comprehensive security grade.

## Backend Security (Auth Service - Port 8081)

The auth service also needs security headers. For Spring Boot applications, add:

**application.yml:**
```yaml
server:
  port: 8081
  servlet:
    context-path: /api

spring:
  security:
    headers:
      content-security-policy: "default-src 'self'"
      frame-options: DENY
      content-type-options: nosniff
      xss-protection: 1; mode=block
```

Or use Spring Security configuration:
```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.headers()
            .contentSecurityPolicy("default-src 'self'")
            .and()
            .frameOptions().deny()
            .and()
            .contentTypeOptions()
            .and()
            .xssProtection().block(true);
    }
}
```

## Continuous Security

- **Regular Scans**: Run ZAP or similar tools in CI/CD pipeline
- **Dependency Updates**: Keep packages updated (`npm audit`, `dependabot`)
- **Security Reviews**: Review CSP violations in browser console
- **Monitoring**: Log and monitor security header violations

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [SecurityHeaders.com](https://securityheaders.com)
- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
