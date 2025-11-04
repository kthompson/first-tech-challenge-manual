# Contributing to FTC Decode Manual Chatbot

Thank you for your interest in contributing to the FTC Decode Manual Chatbot! This project aims to help FTC teams quickly access and understand competition rules through an intelligent conversational interface.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project follows the [FIRST Core Values](https://www.firstinspires.org/about/vision-and-mission):

- **Gracious Professionalism**: We respect all contributors and maintain a professional, collaborative environment
- **Coopertition**: We compete and cooperate, helping each other succeed
- **Inclusion**: We welcome contributors from all backgrounds and skill levels
- **Innovation**: We encourage creative solutions and new ideas
- **Impact**: We aim to make a positive difference for the FTC community

### Expected Behavior

- Use welcoming and inclusive language
- Respect different viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other contributors

## Getting Started

### Prerequisites

- **Git**: Version control system
- **Node.js 18+** (for TypeScript) or **.NET 8+** (for C#)
- **Basic AI/ML Knowledge**: Understanding of embeddings and language models helpful
- **FTC Experience**: Familiarity with FIRST Tech Challenge rules and terminology

### First Contribution

1. **Explore the Codebase**: Read through the README and documentation
2. **Set Up Development Environment**: Follow the [setup guide](docs/setup.md)
3. **Find a Good First Issue**: Look for issues labeled `good-first-issue` or `help-wanted`
4. **Ask Questions**: Don't hesitate to ask for clarification on issues or in discussions

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

#### 🐛 Bug Reports

- Report issues with the chatbot responses
- Document installation or setup problems
- Identify performance issues

#### 🚀 Feature Requests

- Suggest new functionality
- Propose UI/UX improvements
- Request integration with other tools

#### 💻 Code Contributions

- Fix bugs and issues
- Implement new features
- Optimize performance
- Add tests

#### 📚 Documentation

- Improve existing documentation
- Add examples and tutorials
- Translate documentation
- Create video guides

#### 🎨 Design

- UI/UX improvements
- Create graphics and icons
- Design system components

#### 🧪 Testing

- Write test cases
- Manual testing of features
- Performance testing
- Accessibility testing

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/ftc-decode-chatbot.git
cd ftc-decode-chatbot

# Add the original repository as upstream
git remote add upstream https://github.com/ORIGINAL_OWNER/ftc-decode-chatbot.git
```

### 2. Environment Setup

```bash
# Install dependencies (TypeScript)
pnpm install

# OR for C#
dotnet restore

# Copy environment template
cp .env.example .env
# Edit .env with your API keys and configuration
```

### 3. Verify Setup

```bash
# Run tests
pnpm test  # or dotnet test

# Start development server
pnpm dev  # or dotnet run

# Process test manual
pnpm process-manual
```

## Coding Standards

### TypeScript Guidelines

- **Formatting**: Use Prettier with ESLint
- **Type Safety**: Strict TypeScript configuration
- **Naming**: Use camelCase for variables, PascalCase for types
- **Imports**: Use absolute imports where possible

```typescript
// Good
import { ChatService } from "@/services/chatService";
import type { ChatMessage } from "@/types/chat";

// Function example
export async function processUserQuery(
  message: string,
  context: ChatContext
): Promise<ChatResponse> {
  // Implementation
}
```

### C# Guidelines

- **Formatting**: Follow Microsoft C# coding conventions
- **Naming**: PascalCase for public members, camelCase for private
- **Async**: Use async/await patterns consistently
- **Nullability**: Enable nullable reference types

```csharp
// Good
public async Task<ChatResponse> ProcessUserQueryAsync(
    string message,
    ChatContext context,
    CancellationToken cancellationToken = default)
{
    // Implementation
}
```

### General Principles

- **Single Responsibility**: Each function/class should have one purpose
- **DRY (Don't Repeat Yourself)**: Extract common functionality
- **Clear Naming**: Use descriptive names for variables and functions
- **Comments**: Write code that's self-documenting, add comments for complex logic
- **Error Handling**: Always handle errors gracefully

## Testing Guidelines

### Test Structure

```
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests for API endpoints
├── e2e/           # End-to-end tests for complete workflows
└── fixtures/      # Test data and mock files
```

### Writing Tests

#### Unit Tests

```typescript
// Example unit test
describe("ChatService", () => {
  describe("processQuery", () => {
    it("should return relevant response for robot size query", async () => {
      // Arrange
      const mockContext = createMockContext();
      const service = new ChatService(mockContext);

      // Act
      const response = await service.processQuery(
        "What are robot size limits?"
      );

      // Assert
      expect(response.content).toContain("28 inches");
      expect(response.sources).toHaveLength(1);
      expect(response.confidence).toBeGreaterThan(0.8);
    });
  });
});
```

#### Integration Tests

```typescript
// Example API test
describe("POST /api/chat", () => {
  it("should return 200 with valid response", async () => {
    const response = await request(app)
      .post("/api/chat")
      .send({ message: "What is the robot weight limit?" })
      .expect(200);

    expect(response.body.response).toBeDefined();
    expect(response.body.sources).toBeInstanceOf(Array);
  });
});
```

### Test Requirements

- **Coverage**: Aim for >85% code coverage
- **Test Data**: Use realistic FTC manual content in tests
- **Mocking**: Mock external services (OpenAI, vector databases)
- **Performance**: Include performance tests for critical paths

### Running Tests

```bash
# Run all tests
pnpm test  # or dotnet test

# Run specific test suite
pnpm test -- --grep "ChatService"

# Run tests with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration
```

## Pull Request Process

### 1. Create Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/add-slack-integration
# or
git checkout -b fix/vector-search-timeout
```

### 2. Make Changes

- Follow coding standards
- Add tests for new functionality
- Update documentation if needed
- Ensure all tests pass

### 3. Commit Changes

Use conventional commit format:

```bash
# Feature commits
git commit -m "feat: add Slack slash command support"

# Bug fix commits
git commit -m "fix: resolve vector search timeout issue"

# Documentation commits
git commit -m "docs: update API documentation for new endpoints"

# Test commits
git commit -m "test: add integration tests for chat API"
```

### 4. Push and Create PR

```bash
# Push feature branch
git push origin feature/add-slack-integration

# Create pull request on GitHub
# Fill out the PR template completely
```

### 5. PR Template

When creating a PR, include:

```markdown
## Description

Brief description of changes and motivation.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Screenshots (if UI changes)

Include screenshots for visual changes.

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added for new functionality
```

### 6. Review Process

- **Automated Checks**: CI/CD pipeline must pass
- **Code Review**: At least one reviewer approval required
- **Testing**: Manual testing by reviewer if needed
- **Documentation**: Ensure docs are updated

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Describe the Bug**
A clear description of the bug.

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**

- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Safari]
- Version: [e.g. v1.0.0]

**Additional Context**
Any other context about the problem.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Additional context**
Any other context or screenshots about the feature request.

**FTC Use Case**
How would this help FTC teams specifically?
```

## Documentation

### Types of Documentation

1. **Code Comments**: Inline documentation for complex logic
2. **API Documentation**: Endpoint descriptions and examples
3. **User Guides**: How to use the application
4. **Developer Guides**: How to contribute and extend
5. **Architecture Documentation**: System design and decisions

### Documentation Standards

- **Clear and Concise**: Write for your audience
- **Examples**: Include code examples and use cases
- **Up-to-Date**: Keep documentation current with code changes
- **Accessible**: Use clear language, avoid jargon
- **Visual**: Include diagrams and screenshots where helpful

### Documentation Tools

- **Markdown**: For all documentation files
- **JSDoc/XML Docs**: For code documentation
- **Mermaid**: For diagrams and flowcharts
- **Screenshots**: For UI documentation

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General discussion and questions
- **Slack/Discord**: Real-time chat (if available)
- **Email**: For sensitive issues or private questions

### Getting Help

1. **Check Documentation**: Start with README and docs folder
2. **Search Issues**: Someone might have asked already
3. **Ask Questions**: Create a discussion or issue
4. **Join Community**: Participate in team communications

### Mentorship

We encourage experienced contributors to mentor newcomers:

- **Pair Programming**: Work together on complex features
- **Code Reviews**: Provide detailed, constructive feedback
- **Office Hours**: Regular times for questions and help
- **Documentation**: Help improve onboarding materials

## Recognition

We appreciate all contributions and will recognize them:

- **Contributors File**: Listed in CONTRIBUTORS.md
- **Release Notes**: Mentioned in feature announcements
- **Community Spotlights**: Featured contributions
- **Conference Talks**: Speaking opportunities about the project

## Development Workflow

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/\***: Individual feature development
- **fix/\***: Bug fixes
- **docs/\***: Documentation updates

### Release Process

1. **Feature Freeze**: No new features after cut-off
2. **Testing Phase**: Comprehensive testing of release candidate
3. **Release Candidate**: Tagged pre-release for final testing
4. **Release**: Tagged and deployed to production
5. **Post-Release**: Monitor for issues and hotfixes

## Questions?

If you have questions not covered here:

1. Check the [FAQ](docs/faq.md)
2. Search existing [GitHub Issues](https://github.com/your-repo/issues)
3. Create a new issue with the "question" label
4. Reach out to maintainers directly if needed

---

Thank you for contributing to the FTC community! Every contribution, no matter how small, helps teams succeed in competition and builds valuable skills for students.

_Happy coding! 🤖🏆_
