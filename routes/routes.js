const express = require('express');
const router = express.Router();
const db = require('../database/db');

function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.message = 'Please login to continue.';
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.session.message = 'Admin access required.';
    return res.redirect('/admin/login');
  }
  next();
}

function cartTotal(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
}

function makeTransactionId() {
  return 'BN' + Date.now().toString().slice(-10) + Math.floor(100 + Math.random() * 900);
}

router.get('/', async (req, res) => {
  try {
    const [books] = await db.query('SELECT * FROM books ORDER BY created_at DESC LIMIT 6');
    res.render('home', { books });
  } catch (err) {
    console.error(err);
    res.render('home', { books: [] });
  }
});

router.get('/register', (req, res) => res.render('register', { error: null }));

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.render('register', { error: 'All fields are required.' });
  if (password.length < 6) return res.render('register', { error: 'Password must contain at least 6 characters.' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length) return res.render('register', { error: 'An account with this email already exists.' });

    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), password, 'client']
    );
    req.session.message = 'Registration successful. Please login.';
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'Registration failed. Please try again.' });
  }
});

router.get('/login', (req, res) => res.render('login', { error: null }));

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.render('login', { error: 'Email and password are required.' });

  try {
    const [users] = await db.query(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    if (!users.length || users[0].password !== password) return res.render('login', { error: 'Invalid email or password.' });

    const user = users[0];
    delete user.password;
    req.session.user = user;
    res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/catalogue');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Login failed. Please try again.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

router.get('/catalogue', async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    let sql = 'SELECT * FROM books';
    const params = [];
    if (search) {
      sql += ' WHERE title LIKE ? OR author LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY title ASC';
    const [books] = await db.query(sql, params);
    res.render('catalogue', { books, search });
  } catch (err) {
    console.error(err);
    res.render('catalogue', { books: [], search: '' });
  }
});

router.get('/book/:id', async (req, res) => {
  try {
    const [books] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!books.length) return res.status(404).render('404');
    res.render('book-details', { book: books[0] });
  } catch (err) {
    console.error(err);
    res.status(500).render('404');
  }
});

// CART
router.post('/cart/add/:id', async (req, res) => {
  try {
    const [books] = await db.query('SELECT id, title, author, price, image FROM books WHERE id = ?', [req.params.id]);
    if (!books.length) return res.status(404).render('404');

    const book = books[0];
    const existing = req.session.cart.find(item => item.id === book.id);

    if (existing) existing.quantity += 1;
    else req.session.cart.push({ ...book, quantity: 1 });

    req.session.message = `${book.title} added to your cart.`;
    res.redirect(req.get('Referrer') || '/catalogue');
  } catch (err) {
    console.error(err);
    res.redirect('/catalogue');
  }
});

router.get('/cart', (req, res) => {
  const total = cartTotal(req.session.cart);
  res.render('cart', { cart: req.session.cart, total });
});

router.post('/cart/update/:id', (req, res) => {
  const quantity = Math.max(1, Math.min(20, parseInt(req.body.quantity, 10) || 1));
  const item = req.session.cart.find(i => i.id === Number(req.params.id));
  if (item) item.quantity = quantity;
  res.redirect('/cart');
});

router.post('/cart/remove/:id', (req, res) => {
  req.session.cart = req.session.cart.filter(i => i.id !== Number(req.params.id));
  res.redirect('/cart');
});

router.post('/cart/clear', (req, res) => {
  req.session.cart = [];
  res.redirect('/cart');
});

// CHECKOUT
router.get('/checkout', requireLogin, (req, res) => {
  if (!req.session.cart.length) {
    req.session.message = 'Your cart is empty.';
    return res.redirect('/catalogue');
  }
  const total = cartTotal(req.session.cart);
  res.render('checkout', { cart: req.session.cart, total, error: null });
});

router.post('/checkout', requireLogin, (req, res) => {
  if (!req.session.cart.length) return res.redirect('/cart');
  const { shipping_name, shipping_phone, shipping_address } = req.body;
  if (!shipping_name || !shipping_phone || !shipping_address) {
    return res.render('checkout', {
      cart: req.session.cart,
      total: cartTotal(req.session.cart),
      error: 'Please complete all delivery details.'
    });
  }
  req.session.checkout = { shipping_name, shipping_phone, shipping_address };
  res.redirect('/payment');
});

