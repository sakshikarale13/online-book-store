# Online Book Store — XAMPP Complete Version

A complete assignment-friendly online bookstore built with Node.js, Express, EJS and XAMPP MySQL/MariaDB.

## Included

### Client
- Home page
- Registration and login
- Catalogue and search
- Book details
- Shopping cart
- Quantity update/remove/clear cart
- Checkout with delivery details
- Mock UPI payment
- Mock card payment
- Cash on Delivery
- Payment/order success receipt
- My Orders
- Order details
- Responsive UI

### Admin
- Admin login
- Dashboard statistics
- Book management: add/edit/delete
- Client list
- Order management and status updates
- Payment records

## Mock payment

Payments are simulated only. No real transaction is made.

The app stores:
- order ID
- payment method
- amount
- generated transaction ID
- payment status
- masked UPI/card reference

It does NOT store card CVV or full card number.

## XAMPP setup

1. Start XAMPP MySQL.
2. Open http://localhost/phpmyadmin
3. Run `database/bookstore.sql`.
4. Open this project in VS Code.
5. Run:
   `npm install`
6. Start:
   `node app.js`
7. Open:
   http://localhost:3000

Default database configuration in `database/db.js`:

host: 127.0.0.1
port: 3306
user: root
password: empty
database: bookstore

Change the password/port if your XAMPP installation uses different values.

## Demo accounts

Admin:
admin@bookstore.com
admin123

Client:
client@bookstore.com
client123

## Main flow

Catalogue → Add to Cart → Cart → Checkout → Payment → Success → My Orders

Admin:
Dashboard → Books → Orders → Payments → Clients

## Assignment compatibility

The original assignment requires Node.js + Express + MySQL + EJS, Home/Login/Registration/Catalogue pages, users/books database tables, sessions, routes and responsive CSS. This project includes those requirements plus cart, checkout, simulated payment and order management.
