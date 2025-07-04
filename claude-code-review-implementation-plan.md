# Claude Code Review Implementation Plan

## Overview

This document outlines the implementation plan for integrating Claude AI-powered code reviews into your GitHub workflow. Based on the Claude GitHub Actions documentation and your current repository setup, this plan will enable automated code reviews on new pull requests.

## Current Repository Analysis

### Existing Setup
- **Repository**: Rewind - Mobile-first PWA for podcast enthusiasts
- **Technology Stack**: React, TypeScript, AWS Serverless, Node.js
- **Current Workflow**: Deploy workflow with validation, build, test, and deployment
- **Available Commands**: 
  - `npm run lint` (ESLint)
  - `npm run test` (Jest/Vitest)
  - `npm run build` (TypeScript compilation)
  - `npm run format:check` (Prettier)

## Implementation Steps

### Phase 1: Basic Setup (30-60 minutes)

#### Step 1: Install Claude GitHub App
```bash
# Run this in your terminal where you have claude installed
claude /install-github-app
```
This command will:
- Guide you through installing the Claude GitHub App
- Set up the required `ANTHROPIC_API_KEY` secret
- Provide the necessary permissions

#### Step 2: Manual Setup (if CLI fails)
If the quick setup fails:
1. Install the Claude GitHub app: https://github.com/apps/claude
2. Add `ANTHROPIC_API_KEY` to repository secrets:
   - Go to Settings → Secrets and variables → Actions
   - Add new secret: `ANTHROPIC_API_KEY` with your API key

#### Step 3: Create CLAUDE.md Configuration
Create a `CLAUDE.md` file in the repository root to guide Claude's behavior:

```markdown
# Rewind Project Guidelines for Claude

## Project Overview
Mobile-first PWA for podcast enthusiasts aged 35+ to rediscover older episodes.

## Technology Stack
- Frontend: React Router v7, TypeScript, Tailwind CSS, Vite
- Backend: AWS Lambda, API Gateway, DynamoDB
- Infrastructure: AWS CDK
- Testing: Vitest, Playwright (E2E)

## Code Style and Standards
- Use TypeScript with strict type checking
- Follow existing ESLint and Prettier configurations
- Prefer functional components with hooks
- Use Tailwind CSS for styling
- Follow existing file structure and naming conventions

## Testing Requirements
- Unit tests required for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage

## Review Focus Areas
1. **Security**: No hardcoded secrets, proper input validation
2. **Performance**: Efficient algorithms, proper caching, bundle size
3. **Accessibility**: WCAG compliance, semantic HTML
4. **Error Handling**: Comprehensive error boundaries and API error handling
5. **Code Quality**: Clean, readable, maintainable code
6. **Testing**: Adequate test coverage and quality

## Commands
- Lint: `npm run lint`
- Test: `npm run test`
- Build: `npm run build`
- Format: `npm run format:check`

## Architecture Notes
- Mobile-first responsive design
- PWA features with offline capability
- AWS serverless backend
- Cognito authentication
- DynamoDB for data storage
```

### Phase 2: Create GitHub Actions Workflow (15-30 minutes)

#### Step 4: Create Claude Review Workflow
Create `.github/workflows/claude-review.yml`:

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  claude-review:
    # Only run on PRs or when @claude is mentioned
    if: |
      github.event_name == 'pull_request' ||
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude'))
    
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for better context

      - name: Claude Code Review
        uses: anthropics/claude-3-5-sonnet-20241022@v1
        with:
          trigger_phrase: "@claude"
          timeout_minutes: "10"
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          max_turns: 3
```

### Phase 3: Enhanced Configuration (30-45 minutes)

#### Step 5: Create Comprehensive Review Workflow
For more control, create a custom workflow with specific review triggers:

```yaml
name: Automated Code Review

