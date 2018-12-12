const express = require('express');
const router = express.Router();

const signUpRouter = require('./signUp');
const signInRouter = require('./signIn');
const jwtSignInRouter = require('./jwtSignIn');
const signOutRouter = require('./signOut');
const authorizationRouter = require('./authorization');
const authorizationCheckRouter = require('./authorizationCheck');

router.use('/sign-up', signUpRouter);
router.use('/sign-in', signInRouter);
router.use('/jwt-sign-in', jwtSignInRouter);
router.use('/sign-out', signOutRouter);
router.use('/authorization', authorizationRouter);
router.use('/authorization-check', authorizationCheckRouter);

module.exports = router;