const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({
        message: "User already exists with that email or username",
      });
    }

    // Create new user
    user = new User({
      username,
      email,
      password,
    });

    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      "your_jwt_secret", // This should be in an environment variable
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    // For prototype: Allow empty credentials
    if (!login || !password) {
      // Return a demo user token
      const demoToken = jwt.sign(
        {
          userId: "demo",
          username: "demo_user",
          role: "admin", // Adding admin role for full access
        },
        "your_jwt_secret",
        { expiresIn: "7d" }
      );

      return res.json({
        message: "Demo login successful",
        token: demoToken,
        user: {
          id: "demo",
          username: "demo_user",
          email: "demo@example.com",
          role: "admin",
        },
      });
    }

    // Regular login flow for non-empty credentials
    const user = await User.findOne({
      $or: [{ email: login.toLowerCase() }, { username: login }],
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, "your_jwt_secret", {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
