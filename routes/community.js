const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// 🟢 1. అన్ని పోస్ట్‌లను పొందడం (Get all posts)
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🟢 2. కొత్త పోస్ట్ క్రియేట్ చేయడం (Create a post)
router.post('/posts', async (req, res) => {
  const newPost = new Post(req.body);
  try {
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 🟢 3. లైక్ చేయడం (Like/Unlike Logic)
router.put('/posts/like/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    // ఇక్కడ సింపుల్ లైక్ లాజిక్
    post.likes += 1;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;