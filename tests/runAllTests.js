const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { io: ioClient } = require('../JUI_TAWDE/node_modules/socket.io-client');

// Import application modules
const { validateQuestion, validateQuiz } = require('../JUI_TAWDE/utils/quizValidation');
const QuizParser = require('../JUI_TAWDE/public/js/quizParser');
const { parseUploadedDocument } = require('../JUI_TAWDE/services/documentParser');

let totalTests = 0;
let passedTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        passedTests++;
        console.log(`  ✓ ${desc}`);
      }).catch(err => {
        console.error(`  ✕ ${desc}`);
        console.error(`    ${err.message}`);
        throw err;
      });
    }
    passedTests++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✕ ${desc}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function runTests() {
  console.log('\n==================================================');
  console.log('--- 1. QUIZ SCHEMA & VALIDATION TESTS ---');
  console.log('==================================================');

  it('validates a well-formed question', () => {
    const q = {
      question: 'What is Node.js?',
      options: ['Runtime', 'Language', 'Database', 'IDE'],
      correctOption: 0,
      explanation: 'Node.js is a JavaScript runtime built on Chrome V8.'
    };
    const res = validateQuestion(q, 0);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.sanitized.correctOption, 0);
    assert.strictEqual(res.sanitized.timeLimitSeconds, 15);
  });

  it('rejects question with missing question text', () => {
    const q = {
      question: '   ',
      options: ['A', 'B'],
      correctOption: 0,
      explanation: 'Some explanation'
    };
    const res = validateQuestion(q, 0);
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('non-empty question text')));
  });

  it('rejects question with fewer than 2 options', () => {
    const q = {
      question: 'Valid question?',
      options: ['Only One Option'],
      correctOption: 0,
      explanation: 'Some explanation'
    };
    const res = validateQuestion(q, 0);
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('at least 2 options')));
  });

  it('rejects question with empty option string', () => {
    const q = {
      question: 'Valid question?',
      options: ['Option A', '   '],
      correctOption: 0,
      explanation: 'Some explanation'
    };
    const res = validateQuestion(q, 0);
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('cannot be empty')));
  });

  it('rejects question with invalid correctOption index', () => {
    const q = {
      question: 'Valid question?',
      options: ['A', 'B'],
      correctOption: 5,
      explanation: 'Some explanation'
    };
    const res = validateQuestion(q, 0);
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('valid correct answer')));
  });

  it('rejects question with empty explanation', () => {
    const q = {
      question: 'Valid question?',
      options: ['A', 'B'],
      correctOption: 0,
      explanation: '   '
    };
    const res = validateQuestion(q, 0);
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('non-empty explanation')));
  });

  it('validates a complete quiz object', () => {
    const quiz = {
      title: 'Full Stack JavaScript',
      questions: [
        {
          question: 'Q1?',
          options: ['A', 'B', 'C'],
          correctOption: 1,
          explanation: 'Reason 1'
        },
        {
          question: 'Q2?',
          options: ['X', 'Y'],
          correctOption: 0,
          explanation: 'Reason 2'
        }
      ]
    };
    const res = validateQuiz(quiz, 2);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.sanitized.questionCount, 2);
  });

  it('rejects quiz if count does not match desiredCount', () => {
    const quiz = {
      title: 'Sample Quiz',
      questions: [
        {
          question: 'Q1?',
          options: ['A', 'B'],
          correctOption: 0,
          explanation: 'Reason'
        }
      ]
    };
    const res = validateQuiz(quiz, 3);
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('must match selected count')));
  });

  console.log('\n==================================================');
  console.log('--- 2. DOCUMENT PARSER & EXTRACTION TESTS ---');
  console.log('==================================================');

  const fixturesDir = path.join(__dirname, 'fixtures');

  await it('parses Plain Text file (.txt)', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'sample_quiz.txt'));
    const res = await parseUploadedDocument(buffer, 'sample_quiz.txt', 'text/plain');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.questions.length, 2);
    assert.strictEqual(res.questions[0].question, 'Which protocol is used for secure web communication?');
    assert.strictEqual(res.questions[0].correctOption, 1); // Option B
    assert(res.questions[0].explanation.includes('HTTPS uses TLS'));
  });

  await it('parses Markdown file (.md) with checkboxes', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'sample_quiz.md'));
    const res = await parseUploadedDocument(buffer, 'sample_quiz.md', 'text/markdown');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.questions.length, 2);
    // Port 80 answer is C -> index 2
    assert.strictEqual(res.questions[0].correctOption, 2);
    // FIFO Queue marked with [x] -> index 1
    assert.strictEqual(res.questions[1].correctOption, 1);
  });

  await it('parses text document with separate answer key at the end', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'sample_separate_key.txt'));
    const res = await parseUploadedDocument(buffer, 'sample_separate_key.txt', 'text/plain');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.questions.length, 2);
    assert.strictEqual(res.questions[0].correctOption, 2); // Paris -> C
    assert(res.questions[0].explanation.includes('capital and largest city of France'));
    assert.strictEqual(res.questions[1].correctOption, 1); // 4 -> B
  });

  await it('parses CSV spreadsheet file (.csv)', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'sample_quiz.csv'));
    const res = await parseUploadedDocument(buffer, 'sample_quiz.csv', 'text/csv');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.questions.length, 2);
    assert.strictEqual(res.questions[0].correctOption, 1); // JavaScript -> B
    assert.strictEqual(res.questions[1].correctOption, 0); // color -> A
  });

  await it('parses Excel workbook (.xlsx)', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'sample_quiz.xlsx'));
    const res = await parseUploadedDocument(buffer, 'sample_quiz.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.sheetNames.length, 1);
    assert.strictEqual(res.questions.length, 2);
    assert.strictEqual(res.questions[0].correctOption, 0); // DOM -> A
    assert.strictEqual(res.questions[1].correctOption, 1); // <ul> -> B
  });

  await it('parses Word document (.docx)', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'sample_quiz.docx'));
    const res = await parseUploadedDocument(buffer, 'sample_quiz.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.questions.length, 2);
    assert.strictEqual(res.questions[0].correctOption, 0); // Resource management -> A
    assert.strictEqual(res.questions[1].correctOption, 1); // FCFS -> B
  });

  await it('parses PDF document (.pdf)', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'sample_quiz.pdf'));
    const res = await parseUploadedDocument(buffer, 'sample_quiz.pdf', 'application/pdf');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.questions.length, 1);
    assert.strictEqual(res.questions[0].correctOption, 1); // DNS -> B
    assert(res.questions[0].explanation.includes('DNS resolves human-readable'));
  });

  await it('parses JSON quiz file (.json)', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'sample_quiz.json'));
    const res = await parseUploadedDocument(buffer, 'sample_quiz.json', 'application/json');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.questions.length, 2);
    assert.strictEqual(res.title, 'Computer Architecture Trivia');
  });

  await it('handles invalid JSON gracefully with informative error', async () => {
    const buffer = fs.readFileSync(path.join(fixturesDir, 'invalid_quiz.json'));
    const res = await parseUploadedDocument(buffer, 'invalid_quiz.json', 'application/json');
    assert.strictEqual(res.ok, false);
    assert(res.error.includes('JSON'));
  });

  console.log('\n==================================================');
  console.log('--- 3. MULTIPLAYER SOCKET & EXPLANATION TESTS ---');
  console.log('==================================================');

  // Boot server on dynamic port for integration testing
  const express = require('../JUI_TAWDE/node_modules/express');
  const { Server } = require('../JUI_TAWDE/node_modules/socket.io');
  const { registerLobbyHandlers } = require('../JUI_TAWDE/sockets/lobbyHandler');
  const { registerGameHandlers } = require('../JUI_TAWDE/sockets/gameEngine');

  const multer = require('../JUI_TAWDE/node_modules/multer');
  const upload = multer({ storage: multer.memoryStorage() });
  const defaultQuestions = require('../JUI_TAWDE/data/questions.json');

  const app = express();
  app.use(express.json());

  app.get('/health', (_, res) => res.json({ status: 'ok', service: 'quiz-battle' }));
  app.get('/api/quiz/default', (_, res) => res.json({ title: 'Default Quiz', questionCount: defaultQuestions.length, questions: defaultQuestions }));
  app.post('/api/quiz/validate', (req, res) => res.json(validateQuiz(req.body, req.query.desiredCount)));
  app.post('/api/quiz/parse-file', upload.single('quizFile'), async (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No file' });
    const result = await parseUploadedDocument(req.file.buffer, req.file.originalname, req.file.mimetype, {
      useAI: req.body.useAI === 'true'
    });
    res.json(result);
  });

  const testHttpServer = http.createServer(app);
  const testIo = new Server(testHttpServer, { cors: { origin: '*' } });
  const testRooms = new Map();

  registerLobbyHandlers(testIo, testRooms);
  registerGameHandlers(testIo, testRooms);

  const testPort = 5555;
  await new Promise(resolve => testHttpServer.listen(testPort, resolve));

  const serverUrl = `http://localhost:${testPort}`;

  function createClientSocket() {
    return ioClient(serverUrl, { transports: ['websocket'], forceNew: true });
  }

  await it('Host creates room with Custom Quiz and players receive shared explanations', async () => {
    const hostSocket = createClientSocket();
    const player1Socket = createClientSocket();
    const player2Socket = createClientSocket();

    await new Promise(r => hostSocket.on('connect', r));
    await new Promise(r => player1Socket.on('connect', r));
    await new Promise(r => player2Socket.on('connect', r));

    const customQuiz = {
      title: 'Real-time Multiplayer Test Quiz',
      questions: [
        {
          question: 'What does TCP stand for?',
          options: ['Transmission Control Protocol', 'Total Control Packet', 'Transfer Communication Path', 'Target Control Program'],
          correctOption: 0,
          explanation: 'Transmission Control Protocol provides reliable, ordered data stream delivery.',
          timeLimitSeconds: 15
        },
        {
          question: 'Which HTTP method is idempotent?',
          options: ['POST', 'GET', 'PATCH', 'CONNECT'],
          correctOption: 1,
          explanation: 'GET requests can be repeated safely without modifying server state.',
          timeLimitSeconds: 15
        }
      ]
    };

    // 1. Host creates custom quiz room
    const createRes = await new Promise(resolve => {
      hostSocket.emit('quiz:create', {
        hostName: 'TestHost',
        category: 'Networking',
        customQuiz
      }, resolve);
    });

    assert.strictEqual(createRes.ok, true);
    const pin = createRes.pin;
    assert.strictEqual(createRes.questionCount, 2);

    // 2. Players join room
    const p1Join = await new Promise(resolve => {
      player1Socket.emit('quiz:join', { pin, playerName: 'Alice' }, resolve);
    });
    assert.strictEqual(p1Join.ok, true);

    const p2Join = await new Promise(resolve => {
      player2Socket.emit('quiz:join', { pin, playerName: 'Bob' }, resolve);
    });
    assert.strictEqual(p2Join.ok, true);

    // Duplicate player name rejection test
    const dupJoin = await new Promise(resolve => {
      const p3 = createClientSocket();
      p3.on('connect', () => {
        p3.emit('quiz:join', { pin, playerName: 'alice' }, res => {
          p3.disconnect();
          resolve(res);
        });
      });
    });
    assert.strictEqual(dupJoin.ok, false);
    assert(dupJoin.message.includes('already in use'));

    // 3. Host starts quiz
    const startRes = await new Promise(resolve => {
      hostSocket.emit('quiz:start', { pin }, resolve);
    });
    assert.strictEqual(startRes.ok, true);

    // Host signals ready
    hostSocket.emit('quiz:ready', { pin });

    // 4. Verify question:start payload sent to players does NOT leak answer or explanation
    const [p1Question] = await Promise.all([
      new Promise(resolve => player1Socket.on('question:start', resolve)),
      new Promise(resolve => player2Socket.on('question:start', resolve))
    ]);

    assert.strictEqual(p1Question.questionIndex, 1);
    assert.strictEqual(p1Question.totalQuestions, 2);
    assert.strictEqual(p1Question.question, 'What does TCP stand for?');
    assert.strictEqual(p1Question.options.length, 4);
    assert.strictEqual(p1Question.correctOption, undefined, 'ANTI-CHEAT: correctOption must not be sent on start');
    assert.strictEqual(p1Question.explanation, undefined, 'ANTI-CHEAT: explanation must not be sent on start');

    // 5. Attach time_up listeners before answer submission so immediate time_up is caught
    const hostTimeUpPromise = new Promise(resolve => hostSocket.once('question:time_up', resolve));
    const p1TimeUpPromise = new Promise(resolve => player1Socket.once('question:time_up', resolve));
    const p2TimeUpPromise = new Promise(resolve => player2Socket.once('question:time_up', resolve));

    // Submit answers: Alice correct (opt 0), Bob incorrect (opt 1)
    const [aliceAns, bobAns] = await Promise.all([
      new Promise(resolve => player1Socket.emit('answer:submit', { pin, selectedOption: 0, timeTakenMs: 1200 }, resolve)),
      new Promise(resolve => player2Socket.emit('answer:submit', { pin, selectedOption: 1, timeTakenMs: 1800 }, resolve))
    ]);

    assert.strictEqual(aliceAns.isCorrect, true);
    assert(aliceAns.score >= 500);
    assert.strictEqual(bobAns.isCorrect, false);
    assert.strictEqual(bobAns.score, 0);

    // 6. Verify BOTH host and participants receive question:time_up with explanation
    const [hostTimeUp, p1TimeUp, p2TimeUp] = await Promise.all([
      hostTimeUpPromise,
      p1TimeUpPromise,
      p2TimeUpPromise
    ]);

    assert.strictEqual(hostTimeUp.correctOption, 0);
    assert.strictEqual(p1TimeUp.correctOption, 0);
    assert.strictEqual(p2TimeUp.correctOption, 0);

    // FEATURE H CHECK: Explanations visible to BOTH host and player!
    assert.strictEqual(hostTimeUp.explanation, 'Transmission Control Protocol provides reliable, ordered data stream delivery.');
    assert.strictEqual(p1TimeUp.explanation, 'Transmission Control Protocol provides reliable, ordered data stream delivery.');
    assert.strictEqual(p2TimeUp.explanation, 'Transmission Control Protocol provides reliable, ordered data stream delivery.');

    hostSocket.disconnect();
    player1Socket.disconnect();
    player2Socket.disconnect();
  });

  await it('Default Quiz still works without modification (regression test)', async () => {
    const host = createClientSocket();
    const player = createClientSocket();

    await new Promise(r => host.on('connect', r));
    await new Promise(r => player.on('connect', r));

    const createRes = await new Promise(r => host.emit('quiz:create', { hostName: 'DefaultHost' }, r));
    assert.strictEqual(createRes.ok, true);
    assert.strictEqual(createRes.questionCount, 5); // default questions length is 5

    const joinRes = await new Promise(r => player.emit('quiz:join', { pin: createRes.pin, playerName: 'Charlie' }, r));
    assert.strictEqual(joinRes.ok, true);

    await new Promise(r => host.emit('quiz:start', { pin: createRes.pin }, r));
    const qPromise = new Promise(r => player.on('question:start', r));
    host.emit('quiz:ready', { pin: createRes.pin });

    const q = await qPromise;
    assert.strictEqual(q.question, 'What is Node.js runtime based on?');
    assert.strictEqual(q.totalQuestions, 5);

    host.disconnect();
    player.disconnect();
  });

  await it('Two concurrent rooms remain isolated with different custom quizzes', async () => {
    const hostA = createClientSocket();
    const hostB = createClientSocket();
    const playerA = createClientSocket();
    const playerB = createClientSocket();

    await Promise.all([
      new Promise(r => hostA.on('connect', r)),
      new Promise(r => hostB.on('connect', r)),
      new Promise(r => playerA.on('connect', r)),
      new Promise(r => playerB.on('connect', r))
    ]);

    const quizA = {
      title: 'Quiz A',
      questions: [{ question: 'Question A1?', options: ['A1', 'A2'], correctOption: 0, explanation: 'Exp A' }]
    };
    const quizB = {
      title: 'Quiz B',
      questions: [{ question: 'Question B1?', options: ['B1', 'B2'], correctOption: 1, explanation: 'Exp B' }]
    };

    const resA = await new Promise(r => hostA.emit('quiz:create', { customQuiz: quizA }, r));
    const resB = await new Promise(r => hostB.emit('quiz:create', { customQuiz: quizB }, r));

    assert.notStrictEqual(resA.pin, resB.pin);

    await new Promise(r => playerA.emit('quiz:join', { pin: resA.pin, playerName: 'PlayerA' }, r));
    await new Promise(r => playerB.emit('quiz:join', { pin: resB.pin, playerName: 'PlayerB' }, r));

    await new Promise(r => hostA.emit('quiz:start', { pin: resA.pin }, r));
    await new Promise(r => hostB.emit('quiz:start', { pin: resB.pin }, r));

    const qPromiseA = new Promise(r => playerA.on('question:start', r));
    const qPromiseB = new Promise(r => playerB.on('question:start', r));
    hostA.emit('quiz:ready', { pin: resA.pin });
    hostB.emit('quiz:ready', { pin: resB.pin });

    const [qA, qB] = await Promise.all([qPromiseA, qPromiseB]);

    assert.strictEqual(qA.question, 'Question A1?');
    assert.strictEqual(qB.question, 'Question B1?');

    hostA.disconnect();
    hostB.disconnect();
    playerA.disconnect();
    playerB.disconnect();
  });

  console.log('\n==================================================');
  console.log('--- 4. HTTP API INTEGRATION TESTS ---');
  console.log('==================================================');

  await it('GET /health returns status ok', async () => {
    const res = await fetch(`${serverUrl}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
  });

  await it('GET /api/quiz/default returns default quiz bank', async () => {
    const res = await fetch(`${serverUrl}/api/quiz/default`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.questionCount, 5);
    assert.strictEqual(body.questions.length, 5);
  });

  await it('POST /api/quiz/validate validates quiz payload', async () => {
    const res = await fetch(`${serverUrl}/api/quiz/validate?desiredCount=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Single Question Quiz',
        questions: [{
          question: 'Is testing essential?',
          options: ['Yes', 'No'],
          correctOption: 0,
          explanation: 'Testing ensures software reliability.'
        }]
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.valid, true);
    assert.strictEqual(body.sanitized.questions.length, 1);
  });

  await it('POST /api/quiz/parse-file accepts multipart file upload', async () => {
    const fileBytes = fs.readFileSync(path.join(fixturesDir, 'sample_quiz.txt'));
    const formData = new FormData();
    const blob = new Blob([fileBytes], { type: 'text/plain' });
    formData.append('quizFile', blob, 'sample_quiz.txt');

    const res = await fetch(`${serverUrl}/api/quiz/parse-file`, {
      method: 'POST',
      body: formData
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.questions.length, 2);
  });

  testHttpServer.close();

  console.log('\n==================================================');
  console.log(`ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log('==================================================\n');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
