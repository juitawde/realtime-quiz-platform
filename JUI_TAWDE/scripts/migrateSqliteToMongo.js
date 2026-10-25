const path = require("path");
const fs = require("fs");
const { connectDB, disconnectDB } = require("../config/database");
const {
  User,
  Session,
  QuizSession,
  QuizParticipant,
  QuestionResult
} = require("../models");

async function migrate() {
  const sqliteDbPath = path.resolve(__dirname, "..", "data", "quiz_platform.db");

  if (!fs.existsSync(sqliteDbPath)) {
    console.log(`[Migration] SQLite database not found at ${sqliteDbPath}. Migration skipped.`);
    return;
  }

  // Use better-sqlite3 for reading the legacy DB during migration
  let Database;
  try {
    Database = require("better-sqlite3");
  } catch (err) {
    console.error("[Migration] better-sqlite3 is required to run the one-time migration:", err.message);
    return;
  }

  console.log(`[Migration] Opening SQLite database at ${sqliteDbPath}...`);
  const sqliteDb = new Database(sqliteDbPath, { readonly: true });

  await connectDB();
  console.log("[Migration] Connected to MongoDB. Starting data transfer...");

  let userCount = 0;
  let sessionCount = 0;
  let quizSessionCount = 0;
  let participantCount = 0;
  let questionResultCount = 0;

  try {
    // 1. Migrate Users
    const users = sqliteDb.prepare("SELECT * FROM users").all();
    for (const u of users) {
      await User.updateOne(
        { id: u.id },
        {
          $set: {
            id: u.id,
            displayName: u.display_name,
            email: String(u.email).toLowerCase().trim(),
            passwordHash: u.password_hash,
            createdAt: u.created_at ? new Date(u.created_at) : new Date()
          }
        },
        { upsert: true }
      );
      userCount++;
    }
    console.log(`[Migration] ✓ Migrated ${userCount} users.`);

    // 2. Migrate Sessions (auth tokens)
    try {
      const sessions = sqliteDb.prepare("SELECT * FROM sessions").all();
      for (const s of sessions) {
        await Session.updateOne(
          { id: s.id },
          {
            $set: {
              id: s.id,
              userId: s.user_id,
              expiresAt: new Date(s.expires_at),
              createdAt: s.created_at ? new Date(s.created_at) : new Date()
            }
          },
          { upsert: true }
        );
        sessionCount++;
      }
      console.log(`[Migration] ✓ Migrated ${sessionCount} auth sessions.`);
    } catch (e) {
      console.warn(`[Migration] Sessions table note: ${e.message}`);
    }

    // 3. Migrate Quiz Sessions
    const quizSessions = sqliteDb.prepare("SELECT * FROM quiz_sessions").all();
    for (const qs of quizSessions) {
      await QuizSession.updateOne(
        { id: qs.id },
        {
          $set: {
            id: qs.id,
            pin: qs.pin,
            hostUserId: qs.host_user_id || null,
            hostName: qs.host_name || "Host",
            quizTitle: qs.quiz_title,
            category: qs.category || "Mixed",
            totalQuestions: qs.total_questions || 0,
            questionsJson: qs.questions_json || "[]",
            status: qs.status || "completed",
            startTime: qs.start_time ? new Date(qs.start_time) : new Date(),
            endTime: qs.end_time ? new Date(qs.end_time) : null,
            durationSeconds: qs.duration_seconds || 0,
            participantsCount: qs.participants_count || 0,
            winnerName: qs.winner_name || null,
            winnerScore: qs.winner_score !== null ? qs.winner_score : null,
            createdAt: qs.created_at ? new Date(qs.created_at) : new Date()
          }
        },
        { upsert: true }
      );
      quizSessionCount++;
    }
    console.log(`[Migration] ✓ Migrated ${quizSessionCount} quiz sessions.`);

    // 4. Migrate Participants
    const participants = sqliteDb.prepare("SELECT * FROM quiz_participants").all();
    for (const p of participants) {
      await QuizParticipant.updateOne(
        { id: p.id },
        {
          $set: {
            id: p.id,
            quizSessionId: p.quiz_session_id,
            userId: p.user_id || null,
            socketId: p.socket_id || "",
            playerName: p.player_name,
            score: p.score || 0,
            rank: p.rank !== null ? p.rank : null,
            correctCount: p.correct_count || 0,
            incorrectCount: p.incorrect_count || 0,
            unansweredCount: p.unanswered_count || 0,
            totalResponseTimeMs: p.total_response_time_ms || 0,
            avgResponseTimeMs: p.avg_response_time_ms || 0,
            createdAt: p.created_at ? new Date(p.created_at) : new Date()
          }
        },
        { upsert: true }
      );
      participantCount++;
    }
    console.log(`[Migration] ✓ Migrated ${participantCount} quiz participants.`);

    // 5. Migrate Question Results
    const qResults = sqliteDb.prepare("SELECT * FROM question_results").all();
    for (const qr of qResults) {
      await QuestionResult.updateOne(
        {
          quizSessionId: qr.quiz_session_id,
          participantId: qr.participant_id,
          questionIndex: qr.question_index
        },
        {
          $set: {
            id: qr.id,
            quizSessionId: qr.quiz_session_id,
            participantId: qr.participant_id,
            questionIndex: qr.question_index,
            questionText: qr.question_text,
            selectedOption: qr.selected_option !== null ? qr.selected_option : null,
            selectedText: qr.selected_text || null,
            correctOption: qr.correct_option,
            correctText: qr.correct_text,
            isCorrect: qr.is_correct || 0,
            isUnanswered: qr.is_unanswered || 0,
            responseTimeMs: qr.response_time_ms || 0,
            pointsEarned: qr.points_earned || 0,
            explanation: qr.explanation || "",
            answeredAt: qr.answered_at ? new Date(qr.answered_at) : new Date()
          }
        },
        { upsert: true }
      );
      questionResultCount++;
    }
    console.log(`[Migration] ✓ Migrated ${questionResultCount} question results.`);

    // Verify MongoDB counts
    const mongoUsers = await User.countDocuments();
    const mongoSessions = await QuizSession.countDocuments();
    const mongoParticipants = await QuizParticipant.countDocuments();
    const mongoResults = await QuestionResult.countDocuments();

    console.log("\n==================================================");
    console.log("[Migration] Complete! Verified record totals in MongoDB:");
    console.log(`- Users: ${mongoUsers}`);
    console.log(`- Quiz Sessions: ${mongoSessions}`);
    console.log(`- Participants: ${mongoParticipants}`);
    console.log(`- Question Results: ${mongoResults}`);
    console.log("==================================================\n");
  } catch (err) {
    console.error("[Migration] Error during migration:", err);
  } finally {
    sqliteDb.close();
    await disconnectDB();
  }
}

if (require.main === module) {
  migrate().catch(console.error);
}

module.exports = { migrate };
