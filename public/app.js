// --- STATE MANAGEMENT ---
let state = {
  user: null,
  token: localStorage.getItem('auth_token') || null,
  products: [],
  cart: JSON.parse(localStorage.getItem('shopping_cart')) || [],
  currentCategory: 'All',
  searchQuery: '',
  sortBy: 'default',
  selectedProduct: null
};

// --- DOM ELEMENTS ---
const elements = {
  authNavBtn: document.getElementById('auth-nav-btn'),
  authBtnText: document.getElementById('auth-btn-text'),
  ordersNavBtn: document.getElementById('orders-nav-btn'),
  cartNavBtn: document.getElementById('cart-nav-btn'),
  cartBadgeCount: document.getElementById('cart-badge-count'),
  cartBtnTotal: document.getElementById('cart-btn-total'),
  searchInput: document.getElementById('search-input'),
  categoriesContainer: document.getElementById('categories-container'),
  sortSelect: document.getElementById('sort-select'),
  productGrid: document.getElementById('product-grid-container'),
  logoBtn: document.getElementById('logo-btn'),
  exploreCtaBtn: document.getElementById('explore-cta-btn'),
  
  // Modals & Drawers
  authModal: document.getElementById('auth-modal'),
  detailModal: document.getElementById('detail-modal'),
  cartDrawer: document.getElementById('cart-drawer'),
  checkoutModal: document.getElementById('checkout-modal'),
  ordersModal: document.getElementById('orders-modal'),
  
  // Forms
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  checkoutForm: document.getElementById('checkout-form'),
  
  // Tabs
  tabLogin: document.getElementById('tab-login-btn'),
  tabRegister: document.getElementById('tab-register-btn'),
  
  // Details Modal Template
  productDetailContent: document.getElementById('product-detail-content'),
  
  // Cart Drawer
  cartItemsContainer: document.getElementById('cart-items-container'),
  cartSubtotal: document.getElementById('cart-subtotal'),
  checkoutDrawerBtn: document.getElementById('checkout-drawer-btn'),
  
  // Checkout Summary
  checkoutItemsList: document.getElementById('checkout-items-list'),
  checkoutTotalPrice: document.getElementById('checkout-total-price'),
  completeCheckoutBtn: document.getElementById('complete-checkout-btn'),
  
  // Credit Card Preview Bindings
  checkoutCardNum: document.getElementById('checkout-card-num'),
  checkoutCardExpiry: document.getElementById('checkout-card-expiry'),
  checkoutName: document.getElementById('checkout-name'),
  cardNumberPreview: document.getElementById('card-number-preview'),
  cardNamePreview: document.getElementById('card-name-preview'),
  cardExpiryPreview: document.getElementById('card-expiry-preview'),
  
  // Orders
  ordersList: document.getElementById('orders-list'),
  
  // Toast container
  toastContainer: document.getElementById('toast-container')
};

