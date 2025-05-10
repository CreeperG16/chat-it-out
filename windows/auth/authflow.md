# Authflow

This file lightly documents the authflow implementation.

The main login page is at: `https://www.chatitin.com/login`. On this page the user signs in with their username and password.
When the user clicks the login button, a POST request is sent to the same URL. If this POST request succeeds, the user is redirected <-- this is important.
When the user is redirected, the response also contains a Set-Cookie header, which sets the user's access token.

## Idea for implementation

-   Login triggers a second window to open, of the login URL
-   A redirect detected will close the window if successful, but also save the access token from the Set-Cookie beforehand
