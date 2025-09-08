# Tool Documentation Best Practices
## Tool Description
The description field should provide a concise, high-level explanation of what the tool accomplishes:

- Purpose: Communicate tool functionality and use cases, focus on user needs
- Audience:
    - LLMs who need select appropriate tools
    - Developers who need to understand the tool capabilities
- Content Guidelines:
    - Avoid parameter-specific details

Example:
```
{
  name: "read_multiple_files",
  description: "Read the contents of multiple files simultaneously. More efficient than reading files individually when analyzing or comparing multiple files."
}
```

## Schema Descriptions
The inputSchema property descriptions should provide parameter-specific documentation:

- Purpose: Guide correct tool invocation
- Audience:
    - LLMs constructing tool calls
    - Developers implementing clients
- Content Guidelines:
    - Specify parameter types and constraints
    - Include validation requirements
    - Provide usage examples where helpful
    - Explain parameter relationships

Example:
```
const schema = z.object({
  paths: z.array(z.string())
    .min(1, "At least one file path must be provided")
    .describe("Array of file paths to read. Each path must be a valid absolute or relative file path.")
});
```

## Rationale
Separation of Concerns: Tool descriptions and schema descriptions serve different purposes and audiences. Tool descriptions help with tool selection and understanding, while schema descriptions guide proper usage.

Flexibility Over Prescription: The guidelines provide clear direction while allowing implementation flexibility, recognizing that different tools may have unique documentation needs.

LLM-First Design: The practices optimize for LLM consumption patterns, where tools are first discovered via descriptions then invoked via schemas.

## Source
https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1382