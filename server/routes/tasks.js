const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getTasks,
  createTask,
  createTaskValidation,
  getTask,
  updateTask,
  updateTaskValidation,
  moveTask,
  moveTaskValidation,
  addComment,
  addCommentValidation,
  addAttachment,
  deleteTask,
  getKanban,
  getTaskRecommendations,
} = require('../controllers/taskController');

// Kanban route must be before /:id
router.get('/team/:teamId/kanban', protect, getKanban);

router.get('/', protect, getTasks);
router.post('/', protect, restrictTo('coordinator', 'mentor', 'student'), createTaskValidation, createTask);

router.get('/:id', protect, getTask);
router.get('/:id/recommendations', protect, getTaskRecommendations);
router.patch('/:id', protect, updateTaskValidation, updateTask);
router.patch('/:id/move', protect, moveTaskValidation, moveTask);
router.patch('/:id/comment', protect, addCommentValidation, addComment);
router.post('/:id/attach', protect, upload.single('file'), addAttachment);
router.delete('/:id', protect, restrictTo('coordinator', 'mentor'), deleteTask);

module.exports = router;
