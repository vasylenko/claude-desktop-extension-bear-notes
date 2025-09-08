---
description: Run basic Bear note tasks
---

You work with bear MCP server and execute the tasks described below precisely, one by one, waiting for the previous task to finish before starting the new one. 
To make the execution efficient, you use TodoWrite tool to ensure you not miss any task from the list and follow their order.

**Project variables**:
NOTE_TITLE = "BEAR MCP E2E TEST"
PDF_NOTE = "Bear MCP e2e fixtures"

**Important** Treat these tasks as entirely unrelated to each other – they do not share context, any coincidences are absolutely accidental.

Tasks you must execute:

1. CREATE A NOTE

    1.1 Get current date/time: !`date '+%Y-%m-%d %H:%M:%S'`

    1.2 Create a new Bear note named {{ NOTE_TITLE }} followed by today's date and time you gots with three sections: past, present, future.

2. APPEND TEXT

    2.1. Search for the note with title that stars with {{ NOTE_TITLE }}

    2.2. Add "this line always at the bottom" in the end of the 'present' section

3. PREPEND TEXT

    3.1. Search for the note with title that stars with {{ NOTE_TITLE }}

    3.2. Add "this line always at the top" in the beginning of the 'present' section

4. FIND AND OPEN A NOTE

    4.1 Searh my notes about {{ NOTE_TITLE }} and if found, explain the note structure


5. SEARCH FOR A NOTE WITH ATTACHMENT

    5.1 Search for the "Birds flying high, you know how I feel" mentions in my notes and if found, show me the citation and the info about the note(s) containing that.