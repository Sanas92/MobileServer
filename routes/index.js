const express = require('express');
const router = express.Router();

const userDirectoryRouter = require('./user/index');
const boardDirectoryRouter = require('./board/index');
const doLikeRouter = require('./doLike');

router.use('/user', userDirectoryRouter);
router.use('/board', boardDirectoryRouter);
router.use('/do-like', doLikeRouter);

router.get('/', function(req, res) {
  res.render('index', {title : 'Main page'});
});

module.exports = router;