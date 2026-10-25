# Quiz Arena — Real-Time Multiplayer Quiz Platform

Quiz Arena is a real-time multiplayer quiz application that allows users to host live quizzes, invite participants using a room PIN, create custom quizzes, import questions from documents, and analyse player performance through persistent quiz history and detailed reports.

The platform combines real-time gameplay with account-based history, server-side scoring, question-level analytics, and a winners' podium to provide a complete quiz hosting and participation experience.

## Live Demo Link: 
https://realtime-quiz-platform-w0c4.onrender.com/

## Features

### 1. Real-Time Multiplayer Quiz Gameplay

- Create and host live quiz sessions.
- Generate a unique room PIN for participants.
- Allow players to join using the room PIN.
- Synchronize questions, timers, answer submissions, and results using Socket.io.
- Calculate scores and validate answers on the server.
- Display correct answers and explanations after the appropriate reveal stage.
- Show live leaderboards and final rankings.
- Support multiple participants in a single quiz session.

### 2. Custom Quiz Creation

- Create quizzes using your own questions.
- Configure the number of questions in a quiz.
- Add multiple-choice options, correct answers, and explanations.
- Validate question structure before starting a game.
- Save reusable quiz templates locally.
- Reuse saved quizzes for future sessions.

### 3. Document-Based Quiz Import

Create quizzes from supported document formats instead of manually entering every question.

The quiz import system is designed to support formats such as:

- PDF
- DOCX
- XLSX
- CSV
- TXT
- Markdown
- JSON

Depending on the document format and parser implementation, the system can extract questions, answer options, correct answers, and explanations into a structured quiz.

Imported questions are validated before they are used in a live session. Review extracted content before hosting, especially when source documents contain complex layouts, scanned pages, or ambiguous answer formats.

### 4. User Authentication

Quiz Arena includes account-based authentication for personalized quiz activity.

- Register using a display name, email address, and password.
- Log in to access your account.
- Log out securely.
- Associate hosted quiz sessions with the authenticated host.
- Associate participation records with registered players.
- Maintain separate histories for quizzes hosted and quizzes played.
- Support guest participation where enabled.

Passwords must be securely hashed, and protected operations must be authorized on the backend.

### 5. Dedicated Login and Registration Pages

The authentication interface uses separate pages rather than relying on a login or registration modal.

- Dedicated login page.
- Dedicated registration page.
- Client-side and server-side validation.
- Password visibility controls.
- Helpful authentication error messages.
- Navigation between login, registration, and the main application.
- Account-aware navigation after login.

The authentication pages follow the existing Quiz Arena visual design.

### 6. MongoDB Persistence

MongoDB is the intended persistent database for user accounts, quiz sessions, participant records, and question-level results.

Mongoose provides the database models, validation, and database operations.

The database stores information such as:

- User accounts and password hashes.
- Reusable quiz templates, where supported.
- Quiz session metadata.
- Host and participant associations.
- Question snapshots used during each session.
- Player answers and correctness.
- Response times and points earned.
- Final scores, rankings, and session statistics.

Each conducted quiz is stored as a separate session so that its historical results remain distinct from other sessions using the same quiz template.

The application should use MongoDB for persistent account history and reports. Browser storage may still be used for local quiz templates and other explicitly local data.

### 7. Hosted Quiz History

Hosts can access their previously conducted quizzes through their account.

The history view is designed to show:

- Quiz title.
- Date and time.
- Number of participants.
- Winner and winning score.
- Session duration.
- Session status.
- Access to the detailed report.

Each history entry should link to the report for that specific quiz session.

### 8. Played Quiz History

Registered participants can review quizzes they have played.

Their history can include:

- Quiz title.
- Host name, where available.
- Date played.
- Final score.
- Final rank.
- Correct and incorrect answer counts.
- Accuracy percentage.
- Average response time.
- Access to their permitted results.

History should remain available after refreshing the browser, logging out and back in, or restarting the application, provided the session data was successfully persisted.

### 9. Detailed Quiz Reports and Analytics

Every completed quiz session can produce a report containing an overview of the game and individual player performance.

#### Session overview

- Quiz title and session identifier.
- Host information.
- Start time and end time.
- Total duration.
- Total questions.
- Number of participants.
- Winner and highest score.
- Average participant score.
- Overall answer accuracy.

#### Individual player analysis

For each participant, the report can include:

- Display name.
- Final score and rank.
- Correct answers.
- Incorrect answers.
- Unanswered questions.
- Accuracy percentage.
- Total response time.
- Average response time.

#### Question-by-question analysis

For each player and question, the report can display:

- Question number and text.
- Selected answer.
- Correct answer.
- Correct, incorrect, or unanswered status.
- Response time.
- Points earned.
- Question explanation.

