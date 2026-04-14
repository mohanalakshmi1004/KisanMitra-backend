const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // identifier లోనే Phone లేదా Email ఏదో ఒకటి సేవ్ అవుతుంది.
  identifier: { type: String, required: true, unique: true }, 
  password: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);