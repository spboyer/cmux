# Configuration

cmux uses environment variables for feature flags and configuration.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VP_AUTO_COPILOT` | unset | When set (e.g. `1`), new workspaces auto-run the `copilot` command on creation. When unset, workspaces open as plain shells. |
| `VP_ALLOW_MULTI` | unset | When set, allows multiple cmux instances to run simultaneously. By default, only one instance is allowed. |

## Setting Environment Variables

### PowerShell (Windows)

```powershell
$env:VP_AUTO_COPILOT=1; npm start
```

### Bash / Zsh (macOS / Linux)

```bash
VP_AUTO_COPILOT=1 npm start
```

## Authentication & Global Dependencies

cmux requires the Copilot CLI and SDK:

```bash
npm install -g @github/copilot @github/copilot-sdk
```

On first launch, use the `/login` command in the Copilot CLI to authenticate with your GitHub account. Alternatively, set `GH_TOKEN` or `GITHUB_TOKEN` environment variables with a personal access token.
