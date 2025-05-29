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

// @route   GET /api/announcements/:id
// @desc    Get single announcement by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    res.json(announcement);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Announcement not found" });
    }
    res.status(500).json({ message: "Server Error" });
  }
});

// @route   POST /api/announcements
// @desc    Create a new announcement
// @access  Private (will be protected later)
router.post("/", async (req, res) => {
  try {
    const { name, course, content, img } = req.body;

    // Validate required fields
    if (!name || !course || !content || !img) {
      return res.status(400).json({
        message:
          "Please provide all required fields: name, course, content, img",
      });
    }

    const announcement = new Announcement({
      name,
      course,
      content,
      img,
    });

    const savedAnnouncement = await announcement.save();
    res.status(201).json(savedAnnouncement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @route   PUT /api/announcements/:id
// @desc    Update an announcement
// @access  Private (will be protected later)
router.put("/:id", async (req, res) => {
  try {
    const { name, course, content, img } = req.body;

    // Build announcement object
    const announcementFields = {};
    if (name) announcementFields.name = name;
    if (course) announcementFields.course = course;
    if (content) announcementFields.content = content;
    if (img) announcementFields.img = img;

    let announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { $set: announcementFields },
      { new: true }
    );

    res.json(announcement);
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Announcement not found" });
    }
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @route   DELETE /api/announcements/:id
// @desc    Delete an announcement
// @access  Private (will be protected later)
router.delete("/:id", async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    await announcement.deleteOne();
    res.json({ message: "Announcement removed" });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Announcement not found" });
    }
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
