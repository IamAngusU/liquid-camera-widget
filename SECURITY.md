# Security

## Supported version

The latest release on the `main` branch receives security fixes.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not
open a public issue containing camera, network, or privacy-sensitive details.

## Security properties

- The desktop renderer runs with context isolation, sandboxing, and no Node.js
  integration.
- The iPhone requests video only; audio capture is disabled.
- WebRTC media is encrypted in transit.
- No TURN relay is configured by default, so media is not relayed by this
  project.
- Signalling metadata must never contain credentials or personal data.
