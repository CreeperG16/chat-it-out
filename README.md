# Chat it out

A third-party desktop client for the [CHAT IT IN](https://www.chatitin.com) chat platform, built using Electron, with a clean and minimal vanilla JavaScript, HTML, and CSS frontend.

## Features

- Authentication (login from the official site)
- Switch between channels (rooms) at will
- Sending and receiving chat messages in real time
- Online status
- Upload and send images
- Reply to and delete messages

## Screenshots

_Login via the official site_
![The official CHAT IT IN login page, open in a window](screenshots/login.png)

_Clean, familiar chat UI_
![The main chat window, with the general channel selected](screenshots/chat.png)

_Upload, send, receive and open images_
![An open image modal, showing an image previously sent in a message](screenshots/images.png)

## Try it yourself!

Head to the latest [release](https://github.com/CreeperG16/chat-it-out/releases/latest) and download the bundled executable for your OS.

## Running from source

Prerequisites: [Node.js](https://nodejs.org/) and [Git](https://git-scm.com/)

```bash
git clone https://github.com/CreeperG16/chat-it-out.git
cd chat-it-out
npm install
````

### Running the App

```bash
npm start
```

This will launch the Electron app. On first run, you'll be prompted to log into CHAT IT IN.

## Reverse Engineering

This project was built by inspecting and mimicking the network behavior of the official CHAT IT IN web client. All HTTP endpoints and WebSocket messages were reverse engineered using browser dev tools.

Authentication is handled by opening the official login page in a separate window. Once the user logs in, the session cookie is intercepted and saved, and its token is used to authenticate further requests.

## Vibe coding?

When I started this project, I wanted to try out the "vibe coding" everyone is talking about. So I spun up Visual Studio Code, opened the chat panel, set it to agent mode, and told it to build an electron app around an api.js file I had defined. This went about as badly as I expected, and I even completely restarted from the ground up near the beginning. For an actually usable, and more importantly, maintainable program, I had to hold AI's hand Every. Step. of the way - usually explaining in great detail what I wanted it to implement and how. If I didn't have experience with JavaScript (HTML, CSS), Node.JS and Electron beforehand, this project would have lasted about as far as a working(ish) proof of concept.

For the beginnings of this program, I tried Gemini 2.5 pro and GPT 4o. After a few features, however, the code got extremely messy, had many redundant parts, and was all in all unmaintanable and extremely hard to expand upon by me. For a while now, I have been slowly rewriting, moving and refactoring all the code that the AI agents threw into one or two files, to build a project structure that makes sense (at least to me) and is easy to expand. I still sometimes ask for the help of AI for repetitive tasks, or boilderplate, or small implementations, but the agent isn't capable enough to implement big features. Yet.