// --- API HELPER ---
async function apiCall(endpoint, method = 'GET', body = null, requireAuth = false) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (requireAuth && state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const res = await fetch(endpoint, options);
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  } catch (err) {
    console.error(`API Error (${endpoint}):`, err.message);
    showToast(err.message, 'error');
    throw err;
  }
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span class="toast-message">${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  lucide.createIcons();
  
  // Slide out and remove
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// --- AUTH FLOW ---
async function initAuth() {
  if (!state.token) {
    updateAuthUI();
    return;
  }
  
  try {
    const user = await apiCall('/api/auth/me', 'GET', null, true);
    state.user = user;
  } catch (err) {
    // Token was invalid or expired
    state.token = null;
    state.user = null;
    localStorage.removeItem('auth_token');
  }
  updateAuthUI();
}

function updateAuthUI() {
  if (state.user) {
    elements.authBtnText.textContent = state.user.username;
    elements.ordersNavBtn.style.display = 'flex';
  } else {
    elements.authBtnText.textContent = 'Sign In';
    elements.ordersNavBtn.style.display = 'none';
  }
  lucide.createIcons();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const data = await apiCall('/api/auth/login', 'POST', { email, password });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('auth_token', data.token);
    
    showToast(`Welcome back, ${data.user.username}!`);
    closeModal(elements.authModal);
    updateAuthUI();
    
    // Clear form
    elements.loginForm.reset();
  } catch (err) {
    // Error handled by apiCall
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  
  try {
    const data = await apiCall('/api/auth/register', 'POST', { username, email, password });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('auth_token', data.token);
    
    showToast(`Account created! Welcome, ${data.user.username}.`);
    closeModal(elements.authModal);
    updateAuthUI();
    
    // Clear form
    elements.registerForm.reset();
  } catch (err) {
    // Error handled by apiCall
  }
}

function handleAuthClick() {
  if (state.user) {
    // Logout flow
    state.user = null;
    state.token = null;
    localStorage.removeItem('auth_token');
    showToast('Logged out successfully.');
    updateAuthUI();
  } else {
    openModal(elements.authModal);
  }
}

// --- PRODUCT FLOW ---
async function fetchProducts() {
  let query = `?category=${encodeURIComponent(state.currentCategory)}&sort=${state.sortBy}`;
  if (state.searchQuery) {
    query += `&search=${encodeURIComponent(state.searchQuery)}`;
  }
  
  try {
    const products = await apiCall(`/api/products${query}`);
    state.products = products;
    renderProducts();
  } catch (err) {
    elements.productGrid.innerHTML = `<p class="error-text">Failed to load products.</p>`;
  }
}

function renderProducts() {
  elements.productGrid.innerHTML = '';
  
  if (state.products.length === 0) {
    elements.productGrid.innerHTML = `
      <div class="loading-spinner-wrapper">
        <i data-lucide="package-open" style="width:48px; height:48px; color:var(--text-muted);"></i>
        <p>No products found matching filters.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }
  
  state.products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="card-img-wrapper">
        <span class="card-badge-category">${product.category}</span>
        <img src="${product.image}" alt="${product.name}" class="card-img" loading="lazy">
      </div>
      <div class="card-body">
        <h3 class="card-title">${product.name}</h3>
        <p class="card-desc">${product.description}</p>
        <div class="card-footer">
          <span class="card-price">$${product.price.toFixed(2)}</span>
          <button class="card-btn add-to-cart-quick" data-id="${product.id}" title="Add to Cart">
            <i data-lucide="shopping-cart" class="btn-icon"></i>
          </button>
        </div>
      </div>
    `;
    
    // Bind click to open details modal (except on quick add button)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-to-cart-quick')) return;
      openProductDetails(product.id);
    });
    
    elements.productGrid.appendChild(card);
  });
  
  // Bind quick add buttons
  document.querySelectorAll('.add-to-cart-quick').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      addToCart(id, 1);
    });
  });
  
  lucide.createIcons();
}

async function openProductDetails(id) {
  try {
    const product = await apiCall(`/api/products/${id}`);
    state.selectedProduct = product;
    
    const inCart = state.cart.find(item => item.productId === id);
    const cartQty = inCart ? inCart.quantity : 0;
    const availableStock = product.stock - cartQty;
    
    elements.productDetailContent.innerHTML = `
      <div class="detail-img-wrapper">
        <img src="${product.image}" alt="${product.name}" class="detail-img">
      </div>
      <div class="detail-info">
        <span class="detail-category">${product.category}</span>
        <h3 class="detail-title">${product.name}</h3>
        <p class="detail-desc">${product.description}</p>
        <span class="detail-price">$${product.price.toFixed(2)}</span>
        
        <div class="detail-meta">
          <span class="stock-status ${product.stock > 0 ? 'stock-in' : 'stock-out'}">
            ${product.stock > 0 ? `${product.stock} units available` : 'Out of Stock'}
          </span>
          
          ${product.stock > 0 ? `
            <div class="qty-selector">
              <button class="qty-btn" id="detail-qty-dec"><i data-lucide="minus" class="btn-icon"></i></button>
              <span class="qty-val" id="detail-qty-val">1</span>
              <button class="qty-btn" id="detail-qty-inc"><i data-lucide="plus" class="btn-icon"></i></button>
            </div>
          ` : ''}
        </div>
        
        <button class="btn btn-primary btn-full" id="detail-add-btn" ${product.stock === 0 ? 'disabled' : ''}>
          ${product.stock > 0 ? 'Add to Cart' : 'Sold Out'}
        </button>
      </div>
    `;
    
    openModal(elements.detailModal);
    lucide.createIcons();
    
    if (product.stock === 0) return;
    
    // Qty Selector logic
    let currentQty = 1;
    const qtyVal = document.getElementById('detail-qty-val');
    const decBtn = document.getElementById('detail-qty-dec');
    const incBtn = document.getElementById('detail-qty-inc');
    const addBtn = document.getElementById('detail-add-btn');
    
    decBtn.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qtyVal.textContent = currentQty;
      }
    });
    
    incBtn.addEventListener('click', () => {
      if (currentQty < availableStock) {
        currentQty++;
        qtyVal.textContent = currentQty;
      } else {
        showToast('Max available stock reached', 'error');
      }
    });
    
    addBtn.addEventListener('click', () => {
      addToCart(product.id, currentQty);
      closeModal(elements.detailModal);
    });
    
  } catch (err) {
    // handled
  }
}

