# services/

Application-level (cross-cutting, infrastructure) services for the API.

Per the platform DNA, **domain business logic lives inside each business module's
own `services/` folder** (alongside its routes, repositories, and domain models),
not here. This top-level directory is reserved for cross-cutting application
services that are not owned by a single domain.

No services are implemented in the backend bootstrap phase. This directory is
part of the prescribed foundation structure and is populated as needed in later
phases.

See `docs/dna/03-backend.md`.
