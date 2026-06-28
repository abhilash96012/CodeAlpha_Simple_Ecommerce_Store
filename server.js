const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./backend/db-helper');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'codealpha-ecommerce-secret-key-98765';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Seed Initial Products if empty
async function seedProducts() {
  const products = await db.getAll('products');
  if (products.length === 0) {
    const initialProducts = [
      {
        name: "Apex Mech Pro",
        category: "Keyboards",
        price: 149.99,
        image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
        description: "Premium mechanical gaming keyboard with hot-swappable tactile brown switches, double-shot PBT keycaps, and customizable RGB backlighting. Built on an aircraft-grade aluminum frame.",
        stock: 15
      },
      {
        name: "Pulse Wireless",
        category: "Mice",
        price: 89.99,
        image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
        description: "Ultra-lightweight wireless gaming mouse featuring a 26K DPI optical sensor, optical switches rated for 90M clicks, and up to 150 hours of battery life with zero latency lag.",
        stock: 25
      },
      {
        name: "Aero ANC 9",
        category: "Audio",
        price: 299.99,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
        description: "Premium over-ear headphones featuring Hybrid Active Noise Cancellation, high-fidelity 40mm drivers, spatial audio tracking, and a plush memory-foam headband for all-day comfort.",
        stock: 10
      },
      {
        name: "Horizon 34 Ultra",
        category: "Monitors",
        price: 499.99,
        image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
        description: "34-inch curved ultrawide gaming monitor. Features a crisp WQHD resolution, 165Hz refresh rate, 1ms response time, HDR400 color depth, and AMD FreeSync Premium support.",
        stock: 5
      },
      {
        name: "Viper Streamer Mic",
        category: "Audio",
        price: 119.99,
        image: "https://images.unsplash.com/photo-1590608897129-79da98d15969?auto=format&fit=crop&w=600&q=80",
        description: "Professional studio-quality USB condenser microphone. Features four selectable polar patterns, built-in shock mount, headphone output for zero-latency monitoring, and tap-to-mute sensor.",
        stock: 12
      },
      {
        name: "Orbit Desk Pad",
        category: "Accessories",
        price: 34.99,
        image: "https://images.unsplash.com/photo-1632292224971-0d45778bd364?auto=format&fit=crop&w=600&q=80",
        description: "Minimalist executive desk mat crafted from water-resistant vegan leather and soft felt backing. Protects your desk surface and provides seamless tracking for your mouse.",
        stock: 40
      },
      {
        name: "Zen Laptop Stand",
        category: "Accessories",
        price: 39.99,
        image: "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&w=600&q=80",
        description: "Ergonomic aluminum laptop riser. Lifts your laptop to eye level to reduce neck strain. Dynamic open-airflow design prevents your laptop from overheating.",
        stock: 30
      },
      {
        name: "Volt PowerDock",
        category: "Accessories",
        price: 69.99,
        image: "https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&w=600&q=80",
        description: "3-in-1 fast wireless charging station for smartphone, smartwatch, and wireless earbuds. Features built-in temperature regulation and surge protection.",
        stock: 18
      }
    ];

    for (const prod of initialProducts) {
      await db.insert('products', prod);
    }
    console.log('Product database seeded successfully.');
  }
}

// --- API ROUTES ---

// AUTHENTICATION

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required' });
  }

  try {
    // Check if email already exists
    const existingUser = await db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db.insert('users', {
      username,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    // Create token
    const token = jwt.sign({ id: newUser.id, username: newUser.username, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getById('users', req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ id: user.id, username: user.username, email: user.email });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PRODUCTS

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    let products = await db.getAll('products');
    const { category, search, sort } = req.query;

    if (category && category !== 'All') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      );
    }

    if (sort) {
      if (sort === 'price-asc') {
        products.sort((a, b) => a.price - b.price);
      } else if (sort === 'price-desc') {
        products.sort((a, b) => b.price - a.price);
      }
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// Get product details
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getById('products', req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching product details' });
  }
});

// ORDERS

// Place Order (Checkout)
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { items, shippingAddress, paymentDetails } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Order must contain at least one item' });
  }

  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine || !shippingAddress.city || !shippingAddress.postalCode) {
    return res.status(400).json({ message: 'Complete shipping address is required' });
  }

  try {
    let total = 0;
    const dbProducts = await db.getAll('products');
    const orderItems = [];

    // Verify stock and calculate total
    for (const item of items) {
      const product = dbProducts.find(p => p.id === item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for product: ${product.name}` });
      }

      const itemTotal = product.price * item.quantity;
      total += itemTotal;

      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: item.quantity,
        total: itemTotal
      });

      // Deduct stock
      await db.update('products', product.id, { stock: product.stock - item.quantity });
    }

    // Create Order Record
    const order = await db.insert('orders', {
      userId: req.user.id,
      items: orderItems,
      total: parseFloat(total.toFixed(2)),
      shippingAddress,
      status: 'Processing',
      paymentStatus: 'Paid',
      orderDate: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Order processed successfully',
      order
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ message: 'Server error during checkout' });
  }
});

// Get User's Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await db.findMany('orders', o => o.userId === req.user.id);
    // Sort by orderDate descending
    orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching order history' });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`E-commerce Server running on http://localhost:${PORT}`);
  await seedProducts();
});