// --- CART FLOW ---
function addToCart(productId, quantity) {
  const product = state.products.find(p => p.id === productId) || state.selectedProduct;
  if (!product) return;
  
  const existingItemIndex = state.cart.findIndex(item => item.productId === productId);
  
  if (existingItemIndex > -1) {
    const newQty = state.cart[existingItemIndex].quantity + quantity;
    if (newQty > product.stock) {
      showToast(`Cannot add items. Only ${product.stock} units are in stock.`, 'error');
      return;
    }
    state.cart[existingItemIndex].quantity = newQty;
  } else {
    if (quantity > product.stock) {
      showToast(`Cannot add items. Only ${product.stock} units are in stock.`, 'error');
      return;
    }
    state.cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity
    });
  }
  
  saveCart();
  showToast(`Added ${quantity} x ${product.name} to cart.`);
}

function updateCartItemQty(productId, delta) {
  const itemIndex = state.cart.findIndex(item => item.productId === productId);
  if (itemIndex === -1) return;
  
  const item = state.cart[itemIndex];
  
  // Find product stock limits
  const product = state.products.find(p => p.id === productId) || { stock: 999 };
  
  const newQty = item.quantity + delta;
  
  if (newQty <= 0) {
    state.cart.splice(itemIndex, 1);
    showToast(`Removed ${item.name} from cart.`);
  } else if (newQty > product.stock) {
    showToast(`Only ${product.stock} units available in stock.`, 'error');
  } else {
    item.quantity = newQty;
  }
  saveCart();
}

function removeFromCart(productId) {
  const itemIndex = state.cart.findIndex(item => item.productId === productId);
  if (itemIndex > -1) {
    const name = state.cart[itemIndex].name;
    state.cart.splice(itemIndex, 1);
    saveCart();
    showToast(`Removed ${name} from cart.`);
  }
}

function saveCart() {
  localStorage.setItem('shopping_cart', JSON.stringify(state.cart));
  renderCartDrawer();
  updateNavCartCount();
}

function updateNavCartCount() {
  const totalCount = state.cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  elements.cartBadgeCount.textContent = totalCount;
  elements.cartBtnTotal.textContent = `$${totalPrice.toFixed(2)}`;
}

