# QA Studio REST API

All endpoints are under `/api/v1`.  
Authenticate with: `Authorization: Bearer <QA_STUDIO_API_KEY>`

---

## Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects` | List all projects |

---

## Folders

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/:key/folders` | List folders |
| POST | `/api/v1/projects/:key/folders` | Create folder — body: `{ name, parentFolderName? }` |

---

## Test Cases

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/:key/cases` | List cases — query: `?folder=<name>` |
| POST | `/api/v1/projects/:key/cases` | Create case — body: `{ title, description?, expectedResult?, priority?, folderName?, tags? }` |
| GET | `/api/v1/projects/:key/cases/:caseId` | Get single case |
| PATCH | `/api/v1/projects/:key/cases/:caseId` | Update case — body: any subset of create fields |
| DELETE | `/api/v1/projects/:key/cases/:caseId` | Delete case |

---

## Test Runs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/:key/runs` | List runs |
| POST | `/api/v1/projects/:key/runs` | Create run — body: `{ name, description?, assignedTester?, caseIds?, folderNames? }` |
| GET | `/api/v1/runs/:runId` | Get run with all case results |
| PATCH | `/api/v1/runs/:runId` | Update run status — body: `{ status: "InProgress" \| "Completed" }` |
| POST | `/api/v1/runs/:runId/results` | Bulk submit results — body: `{ results: [{ id?, title?, status, actualResult? }] }` |

Valid statuses: `Passed`, `Failed`, `Blocked`, `Skipped`, `Untested`

---

## Defects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/:key/defects` | List defects — query: `?status=Open` |
| POST | `/api/v1/projects/:key/defects` | Create defect — body: `{ title, description?, stepsToReproduce?, expectedResult?, actualResult?, severity?, priority? }` |

---

## MCP Server

Run locally with:
```
npx tsx scripts/mcp-server.ts
```

Add to `~/.claude/mcp.json`:
```json
{
  "mcpServers": {
    "qa-studio": {
      "command": "npx",
      "args": ["tsx", "/path/to/qa-studio/scripts/mcp-server.ts"],
      "env": {
        "TURSO_DATABASE_URL": "libsql://...",
        "TURSO_AUTH_TOKEN": "..."
      }
    }
  }
}
```

### Available MCP tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects |
| `get_project` | Get project details by key |
| `list_folders` | List folders in a project |
| `list_cases` | List cases, optionally filtered by folder |
| `get_case` | Get full case details by ID |
| `create_case` | Create a new test case |
| `update_case` | Update an existing test case |
| `delete_case` | Delete a test case |
| `list_runs` | List runs in a project |
| `get_run` | Get run details with all case results |
| `create_run` | Create a new run (scoped by folder or case IDs) |
| `complete_run` | Mark a run as Completed |
| `reopen_run` | Reopen a Completed run |
| `submit_results` | Bulk-submit test results for a run |
| `list_defects` | List defects in a project |
| `create_defect` | File a new defect |
