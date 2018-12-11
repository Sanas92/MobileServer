const express = require('express');
const router = express.Router();

const signUpRouter = require('./signUp');
const signInRouter = require('./signIn');
const signOutRouter = require('./signOut');

router.use('/sign-up', signUpRouter);
router.use('/sign-in', signInRouter);
router.use('/sign-out', signOutRouter);

module.exports = router;