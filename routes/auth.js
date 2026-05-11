const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 🔐 SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, identifier, password } = req.body;

    const existing = await User.findOne({ identifier });
    if (existing) {
      return res.status(400).json({ success: false, message: "ఈ నంబర్/మెయిల్ తో ఆల్రెడీ అకౌంట్ ఉంది!" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, identifier, password: hashed });
    await user.save();

    res.json({ success: true, message: "Signup successful! ఇప్పుడు లాగిన్ అవ్వండి." });
  } catch (err) {
  console.error("SIGNUP ERROR:", err);
  res.status(500).json({ success: false, message: err.message });
}
});

// 🔐 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ identifier });

    if (!user) {
      return res.status(400).json({ success: false, message: "యూజర్ దొరకలేదు! సైన్ అప్ అవ్వండి." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "పాస్‌వర్డ్ తప్పు!" });
    }

    // టోకెన్ క్రియేట్ చేయడం
    const token = jwt.sign({ id: user._id }, "YOUR_SECRET_KEY", { expiresIn: "7d" });

    res.json({ 
      success: true, 
      token, 
      user: { name: user.name, identifier: user.identifier } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
