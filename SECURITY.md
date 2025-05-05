# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Route Radar seriously. If you have discovered a security vulnerability, we appreciate your help in disclosing it to us responsibly.

### Reporting Process

Please email security reports to: c0mpiler@ins8s.dev

Include as much of the following information as possible:
- Type of vulnerability
- Affected components
- Steps to reproduce the issue
- Potential impact
- Suggested fixes (if any)

### Response Time

- Initial response: Within 48 hours
- Status updates: Every 5 business days
- Resolution timeline: Varies based on severity

### Disclosure Policy

- Confirmed vulnerabilities will be patched as soon as possible
- Security updates will be released through regular channels
- Credit will be given to reporters unless anonymity is requested

## Security Best Practices

### For Users

1. Keep Route Radar updated to the latest version
2. Use HTTPS when deploying
3. Validate uploaded data files
4. Implement rate limiting on your server
5. Keep dependencies updated

### For Developers

1. Follow secure coding practices
2. Validate all input data
3. Use TypeScript for type safety
4. Implement proper error handling
5. Regular security audits

## Known Security Considerations

### Data Files

- All data files are public and should not contain sensitive information
- Files are validated before processing
- No server-side execution of uploaded data

### Client-Side Processing

- All calculations run in the browser
- No sensitive data is stored permanently
- Web Workers provide isolated execution

Thank you for helping keep Route Radar secure!
