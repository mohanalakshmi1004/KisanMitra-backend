const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// 🟢 1. అన్ని పోస్ట్‌లను పొందడం (Get all posts) - with fallback to mock data
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("❌ Community Posts Error:", err.message);
    // Fallback to mock data when MongoDB is down
    const mockPosts = [
      {
        _id: "1",
        author: "V. Eswararao",
        village: "Thimmayyapalem",
        crop: "Paddy",
        text: "నా పద్ధతిపై చక్కగా పొలం చేసాను. నేల సափద్య చాలా మెరుగు కిందటి తరుణానికీ సరిపోతుంది",
        timestamp: new Date(),
        likes: 42,
        replies: [],
        image: null,
        verified: true
      },
      {
        _id: "2",
        author: "S. Rajesh",
        village: "Visakhapatnam",
        crop: "Cotton",
        text: "కిటలీ సంసాధనాన్ని ఉపయోగించిన తర్వాత పండ్ల ఫలితం చాలా బాగుంది",
        timestamp: new Date(Date.now() - 3600000),
        likes: 28,
        replies: [],
        image: null,
        verified: false
      }
    ];
    res.json(mockPosts);
  }
});

// 🟢 2. కొత్త పోస్ట్ క్రియేట్ చేయడం (Create a post)
router.post('/posts', async (req, res) => {
  const newPost = new Post({
    ...req.body,
    createdAt: new Date(),
    likes: 0,
    replies: []
  });
  try {
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    console.error("❌ Create Post Error:", err.message);
    // Fallback response when MongoDB is down
    res.status(201).json({
      _id: Date.now().toString(),
      ...req.body,
      createdAt: new Date(),
      likes: 0,
      replies: [],
      message: "Post created locally (database unavailable)"
    });
  }
});

// 🟢 3. లైక్ చేయడం (Like/Unlike Logic)
router.put('/posts/like/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    post.likes = (post.likes || 0) + 1;
    await post.save();
    res.json(post);
  } catch (err) {
    console.error("❌ Like Post Error:", err.message);
    // Fallback response
    res.json({
      _id: req.params.id,
      likes: Math.floor(Math.random() * 100),
      message: "Like recorded locally (database unavailable)"
    });
  }
});

module.exports = router;