#### Question-level statistics

Where the underlying answer records are available, the host report can also show:

- Number of correct answers.
- Number of incorrect answers.
- Number of unanswered questions.
- Percentage of participants answering correctly.
- Average response time.
- Frequently selected incorrect options.

These statistics must be calculated from actual session results rather than hardcoded examples.

### 10. Winners' Podium and Final Leaderboard

At the end of a quiz, the results experience is designed to show the winners' podium first, followed by the complete leaderboard.

#### Winners' podium

- First place appears in the center on the highest podium.
- Second place appears on the left.
- Third place appears on the right.
- Each position displays the actual player's name, final score, and rank.
- Gold, silver, and bronze accents distinguish the three positions.
- The podium adapts to sessions with fewer than three participants.
- Ties follow a consistent ranking policy.

#### Complete leaderboard

After the podium, users can view the full ranking of all participants.

The leaderboard can display:

- Rank.
- Player name.
- Final score.
- Correct answers.
- Accuracy.
- Average response time.

The host can then open the detailed analytics report for the completed session. Participants can access their own permitted results.

The podium, leaderboard, and report must use consistent, server-calculated final results.

### 11. Response-Time Tracking and Scoring

The server records answer submissions and calculates response times using server-controlled timestamps.

- Validate answer submissions against the active question and deadline.
- Calculate correctness and points on the server.
- Record accepted answers and response times.
- Record unanswered questions when the timer expires.
- Prevent duplicate submissions from creating duplicate result records.
- Preserve answers already recorded if a participant disconnects.
- Finalize participant scores and rankings when the session ends.

The existing scoring rules should remain unchanged unless a specific change is required.

### 12. Persistent Session Reports

Each conducted quiz has its own session record.

Historical reports should remain consistent even if the original reusable quiz template is later edited.

The application should:

- Persist completed session results.
- Save the question snapshot used during the session.
- Associate participants and answers with the correct session.
- Prevent duplicate finalization.
- Handle database errors without falsely reporting successful persistence.
- Retrieve reports through authenticated backend endpoints.

### 13. UI and Design

Quiz Arena retains its existing design language, including its warm, understated color palette.

The interface uses:

- Cream backgrounds.
- Dusty rose and lilac accents.
- Dark, readable text.
- Inter typography.
- Rounded cards and consistent spacing.
- Subtle shadows and gradients.
- Professional SVG icons.
- Responsive layouts where supported.

The authentication pages, quiz history, analytics reports, and winners' podium should integrate with the existing design rather than introducing an unrelated visual style.

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML | Page structure |
| CSS | Styling and responsive layouts |
| JavaScript | Frontend interactions |
| Node.js | Server-side JavaScript runtime |
| Express.js | HTTP server and API routes |
| Socket.io | Real-time multiplayer communication |
| MongoDB | Persistent application data |
| Mongoose | MongoDB models and database operations |
| bcryptjs | Password hashing, if retained in the implementation |
| dotenv | Environment variable configuration |
| Existing document parsers | Extracting questions from supported file formats |

The exact document-parsing libraries and authentication/session implementation should match the installed project dependencies.

## Project Structure

The following is a representative structure based on the existing project. Retain the actual filenames and add or remove files as required by the implementation.

