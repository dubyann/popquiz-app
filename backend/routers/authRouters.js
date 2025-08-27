const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/captcha', authController.createCaptcha);

module.exports = router;