// PAYMENT
router.get('/payment', requireLogin, (req, res) => {
  if (!req.session.cart.length || !req.session.checkout) return res.redirect('/checkout');
  res.render('payment', { cart: req.session.cart, total: cartTotal(req.session.cart), error: null });
});

router.post('/payment', requireLogin, async (req, res) => {
  if (!req.session.cart.length || !req.session.checkout) return res.redirect('/checkout');

  const method = req.body.method;
  const total = cartTotal(req.session.cart);

  if (!['UPI', 'Card', 'Cash on Delivery'].includes(method)) {
    return res.render('payment', { cart: req.session.cart, total, error: 'Please select a payment method.' });
  }

  if (method === 'UPI' && !req.body.upi_id) {
    return res.render('payment', { cart: req.session.cart, total, error: 'Please enter a UPI ID.' });
  }

  if (method === 'Card' && (!req.body.card_number || !req.body.card_name || !req.body.expiry || !req.body.cvv)) {
    return res.render('payment', { cart: req.session.cart, total, error: 'Please complete all card fields.' });
  }

  try {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [orderResult] = await connection.query(
        'INSERT INTO orders (user_id, total_amount, status, shipping_name, shipping_phone, shipping_address) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.session.user.id,
          total,
          method === 'Cash on Delivery' ? 'Pending' : 'Confirmed',
          req.session.checkout.shipping_name,
          req.session.checkout.shipping_phone,
          req.session.checkout.shipping_address
        ]
      );

      const orderId = orderResult.insertId;

      for (const item of req.session.cart) {
        await connection.query(
          'INSERT INTO order_items (order_id, book_id, title, price, quantity) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.id, item.title, item.price, item.quantity]
        );
      }

      let masked = null;
      if (method === 'UPI') {
        const upi = String(req.body.upi_id);
        masked = upi.length > 4 ? '****' + upi.slice(-4) : '****';
      } else if (method === 'Card') {
        const digits = String(req.body.card_number).replace(/\D/g, '');
        masked = '**** **** **** ' + digits.slice(-4);
      } else {
        masked = 'Pay at delivery';
      }

      const status = method === 'Cash on Delivery' ? 'Pending' : 'Successful';
      const transactionId = makeTransactionId();

      await connection.query(
        'INSERT INTO payments (order_id, transaction_id, method, amount, status, masked_reference) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, transactionId, method, total, status, masked]
      );

      await connection.commit();

      req.session.cart = [];
      req.session.checkout = null;

      res.render('payment-success', {
        orderId,
        transactionId,
        method,
        amount: total,
        paymentStatus: status
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err);
    res.render('payment', {
      cart: req.session.cart,
      total,
      error: 'Could not complete the order. Please try again.'
    });
  }
});

// CLIENT ORDERS
router.get('/orders', requireLogin, async (req, res) => {
  const [orders] = await db.query(
    'SELECT o.*, p.method, p.transaction_id, p.status AS payment_status FROM orders o LEFT JOIN payments p ON p.order_id=o.id WHERE o.user_id=? ORDER BY o.created_at DESC',
    [req.session.user.id]
  );
  res.render('orders', { orders });
});

router.get('/orders/:id', requireLogin, async (req, res) => {
  const [orders] = await db.query(
    'SELECT o.*, p.method, p.transaction_id, p.status AS payment_status, p.masked_reference FROM orders o LEFT JOIN payments p ON p.order_id=o.id WHERE o.id=? AND o.user_id=?',
    [req.params.id, req.session.user.id]
  );
  if (!orders.length) return res.status(404).render('404');
  const [items] = await db.query('SELECT * FROM order_items WHERE order_id=?', [req.params.id]);
  res.render('order-details', { order: orders[0], items });
});

// ADMIN
router.get('/admin/login', (req, res) => res.render('admin/login', { error: null }));

router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.query(
      'SELECT id, name, email, password, role FROM users WHERE email = ? AND role = ?',
      [email.trim().toLowerCase(), 'admin']
    );
    if (!users.length || users[0].password !== password) return res.render('admin/login', { error: 'Invalid admin credentials.' });
    const admin = users[0];
    delete admin.password;
    req.session.user = admin;
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.render('admin/login', { error: 'Admin login failed.' });
  }
});