```text
JUI_TAWDE/
├── config/
│   └── database.js
├── middleware/
│   └── authMiddleware.js
├── models/
│   ├── User.js
│   ├── QuizTemplate.js
│   ├── QuizSession.js
│   ├── ParticipantResult.js
│   └── QuestionResult.js
├── services/
│   ├── authService.js
│   ├── documentParser.js
│   ├── quizReportService.js
│   └── sessionService.js
├── sockets/
│   ├── gameEngine.js
│   └── lobbyHandler.js
├── utils/
│   └── quizValidation.js
├── public/
│   ├── js/
│   │   ├── auth.js
│   │   ├── podium.js
│   │   ├── quizHistory.js
│   │   ├── quizImporter.js
│   │   ├── quizParser.js
│   │   ├── quizReports.js
│   │   ├── quizStorage.js
│   │   └── quizValidation.js
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── host.html
│   ├── player.html
│   ├── app.js
│   └── style.css
├── tests/
│   └── runAllTests.js
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

## Screenshots

<img width="2940" height="1760" alt="image" src="https://github.com/user-attachments/assets/7c631abf-5294-4aef-8222-230fd00cc86f" />

<img width="2940" height="1766" alt="image" src="https://github.com/user-attachments/assets/67400cd6-6b6a-4874-b899-fd1925b20f6a" />

<img width="2932" height="1774" alt="image" src="https://github.com/user-attachments/assets/303443f3-2e52-4f04-b529-8d55c5996ea9" />

<img width="2940" height="1766" alt="image" src="https://github.com/user-attachments/assets/a277f073-7994-49be-9ace-d0c67ee508e4" />

<img width="2940" height="1758" alt="image" src="https://github.com/user-attachments/assets/fb7000d6-f624-448a-b954-af67644b5d3e" />

<img width="2930" height="1754" alt="image" src="https://github.com/user-attachments/assets/1a433389-e257-4dab-aa4f-729ae0933e98" />

<img width="2940" height="1762" alt="image" src="https://github.com/user-attachments/assets/e68c4992-3ec7-453c-be56-2fd8dc80887a" />

<img width="2932" height="1766" alt="image" src="https://github.com/user-attachments/assets/b2af50a2-f352-4b7b-af00-c21e9cd8e609" />

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

<img width="2940" height="1760" alt="image" src="https://github.com/user-attachments/assets/da315b5d-d3b2-413f-b70c-a98c83a986e3" />

<img width="2940" height="1762" alt="image" src="https://github.com/user-attachments/assets/c367eb90-3f74-4e90-be0e-9b5781ed02a3" />


## Installation and Setup

### Prerequisites

- Node.js and npm.
- MongoDB Atlas account or a locally running MongoDB Community Server.
- Git, if cloning the repository.

### 1. Open the project directory

```bash
cd path/to/realtime-quiz-platform/JUI_TAWDE
```

Use the actual path to your project directory.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the location expected by `server.js`.

Example:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/quiz_arena
SESSION_SECRET=replace_with_a_long_random_secret
```

For MongoDB Atlas, replace the local URI with the connection string provided by Atlas.

Keep `.env` private and ensure it is listed in `.gitignore`.

Generate a secure session secret on macOS or Linux using:

```bash
openssl rand -hex 32
```

Copy the generated value after `SESSION_SECRET=`.

### 4. Start MongoDB

For a local installation, ensure the MongoDB service is running.

For MongoDB Atlas, configure the database user and network access, then provide the Atlas connection URI in `.env`.

### 5. Start the application

Use the start script defined in `package.json`. If it is configured as `start`, run:

```bash
npm start
```

Alternatively, if no start script exists:

```bash
node server.js
```

Open the local address printed by the server, typically:

```text
http://localhost:5000
```

The application should confirm that MongoDB is connected before serving requests that require persistent data.

## Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | HTTP server port |
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Secret used by the configured session mechanism |

Additional variables may be required depending on the final authentication and deployment setup.

Never commit real credentials or production secrets to version control.

## Testing

Run the test command configured in `package.json`. If the existing test runner is invoked directly, the command may be:

```bash
node tests/runAllTests.js
```

The test suite should cover:

- Registration, login, and logout.
- MongoDB connection and persistence.
- Host and participant identity.
- Quiz creation and room joining.
- Answer validation and scoring.
- Response-time tracking.
- Session finalization.
- Hosted and played history.
- Detailed quiz reports.
- Winners' podium and complete rankings.
- Authorization and privacy.
- Existing custom quiz and document-import functionality.

Report actual test results. Do not claim tests passed unless they were executed successfully.

## Security and Data Privacy

Quiz Arena should follow these security principles:

- Hash passwords securely.
- Authenticate users on the server.
- Authorize access to hosted reports and personal results.
- Calculate scores and ranks on the server.
- Validate Socket.io events.
- Protect sensitive endpoints.
- Avoid exposing password hashes and authentication secrets.
- Keep environment files out of version control.
- Avoid collecting unnecessary personal information.

## Future Enhancements

Potential future improvements include:

- Downloadable quiz reports in CSV or PDF format.
- Advanced player-performance charts.
- Quiz categories and difficulty levels.
- Historical performance comparisons.
- Improved accessibility.
- Session recovery and reconnection handling.
- Cloud synchronization for reusable custom quizzes.

## Project Goal

Quiz Arena aims to make live quizzes more engaging and useful by combining multiplayer gameplay with custom quiz creation, document imports, account-based history, persistent results, detailed performance analytics, and an intuitive winners' podium.

The goal is not only to conduct quizzes but also to preserve each session's results so hosts and participants can review and understand their performance afterwards.

---

## 👩‍💻 Author

**Jui Tawde**  
B.Tech Computer Science Engineering Student  
Passionate about building interactive, real-time web applications and learning new technologies.

- **LinkedIn:** [Jui Tawde](https://linkedin.com/in/jui-tawde-788210385/)

---

## ⭐ Support the Project

If you like **Quiz Arena**, find it useful, or appreciate the work behind it, please consider giving this repository a **star ⭐** on GitHub. Your support motivates me to keep improving and building more projects!

**Built with 💗, curiosity, and a lot of debugging.**
