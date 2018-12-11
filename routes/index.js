const express = require('express');
const router = express.Router();

const userDirectoryRouter = require('./user/index');

router.use('/user', userDirectoryRouter);

router.get('/', function(req, res) {
  res.render('index', {title : 'Main page'});
});

module.exports = router;