const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  user: { type: String, required: true },
  content: { type: String },
  image: { type: String }, // Base64 లేదా Image URL
  audio: { type: String },
  village: { type: String, default: 'Chebrole' },
  crop: { type: String, default: 'Paddy' },
  likes: { type: Number, default: 0 },
  likedBy: [String], // డూప్లికేట్ లైక్స్ రాకుండా ఉండటానికి
  comments: [{
    username: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);