router.get('/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const [[bookCount]] = await db.query('SELECT COUNT(*) AS count FROM books');
    const [[userCount]] = await db.query("SELECT COUNT(*) AS count FROM users WHERE role='client'");
    const [[orderCount]] = await db.query('SELECT COUNT(*) AS count FROM orders');
    const [[sales]] = await db.query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='Successful'");
    res.render('admin/dashboard', {
      bookCount: bookCount.count, userCount: userCount.count,
      orderCount: orderCount.count, sales: sales.total
    });
  } catch (err) {
    console.error(err);
    res.render('admin/dashboard', { bookCount: 0, userCount: 0, orderCount: 0, sales: 0 });
  }
});

router.get('/admin/books', requireAdmin, async (req, res) => {
  const [books] = await db.query('SELECT * FROM books ORDER BY id DESC');
  res.render('admin/books', { books });
});

router.get('/admin/books/add', requireAdmin, (req, res) => res.render('admin/add-book', { error: null }));

router.post('/admin/books/add', requireAdmin, async (req, res) => {
  const { title, author, price, image, description } = req.body;
  if (!title || !author || !price) return res.render('admin/add-book', { error: 'Title, author and price are required.' });
  try {
    await db.query(
      'INSERT INTO books (title, author, price, image, description) VALUES (?, ?, ?, ?, ?)',
      [title.trim(), author.trim(), Number(price), image || '', description || '']
    );
    req.session.message = 'Book added successfully.';
    res.redirect('/admin/books');
  } catch (err) {
    console.error(err);
    res.render('admin/add-book', { error: 'Could not add book.' });
  }
});

router.get('/admin/books/edit/:id', requireAdmin, async (req, res) => {
  const [books] = await db.query('SELECT * FROM books WHERE id=?', [req.params.id]);
  if (!books.length) return res.status(404).render('404');
  res.render('admin/edit-book', { book: books[0], error: null });
});

router.post('/admin/books/edit/:id', requireAdmin, async (req, res) => {
  const { title, author, price, image, description } = req.body;
  try {
    await db.query(
      'UPDATE books SET title=?, author=?, price=?, image=?, description=? WHERE id=?',
      [title.trim(), author.trim(), Number(price), image || '', description || '', req.params.id]
    );
    req.session.message = 'Book updated successfully.';
    res.redirect('/admin/books');
  } catch (err) {
    console.error(err);
    res.render('admin/edit-book', { book: { id:req.params.id,title,author,price,image,description }, error:'Could not update book.' });
  }
});

router.post('/admin/books/delete/:id', requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM books WHERE id=?', [req.params.id]);
    req.session.message = 'Book deleted successfully.';
  } catch (err) {
    console.error(err);
    req.session.message = 'Could not delete book. A book used in an existing order cannot be deleted.';
  }
  res.redirect('/admin/books');
});

router.get('/admin/users', requireAdmin, async (req, res) => {
  const [users] = await db.query("SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC");
  res.render('admin/users', { users });
});

router.get('/admin/orders', requireAdmin, async (req, res) => {
  const [orders] = await db.query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email,
            p.method, p.transaction_id, p.status AS payment_status
     FROM orders o
     JOIN users u ON u.id=o.user_id
     LEFT JOIN payments p ON p.order_id=o.id
     ORDER BY o.created_at DESC`
  );
  res.render('admin/orders', { orders });
});

router.post('/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const allowed = ['Pending','Confirmed','Shipped','Delivered','Cancelled'];
  if (allowed.includes(req.body.status)) {
    await db.query('UPDATE orders SET status=? WHERE id=?', [req.body.status, req.params.id]);
    req.session.message = 'Order status updated.';
  }
  res.redirect('/admin/orders');
});

router.get('/admin/payments', requireAdmin, async (req, res) => {
  const [payments] = await db.query(
    `SELECT p.*, o.status AS order_status, u.name AS customer_name, u.email
     FROM payments p
     JOIN orders o ON o.id=p.order_id
     JOIN users u ON u.id=o.user_id
     ORDER BY p.created_at DESC`
  );
  res.render('admin/payments', { payments });
});

module.exports = router;