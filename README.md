# Chat it out

This is a client for [CHAT IT IN](https://chatitin.com/) built using electron
I made it because I was bored and thought it was a funny idea to reverse engineer the HTTP requests etc.
The front end and a lot of the original backend code was made by gemini 2.5 pro
After holding the AI's hand every step of the way, I try to reorganise a lot of the code and clean it up

This project was simultaneously me trying out vscode agent mode and me reverse engineering David's http requests

I could have just used the Supabase JS library but I challenged myself to do it all with raw HTTP and WebSocket

The authentication flow in particular is fun
I outlined what I wanted in a .md file for the AI to read

All things considered, I still needed to know a decent amount about JS and electron to debug and fix problems that the AI managed to think up
I haven't really tried other models yet, but Gemini 2.5 doesn't seem to like creating new files to organise code into, it prefers writing 500-line long implementations which start containing redundant code when the file gets big enough not to fit in the model's provided context

There was at least one hallucination-induced problem

@UCDFiddes is adding features to chat it in faster than I can implement them here though lol
