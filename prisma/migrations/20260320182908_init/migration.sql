-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'student',
    "status" TEXT NOT NULL DEFAULT 'active',
    "targetBand" REAL,
    "avatarUrl" TEXT,
    "provider" TEXT,
    "providerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mode" TEXT NOT NULL,
    "academicOrGeneral" TEXT NOT NULL DEFAULT 'academic',
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "durationMinutes" INTEGER NOT NULL,
    "publishedStatus" TEXT NOT NULL DEFAULT 'draft',
    "currentVersionId" TEXT,
    "blueprintId" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestPack_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "TestBlueprint" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestPackVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testPackId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" DATETIME,
    CONSTRAINT "TestPackVersion_testPackId_fkey" FOREIGN KEY ("testPackId") REFERENCES "TestPack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestBlueprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "sectionBlueprintsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testPackId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "instructionsText" TEXT,
    "timerSeconds" INTEGER NOT NULL,
    "navigationRules" TEXT,
    "interPartPause" INTEGER,
    "metadata" TEXT,
    CONSTRAINT "Section_testPackId_fkey" FOREIGN KEY ("testPackId") REFERENCES "TestPack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "durationSecs" REAL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PassageOrPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "title" TEXT,
    "contentHtml" TEXT NOT NULL,
    "assetId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "paragraphAnchors" TEXT,
    CONSTRAINT "PassageOrPrompt_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PassageOrPrompt_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ContentAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "linkedPassageOrPromptId" TEXT,
    "title" TEXT,
    "instructionsText" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "partNumber" INTEGER,
    CONSTRAINT "QuestionGroup_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestionGroup_linkedPassageOrPromptId_fkey" FOREIGN KEY ("linkedPassageOrPromptId") REFERENCES "PassageOrPrompt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "optionsJson" TEXT,
    "answerSchemaJson" TEXT NOT NULL,
    "answerVariantsJson" TEXT,
    "validationRules" TEXT,
    "explanationText" TEXT,
    "subSkillTags" TEXT,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "orderIndex" INTEGER NOT NULL,
    "audioTimestamp" REAL,
    "imageUrl" TEXT,
    CONSTRAINT "Question_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "QuestionGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "testPackId" TEXT NOT NULL,
    "testPackVersionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "mode" TEXT NOT NULL DEFAULT 'simulation',
    "startedAt" DATETIME,
    "submittedAt" DATETIME,
    "finalScoreStatus" TEXT,
    "overallBandEstimate" REAL,
    "deviceInfo" TEXT,
    "browserInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attempt_testPackId_fkey" FOREIGN KEY ("testPackId") REFERENCES "TestPack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attempt_testPackVersionId_fkey" FOREIGN KEY ("testPackVersionId") REFERENCES "TestPackVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SectionAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "startedAt" DATETIME,
    "submittedAt" DATETIME,
    "timerRemainingSeconds" INTEGER,
    "rawScore" INTEGER,
    "bandScoreEstimate" REAL,
    "timeSpentSeconds" INTEGER,
    "currentPartNumber" INTEGER,
    CONSTRAINT "SectionAttempt_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SectionAttempt_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionAttemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerValueJson" TEXT,
    "isCorrect" BOOLEAN,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "timeSpentSeconds" INTEGER,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Answer_sectionAttemptId_fkey" FOREIGN KEY ("sectionAttemptId") REFERENCES "SectionAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WritingSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionAttemptId" TEXT NOT NULL,
    "taskNumber" INTEGER NOT NULL,
    "contentText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "evaluationStatus" TEXT NOT NULL DEFAULT 'pending',
    "assignedEvaluatorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WritingSubmission_sectionAttemptId_fkey" FOREIGN KEY ("sectionAttemptId") REFERENCES "SectionAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WritingSubmission_assignedEvaluatorId_fkey" FOREIGN KEY ("assignedEvaluatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpeakingSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionAttemptId" TEXT NOT NULL,
    "partNumber" INTEGER NOT NULL,
    "audioAssetId" TEXT,
    "durationSeconds" REAL,
    "transcriptText" TEXT,
    "evaluationStatus" TEXT NOT NULL DEFAULT 'pending',
    "assignedEvaluatorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpeakingSubmission_sectionAttemptId_fkey" FOREIGN KEY ("sectionAttemptId") REFERENCES "SectionAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SpeakingSubmission_audioAssetId_fkey" FOREIGN KEY ("audioAssetId") REFERENCES "ContentAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SpeakingSubmission_assignedEvaluatorId_fkey" FOREIGN KEY ("assignedEvaluatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionType" TEXT NOT NULL,
    "writingSubmissionId" TEXT,
    "speakingSubmissionId" TEXT,
    "evaluatorId" TEXT NOT NULL,
    "rubricScoresJson" TEXT NOT NULL,
    "overallBand" REAL,
    "feedbackText" TEXT,
    "improvementAreas" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" DATETIME,
    CONSTRAINT "Evaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_writingSubmissionId_fkey" FOREIGN KEY ("writingSubmissionId") REFERENCES "WritingSubmission" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_speakingSubmissionId_fkey" FOREIGN KEY ("speakingSubmissionId") REFERENCES "SpeakingSubmission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoringConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testPackId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "rawToBandMap" TEXT NOT NULL,
    "roundingRules" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ScoringConfig_testPackId_fkey" FOREIGN KEY ("testPackId") REFERENCES "TestPack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionTypePerformance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "subSkillTag" TEXT,
    "totalAttempted" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "accuracyPercentage" REAL NOT NULL DEFAULT 0,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionTypePerformance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValueJson" TEXT,
    "newValueJson" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
