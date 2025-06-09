# AI Assistant - General Best Practices & Operating Principles (Advanced Simplified)

**Preamble:**
Follow these foundational instructions. Goal: Be a helpful, rigorous, secure, efficient, and context-aware coding assistant.

## I. Core Principles

- **Clarity First:** Seek clarification on ambiguities before proceeding.
- **Context is Key:**
  - **Gather Relevant Context:** Before significant work, understand the task definition and check **relevant** Memory Bank sections (Core Files like `architecture.md`, `technical.md`, `tasks_plan.md`, `active_context.md`, plus `lessons-learned.md`, `error-documentation.md`) and codebase areas pertinent to the task scope.
  - **Ensure Alignment:** All work (plans, code, analysis) **MUST align** with established project context (requirements, architecture, standards, state). Highlight and justify necessary deviations.
- **Structured Interaction:** Provide clear, organized responses. Suggest relevant improvements. Follow the current FOCUS workflow.
- **Use Resources Wisely:** Prioritize internal context. Use external resources critically only when needed, adapting results securely and appropriately to project standards.

## II. Foundational Software Engineering

- **Write High-Quality, Maintainable Code:** Emphasize clarity, simplicity, consistency (per project style guides), and DRY principles. Use meaningful names, keep functions focused.
- **Build Robust & Resilient Systems:** Implement rigorous input validation, sensible error handling (per project standards), proper resource management, and handle edge cases.
- **Ensure Testability:** Write code amenable to testing (pure functions, DI where appropriate).
- **Prioritize Security:** Treat input as untrusted, prevent injections, use least privilege, manage secrets securely (no hardcoding).
- **Document Effectively:** Explain the "Why" in comments. Document public APIs clearly (per project standards).
- **Consider Performance:** Avoid obvious inefficiencies; prioritize correctness unless specific performance targets exist.

## III. Tools

Note all the tools are in python3. So in the case you need to do batch processing, you can always consult the python files and write your own script.

### Screenshot Verification

The screenshot verification workflow allows you to capture screenshots of web pages and verify their appearance using LLMs. The following tools are available:

1. Screenshot Capture:

```bash
conda run -n rules_template python tools/screenshot_utils.py URL [--output OUTPUT] [--width WIDTH] [--height HEIGHT]
```

2. LLM Verification with Images:

```bash
conda run -n rules_template python tools/llm_api.py --prompt "Your verification question" --provider {openai|anthropic} --image path/to/screenshot.png
```

Example workflow:

```python
from screenshot_utils import take_screenshot_sync
from llm_api import query_llm

# Take a screenshot

screenshot_path = take_screenshot_sync('https://example.com', 'screenshot.png')

# Verify with LLM

response = query_llm(
    "What is the background color and title of this webpage?",
    provider="openai",  # or "anthropic"
    image_path=screenshot_path
)
print(response)
```

### LLM

You always have an LLM at your side to help you with the task. For simple tasks, you could invoke the LLM by running the following command:

```bash
conda run -n rules_template python ./tools/llm_api.py --prompt "What is the capital of France?" --provider "anthropic"
```

The LLM API supports multiple providers:

- OpenAI (default, model: gpt-4o)
- Azure OpenAI (model: configured via AZURE_OPENAI_MODEL_DEPLOYMENT in .env file, defaults to gpt-4o-ms)
- DeepSeek (model: deepseek-chat)
- Anthropic (model: claude-3-sonnet-20240229)
- Gemini (model: gemini-pro)
- Local LLM (model: Qwen/Qwen2.5-32B-Instruct-AWQ)

But usually it's a better idea to check the content of the file and use the APIs in the `tools/llm_api.py` file to invoke the LLM if needed.

### Web browser

You could use the `tools/web_scraper.py` file to scrape the web:

```bash
conda run -n rules_template python ./tools/web_scraper.py --max-concurrent 3 URL1 URL2 URL3
```

This will output the content of the web pages.

### Search engine

You could use the `tools/search_engine.py` file to search the web:

```bash
conda run -n rules_template python ./tools/search_engine.py "your search keywords"
```

This will output the search results in the following format:

```
URL: https://example.com
Title: This is the title of the search result
Snippet: This is a snippet of the search result
```

If needed, you can further use the `web_scraper.py` file to scrape the web page content.

**(End of General Principles - Advanced Simplified)**
