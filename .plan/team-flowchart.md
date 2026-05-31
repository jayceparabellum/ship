# Agent Team Flowchart

This flowchart shows how the ShipShape agent team should work after adding the Six Sigma quality layer. Jayce remains the human gate for product/demo changes, final submission actions, and any proposal that changes scope.

```mermaid
flowchart TD
    A["Jayce<br/>Human Gate / Product Owner"] -->|approves scope, proposals, final actions| B["Mission Supervisor<br/>CTQ Alignment"]

    B --> C["Rubric Supervisor<br/>Defect Accounting"]
    B --> D["Product Demo Supervisor<br/>PRESENTATION.md Contract"]
    B --> E["Quality Supervisor<br/>Verification and Control"]

    C --> F["Audit Orchestrator<br/>DMAIC for 7 Categories"]
    D --> G["Demo Orchestrator<br/>DMAIC for Product Flows"]
    E --> H["Implementation Orchestrator<br/>Approved Fixes Only"]
    E --> I["Evidence Orchestrator<br/>Raw Proof and Repro Commands"]
    H --> J["Compound Engineering Orchestrator<br/>Plan -> Work -> Review -> Compound"]

    F --> K["Baseline Measurement Worker<br/>Before Evidence from 076a1837"]
    F --> L["Current-State Verification Worker<br/>Validate Existing Claims"]

    H --> M["TypeScript Worker<br/>Category 1"]
    H --> N["Frontend Performance Worker<br/>Category 2"]
    H --> O["API Performance Worker<br/>Category 3"]
    H --> P["Database Worker<br/>Category 4"]
    H --> Q["Test Reliability Worker<br/>Category 5"]
    H --> R["Runtime Reliability Worker<br/>Category 6"]
    H --> S["Accessibility Worker<br/>Category 7"]

    G --> T["Demo Feature Worker<br/>Programs, Planning, Standups, Reviews, Retros"]
    G --> U["Browser QA Worker<br/>gstack Evidence and Screenshots"]

    I --> V["Documentation Worker<br/>Audit, Improvement Docs, Evidence Index"]
    I --> W["Release Readiness Worker<br/>Final Rubric Review"]
    J --> X["Compound Learning Worker<br/>Controls and Reusable Learnings"]

    T --> Y{"New Product/Demo Update?"}
    M --> Y
    N --> Y
    O --> Y
    P --> Y
    Q --> Y
    R --> Y
    S --> Y

    Y -->|yes| Z["Proposal in .plan/proposals<br/>Problem, Evidence, Risk, Verification, Rollback"]
    Z --> A
    A -->|approved| H
    A -->|rejected/deferred| AA["Backlog or Revise Proposal"]

    U --> I
    K --> I
    L --> I
    V --> W
    X --> B

    W --> AB{"Final Gate"}
    AB -->|pass| AC["Submission-Ready Package"]
    AB -->|risk found| C
```

## How To Edit The Team

Good edit points:

- Add a new worker under the relevant orchestrator.
- Split a worker if the file surface is too broad.
- Add a supervisor only when it owns a distinct failure mode.
- Remove roles that are not tied to a CTQ, defect class, or verification need.

Keep Jayce as the final human gate for proposed product/demo changes.
