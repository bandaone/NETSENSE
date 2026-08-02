# Testing Plan

This test plan describes the objectives, scope, levels, and environment for NetSense testing.

## Objectives

- Validate core capture and normalisation functionality.
- Ensure baseline and anomaly detection behave correctly.
- Verify topology discovery and incident workflows.
- Confirm security controls for PCAPs and role-based access.

## Test Levels

- **Unit:** Fast isolated tests for probe, platform, and frontend components.
- **Integration:** Combined component tests across probe, platform, and database.
- **E2E:** Full workflow validation from capture through dashboard and incident resolution.

## Environment

- Docker-based staging stack for platform services.
- Simulated capture traffic for probe tests.
- Browser-based UI automation for dashboard workflows.

## Coverage

- Add test cases for each major feature area.
- Maintain traceability from requirements to tests.
- Enforce coverage thresholds in CI.