on:
  pull_request:
    types: [opened, synchronize]
    branches: [main, develop]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  automated-review:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        id: lint
        run: |
          npm run lint 2>&1 | tee lint-output.txt || echo "lint-failed=true" >> $GITHUB_OUTPUT

      - name: Run tests
        id: test
        run: |
          npm run test 2>&1 | tee test-output.txt || echo "test-failed=true" >> $GITHUB_OUTPUT

      - name: Claude Code Review
        uses: anthropics/claude-3-5-sonnet-20241022@v1
        with:
          prompt: |
            Please review this pull request focusing on:
            
            1. Code quality and adherence to project standards (see CLAUDE.md)
            2. Security vulnerabilities and best practices
            3. Performance implications
            4. Test coverage and quality
            5. Documentation completeness
            
            Consider the lint results: ${{ steps.lint.outputs.lint-failed == 'true' && 'LINTING FAILED - see issues' || 'Linting passed' }}
            Consider the test results: ${{ steps.test.outputs.test-failed == 'true' && 'TESTS FAILED - see issues' || 'Tests passed' }}
            
            Please provide:
            - Overall assessment
            - Specific improvement suggestions
            - Any blocking issues that should prevent merge
            
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          timeout_minutes: "15"
```

### Phase 4: Testing and Optimization (15-30 minutes)

#### Step 6: Test the Setup
1. Create a test branch: `git checkout -b test-claude-review`
2. Make a small change to test the workflow
3. Create a pull request
4. Verify Claude responds with a review
5. Test the `@claude` mention functionality

#### Step 7: Configure Branch Protection Rules
Add branch protection rules in GitHub repository settings:
- Require pull request reviews before merging
- Require status checks to pass (including Claude review)
- Require branches to be up to date before merging

## Advanced Features (Optional)

### Custom Review Prompts
Create issue templates for specific review types:

```markdown
<!-- .github/ISSUE_TEMPLATE/claude_review.md -->
---
name: Claude Code Review Request
about: Request specific code review from Claude
title: '[CLAUDE REVIEW] '
labels: ['claude-review']
assignees: []
---

@claude please review the following:

**Focus Areas:**
- [ ] Security
- [ ] Performance
- [ ] Code Quality
- [ ] Testing
- [ ] Documentation

**Specific Questions:**
<!-- Add any specific questions or concerns -->

**Files to Review:**
<!-- List specific files or directories -->
```

### Integration with Existing CI/CD
Modify your existing `deploy.yml` to include Claude review status:

```yaml
# Add this to your existing deploy.yml validation job
- name: Wait for Claude Review
  if: github.event_name == 'pull_request'
  uses: fountainhead/action-wait-for-check@v1.1.0
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    checkName: "claude-review"
    timeoutSeconds: 600
```

## Best Practices and Usage

### Effective Usage Patterns

1. **Automatic Reviews**: Every PR gets an initial review
2. **Interactive Reviews**: Use `@claude` for specific questions
3. **Focused Reviews**: Ask Claude to focus on specific areas
4. **Follow-up Reviews**: Request additional reviews after changes

### Example Commands
```
@claude please review the security implications of this authentication change

@claude can you suggest performance improvements for this component?

@claude check if this follows our TypeScript and React best practices

@claude review the test coverage for these new features
```

### Cost Optimization
- Set appropriate `timeout_minutes` to avoid long-running workflows
- Use `max_turns` to limit conversation length
- Configure workflow to run only on meaningful changes (exclude docs-only PRs)

## Troubleshooting

### Common Issues
1. **Claude not responding**: Check API key, app installation, and permissions
2. **Workflow not triggering**: Verify YAML syntax and event configuration
3. **Rate limiting**: Monitor API usage and adjust frequency if needed

### Debug Commands
```bash
# Check workflow runs
gh run list --workflow="claude-review.yml"

# View workflow logs
gh run view [run-id] --log

# Test API key
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
     https://api.anthropic.com/v1/messages
```

## Security Considerations

1. **API Key Management**: Store API key in GitHub Secrets, never in code
2. **Permissions**: Use minimal required permissions for GitHub token
3. **Repository Access**: Claude app only accesses repositories where installed
4. **Data Privacy**: Code is processed by Anthropic's API (review their privacy policy)

## Expected Benefits

- **Faster Reviews**: Immediate feedback on PRs
- **Consistent Quality**: Standardized review criteria
- **Learning Tool**: Educational feedback for developers
- **Security Focus**: Automated security vulnerability detection
- **24/7 Availability**: Reviews available outside business hours

## Next Steps

1. [ ] Run `claude /install-github-app` or manual setup
2. [ ] Create `CLAUDE.md` configuration file
3. [ ] Add the GitHub Actions workflow
4. [ ] Test with a sample PR
5. [ ] Configure branch protection rules
6. [ ] Train team on effective usage patterns
7. [ ] Monitor and optimize based on usage

## Support and Resources

- **Claude GitHub Actions Documentation**: https://docs.anthropic.com/en/docs/claude-code/github-actions
- **GitHub App**: https://github.com/apps/claude
- **Issue Reporting**: https://github.com/anthropics/claude-code/issues
- **API Documentation**: https://docs.anthropic.com/claude/reference/

This implementation will provide automated, intelligent code reviews that help maintain code quality, security, and adherence to your project standards while being cost-effective and customizable to your team's needs.