const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('./routes/routes');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'online-book-store-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}));

app.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = [];
  res.locals.user = req.session.user || null;
  res.locals.cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
  res.locals.message = req.session.message || null;
  delete req.session.message;
  next();
});

app.use('/', routes);

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`Online Book Store running at http://localhost:${PORT}`);
});