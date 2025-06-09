# Meta-Rules for AI Assistant Interaction (Advanced Simplified - Mode Logic Preserved)

You will receive a sequence of rule files providing context and instructions. Process them in order.

**File Sequence Purpose Overview:**

- **This File (0th):** Overall system, focus determination.
- **Files 1-5 (approx.):** Project Context (Memory Bank definitions, Directory Structure). Consult as needed/directed.
- **File 6 (approx.):** General Principles & Best Practices (**ALWAYS FOLLOW**).
- **Files 7-9 (approx.):** Specific Workflows (**FOCUS** = PLANNING, IMPLEMENTATION, DEBUGGING).

**Determining Your Operational Focus and Applicable Rules:**

Apply the MOST relevant specific workflow rule set (from files approx. 7, 8, or 9) IN ADDITION to the general rules (file approx. 6) and required memory files (files approx. 1-4 as needed). Use the following hierarchy:

1.  **Explicit User Command:** Check IF the user's LATEST request contains an explicit instruction like `FOCUS = PLANNING`, `FOCUS = IMPLEMENTATION`, or `FOCUS = DEBUGGING`.

    - IF YES: Prioritize applying the workflow rules associated with that specified FOCUS (File 7, 8, or 9). This command OVERRIDES other factors for this turn.

2.  **Infer Task Intent (Primary Method after Explicit Command):** IF no explicit command (Step 1) applies, analyze the user's CURRENT request to determine the primary task intent:

    - Is it about high-level design, analysis, creating a plan, exploring solutions? -> Determine **FOCUS = PLANNING** (Use rules from file approx. 7).
    - Is it about writing code, implementing specific steps from a known plan, making direct modifications? -> Determine **FOCUS = IMPLEMENTATION** (Use rules from file approx. 8).
    - Is it about fixing a reported error, diagnosing unexpected behavior, analyzing a failure? -> Determine **FOCUS = DEBUGGING** (Use rules from file approx. 9).
    - IF unsure about the intent based on the request, ASK the user for clarification on the required FOCUS (Planning, Implementation, or Debugging).

3.  **Assistant's Internal State (Context / Cross-Check - If Applicable):** IF you are an assistant with persistent internal modes (e.g., 'Act', 'Debug', 'Architect'):
    - **Cross-check:** Does your current internal mode _conflict_ with the FOCUS determined in Step 2?
      - **Example Conflict:** You are in 'Debug Mode', but Step 2 determined `FOCUS = PLANNING` based on the user's request ("Let's redesign this part").
      - **Example Ambiguity:** You are in 'Act Mode' (which covers both Implementation and Debugging), and Step 2 determined `FOCUS = DEBUGGING`. This is consistent. If Step 2 determined `FOCUS = IMPLEMENTATION`, this is also consistent.
    - **Action on Conflict:** If your internal mode _clearly conflicts_ with the FOCUS determined from the user's current request (Step 2), NOTIFY the user: "My current internal mode is [Your Mode Name]. However, your request seems to be for [FOCUS determined in Step 2]. I will proceed with FOCUS = [FOCUS determined in Step 2] based on your request. Is this correct, or should I remain focused on tasks related to [Your Mode Name]?" _Prioritize the FOCUS derived from the current request (Step 2) after notifying._
    - **Action on Ambiguity:** If your internal mode covers multiple FOCUS types (like Cline's 'Act'), rely primarily on the FOCUS determined in Step 2 from the _specific request_. Your internal mode serves as broader context but doesn't dictate the rules file if the request is clearly about one specific FOCUS (e.g., debugging).

**Applying Rules:**

- **Always apply File 6 (General Principles).** This includes initial context gathering relevant to the task.
- **Apply the ONE most relevant workflow file (7, 8, or 9)** based on the determined FOCUS (using the detailed logic above).
- **Consult Memory Bank files** actively as needed for context and validation, guided by the principles in File 6 and the current workflow.

**(End of Meta-Rules - Advanced Simplified - Mode Logic Preserved)**
