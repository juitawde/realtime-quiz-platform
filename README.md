# 🧠 Assignment 14 — Real-Time Multiplayer Live Quiz Battle

A Socket.io + Express multiplayer quiz battle with a server-authoritative timer, speed-based scoring, PIN rooms, anti-cheat validation and live leaderboards.

**Live Demo:**
https://realtime-quiz-platform-w0c4.onrender.com/

## Run

```bash
npm install
npm run dev
```

Open:

- Host: `http://localhost:5000/host.html`
- Player: `http://localhost:5000/player.html`

## Flow

1. Host creates a room and receives a 4-digit PIN.
2. Players join with the PIN.
3. Host starts the quiz.
4. The server broadcasts each question and controls the 15-second round.
5. Correct answers receive 500–1000 points depending on response speed.
6. Duplicate or late answers are rejected server-side.
7. The leaderboard is broadcast after every answer and after each reveal.
8. After the final question, the server broadcasts final rankings and winner.

## Scoring

`500 + speed bonus`, where the speed bonus is up to 500 points.

## Folder Structure

```text
assignment-14-quiz-socket/
├── public/
│   ├── index.html
│   ├── host.html
│   ├── player.html
│   ├── app.js
│   └── style.css
├── data/
│   └── questions.json
├── sockets/
│   ├── gameEngine.js
│   └── lobbyHandler.js
├── server.js
├── package.json
├── .env
└── README.md
```
## Screenshots

<img width="1470" height="877" alt="Screenshot 2026-09-17 at 7 43 44 PM" src="https://github.com/user-attachments/assets/9c32f6ce-b788-4818-8505-c28a8a4a083b" />

<img width="1470" height="882" alt="Screenshot 2026-09-17 at 7 43 57 PM" src="https://github.com/user-attachments/assets/2c565a75-bb05-4068-bac2-c1ffb9cbd7c7" />

<img width="1470" height="881" alt="Screenshot 2026-09-17 at 7 45 03 PM" src="https://github.com/user-attachments/assets/8c2700d8-21bc-4178-92ed-15088638be23" />

<img width="1470" height="956" alt="Screenshot 2026-09-17 at 7 45 48 PM" src="https://github.com/user-attachments/assets/943e8b85-75e1-41b5-be4a-93bd4ce7698a" />

<img width="1470" height="956" alt="Screenshot 2026-09-17 at 7 46 19 PM" src="https://github.com/user-attachments/assets/8aebbac3-f7bf-43c4-a5ab-acb581ce1001" />

<img width="1470" height="876" alt="Screenshot 2026-09-17 at 7 46 29 PM" src="https://github.com/user-attachments/assets/cc738e5f-7f79-4182-80a6-ddd03cca1205" />

<img width="1470" height="878" alt="Screenshot 2026-09-17 at 7 46 43 PM" src="https://github.com/user-attachments/assets/bad2fd34-e1ef-476b-b2ae-6d3d1491c1b4" />

<img width="1470" height="885" alt="Screenshot 2026-09-17 at 7 46 54 PM" src="https://github.com/user-attachments/assets/ae227087-7a55-44e7-8206-00f91d6d8100" />

<img width="1470" height="956" alt="Screenshot 2026-09-17 at 7 47 08 PM" src="https://github.com/user-attachments/assets/2dd3e8a5-3798-4a00-9b4a-0520a7b5366d" />

<img width="1470" height="956" alt="Screenshot 2026-09-17 at 7 47 28 PM" src="https://github.com/user-attachments/assets/691ed4ed-07af-4896-9974-4ed2e52d3882" />

<img width="1470" height="956" alt="Screenshot 2026-09-17 at 7 47 56 PM" src="https://github.com/user-attachments/assets/d241e8fb-6a1b-4600-b2cf-8f8abab5e706" />

<img width="1470" height="882" alt="Screenshot 2026-09-17 at 7 48 06 PM" src="https://github.com/user-attachments/assets/d067688d-635d-4c3c-8c0b-f887b2aea7aa" />


## Demo

For the required 3-player demonstration, open one host tab and three player tabs. Create a room, share the PIN, start the game, answer at different speeds, and show the leaderboard updating in real time.

> Note: The server calculates elapsed time itself. The player's `timeTakenMs` payload is not trusted for deciding whether the submission is late or for scoring.
