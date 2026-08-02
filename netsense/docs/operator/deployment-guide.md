# Deployment Guide

## Disconnected Sites

Mining and other remote sites should assume the cloud link may disappear. The probe must continue local capture, collection, normalisation, alert evaluation, and incident buffering while offline.

## Multi-Tenant SaaS

For Model 4 deployments, enable PostgreSQL and TimescaleDB Row-Level Security on every table that contains `tenant_id`, and ensure the FastAPI layer sets the tenant session variable before querying.
