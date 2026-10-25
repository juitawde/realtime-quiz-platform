# 🧠 Real-Time Multiplayer Quiz Platform

A real-time multiplayer quiz application built with **Node.js, Express.js, and Socket.io**, allowing hosts to create and manage quizzes while participants compete by answering questions in real time.

The platform supports a host-controlled quiz experience, live question delivery, countdown timers, answer evaluation, explanations, leaderboards, and winner announcements. It is designed to support both manually created quizzes and quizzes imported from documents.

## Live Demo Link: 
https://realtime-quiz-platform-w0c4.onrender.com/

## ✨ Features

### 🎮 Real-Time Multiplayer Gameplay
- Create a quiz room with a unique room PIN.
- Allow participants to join using the room PIN.
- Start and manage the quiz as the host.
- Deliver questions to participants in real time using Socket.io.
- Display countdown timers for questions.
- Accept participant answers and evaluate them on the server.
- Reveal correct answers and explanations after each question.
- Display live quiz results, leaderboards, and the final winner.

### ✍️ Custom Quiz Creation
- Create quizzes with a custom title and question count.
- Add questions and multiple-choice answer options manually.
- Select the correct answer for each question.
- Add explanations to help participants understand the answers.
- Edit, delete, and reorder questions before starting a game.
- Review and validate questions before launching a quiz.

### 📄 Document-Based Quiz Import

Create quizzes from existing question documents instead of entering every question manually.

Supported formats planned for the importer:

| File format | Extension |
|---|---|
| PDF documents | `.pdf` |
| Microsoft Word | `.docx` |
| Microsoft Excel | `.xlsx`, `.xls` |
| CSV spreadsheets | `.csv` |
| Plain text | `.txt` |
| Markdown | `.md` |
| JSON | `.json` |

The importer is designed to extract:

- Question text
- Multiple-choice options
- Correct answers
- Explanations
- Other supported question metadata

For example, a host can upload a PDF containing questions, options, answer keys, and explanations. The application can extract the available content and convert it into structured quiz questions.

**Import workflow:**

1. Upload a supported document.
2. Extract and structure the available question data.
3. Review the extracted questions and answers.
4. Correct missing or incorrectly extracted information.
5. Save the validated quiz.
6. Start a multiplayer game using the imported questions.

Scanned PDFs may require Optical Character Recognition (OCR). Extraction accuracy depends on document quality and formatting, so reviewing imported questions before starting a game is important.

### 💾 Saved Quizzes

- Store custom quizzes locally in the host's browser using IndexedDB.
- Reopen and reuse previously saved quizzes.
- Edit, duplicate, and delete saved quizzes.
- Retain saved quizzes across normal browser restarts on the same browser and device.

Saved quizzes are stored locally on the host's device. They are not automatically available on other devices.

### 💡 Explanations for Everyone

Both the host and participants can view explanations after the correct answer is revealed.

- Display the correct answer after the question ends.
- Show the associated explanation to participants and the host.
- Allow participants to understand why an answer is correct.
- Keep answers and explanations hidden until the appropriate reveal stage.

### 🏆 Leaderboard and Results

- Evaluate answers on the server.
- Maintain the existing scoring logic.
- Display quiz results and the leaderboard.
- Announce the final winner when the quiz ends.

### 🔒 Validation and Room Isolation

- Validate quiz questions before starting a game.
- Restrict quiz configuration to the authorized host.
- Keep active quiz data associated with its room.
- Prevent premature exposure of correct answers.
- Validate uploaded content and handle malformed files.
- Render question text and explanations safely.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime for the backend |
| Express.js | HTTP server and application routes |
| Socket.io | Real-time communication between the host, server, and participants |
| HTML5 | Frontend structure |
| CSS3 | Styling and layout |
| JavaScript | Client-side functionality and application logic |
| IndexedDB | Persistent local storage for saved quizzes |
| PDF.js (`pdfjs-dist`) | PDF text extraction |
| Mammoth.js (`mammoth`) | Word document text extraction |
| SheetJS (`xlsx`) | Excel and spreadsheet parsing |
| Tesseract.js | Optional OCR for scanned documents |
| LLM API | Optional AI-assisted parsing of complex documents |

The document-parsing libraries should be installed only when their corresponding import features are implemented. AI-assisted parsing is optional and requires a separately configured provider.

## 🏗️ Project Structure

The following is a representative structure. Actual filenames may differ depending on the implementation.

```text
realtime-quiz-platform/
├── JUI_TAWDE/
│   ├── public/
│   │   ├── js/
│   │   │   ├── quizImporter.js
│   │   │   ├── quizParser.js
│   │   │   ├── quizStorage.js
│   │   │   └── quizValidation.js
│   │   ├── app.js
│   │   ├── host.html
│   │   ├── index.html
│   │   ├── player.html
│   │   └── style.css
│   ├── services/
│   │   └── documentParser.js
│   ├── sockets/
│   │   ├── gameEngine.js
│   │   └── lobbyHandler.js
│   ├── utils/
│   │   └── quizValidation.js
│   ├── tests/
│   │   ├── fixtures/
│   │   ├── generateBinaryFixtures.js
│   │   ├── generateFixtures.js
│   │   └── runAllTests.js
│   ├── data/
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   └── server.js
```

