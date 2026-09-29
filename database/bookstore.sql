CREATE DATABASE IF NOT EXISTS bookstore;
USE bookstore;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'client') NOT NULL DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(150) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('Pending','Confirmed','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
    shipping_name VARCHAR(100) NOT NULL,
    shipping_phone VARCHAR(30) NOT NULL,
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    book_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT
);

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    transaction_id VARCHAR(50) NOT NULL UNIQUE,
    method ENUM('UPI','Card','Cash on Delivery') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('Successful','Pending','Failed') NOT NULL,
    masked_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

INSERT INTO users (name, email, password, role) VALUES
('Administrator', 'admin@bookstore.com', 'admin123', 'admin'),
('Demo Client', 'client@bookstore.com', 'client123', 'client');

INSERT INTO books (title, author, price, image, description) VALUES
('The Alchemist', 'Paulo Coelho', 399.00,
 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80',
 'A classic inspirational novel about following dreams and discovering one’s purpose.'),
('Atomic Habits', 'James Clear', 499.00,
 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
 'A practical guide to building good habits and breaking bad ones.'),
('Clean Code', 'Robert C. Martin', 799.00,
 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=600&q=80',
 'A practical software engineering book focused on writing readable and maintainable code.'),
('The Psychology of Money', 'Morgan Housel', 549.00,
 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
 'Lessons on wealth, behavior, risk and making better financial decisions.'),
('Rich Dad Poor Dad', 'Robert T. Kiyosaki', 449.00,
 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
 'Personal finance lessons presented through two contrasting approaches to money.'),
('Introduction to Algorithms', 'Thomas H. Cormen', 999.00,
 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80',
 'A comprehensive reference for algorithms, data structures and algorithmic problem solving.');