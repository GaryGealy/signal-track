---
name: explain-code
description: This skill should be used when explaining how code works, teaching about a codebase, or when the user asks "how does this work?", "explain this code", "what does this do?", or "help me understand this". Provides explanations with visual diagrams and analogies.
---

# Explain Code

This skill provides a structured approach to explaining code using visual diagrams, analogies, and step-by-step walkthroughs. Use it to make complex code concepts accessible and memorable.

## When to Use This Skill

Use this skill when:
- The user asks "how does this work?"
- Teaching or onboarding someone to a codebase
- Explaining complex algorithms or data structures
- The user asks "explain this code" or "what does this do?"
- Breaking down unfamiliar code patterns

## Explanation Structure

When explaining code, always include these four elements:

### 1. Start with an Analogy

Compare the code to something from everyday life that captures the essence of what it does. The analogy should:
- Be relatable and concrete
- Map clearly to the code's purpose
- Help build intuition before diving into details

**Example:**
```
This authentication middleware is like a bouncer at a club - it checks your ID
(JWT token) before letting you into the VIP section (protected routes).
```

### 2. Draw a Diagram

Use ASCII art to show the flow, structure, or relationships. Visual representations help cement understanding. Consider:
- **Flow diagrams** for sequential processes
- **Tree structures** for hierarchies
- **Tables** for data relationships
- **State diagrams** for stateful behavior

**Example:**
```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Auth Middleware │ ◄── Checks JWT token
└──────┬──────────┘
       │
       ├─── Valid ───────► Continue to route
       │
       └─── Invalid ─────► Return 401
```

### 3. Walk Through the Code

Explain step-by-step what happens, line by line or section by section:
- Start from the entry point
- Follow the execution flow
- Call out important variables, functions, or state changes
- Explain the "why" not just the "what"

**Example:**
```
1. Request arrives with Authorization header
2. Middleware extracts the token from "Bearer <token>"
3. Token is verified using the secret key
4. If valid, user info is attached to request object
5. If invalid, error response is sent immediately
```

### 4. Highlight a Gotcha

What's a common mistake or misconception? This helps prevent future errors and deepens understanding.

**Example:**
```
⚠️ Common Gotcha: The middleware must be placed BEFORE route handlers in the
middleware chain, or it won't protect those routes. Order matters!
```

## For Complex Concepts

When the code is particularly complex:
- **Use multiple analogies** - different perspectives help different learners
- **Break into smaller chunks** - explain one piece at a time
- **Show both the big picture and details** - zoom out, then zoom in
- **Provide examples** - show what would happen with specific inputs

## Keep It Conversational

- Use "we" and "let's" to create a collaborative feel
- Ask rhetorical questions to engage thinking
- Use casual language, not academic jargon
- Make it feel like a friendly pair programming session

**Example tone:**
```
So what's happening here? Well, let's walk through it together. When a user
logs in, we're not just checking if their password matches - we're actually
creating a secure token that acts like a temporary key card...
```

## Example Full Explanation

**User asks: "How does this authentication middleware work?"**

**Response:**

**Analogy:**
Think of this middleware like a hotel key card system. When you check in (log in),
you get a key card (JWT token). Every time you try to access your room (protected
route), the lock (middleware) checks if your card is valid and hasn't expired.

**Diagram:**
```
┌──────────┐
│  Login   │ ──► Creates JWT token (key card)
└──────────┘
      │
      ▼
┌─────────────────────────────┐
│ Protected Route Request     │
│ with JWT in Auth header     │
└──────────┬──────────────────┘
           │
           ▼
┌───────────────────────────┐
│  Auth Middleware Check    │
│  • Token exists?          │
│  • Valid signature?       │
│  • Not expired?           │
└────┬──────────────┬───────┘
     │              │
  Valid          Invalid
     │              │
     ▼              ▼
┌─────────┐    ┌─────────┐
│ Allow   │    │ Deny    │
│ Access  │    │ (401)   │
└─────────┘    └─────────┘
```

**Walkthrough:**
1. User logs in, server creates JWT containing user ID and expiration time
2. JWT is signed with secret key (like a hologram on a credit card)
3. User includes JWT in Authorization header for subsequent requests
4. Middleware extracts and verifies the JWT signature
5. If valid, the decoded user info is attached to the request object
6. Route handler can now access `req.user` to know who's making the request

**Gotcha:**
⚠️ The secret key used to sign tokens MUST match the key used to verify them.
If you rotate keys, existing tokens become invalid immediately - users get
logged out! Plan for graceful key rotation with overlapping validity periods.

## Tips for Different Code Types

**Algorithms:**
- Show example inputs and trace through execution
- Visualize the data structure transformations
- Explain time/space complexity with analogies

**API Routes:**
- Show the request/response flow
- Include example payloads
- Explain error cases

**React Components:**
- Show the component tree
- Trace props and state changes
- Explain render triggers

**Database Queries:**
- Show the table relationships
- Visualize joins as Venn diagrams
- Include example result sets

Remember: The goal is understanding, not just information transfer. Make it stick!
