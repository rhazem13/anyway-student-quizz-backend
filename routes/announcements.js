const express = require("express");
const router = express.Router();
const Announcement = require("../models/Announcement");

// @route   GET /api/announcements
// @desc    Get all announcements
// @access  Public
router.get("/", async (req, res) => {
  try {
    const announcements = await Announcement.find({}).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
