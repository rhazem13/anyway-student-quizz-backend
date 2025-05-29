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
    const { title, course, topic, dueDate } = req.body;

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

    const quiz = new Quiz({
      title,
      course,
      topic,
      dueDate: dueDateObj,
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
    const { title, course, topic, dueDate } = req.body;

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

module.exports = router;
