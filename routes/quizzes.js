const express = require("express");
const router = express.Router();
const Quiz = require("../models/Quiz");

// @route   GET /api/quizzes
// @desc    Get all quizzes
// @access  Public
router.get("/", async (req, res) => {
  try {
    const quizzes = await Quiz.find({}).sort({ dueDate: 1 }); // Sort by due date ascending
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// @route   GET /api/quizzes/:id
// @desc    Get single quiz by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.json(quiz);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(500).json({ message: "Server Error" });
  }
});

// @route   POST /api/quizzes
// @desc    Create a new quiz
// @access  Private (will be protected later)
router.post("/", async (req, res) => {
  try {
    const { title, course, topic, dueDate, questions } = req.body;

    // Validate required fields
    if (!title || !course || !topic || !dueDate) {
      return res.status(400).json({
        message:
          "Please provide all required fields: title, course, topic, dueDate",
      });
    }

    // Validate date format
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      return res.status(400).json({
        message:
          "Invalid date format for dueDate. Please use ISO 8601 format (e.g., 2024-03-20T15:00:00Z)",
      });
    }

    // Validate questions if provided
    if (questions && Array.isArray(questions)) {
      for (const question of questions) {
        if (
          !question.description ||
          !Array.isArray(question.answers) ||
          question.answers.length !== 4
        ) {
          return res.status(400).json({
            message:
              "Each question must have a description and exactly 4 answers.",
          });
        }
        for (const answer of question.answers) {
          if (
            typeof answer.text !== "string" ||
            typeof answer.isCorrect !== "boolean"
          ) {
            return res.status(400).json({
              message:
                "Each answer must have text (string) and isCorrect (boolean).",
            });
          }
        }
      }
    } else if (questions) {
      return res.status(400).json({
        message: "Questions must be provided as an array.",
      });
    }

    const quiz = new Quiz({
      title,
      course,
      topic,
      dueDate: dueDateObj,
      questions: questions || [], // Initialize with empty array if not provided
    });

    const savedQuiz = await quiz.save();
    res.status(201).json(savedQuiz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @route   PUT /api/quizzes/:id
// @desc    Update a quiz
// @access  Private (will be protected later)
router.put("/:id", async (req, res) => {
  try {
    const { title, course, topic, dueDate, questions } = req.body;

    // Build quiz object
    const quizFields = {};
    if (title) quizFields.title = title;
    if (course) quizFields.course = course;
    if (topic) quizFields.topic = topic;
    if (dueDate) {
      // Validate date format if provided
      const dueDateObj = new Date(dueDate);
      if (isNaN(dueDateObj.getTime())) {
        return res.status(400).json({
          message:
            "Invalid date format for dueDate. Please use ISO 8601 format (e.g., 2024-03-20T15:00:00Z)",
        });
      }
      quizFields.dueDate = dueDateObj;
    }

    // Validate and add questions if provided
    if (questions) {
      if (!Array.isArray(questions)) {
        return res.status(400).json({
          message: "Questions must be provided as an array.",
        });
      }
      for (const question of questions) {
        if (
          !question.description ||
          !Array.isArray(question.answers) ||
          question.answers.length !== 4
        ) {
          return res.status(400).json({
            message:
              "Each question must have a description and exactly 4 answers.",
          });
        }
        for (const answer of question.answers) {
          if (
            typeof answer.text !== "string" ||
            typeof answer.isCorrect !== "boolean"
          ) {
            return res.status(400).json({
              message:
                "Each answer must have text (string) and isCorrect (boolean).",
            });
          }
        }
      }
      quizFields.questions = questions;
    }

    let quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { $set: quizFields },
      { new: true }
    );

    res.json(quiz);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Quiz not found" });
    }
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @route   DELETE /api/quizzes/:id
// @desc    Delete a quiz
// @access  Private (will be protected later)
router.delete("/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    await quiz.deleteOne();
    res.json({ message: "Quiz removed" });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Quiz not found" });
    }
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @route   POST /api/quizzes/:id/submit
// @desc    Submit quiz answers and get grade
// @access  Public (for now, can be protected later)
router.post("/:id/submit", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const submittedAnswers = req.body; // Expecting an array of { questionId: string, selectedAnswerIndex: number }

    if (!Array.isArray(submittedAnswers)) {
      return res
        .status(400)
        .json({ message: "Request body should be an array of answers." });
    }

    let correctAnswersCount = 0;
    const totalQuestions = quiz.questions.length;
    const passingPercentage = 70; // 70% to pass

    // Map quiz questions by ID for easy lookup
    const quizQuestionsMap = new Map(
      quiz.questions.map((q) => [q._id.toString(), q])
    );

    for (const submittedAnswer of submittedAnswers) {
      const { questionId, selectedAnswerIndex } = submittedAnswer;

      if (!questionId || selectedAnswerIndex === undefined) {
        console.warn(
          "Invalid submitted answer format received.",
          submittedAnswer
        );
        continue; // Skip malformed entries
      }

      const question = quizQuestionsMap.get(questionId);

      if (question) {
        // Check if the selected answer index is valid and if the answer is correct
        if (
          selectedAnswerIndex >= 0 &&
          selectedAnswerIndex < question.answers.length
        ) {
          if (question.answers[selectedAnswerIndex].isCorrect) {
            correctAnswersCount++;
          }
        } else {
          console.warn(
            `Invalid selected answer index ${selectedAnswerIndex} for question ${questionId}`
          );
        }
      } else {
        console.warn(`Question with ID ${questionId} not found in quiz.`);
      }
    }

    const percentage =
      totalQuestions > 0 ? (correctAnswersCount / totalQuestions) * 100 : 0;
    const status = percentage >= passingPercentage ? "pass" : "fail";

    res.json({
      score: correctAnswersCount,
      totalQuestions,
      percentage,
      status,
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Quiz not found" });
    }
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
