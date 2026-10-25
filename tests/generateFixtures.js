const fs = require('fs');
const path = require('path');
const xlsx = require('../JUI_TAWDE/node_modules/xlsx');

const fixturesDir = path.join(__dirname, 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// 1. Plain Text
const sampleTxt = `Question 1: Which protocol is used for secure web communication?
A. HTTP
B. HTTPS
C. FTP
D. SMTP
Answer: B
Explanation: HTTPS uses TLS encryption for secure communication.

Question 2: What is the primary function of DNS?
A. Routing email
B. Resolving domain names to IP addresses
C. Encrypting data packets
D. Allocating MAC addresses
Answer: B
Explanation: DNS translates human-friendly domains into machine IP addresses.
`;
fs.writeFileSync(path.join(fixturesDir, 'sample_quiz.txt'), sampleTxt, 'utf8');

// 2. Markdown
const sampleMd = `# Networking & Web Quiz

### 1. Which port does HTTP standardly use?
- (A) 21
- (B) 22
- (C) 80
- (D) 443
Answer: C
Explanation: Port 80 is the default port for unencrypted HTTP traffic.

### 2. Which data structure is FIFO?
- [ ] Stack
- [x] Queue
- [ ] Tree
- [ ] Graph
Explanation: A Queue follows the First-In, First-Out principle.
`;
fs.writeFileSync(path.join(fixturesDir, 'sample_quiz.md'), sampleMd, 'utf8');

// 3. Separate Answer Key Text
const sampleSeparateKey = `1. What is the capital of France?
A) Madrid
B) Berlin
C) Paris
D) Rome

2. What is 2 + 2?
A) 3
B) 4
C) 5
D) 6

Answer Key:
1. C - Paris is the capital and largest city of France.
2. B - 2 plus 2 equals 4.
`;
fs.writeFileSync(path.join(fixturesDir, 'sample_separate_key.txt'), sampleSeparateKey, 'utf8');

// 4. CSV
const sampleCsv = `Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation
Which language runs natively in web browsers?,C++,JavaScript,SQL,Rust,B,JavaScript is the native programming language of web browsers.
Which CSS property changes text color?,color,background-color,font-style,text-align,A,The color property specifies the foreground color of text.
`;
fs.writeFileSync(path.join(fixturesDir, 'sample_quiz.csv'), sampleCsv, 'utf8');

// 5. Valid JSON
const sampleJson = {
  title: "Computer Architecture Trivia",
  questions: [
    {
      question: "Which component is considered the brain of the computer?",
      options: ["RAM", "CPU", "Hard Drive", "GPU"],
      correctOption: 1,
      explanation: "The Central Processing Unit (CPU) executes instructions.",
      timeLimitSeconds: 15
    },
    {
      question: "Which memory is volatile?",
      options: ["ROM", "RAM", "Flash SSD", "Optical Disc"],
      correctOption: 1,
      explanation: "RAM loses its stored data when power is turned off.",
      timeLimitSeconds: 20
    }
  ]
};
fs.writeFileSync(path.join(fixturesDir, 'sample_quiz.json'), JSON.stringify(sampleJson, null, 2), 'utf8');

// 6. Invalid JSON
fs.writeFileSync(path.join(fixturesDir, 'invalid_quiz.json'), '{ "title": "Broken", questions: [ }', 'utf8');

// 7. Excel XLSX
const wb = xlsx.utils.book_new();
const wsData = [
  ["Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Explanation"],
  ["What does DOM stand for?", "Document Object Model", "Data Oriented Module", "Digital Ordinance Map", "Desktop Online Mode", "A", "DOM stands for Document Object Model."],
  ["Which HTML tag is used for bulleted lists?", "<ol>", "<ul>", "<li>", "<dl>", "B", "<ul> defines an unordered (bulleted) list."]
];
const ws = xlsx.utils.aoa_to_sheet(wsData);
xlsx.utils.book_append_sheet(wb, ws, "QuizQuestions");
xlsx.writeFile(wb, path.join(fixturesDir, 'sample_quiz.xlsx'));

console.log('Test fixtures generated successfully.');