function renderCartDrawer() {
  elements.cartItemsContainer.innerHTML = '';
  
  if (state.cart.length === 0) {
    elements.cartItemsContainer.innerHTML = `
      <div class="cart-empty-wrapper">
        <i data-lucide="shopping-bag" style="width:48px; height:48px;"></i>
        <p>Your shopping cart is empty.</p>
      </div>
    `;
    elements.cartSubtotal.textContent = '$0.00';
    elements.checkoutDrawerBtn.disabled = true;
    lucide.createIcons();
    return;
  }
  
  state.cart.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.name}</h4>
        <span class="cart-item-price">$${item.price.toFixed(2)}</span>
        <div class="cart-item-qty-row">
          <button class="cart-item-qty-btn qty-dec" data-id="${item.productId}">-</button>
          <span class="cart-item-qty-val">${item.quantity}</span>
          <button class="cart-item-qty-btn qty-inc" data-id="${item.productId}">+</button>
        </div>
      </div>
      <button class="cart-item-remove-btn cart-remove" data-id="${item.productId}">
        <i data-lucide="trash-2" class="btn-icon"></i>
      </button>
    `;
    
    // Wire sub-events
    itemEl.querySelector('.qty-dec').addEventListener('click', () => updateCartItemQty(item.productId, -1));
    itemEl.querySelector('.qty-inc').addEventListener('click', () => updateCartItemQty(item.productId, 1));
    itemEl.querySelector('.cart-remove').addEventListener('click', () => removeFromCart(item.productId));
    
    elements.cartItemsContainer.appendChild(itemEl);
  });
  
  const totalPrice = state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  elements.cartSubtotal.textContent = `$${totalPrice.toFixed(2)}`;
  elements.checkoutDrawerBtn.disabled = false;
  
  lucide.createIcons();
}

// --- CHECKOUT FLOW ---
function openCheckout() {
  if (!state.user) {
    showToast('Please sign in to place an order.', 'error');
    openModal(elements.authModal);
    closeDrawer(elements.cartDrawer);
    return;
  }
  
  closeDrawer(elements.cartDrawer);
  
  // Render checkout list
  elements.checkoutItemsList.innerHTML = '';
  state.cart.forEach(item => {
    const el = document.createElement('div');
    el.className = 'checkout-summary-item';
    el.innerHTML = `
      <span>${item.name} (x${item.quantity})</span>
      <span>$${(item.price * item.quantity).toFixed(2)}</span>
    `;
    elements.checkoutItemsList.appendChild(el);
  });
  
  const totalPrice = state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  elements.checkoutTotalPrice.textContent = `$${totalPrice.toFixed(2)}`;
  elements.completeCheckoutBtn.textContent = `Complete Purchase ($${totalPrice.toFixed(2)})`;
  
  // Set default values in credit card preview
  if (state.user) {
    elements.checkoutName.value = state.user.username.toUpperCase();
    elements.cardNamePreview.textContent = state.user.username.toUpperCase();
  }
  
  openModal(elements.checkoutModal);
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  
  const shippingAddress = {
    fullName: document.getElementById('checkout-name').value,
    addressLine: document.getElementById('checkout-address').value,
    city: document.getElementById('checkout-city').value,
    postalCode: document.getElementById('checkout-postal').value
  };
  
  const items = state.cart.map(item => ({
    productId: item.productId,
    quantity: item.quantity
  }));
  
  try {
    const data = await apiCall('/api/orders', 'POST', { items, shippingAddress }, true);
    
    showToast(`Order Placed! Thank you for shopping with us. ID: ${data.order.id.substring(0, 8)}`);
    
    // Reset state & form
    state.cart = [];
    saveCart();
    closeModal(elements.checkoutModal);
    elements.checkoutForm.reset();
    
    // Refresh catalog products to reflect deducted stock
    fetchProducts();
  } catch (err) {
    // handled
  }
}

// --- ORDER HISTORY FLOW ---
async function openOrdersModal() {
  if (!state.user) return;
  
  try {
    const orders = await apiCall('/api/orders', 'GET', null, true);
    elements.ordersList.innerHTML = '';
    
    if (orders.length === 0) {
      elements.ordersList.innerHTML = `<p class="empty-text">No order history found.</p>`;
      openModal(elements.ordersModal);
      return;
    }
    
    orders.forEach(order => {
      const formattedDate = new Date(order.orderDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      
      const orderEl = document.createElement('div');
      orderEl.className = 'order-history-card';
      
      const itemsList = order.items.map(item => `
        <div>${item.name} (${item.quantity}x) - $${item.price.toFixed(2)}</div>
      `).join('');
      
      orderEl.innerHTML = `
        <div class="order-history-header">
          <div>
            <span class="order-id-label">Order:</span>
            <span class="order-id-value">#${order.id.toUpperCase()}</span>
          </div>
          <span class="order-status-badge badge-processing">${order.status}</span>
        </div>
        <div class="order-history-details">
          <div>
            <div class="order-history-items">
              ${itemsList}
            </div>
            <div class="order-history-date">${formattedDate}</div>
          </div>
          <div class="order-history-total">$${order.total.toFixed(2)}</div>
        </div>
      `;
      
      elements.ordersList.appendChild(orderEl);
    });
    
    openModal(elements.ordersModal);
  } catch (err) {
    // handled
  }
}

// --- MODAL TRIGGERS ---
function openModal(modal) {
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
}

function openDrawer(drawer) {
  drawer.classList.add('active');
}

function closeDrawer(drawer) {
  drawer.classList.remove('active');
}

// --- INTERACTIVE CREDIT CARD EVENT LISTENERS ---
function setupCreditCardPreview() {
  elements.checkoutCardNum.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // strip non-digits
    // Format card number: 1234 5678 1234 5678
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += value[i];
    }
    e.target.value = formatted;
    elements.cardNumberPreview.textContent = formatted || '•••• •••• •••• ••••';
  });
  
  elements.checkoutName.addEventListener('input', (e) => {
    elements.cardNamePreview.textContent = e.target.value.toUpperCase() || 'JOHN DOE';
  });
  
  elements.checkoutCardExpiry.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.substring(0,2) + '/' + value.substring(2,4);
    }
    e.target.value = value;
    elements.cardExpiryPreview.textContent = value || 'MM/YY';
  });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  // Init auth and catalog
  initAuth();
  fetchProducts();
  saveCart(); // Updates nav counts and cart drawers
  setupCreditCardPreview();
  
  // Header Actions
  elements.authNavBtn.addEventListener('click', handleAuthClick);
  elements.ordersNavBtn.addEventListener('click', openOrdersModal);
  elements.cartNavBtn.addEventListener('click', () => openDrawer(elements.cartDrawer));
  
  // Close Modals & Drawers
  document.querySelectorAll('.close-auth-modal').forEach(b => b.addEventListener('click', () => closeModal(elements.authModal)));
  document.querySelectorAll('.close-detail-modal').forEach(b => b.addEventListener('click', () => closeModal(elements.detailModal)));
  document.querySelectorAll('.close-cart-drawer').forEach(b => b.addEventListener('click', () => closeDrawer(elements.cartDrawer)));
  document.querySelectorAll('.close-checkout-modal').forEach(b => b.addEventListener('click', () => closeModal(elements.checkoutModal)));
  document.querySelectorAll('.close-orders-modal').forEach(b => b.addEventListener('click', () => closeModal(elements.ordersModal)));
  
  // Drawer Actions
  elements.checkoutDrawerBtn.addEventListener('click', openCheckout);
  
  // Click on background closes modals
  [elements.authModal, elements.detailModal, elements.checkoutModal, elements.ordersModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
  elements.cartDrawer.addEventListener('click', (e) => {
    if (e.target === elements.cartDrawer) closeDrawer(elements.cartDrawer);
  });
  
  // Auth Form tabs
  elements.tabLogin.addEventListener('click', () => {
    elements.tabLogin.classList.add('active');
    elements.tabRegister.classList.remove('active');
    elements.loginForm.classList.add('active');
    elements.registerForm.classList.remove('active');
  });
  elements.tabRegister.addEventListener('click', () => {
    elements.tabRegister.classList.add('active');
    elements.tabLogin.classList.remove('active');
    elements.registerForm.classList.add('active');
    elements.loginForm.classList.remove('active');
  });
  
  // Auth Form Submits
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.registerForm.addEventListener('submit', handleRegister);
  
  // Checkout Form Submit
  elements.checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  
  // Explore Button / logo
  elements.exploreCtaBtn.addEventListener('click', () => {
    document.getElementById('catalog-anchor').scrollIntoView({ behavior: 'smooth' });
  });
  elements.logoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    state.currentCategory = 'All';
    state.searchQuery = '';
    state.sortBy = 'default';
    
    // reset visual filters
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-category="All"]').classList.add('active');
    elements.sortSelect.value = 'default';
    elements.searchInput.value = '';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchProducts();
  });
  
  // Search bar typing with debounce
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    state.searchQuery = e.target.value;
    searchTimeout = setTimeout(() => {
      fetchProducts();
    }, 400);
  });
  
  // Category chip selection
  elements.categoriesContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    
    state.currentCategory = chip.getAttribute('data-category');
    fetchProducts();
  });
  
  // Sort Dropdown selection
  elements.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    fetchProducts();
  });
  
  lucide.createIcons();
});