**Note:** The structure above illustrates the existing application and possible new modules. Keep the actual repository structure consistent with the implemented code.

## Screenshots

<img width="2940" height="1760" alt="image" src="https://github.com/user-attachments/assets/7c631abf-5294-4aef-8222-230fd00cc86f" />

<img width="2940" height="1766" alt="image" src="https://github.com/user-attachments/assets/67400cd6-6b6a-4874-b899-fd1925b20f6a" />

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


## ⚙️ Installation and Setup

### Prerequisites

Install the following before running the application:

- [Node.js](https://nodejs.org/) — preferably an active LTS version compatible with the project's dependencies.
- npm, which is included with Node.js.
- A modern browser with Socket.io and IndexedDB support.

### 1. Clone the Repository

```bash
git clone https://github.com/juitawde/realtime-quiz-platform.git
cd realtime-quiz-platform/JUI_TAWDE
```

If the repository is already cloned, navigate directly to the directory containing `package.json`.

### 2. Install Dependencies

```bash
npm install
```

This installs the dependencies declared in `package.json`.

If document import is implemented using the recommended libraries, install any missing dependencies required by the project.

For example:

```bash
npm install pdfjs-dist mammoth xlsx
```

For optional OCR support:

```bash
npm install tesseract.js
```

Only install packages that are compatible with the existing project and its runtime.

### 3. Configure Environment Variables

Create a `.env` file in the project root if one does not already exist.

Example:

```env
PORT=3000
```

Add other variables only if the actual application requires them. For example, an optional AI-assisted document parser may require a server-side API key:

```env
LLM_API_KEY=your_api_key_here
```

Replace this placeholder with a valid key only if the chosen AI provider integration is implemented.

**Security:** Never commit real API keys, credentials, or secrets to GitHub. Add `.env` to `.gitignore` and provide a `.env.example` file containing placeholders instead.

### 4. Start the Application

If `package.json` defines a `start` script:

```bash
npm start
```

Alternatively, if the server is started directly through `server.js`:

```bash
node server.js
```

Use the command supported by the actual project configuration.

### 5. Open the Application

If the server uses port `3000`, open:

```text
http://localhost:3000
```

If the application uses a different port, use the URL printed by the server when it starts.

## 🧩 How the Application Works

### Host Workflow

1. Open the application.
2. Choose the host option.
3. Create a quiz room.
4. Select a default quiz, create a custom quiz, or import questions from a supported document.
5. Review and validate the questions.
6. Save the quiz locally if desired.
7. Share the room PIN with participants.
8. Start the quiz.
9. Monitor questions, timers, results, and the leaderboard.

### Participant Workflow

1. Open the application.
2. Join using the room PIN.
3. Wait for the host to start the game.
4. Read each question and submit an answer.
5. View the correct answer and explanation after the reveal.
6. Follow the leaderboard and final results.

### System Architecture

```text
Host Browser
    |
    | Create / Import / Save Quiz
    v
Quiz Validation
    |
    | Start Game
    v
Express.js + Socket.io Server
    |
    | Room-specific question events
    v
Participants' Browsers
    |
    | Submit Answers
    v
Server-side Answer Evaluation
    |
    | Correct Answer + Explanation
    v
Host and Participants
    |
    v
Leaderboard and Final Results
```

The host's saved quiz library remains in IndexedDB, while the selected active quiz is transferred to the server for the multiplayer session. Active game state can remain in memory, consistent with the existing architecture.

## 🧪 Testing Checklist

Before considering a release ready, verify the following:

- [ ] The server starts successfully.
- [ ] The host can create a room and generate a PIN.
- [ ] Participants can join the correct room.
- [ ] A default-question quiz runs successfully.
- [ ] The host can create a custom quiz manually.
- [ ] Question and answer validation works correctly.
- [ ] Supported documents can be imported.
- [ ] Extracted questions can be reviewed and corrected.
- [ ] Saved quizzes remain available after refreshing the host page.
- [ ] Participants receive the same questions in the correct order.
- [ ] Correct answers remain hidden until the reveal.
- [ ] Both host and participants can see explanations after the reveal.
- [ ] Timers and scoring work correctly.
- [ ] The leaderboard and final winner are displayed correctly.
- [ ] Different rooms remain isolated.
- [ ] Existing UI styling and default game functionality remain unchanged.

## 🚀 Future Enhancements

Potential future improvements include:

- Additional document formats.
- Improved extraction for complex PDFs and tables.
- Optional AI-assisted question generation and document parsing.
- Quiz categories and difficulty levels.
- Quiz export and import between devices.
- Persistent multiplayer sessions and reconnect recovery.
- Additional scoring modes and question types.

These are potential extensions, not claims that every feature is currently implemented.

## 👩‍💻 Author

**Jui Tawde**

GitHub: [@juitawde](https://github.com/juitawde)

## 📄 License

Add a license file to the repository if you intend to distribute the project under an open-source license.

---

Built to make multiplayer quizzes more interactive, customizable, and educational — one question at a time. 🧠
