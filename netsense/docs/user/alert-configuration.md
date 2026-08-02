# Alert Configuration

## Offline Fallback

When the platform connection drops, configure the probe to use the local SMTP relay first. If the site has a USB GSM modem installed, enable SMS fallback so critical alerts still leave the site even when the WAN link is down.

## Notes

- SMTP-only fallback is not sufficient on isolated sites without internet access.
- GSM fallback should be treated as the out-of-band path for critical incidents.
