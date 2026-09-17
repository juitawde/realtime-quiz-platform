# 🧠 Assignment 14 — Real-Time Multiplayer Live Quiz Battle

A Socket.io + Express multiplayer quiz battle with a server-authoritative timer, speed-based scoring, PIN rooms, anti-cheat validation and live leaderboards.

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

## Demo

For the required 3-player demonstration, open one host tab and three player tabs. Create a room, share the PIN, start the game, answer at different speeds, and show the leaderboard updating in real time.

> Note: The server calculates elapsed time itself. The player's `timeTakenMs` payload is not trusted for deciding whether the submission is late or for scoring.
