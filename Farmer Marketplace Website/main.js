// main.js - App logic for Farmer Marketplace with Auction System & Transport Services
// Uses Firebase v10 modular SDK and client-side routing between pages

import { app, auth, db } from './firebaseConfig.js';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc,
  getDocs, query, where, orderBy, serverTimestamp, limit,
  onSnapshot, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { initializePaymentSystem } from './payment.js';

// -------------------- Utilities --------------------
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const byId = (id) => document.getElementById(id);
const page = document.body.dataset.page || '';
const yearEl = byId('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

// Global variable to track bid listener
let bidListenerUnsubscribe = null;
let chatListenerUnsubscribe = null;

// One-time login alert helper
function alertLoginOnce(nextTarget) {
  const key = 'loginAlertShown';
  const already = (() => { try { return sessionStorage.getItem(key) === '1'; } catch { return false; } })();
  const next = './login.html?next=' + encodeURIComponent(nextTarget || window.location.pathname);
  if (!already) {
    try { alert('Please log in first.'); } catch {}
    try { sessionStorage.setItem(key, '1'); } catch {}
  }
  window.location.href = next;
}

// -------------------- Session helpers --------------------
function setSession({ uid, name = '', role = '', email = '' }) {
  try {
    sessionStorage.setItem('sessionUid', uid || '');
    sessionStorage.setItem('sessionName', name || '');
    sessionStorage.setItem('sessionRole', role || '');
    sessionStorage.setItem('sessionEmail', email || '');
    sessionStorage.setItem('sessionTs', String(Date.now()));
  } catch {}
}
function getSession() {
  try {
    const uid = sessionStorage.getItem('sessionUid') || '';
    return {
      uid,
      name: sessionStorage.getItem('sessionName') || '',
      role: sessionStorage.getItem('sessionRole') || '',
      email: sessionStorage.getItem('sessionEmail') || '',
      ts: Number(sessionStorage.getItem('sessionTs') || '0'),
    };
  } catch { return { uid: '' }; }
}
function clearSession() {
  try {
    ['sessionUid','sessionName','sessionRole','sessionEmail','sessionTs'].forEach(k => sessionStorage.removeItem(k));
  } catch {}
}
function isSessionActive() {
  try { return !!sessionStorage.getItem('sessionUid'); } catch { return false; }
}

// Per-user cart key
function currentCartKey() {
  const sess = getSession();
  return sess.uid ? `cart:${sess.uid}` : 'cart';
}

// Get URL query param
function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// -------------------- Cart System --------------------
function getCart() {
  try {
    const cartData = localStorage.getItem(currentCartKey());
    if (!cartData) return [];
    
    const cart = JSON.parse(cartData);
    // Ensure each item has required properties
    return cart.map(item => ({
      id: item.id || '',
      name: item.name || 'Unknown Product',
      imageUrl: item.imageUrl || '',
      prices: item.prices || { unit: 0 },
      unit: item.unit || 'unit',
      qty: item.qty || 1,
      price: item.price || 0
    }));
  } catch {
    return [];
  }
}

function saveCart(items) {
  // Clean the data before saving
  const cleanItems = items.map(item => ({
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    prices: item.prices,
    unit: item.unit,
    qty: item.qty
  }));
  
  localStorage.setItem(currentCartKey(), JSON.stringify(cleanItems));
  updateCartCount();
}

function addToCart(product) {
  const cart = getCart();
  
  // Check if product already exists in cart
  const existingItemIndex = cart.findIndex(item => item.id === product.id);
  
  if (existingItemIndex >= 0) {
    // Update quantity if item exists
    cart[existingItemIndex].qty += 1;
  } else {
    // Add new item to cart
    const cartItem = {
      id: product.id,
      name: product.name,
      imageUrl: product.imageBase64 || '',
      prices: product.prices || { unit: product.price || 0 },
      unit: Object.keys(product.prices || {})[0] || 'unit',
      qty: 1
    };
    cart.push(cartItem);
  }
  
  saveCart(cart);
  showCartNotification('Added to cart!');
}

function showCartNotification(message) {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.cart-notification');
  existingNotifications.forEach(notif => notif.remove());
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'cart-notification';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 2 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
}

function renderCart() {
  updateCartCount();
  const listEl = byId('cartItems');
  const totalEl = byId('cartTotal');
  const emptyEl = byId('cartEmpty');
  const checkoutSection = byId('checkoutSection');
  const items = getCart();
  
  listEl.innerHTML = '';

  if (!items.length) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (totalEl) totalEl.textContent = '₹0.00';
    if (checkoutSection) checkoutSection.style.display = 'none';
    return;
  }
  
  if (emptyEl) emptyEl.classList.add('hidden');
  if (checkoutSection) checkoutSection.style.display = 'grid';

  let total = 0;
  
  items.forEach((it, index) => {
    const unitPrice = it.prices?.[it.unit] ?? it.price ?? 0;
    const subtotal = (unitPrice || 0) * (it.qty || 1);
    total += subtotal;
    
    const unitOptions = Object.keys(it.prices || { unit: it.price || 0 })
      .map(u => `<option value="${u}" ${u === it.unit ? 'selected' : ''}>${u}</option>`)
      .join('');
    
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `
      <div class="cart-row">
        <img src="${it.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+'}" 
             alt="${it.name}" 
             style="width:80px;height:60px;object-fit:cover;border-radius:8px;"
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI5MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4n'" />
        <div style="flex: 1;">
          <div style="font-weight:600; margin-bottom: 8px;">${it.name}</div>
          <div class="muted" style="margin-bottom: 4px;">
            Price: ₹${unitPrice.toFixed(2)} per 
            <select data-action="unit" data-id="${it.id}" style="margin-left: 5px; padding: 2px 5px; border-radius: 4px; border: 1px solid var(--border);">
              ${unitOptions}
            </select>
          </div>
          <div class="muted">Subtotal: ₹${subtotal.toFixed(2)}</div>
        </div>
        <div class="cart-controls">
          <label class="muted" for="qty-${it.id}">Qty</label>
          <input id="qty-${it.id}" 
                 type="number" 
                 min="1" 
                 step="1" 
                 value="${it.qty || 1}" 
                 class="qty-input" 
                 data-action="qty" 
                 data-id="${it.id}"
                 style="width: 60px; padding: 4px; border: 1px solid var(--border); border-radius: 4px;" />
          <button class="btn btn-danger" data-action="remove" data-id="${it.id}" style="padding: 6px 12px;">
            Remove
          </button>
        </div>
      </div>
    `;
    listEl.appendChild(row);
  });
  
  if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;

  // Add event listeners for dynamic elements
  listEl.addEventListener('input', (e) => {
    const target = e.target;
    const action = target.dataset.action;
    const id = target.dataset.id;
    
    if (!action || !id) return;
    
    const cart = getCart();
    const itemIndex = cart.findIndex(item => item.id === id);
    
    if (itemIndex === -1) return;
    
    if (action === 'qty') {
      const newQty = parseInt(target.value) || 1;
      cart[itemIndex].qty = Math.max(1, newQty);
    } 
    else if (action === 'unit') {
      cart[itemIndex].unit = target.value;
    }
    
    saveCart(cart);
    renderCart();
  });

  listEl.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    
    const action = button.dataset.action;
    const id = button.dataset.id;
    
    if (action === 'remove') {
      const cart = getCart();
      const updatedCart = cart.filter(item => item.id !== id);
      saveCart(updatedCart);
      renderCart();
      showCartNotification('Item removed from cart');
    }
  });
}

function updateCartCount() {
  const countEl = byId('cartCount');
  const cartBtn = byId('cartBtn');
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
  
  if (!isSessionActive()) {
    if (cartBtn) cartBtn.textContent = 'Cart';
    return;
  }
  
  if (cartBtn && !countEl) {
    cartBtn.innerHTML = 'Cart (<span id="cartCount">0</span>)';
  }
  
  const el = byId('cartCount');
  if (el) el.textContent = totalItems;
}

// Get current user's role from Firestore
async function getUserRole(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data().role || null) : null;
}

// Guard: require auth (and optional role)
async function requireAuth(expectedRole = null) {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = './login.html';
        return;
      }
      if (!expectedRole) { unsub(); return resolve(user); }
      const role = await getUserRole(user.uid);
      if (role !== expectedRole) { window.location.href = './index.html'; return; }
      unsub(); resolve(user);
    });
  });
}

// Navbar auth UI
function setupNavbar() {
  const logoutBtn = byId('logoutBtn');
  on(logoutBtn, 'click', async () => {
    // Clear session and cart, then logout and redirect home
    try { localStorage.removeItem(currentCartKey()); } catch {}
    clearSession();
    await signOut(auth);
    window.location.href = './index.html';
  });

  onAuthStateChanged(auth, async (user) => {
    const badge = byId('userBadge');
    if (user) {
      const role = await getUserRole(user.uid);
      if (badge) { badge.classList.remove('hidden'); badge.textContent = `${role?.toUpperCase() || 'USER'}`; }
      if (logoutBtn) logoutBtn.classList.remove('hidden');
      // Ensure session reflects auth state if missing (e.g., reload)
      if (!isSessionActive()) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const name = userDoc.data()?.name || '';
        setSession({ uid: user.uid, name, role: role || '', email: user.email || '', ts: Date.now() });
      }
      // Clear one-time login alert flag now that user is authenticated
      try { sessionStorage.removeItem('loginAlertShown'); } catch {}
      updateCartCount();
    } else {
      if (badge) badge.classList.add('hidden');
      if (logoutBtn) logoutBtn.classList.add('hidden');
      clearSession();
      updateCartCount();
    }
  });
}

// -------------------- Auth Flows --------------------
// Sign up new user and store profile (role, name, location, phone)
async function handleSignup(e) {
  e.preventDefault();
  const name = byId('name').value.trim();
  const email = byId('email').value.trim();
  const password = byId('password').value;
  const confirmPassword = byId('confirmPassword').value;
  const role = (qsa('input[name="role"]:checked')[0]?.value) || getParam('role') || '';
  const location = byId('location').value.trim();
  const phone = byId('phone').value.trim();
  const msgEl = byId('signupError');

  if (password !== confirmPassword) { msgEl.textContent = 'Passwords do not match.'; return; }
  if (!role) { msgEl.textContent = 'Please select a role (Farmer or Buyer).'; return; }
  if (!name || !email || !location || !phone) { msgEl.textContent = 'All fields are required, including Location and Phone.'; return; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email, role, location, phone, createdAt: serverTimestamp()
    });
    setSession({ uid: cred.user.uid, name, role, email: cred.user.email, ts: Date.now() });
    if (role === 'farmer') window.location.href = './farmer-dashboard.html';
    else window.location.href = './marketplace.html';
  } catch (err) {
    msgEl.textContent = err.message;
  }
}

// Login existing user
async function handleLogin(e) {
  e.preventDefault();
  const email = byId('email').value.trim();
  const password = byId('password').value;
  const msgEl = byId('loginError');
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const role = await getUserRole(cred.user.uid);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    const name = userDoc.data()?.name || '';
    setSession({ uid: cred.user.uid, name, role, email: cred.user.email, ts: Date.now() });
    if (role === 'farmer') window.location.href = './farmer-dashboard.html';
    else window.location.href = './marketplace.html';
  } catch (err) {
    msgEl.textContent = err.message;
  }
}

// -------------------- Farmer: Products CRUD --------------------
// Create or update a product document (with unit prices) and upload image if provided
async function saveProduct(e) {
  e.preventDefault();
  const user = await requireAuth('farmer');
  const id = byId('productId').value || null;
  const name = byId('productName').value.trim();
  const priceKg = parseFloat(byId('priceKg')?.value || '');
  const priceDozen = parseFloat(byId('priceDozen')?.value || '');
  const priceUnit = parseFloat(byId('priceUnit')?.value || '');
  const quantity = parseInt(byId('productQuantity').value, 10);
  const category = byId('productCategory').value.trim();
  const location = byId('productLocation').value.trim();
  const description = byId('productDescription').value.trim();
  const file = byId('productImage').files[0];
  const msg = byId('productFormMsg');

  try {
    // Validate at least one price
    const hasAnyPrice = [priceKg, priceDozen, priceUnit].some(v => typeof v === 'number' && !Number.isNaN(v));
    if (!hasAnyPrice) {
      msg.textContent = 'Please provide at least one price (per kg, dozen, or unit).';
      return;
    }

    let imageBase64 = '';

    if (file) {
      // Convert image file to Base64 string
      imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      // Optional: Check size limit (~1MB)
      const approxSize = (imageBase64.length * 3) / 4 / 1024 / 1024;
      if (approxSize > 1) {
        msg.textContent = 'Image too large. Max 1MB allowed.';
        return;
      }
    }

    const prices = {
      ...(Number.isFinite(priceKg) ? { kg: priceKg } : {}),
      ...(Number.isFinite(priceDozen) ? { dozen: priceDozen } : {}),
      ...(Number.isFinite(priceUnit) ? { unit: priceUnit } : {}),
    };

    if (!id) {
      // Add new product
      await addDoc(collection(db, 'products'), {
        name, prices, quantity, category, location, description,
        imageBase64,
        ownerUid: user.uid,
        ownerEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      msg.textContent = 'Product added.';
    } else {
      // Update existing product
      const upd = {
        name, prices, quantity, category, location, description,
        updatedAt: serverTimestamp()
      };
      if (imageBase64) upd.imageBase64 = imageBase64;
      await updateDoc(doc(db, 'products', id), upd);
      msg.textContent = 'Product updated.';
    }

    // Reset form
    byId('productForm').reset();
    byId('productId').value = '';
    loadMyProducts();

  } catch (err) {
    console.error('Saving product failed:', err);
    msg.textContent = 'Error saving product: ' + err.message;
  }
}

// Load current farmer's products
async function loadMyProducts() {
  const user = await requireAuth('farmer');
  const cont = byId('myProducts');
  cont.innerHTML = '';

  const snap = await getDocs(query(collection(db, 'products'), where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc')));
  snap.forEach((docSnap) => {
    const p = docSnap.data();
    const priceVals = Object.values(p.prices || {});
    const fromPrice = priceVals.length ? Math.min(...priceVals) : (p.price ?? 0);
    const card = document.createElement('div');
    card.className = 'card product-card';
card.innerHTML = `
  <img class="product-img" src="${p.imageBase64 || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+'}" alt="${p.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VmIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+'" />
      <div class="product-body">
        <h4 class="product-title">${p.name}</h4>
        <p class="muted product-meta">From ₹${(Number.isFinite(fromPrice) ? fromPrice.toFixed(2) : fromPrice)} • Qty: ${p.quantity} • ${p.category || ''}</p>
        <p class="product-desc">${p.description || ''}</p>
        <div class="card-actions">
          <button class="btn btn-secondary" data-action="edit" data-id="${docSnap.id}">Edit</button>
          <button class="btn btn-danger" data-action="delete" data-id="${docSnap.id}">Delete</button>
        </div>
      </div>`;
    cont.appendChild(card);
  });

  cont.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'delete') {
      if (!confirm('Delete this product?')) return;
      await deleteDoc(doc(db, 'products', id));
      loadMyProducts();
    }
    if (btn.dataset.action === 'edit') {
      const s = await getDoc(doc(db, 'products', id));
      const p = s.data();
      byId('productId').value = id;
      byId('productName').value = p.name || '';
      if (byId('priceKg')) byId('priceKg').value = p.prices?.kg ?? '';
      if (byId('priceDozen')) byId('priceDozen').value = p.prices?.dozen ?? '';
      if (byId('priceUnit')) byId('priceUnit').value = p.prices?.unit ?? '';
      byId('productQuantity').value = p.quantity || 0;
      byId('productCategory').value = p.category || '';
      byId('productLocation').value = p.location || '';
      byId('productDescription').value = p.description || '';
      byId('productImage').value = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, { once: true });
}

// -------------------- Marketplace (Buyer) --------------------
let MARKET_CACHE = [];

// Load all products for marketplace grid
async function loadMarketplace() {
  updateCartCount();
  const cont = byId('marketProducts');
  cont.innerHTML = '';
  try {
    const snap = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
    MARKET_CACHE = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMarketplace(MARKET_CACHE);
  } catch (err) {
    alertLoginOnce(window.location.pathname);
  }
}

function renderMarketplace(items) {
  const cont = byId('marketProducts');
  const tpl = byId('productCardTpl');
  cont.innerHTML = '';
  items.forEach(p => {
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.product-card');
    node.querySelector('.product-img').src = p.imageBase64 || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZzwvdGV4dD4KPC9zdmc+';
    node.querySelector('.product-img').alt = p.name;
    node.querySelector('.product-img').onerror = function() {
      this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l5ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    };
    node.querySelector('.product-title').textContent = p.name;
    const entries = Object.entries(p.prices || {});
    let fromPrice = p.price ?? 0;
    let unitLabel = 'unit';
    if (entries.length) {
      const min = entries.reduce((acc, [u, val]) => {
        if (!Number.isFinite(acc.val) || (Number.isFinite(val) && val < acc.val)) return { u, val };
        return acc;
      }, { u: 'unit', val: Infinity });
      fromPrice = Number.isFinite(min.val) ? min.val : (p.price ?? 0);
      unitLabel = min.u;
    }
    const metaEl = node.querySelector('.product-meta');
    metaEl.innerHTML = `${p.category || 'General'} • ${p.location || 'N/A'} • <span class="price">From ₹${fromPrice.toFixed(2)} per ${unitLabel}</span> • Qty: ${p.quantity ?? 0}`;
    node.querySelector('.product-desc').textContent = p.description || '';
    const addBtn = node.querySelector('.add-to-cart');
    const detailsA = node.querySelector('a.btn');
    detailsA.href = `./product-details.html?id=${encodeURIComponent(p.id)}`;
    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addToCart(p);
    });
    cont.appendChild(node);
  });
}

function applyMarketplaceFilters() {
  const q = byId('searchInput').value.trim().toLowerCase();
  const cat = byId('filterCategory').value.trim().toLowerCase();
  const loc = byId('filterLocation').value.trim().toLowerCase();
  const min = parseFloat(byId('minPrice').value) || -Infinity;
  const max = parseFloat(byId('maxPrice').value) || Infinity;
  const items = MARKET_CACHE.filter(p => {
    const nameOk = p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    const catOk = !cat || (p.category || '').toLowerCase().includes(cat);
    const locOk = !loc || (p.location || '').toLowerCase().includes(loc);
    const priceVals = Object.values(p.prices || {});
    const minPrice = priceVals.length ? Math.min(...priceVals) : (p.price ?? 0);
    const priceOk = minPrice >= min && minPrice <= max;
    return nameOk && catOk && locOk && priceOk;
  });
  renderMarketplace(items);
}

// -------------------- Product Details --------------------
async function loadProductDetails() {
  updateCartCount();
  const id = getParam('id');
  if (!id) { window.location.href = './marketplace.html'; return; }
  let s;
  try {
    s = await getDoc(doc(db, 'products', id));
  } catch (err) {
    alertLoginOnce(window.location.pathname);
    return;
  }
  if (!s.exists()) { window.location.href = './marketplace.html'; return; }
  const p = s.data();
  byId('detailImage').src = p.imageBase64 || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
  byId('detailImage').onerror = function() {
    this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI5MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4=';
  };
  byId('detailTitle').textContent = p.name || '';
  const entries = Object.entries(p.prices || {});
  let fromPrice = p.price ?? 0;
  let unitLabel = 'unit';
  if (entries.length) {
    const min = entries.reduce((acc, [u, val]) => {
      if (!Number.isFinite(acc.val) || (Number.isFinite(val) && val < acc.val)) return { u, val };
      return acc;
    }, { u: 'unit', val: Infinity });
    fromPrice = Number.isFinite(min.val) ? min.val : (p.price ?? 0);
    unitLabel = min.u;
  }
  byId('detailMeta').innerHTML = `${p.category || 'General'} • ${p.location || 'N/A'} • <span class="price">From ₹${fromPrice.toFixed(2)} per ${unitLabel}</span> • Qty: ${p.quantity ?? 0}`;
  byId('detailDesc').textContent = p.description || '';
  on(byId('detailAddToCart'), 'click', () => addToCart({ id, ...p }));

  const email = p.ownerEmail || '';
  const userDoc = await getDoc(doc(db, 'users', p.ownerUid));
  const phone = userDoc.data()?.phone || '';
  const uploaderName = userDoc.data()?.name || '';
  const mailA = byId('contactMail');
  mailA.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Inquiry about ' + (p.name || 'product'))}`;
  const wa = byId('contactWhatsApp');
  const whats = phone.replace(/\D/g, '');
  wa.href = whats ? `https://wa.me/${whats}?text=${encodeURIComponent('Hi, I am interested in ' + (p.name || 'your product'))}` : '#';
  const uploader = byId('uploaderInfo');
  if (uploader) uploader.textContent = `Uploaded by ${uploaderName || 'Seller'} • ${email || 'No email provided'}`;

  // Setup delete button for product owner
  setupProductDeleteButton(id, p);
}

// Setup delete button for product owner
async function setupProductDeleteButton(productId, product) {
  const deleteBtn = byId('deleteProductBtn');
  const session = getSession();
  
  // Show delete button only for product owner
  if (session.uid === product.ownerUid) {
    deleteBtn.classList.remove('hidden');
    
    deleteBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        try {
          await deleteDoc(doc(db, 'products', productId));
          alert('Product deleted successfully!');
          window.location.href = './marketplace.html';
        } catch (err) {
          console.error('Error deleting product:', err);
          alert('Error deleting product. Please try again.');
        }
      }
    });
  }
}

// -------------------- Auction System --------------------

// Enhanced auction status calculation
function getAuctionStatus(auction) {
  const now = new Date();
  const start = auction.startDate.toDate();
  const end = auction.endDate.toDate();
  
  // If time has ended, convert sold early to ended
  if (now > end && auction.status === 'sold' && auction.endedEarly) {
    return 'ended';
  }
  
  // If farmer manually ended/sold the auction
  if (auction.status === 'sold' && auction.endedEarly) {
    return 'sold';
  }
  
  // If auction ended naturally by time
  if (auction.status === 'ended' || now > end) {
    return 'ended';
  }
  
  if (now < start) return 'upcoming';
  return 'live';
}

// Format time remaining
function getTimeRemaining(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end - now;
  
  if (diff <= 0) return 'Auction ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h ${minutes}m remaining`;
}

// Enhanced auction ending function with chat creation
async function endAuction(auctionId, winningBidId = null, winningBidder = null, winningBidderEmail = null, finalPrice = null) {
  try {
    let updateData = {};
    
    if (winningBidId) {
      // Farmer accepted bid manually (before time ended)
      updateData = {
        status: 'sold',
        winningBidId: winningBidId,
        winningBidder: winningBidder,
        winningBidderEmail: winningBidderEmail,
        finalPrice: finalPrice,
        soldAt: serverTimestamp(),
        endedEarly: true, // Flag for manual ending
        updatedAt: serverTimestamp()
      };
      
      // Create a chat between farmer and winning bidder
      await createAuctionChat(auctionId, winningBidder, winningBidderEmail, finalPrice);
    } else {
      // Automatic ending due to time
      updateData = {
        status: 'ended',
        endedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        endedEarly: false
      };
    }
    
    await updateDoc(doc(db, 'auctions', auctionId), updateData);
    return true;
  } catch (err) {
    console.error('Error ending auction:', err);
    return false;
  }
}

// FIXED: Enhanced chat creation function that properly finds buyer UID and creates complete chat structure
async function createAuctionChat(auctionId, winningBidder, winningBidderEmail, finalPrice) {
  try {
    const session = getSession();
    console.log('Creating chat for auction:', auctionId);
    
    const auctionDoc = await getDoc(doc(db, 'auctions', auctionId));
    if (!auctionDoc.exists()) {
      console.error('Auction not found:', auctionId);
      return null;
    }
    
    const auction = auctionDoc.data();
    
    // FIXED: Properly find buyer UID by email
    let buyerUid = '';
    let buyerName = winningBidder;
    
    try {
      console.log('Looking for buyer with email:', winningBidderEmail);
      
      // Query users collection to find buyer by email
      const buyerQuery = query(collection(db, 'users'), where('email', '==', winningBidderEmail));
      const buyerSnapshot = await getDocs(buyerQuery);
      
      if (!buyerSnapshot.empty) {
        const buyerData = buyerSnapshot.docs[0].data();
        buyerUid = buyerSnapshot.docs[0].id;
        buyerName = buyerData.name || winningBidder;
        console.log('Buyer found by email:', buyerName, buyerUid);
      } else {
        console.warn('Buyer not found by email, will use email reference');
        // Create a reference that can be matched when buyer logs in
        buyerUid = `email_${winningBidderEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
    } catch (err) {
      console.warn('Error finding buyer user data:', err);
      buyerUid = `error_${Date.now()}`;
    }
    
    // Create UNIQUE chat ID
    const chatId = `auction_${auctionId}`;
    
    // Check if chat already exists to avoid duplicates
    const existingChatQuery = query(
      collection(db, 'users', session.uid, 'chats'),
      where('auctionId', '==', auctionId)
    );
    const existingChats = await getDocs(existingChatQuery);
    
    if (!existingChats.empty) {
      console.log('Chat already exists for this auction:', existingChats.docs[0].id);
      return existingChats.docs[0].id;
    }
    
    // Create chat data - SAME structure for both users
    const chatData = {
      chatId: chatId,
      auctionId: auctionId,
      auctionTitle: auction.productName || 'Auction Product',
      farmerUid: session.uid,
      farmerName: session.name,
      farmerEmail: session.email,
      buyerUid: buyerUid,
      buyerName: buyerName,
      buyerEmail: winningBidderEmail,
      finalPrice: finalPrice,
      createdAt: serverTimestamp(),
      lastMessage: 'Auction completed! You can now discuss delivery details.',
      lastMessageTime: serverTimestamp(),
      lastMessageSender: session.name,
      status: 'active'
    };
    
    console.log('Creating chat with ID:', chatId);
    
    // Create chat for farmer with farmer perspective
    const farmerChatData = {
      ...chatData,
      userRole: 'farmer',
      otherUserName: buyerName,
      otherUserUid: buyerUid,
      otherUserEmail: winningBidderEmail,
      myUid: session.uid,
      myName: session.name,
      myEmail: session.email
    };
    
    await setDoc(doc(db, 'users', session.uid, 'chats', chatId), farmerChatData);
    console.log('Chat created for farmer:', session.uid);
    
    // Create chat for buyer if we have a valid UID
    if (buyerUid && !buyerUid.startsWith('email_') && !buyerUid.startsWith('error_')) {
      try {
        // Create chat for buyer with buyer perspective
        const buyerChatData = {
          ...chatData,
          userRole: 'buyer', 
          otherUserName: session.name,
          otherUserUid: session.uid,
          otherUserEmail: session.email,
          myUid: buyerUid,
          myName: buyerName,
          myEmail: winningBidderEmail
        };
        
        await setDoc(doc(db, 'users', buyerUid, 'chats', chatId), buyerChatData);
        console.log('Chat created for buyer:', buyerUid);
        
        // Add initial system message to BOTH users' chat messages
        const initialMessage = {
          senderUid: session.uid,
          senderName: session.name,
          senderRole: 'farmer',
          content: `Congratulations! Your bid of ₹${finalPrice} has been accepted for "${auction.productName}". Let's discuss delivery details.`,
          timestamp: serverTimestamp(),
          type: 'system',
          chatId: chatId
        };
        
        // Add to farmer's messages
        await addDoc(collection(db, 'users', session.uid, 'chats', chatId, 'messages'), initialMessage);
        
        // Add to buyer's messages
        await addDoc(collection(db, 'users', buyerUid, 'chats', chatId, 'messages'), initialMessage);
        
        console.log('Initial messages added to both users');
        
      } catch (buyerErr) {
        console.warn('Could not create chat for buyer:', buyerErr);
        // Still add initial message to farmer's chat
        const initialMessage = {
          senderUid: session.uid,
          senderName: session.name,
          senderRole: 'farmer',
          content: `Congratulations! Your bid of ₹${finalPrice} has been accepted for "${auction.productName}". Let's discuss delivery details.`,
          timestamp: serverTimestamp(),
          type: 'system',
          chatId: chatId
        };
        await addDoc(collection(db, 'users', session.uid, 'chats', chatId, 'messages'), initialMessage);
      }
    } else {
      console.log('Buyer UID not available, chat will be created when buyer logs in');
      // Still add initial message to farmer's chat
      const initialMessage = {
        senderUid: session.uid,
        senderName: session.name,
        senderRole: 'farmer',
        content: `Congratulations! Your bid of ₹${finalPrice} has been accepted for "${auction.productName}". Let's discuss delivery details.`,
        timestamp: serverTimestamp(),
        type: 'system',
        chatId: chatId
      };
      await addDoc(collection(db, 'users', session.uid, 'chats', chatId, 'messages'), initialMessage);
    }
    
    console.log('Chat created successfully with ID:', chatId);
    
    // Show success message
    alert(`Bid accepted! Chat created with ${buyerName}. You can now communicate in the "My Chats" section.`);
    
    return chatId;
    
  } catch (err) {
    console.error('Error creating auction chat:', err);
    alert(`Error creating chat: ${err.message}`);
    return null;
  }
}

// NEW: Function to sync chats for users when they log in
async function syncUserChats(userUid, userEmail) {
  try {
    console.log('Syncing chats for user:', userUid, userEmail);
    
    // Look for chats that reference this user's email but don't have the proper UID yet
    const emailRef = `email_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Query all chats where this user might be referenced as buyer with email reference
    const potentialChatsQuery = query(
      collection(db, 'users', userUid, 'chats'),
      where('buyerUid', 'in', [emailRef, `email_${userEmail}`])
    );
    
    const potentialChats = await getDocs(potentialChatsQuery);
    
    console.log('Found potential chats to sync:', potentialChats.size);
    
    // Update any chats with the proper UID
    for (const docSnap of potentialChats.docs) {
      const chatData = docSnap.data();
      
      if (chatData.buyerUid === emailRef || chatData.buyerUid === `email_${userEmail}`) {
        // Update this chat with proper UID
        await updateDoc(doc(db, 'users', userUid, 'chats', docSnap.id), {
          buyerUid: userUid,
          updatedAt: serverTimestamp()
        });
        console.log('Updated chat with proper UID:', docSnap.id);
      }
    }
    
    // Also check if we need to create buyer-side chats from farmer-side data
    const wonAuctionsQuery = query(
      collection(db, 'auctions'),
      where('winningBidderEmail', '==', userEmail)
    );
    
    const wonAuctionsSnapshot = await getDocs(wonAuctionsQuery);
    
    for (const auctionDoc of wonAuctionsSnapshot.docs) {
      const auction = auctionDoc.data();
      const chatId = `auction_${auctionDoc.id}`;
      
      // Check if buyer already has this chat
      const existingBuyerChat = await getDoc(doc(db, 'users', userUid, 'chats', chatId));
      
      if (!existingBuyerChat.exists()) {
        console.log('Creating buyer chat for won auction:', chatId);
        
        // Create buyer-side chat with proper perspective
        const buyerChatData = {
          chatId: chatId,
          auctionId: auctionDoc.id,
          auctionTitle: auction.productName || 'Auction Product',
          farmerUid: auction.ownerUid,
          farmerName: auction.ownerName,
          farmerEmail: auction.ownerEmail,
          buyerUid: userUid,
          buyerName: auction.winningBidder,
          buyerEmail: userEmail,
          finalPrice: auction.finalPrice,
          createdAt: serverTimestamp(),
          lastMessage: 'Auction completed! You can now discuss delivery details.',
          lastMessageTime: serverTimestamp(),
          status: 'active',
          userRole: 'buyer',
          otherUserName: auction.ownerName,
          otherUserUid: auction.ownerUid,
          otherUserEmail: auction.ownerEmail,
          myUid: userUid,
          myName: auction.winningBidder,
          myEmail: userEmail
        };
        
        await setDoc(doc(db, 'users', userUid, 'chats', chatId), buyerChatData);
        console.log('Created buyer chat from auction data:', chatId);
        
        // Copy any existing messages from farmer's chat to buyer's chat
        try {
          const farmerMessagesQuery = query(
            collection(db, 'users', auction.ownerUid, 'chats', chatId, 'messages'),
            orderBy('timestamp', 'asc')
          );
          const farmerMessagesSnapshot = await getDocs(farmerMessagesQuery);
          
          for (const messageDoc of farmerMessagesSnapshot.docs) {
            const messageData = messageDoc.data();
            await addDoc(collection(db, 'users', userUid, 'chats', chatId, 'messages'), messageData);
          }
          console.log('Copied existing messages to buyer chat');
        } catch (messageErr) {
          console.warn('Could not copy messages to buyer chat:', messageErr);
        }
      }
    }
    
  } catch (err) {
    console.error('Error syncing user chats:', err);
  }
}

// Load auctions for marketplace
async function loadAuctions() {
  const cont = byId('auctionList');
  if (!cont) return;
  
  const session = getSession();
  const createBtn = byId('createAuctionBtn');
  
  // Show create button only for farmers
  if (createBtn && session.role === 'farmer') {
    createBtn.classList.remove('hidden');
    createBtn.addEventListener('click', () => {
      window.location.href = './create-auction.html';
    });
  }

  try {
    const snap = await getDocs(
      query(collection(db, 'auctions'), orderBy('startDate', 'desc'))
    );
    
    cont.innerHTML = '';
    snap.forEach(docSnap => {
      const auction = { id: docSnap.id, ...docSnap.data() };
      renderAuctionCard(auction, session);
    });
    
    setupAuctionFilters();
  } catch (err) {
    console.error('Error loading auctions:', err);
  }
}

// Enhanced auction card rendering with bid acceptance status
function renderAuctionCard(auction, session) {
  const tpl = byId('auctionCardTpl');
  const node = tpl.content.cloneNode(true);
  const card = node.querySelector('.auction-card');
  
  // Set basic info
  node.querySelector('.auction-img').src = auction.imageBase64 || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
  node.querySelector('.auction-img').onerror = function() {
    this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
  };
  node.querySelector('.auction-title').textContent = auction.productName;
  
  // Determine auction status with new logic
  let status = getAuctionStatus(auction);
  let statusText = status.toUpperCase();
  
  // Check if current user is the winning bidder
  const isWinningBidder = session.uid && auction.winningBidderEmail === session.email;
  
  // Special case: sold early but time remains
  if (status === 'sold' && auction.endedEarly) {
    if (isWinningBidder) {
      statusText = 'BID ACCEPTED';
    } else {
      statusText = 'SOLD';
    }
  }
  
  const badge = node.querySelector('.auction-badge');
  badge.textContent = statusText;
  
  // Set badge colors based on status
  if (status === 'sold' && auction.endedEarly && isWinningBidder) {
    badge.className = 'auction-badge status-success';
  } else {
    badge.className = `auction-badge status-${status}`;
  }
  
  // Set metadata
  node.querySelector('.auction-meta').innerHTML = 
    `${auction.location || 'N/A'} • ${auction.quantity || 0}kg`;
  
  // Set prices and bids
  node.querySelector('.base-price').textContent = `₹${auction.basePrice}`;
  
  // Get bid count
  getDocs(collection(db, 'auctions', auction.id, 'bids'))
    .then(snapshot => {
      const bidCount = snapshot.size;
      node.querySelector('.bid-count').textContent = `${bidCount} bids`;
    });
  
  // Timer or status message - SHOW SPECIAL MESSAGE FOR WINNING BIDDER
  const timerEl = node.querySelector('.auction-timer');
  if (status === 'live') {
    timerEl.textContent = getTimeRemaining(auction.endDate.toDate());
  } else if (status === 'sold' && auction.endedEarly) {
    if (isWinningBidder) {
      timerEl.textContent = 'Your bid was accepted! Check your chats for delivery details.';
      timerEl.style.color = 'var(--success)';
      timerEl.style.fontWeight = '600';
    } else {
      timerEl.textContent = 'Sold Early';
    }
  } else if (status === 'ended') {
    timerEl.textContent = 'Auction Ended';
  } else if (status === 'upcoming') {
    timerEl.textContent = 'Starts ' + new Date(auction.startDate.toDate()).toLocaleDateString();
  }
  
  // Store endedEarly flag for filtering
  card.dataset.endedEarly = auction.endedEarly || 'false';
  
  // Button actions - ALL USERS SEE "VIEW DETAILS" BUT WINNING BIDDER GETS SPECIAL STYLING
  const viewBtn = node.querySelector('.view-details');
  
  if (status === 'sold' && auction.endedEarly && isWinningBidder) {
    viewBtn.textContent = 'View Details';
    viewBtn.classList.remove('btn-primary');
    viewBtn.classList.add('btn-success');
  } else {
    viewBtn.textContent = 'View Details';
    viewBtn.classList.remove('btn-success');
    viewBtn.classList.add('btn-primary');
  }
  
  viewBtn.addEventListener('click', () => {
    window.location.href = `./auction-detail.html?id=${auction.id}`;
  });
  
  // Farmer-specific actions
  const farmerBtn = node.querySelector('.farmer-actions');
  if (session.role === 'farmer' && session.uid === auction.ownerUid) {
    farmerBtn.classList.remove('hidden');
    
    // Update button text based on auction status
    if (status === 'sold' && auction.endedEarly) {
      farmerBtn.textContent = 'View Results';
      farmerBtn.classList.remove('btn-secondary');
      farmerBtn.classList.add('btn-primary');
    } else if (status === 'ended') {
      farmerBtn.textContent = 'View Results';
      farmerBtn.classList.remove('btn-secondary');
      farmerBtn.classList.add('btn-primary');
    } else {
      farmerBtn.textContent = 'Manage Bids';
      farmerBtn.classList.remove('btn-secondary');
      farmerBtn.classList.add('btn-primary');
    }
    
    farmerBtn.addEventListener('click', () => {
      window.location.href = `./auction-detail.html?id=${auction.id}&manage=true`;
    });
  } else {
    farmerBtn.classList.add('hidden');
  }
  
  byId('auctionList').appendChild(node);
}

// Enhanced auction filters
function setupAuctionFilters() {
  const applyBtn = byId('applyAuctionFilters');
  const searchInput = byId('auctionSearch');
  const statusSelect = byId('auctionStatus');
  const locationInput = byId('auctionLocation');
  
  if (applyBtn) {
    applyBtn.addEventListener('click', applyAuctionFilters);
  }
  
  // Add real-time filtering
  if (searchInput) {
    searchInput.addEventListener('input', applyAuctionFilters);
  }
  if (statusSelect) {
    statusSelect.addEventListener('change', applyAuctionFilters);
  }
  if (locationInput) {
    locationInput.addEventListener('input', applyAuctionFilters);
  }
}

// Enhanced auction filtering logic
function applyAuctionFilters() {
  const searchTerm = byId('auctionSearch').value.toLowerCase();
  const statusFilter = byId('auctionStatus').value;
  const locationFilter = byId('auctionLocation').value.toLowerCase();
  
  const cards = qsa('.auction-card');
  cards.forEach(card => {
    const title = card.querySelector('.auction-title').textContent.toLowerCase();
    const location = card.querySelector('.auction-meta').textContent.toLowerCase();
    const statusBadge = card.querySelector('.auction-badge');
    const statusText = statusBadge.textContent.toLowerCase();
    const endedEarly = card.dataset.endedEarly === 'true';
    
    // Determine which filter category this auction belongs to
    let matchesFilter = false;
    
    if (statusFilter === 'live') {
      // Show live auctions AND sold auctions that ended early (since time hasn't naturally ended)
      matchesFilter = statusText.includes('live') || (statusText.includes('sold') && endedEarly) || statusText.includes('bid accepted');
    } else if (statusFilter === 'ended') {
      // Show ended auctions AND sold auctions that ended naturally
      matchesFilter = statusText.includes('ended') || (statusText.includes('sold') && !endedEarly);
    } else if (statusFilter === 'won') {
      // NEW: Show auctions where user's bid was accepted
      matchesFilter = statusText.includes('bid accepted');
    } else if (statusFilter === 'all') {
      matchesFilter = true;
    } else {
      matchesFilter = statusText.includes(statusFilter);
    }
    
    const matchesSearch = title.includes(searchTerm) || searchTerm === '';
    const matchesLocation = location.includes(locationFilter) || locationFilter === '';
    
    card.style.display = (matchesSearch && matchesFilter && matchesLocation) ? 'block' : 'none';
  });
}

// Auto-fill farmer details in create auction form
async function loadFarmerDetails() {
  const session = getSession();
  if (session.role !== 'farmer') return;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', session.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      byId('farmerName').value = userData.name || '';
      byId('farmerEmail').value = userData.email || '';
      byId('farmerMobile').value = userData.phone || '';
      byId('location').value = userData.location || '';
    }
  } catch (err) {
    console.error('Error loading farmer details:', err);
  }
}

// Create new auction
async function handleCreateAuction(e) {
  e.preventDefault();
  const session = getSession();
  
  if (session.role !== 'farmer') {
    alert('Only farmers can create auctions.');
    window.location.href = './auction.html';
    return;
  }
  
  const msgEl = byId('auctionFormMsg');
  
  try {
    // Convert image to Base64
    let imageBase64 = '';
    const fileInput = byId('productImage');
    if (fileInput.files[0]) {
      imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(fileInput.files[0]);
      });
    }
    
    const auctionData = {
      productName: byId('productName').value.trim(),
      quantity: parseFloat(byId('quantity').value),
      description: byId('productDescription').value.trim(),
      basePrice: parseFloat(byId('basePrice').value),
      bidIncrement: parseFloat(byId('bidIncrement').value),
      location: byId('location').value.trim(),
      startDate: Timestamp.fromDate(new Date(byId('startDate').value)),
      endDate: Timestamp.fromDate(new Date(byId('endDate').value)),
      farmerName: byId('farmerName').value.trim(),
      farmerEmail: byId('farmerEmail').value.trim(),
      farmerMobile: byId('farmerMobile').value.trim(),
      imageBase64,
      ownerUid: session.uid,
      ownerName: session.name,
      ownerEmail: session.email,
      createdAt: serverTimestamp(),
      status: 'active',
      endedEarly: false // Initialize as false
    };
    
    // Validation
    if (auctionData.startDate >= auctionData.endDate) {
      msgEl.textContent = 'End date must be after start date.';
      return;
    }
    
    await addDoc(collection(db, 'auctions'), auctionData);
    
    msgEl.textContent = 'Auction created successfully!';
    setTimeout(() => {
      window.location.href = './auction.html';
    }, 1500);
    
  } catch (err) {
    console.error('Error creating auction:', err);
    msgEl.textContent = 'Error creating auction: ' + err.message;
  }
}

// Enhanced real-time auction status monitoring
function setupAuctionStatusListener(auctionId) {
  const auctionRef = doc(db, 'auctions', auctionId);
  
  onSnapshot(auctionRef, (doc) => {
    if (doc.exists()) {
      const auction = doc.data();
      const now = new Date();
      const end = auction.endDate.toDate();
      
      // NEW: Check if sold early auction time has ended, convert to ended
      if (auction.status === 'sold' && auction.endedEarly && now > end) {
        updateDoc(doc(db, 'auctions', auctionId), {
          status: 'ended',
          endedEarly: false,
          updatedAt: serverTimestamp()
        });
        return;
      }
      
      // If auction was sold early, update UI immediately
      if (auction.status === 'sold' && auction.endedEarly) {
        // Hide bid form
        const bidFormSection = byId('bidFormSection');
        if (bidFormSection) bidFormSection.classList.add('hidden');
        
        // Update status badge
        const statusBadge = byId('auctionStatusBadge');
        if (statusBadge) {
          statusBadge.textContent = 'SOLD';
          statusBadge.className = 'status-badge status-sold';
        }
        
        // Show sold message
        const currentBidSection = byId('currentBidSection');
        if (currentBidSection) {
          currentBidSection.innerHTML = `
            <h4>Auction Result</h4>
            <div style="background: var(--primary-50); padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: var(--primary-700);">🏆 Sold to ${auction.winningBidder}</div>
              <div style="font-size: 18px; margin-top: 8px;">Final Price: ₹${auction.finalPrice}</div>
              <div class="muted">(Ended early by farmer)</div>
            </div>
          `;
        }
      } else if (auction.status === 'ended' && !auction.endedEarly) {
        // Auction ended naturally by time
        const bidFormSection = byId('bidFormSection');
        if (bidFormSection) bidFormSection.classList.add('hidden');
        
        const statusBadge = byId('auctionStatusBadge');
        if (statusBadge) {
          statusBadge.textContent = 'ENDED';
          statusBadge.className = 'status-badge status-ended';
        }
      }
    }
  });
}

// Load auction details
async function loadAuctionDetail() {
  const auctionId = getParam('id');
  if (!auctionId) {
    window.location.href = './auction.html';
    return;
  }
  
  const session = getSession();
  const isManageMode = getParam('manage') === 'true';
  
  try {
    const auctionDoc = await getDoc(doc(db, 'auctions', auctionId));
    if (!auctionDoc.exists()) {
      window.location.href = './auction.html';
      return;
    }
    
    const auction = { id: auctionDoc.id, ...auctionDoc.data() };
    renderAuctionDetail(auction, session, isManageMode);
    loadBidHistory(auctionId, session, isManageMode);
    
    // Setup real-time status monitoring for all users
    setupAuctionStatusListener(auctionId);
    
    // FIX: Unsubscribe previous listener before setting up new one
    if (bidListenerUnsubscribe) {
      bidListenerUnsubscribe();
      bidListenerUnsubscribe = null;
    }
    
    // Setup real-time bid updates for live auctions
    const status = getAuctionStatus(auction);
    if (status === 'live' && auction.status === 'active') {
      bidListenerUnsubscribe = setupBidListener(auctionId, session, isManageMode);
    }
    
  } catch (err) {
    console.error('Error loading auction details:', err);
  }
}

// Enhanced auction detail rendering
function renderAuctionDetail(auction, session, isManageMode) {
  // Set basic info
  byId('detailAuctionImage').src = auction.imageBase64 || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDA/c3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
  byId('detailAuctionImage').onerror = function() {
    this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
  };
  byId('detailAuctionTitle').textContent = auction.productName;
  byId('detailAuctionDesc').textContent = auction.description || '';
  
  // Set auction info
  byId('detailBasePrice').textContent = `₹${auction.basePrice}`;
  byId('detailBidIncrement').textContent = `₹${auction.bidIncrement}`;
  byId('detailQuantity').textContent = `${auction.quantity}kg`;
  byId('detailLocation').textContent = auction.location;
  byId('detailStartTime').textContent = auction.startDate.toDate().toLocaleString();
  byId('detailEndTime').textContent = auction.endDate.toDate().toLocaleString();
  byId('detailFarmerName').textContent = auction.farmerName || auction.ownerName;
  byId('detailFarmerEmail').textContent = auction.farmerEmail || auction.ownerEmail;
  byId('detailFarmerMobile').textContent = auction.farmerMobile || 'Not provided';
  
  // Determine auction status with new logic
  let status = getAuctionStatus(auction);
  let statusText = status.toUpperCase();
  
  // Special case: sold early but time remains
  if (status === 'sold' && auction.endedEarly) {
    statusText = 'SOLD';
  }
  
  const statusBadge = byId('auctionStatusBadge');
  statusBadge.textContent = statusText;
  statusBadge.className = `status-badge status-${status}`;
  
  // Show/hide sections based on user role and auction status
  const bidFormSection = byId('bidFormSection');
  const bidManagementSection = byId('bidManagementSection');
  
  // Hide bid form if auction is not live (either ended by time or manually)
  if (status !== 'live') {
    bidFormSection.classList.add('hidden');
  }
  
  if (session.role === 'farmer' && session.uid === auction.ownerUid) {
    if (isManageMode) {
      bidManagementSection.classList.remove('hidden');
      setupBidManagement(auction.id);
    }
  } else if (session.role === 'buyer' && status === 'live') {
    bidFormSection.classList.remove('hidden');
    setupBidForm(auction);
  }

  // Setup delete button for auction owner - ALWAYS show for owner
  setupAuctionDeleteButton(auction.id, auction);
  
  // Show special message for winning bidder
  if (auction.status === 'sold' && auction.endedEarly && session.email === auction.winningBidderEmail) {
    const winningMessage = document.createElement('div');
    winningMessage.className = 'card';
    winningMessage.style.background = 'var(--success-50)';
    winningMessage.style.borderLeft = '4px solid var(--success)';
    winningMessage.innerHTML = `
      <h4>🎉 Your Bid Was Accepted!</h4>
      <p>Congratulations! Your bid of <strong>₹${auction.finalPrice}</strong> has been accepted by the farmer.</p>
      <p>Please check your chats to discuss delivery details with the farmer.</p>
      <a href="./my-chats.html" class="btn btn-success">Go to Chats</a>
    `;
    
    // Insert after the auction header
    const auctionHeader = byId('detailAuctionTitle').parentElement;
    auctionHeader.parentNode.insertBefore(winningMessage, auctionHeader.nextSibling);
  }
}

// FIXED: Enhanced auction deletion function
async function setupAuctionDeleteButton(auctionId, auction) {
  const ownerActions = byId('ownerActions');
  const deleteBtn = byId('deleteAuctionBtn');
  const session = getSession();
  
  // Show delete button only for auction owner
  if (session.uid === auction.ownerUid) {
    ownerActions.classList.remove('hidden');
    
    deleteBtn.addEventListener('click', async () => {
      let confirmMessage = 'Are you sure you want to delete this auction? ';
      
      // Check if there are any bids placed
      const bidsSnapshot = await getDocs(collection(db, 'auctions', auctionId, 'bids'));
      const hasBids = !bidsSnapshot.empty;
      
      if (hasBids) {
        confirmMessage += 'This will permanently delete the auction and all associated bids. ';
      } else {
        confirmMessage += 'This will permanently delete the auction. ';
      }
      
      confirmMessage += 'This action cannot be undone.';
      
      if (confirm(confirmMessage)) {
        try {
          console.log('Attempting to delete auction:', auctionId);
          console.log('Current user UID:', session.uid);
          console.log('Auction owner UID:', auction.ownerUid);
          console.log('Auction status:', auction.status);
          console.log('Number of bids:', bidsSnapshot.size);
          
          // First delete all bids in the subcollection (if any exist)
          if (hasBids) {
            const deleteBidsPromises = bidsSnapshot.docs.map(bidDoc => 
              deleteDoc(doc(db, 'auctions', auctionId, 'bids', bidDoc.id))
            );
            await Promise.all(deleteBidsPromises);
            console.log(`Deleted ${bidsSnapshot.size} bids`);
          }
          
          // Then delete the auction itself
          await deleteDoc(doc(db, 'auctions', auctionId));
          
          alert('Auction deleted successfully!');
          window.location.href = './auction.html';
        } catch (err) {
          console.error('Error deleting auction:', err);
          
          // More specific error messages
          if (err.code === 'permission-denied') {
            alert('Permission denied. You may not have the rights to delete this auction.');
          } else if (err.code === 'not-found') {
            alert('Auction not found. It may have already been deleted.');
          } else {
            alert('Error deleting auction. Please try again.');
          }
        }
      }
    });
  }
}

// Update current highest bid display (only for buyers)
async function updateCurrentBid(auctionId) {
  const currentBidEl = byId('currentBidInfo');
  
  // Only update if this element exists (for buyers)
  if (!currentBidEl) return;
  
  try {
    const bidsSnap = await getDocs(
      query(collection(db, 'auctions', auctionId, 'bids'), orderBy('bidAmount', 'desc'), limit(1))
    );
    
    if (bidsSnap.empty) {
      currentBidEl.innerHTML = '<p class="muted">No bids yet. Be the first to bid!</p>';
    } else {
      const highestBid = bidsSnap.docs[0].data();
      currentBidEl.innerHTML = `
        <div class="current-bid">₹${highestBid.bidAmount}</div>
        <p class="muted">by ${highestBid.bidderName}</p>
      `;
    }
  } catch (err) {
    console.error('Error updating current bid:', err);
  }
}

// FIXED: Enhanced bid form setup with fixed bidding system
async function setupBidForm(auction) {
  const form = byId('bidForm');
  const minBidHint = byId('minBidHint');
  
  // Clear any existing event listeners by cloning the form
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  const currentForm = byId('bidForm');
  const currentMinBidHint = byId('minBidHint');
  
  // First check if auction was sold manually (even if time remains)
  if (auction.status === 'sold' && auction.endedEarly) {
    currentForm.innerHTML = '<p class="muted">Auction sold. Bidding closed.</p>';
    return;
  }
  
  // Calculate minimum bid based on current highest bid + increment
  let minBid = auction.basePrice;
  let currentHighestBid = 0;
  
  try {
    const bidsSnap = await getDocs(
      query(collection(db, 'auctions', auction.id, 'bids'), orderBy('bidAmount', 'desc'), limit(1))
    );
    
    if (!bidsSnap.empty) {
      const highestBid = bidsSnap.docs[0].data();
      currentHighestBid = highestBid.bidAmount;
      minBid = currentHighestBid + auction.bidIncrement;
    }
    
    // NEW: Fixed bidding system - only allow exactly base price + increment
    currentMinBidHint.textContent = `Next bid must be exactly: ₹${minBid}`;
    byId('bidAmount').value = minBid; // Auto-fill with the required amount
    byId('bidAmount').readOnly = true; // Make it read-only since it's fixed
    byId('bidAmount').style.background = '#f8f9fa';
    byId('bidAmount').style.cursor = 'not-allowed';
    
  } catch (err) {
    console.error('Error calculating minimum bid:', err);
  }
  
  // Use one-time event listener to prevent duplicates
  let isSubmitting = false;
  
  currentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Prevent multiple simultaneous submissions
    if (isSubmitting) {
      alert('Please wait, your previous bid is being processed...');
      return;
    }
    
    isSubmitting = true;
    const bidAmount = parseFloat(byId('bidAmount').value);
    const session = getSession();
    
    try {
      // Double-check auction status before submitting bid
      const currentAuction = await getDoc(doc(db, 'auctions', auction.id));
      const auctionData = currentAuction.data();
      
      // Prevent bidding if auction was sold early
      if (auctionData.status === 'sold' && auctionData.endedEarly) {
        alert('Auction has been sold. Bidding is closed.');
        isSubmitting = false;
        return;
      }
      
      if (auctionData.status !== 'active') {
        alert('Auction has ended. Bidding is closed.');
        isSubmitting = false;
        return;
      }
      
      // Get current highest bid to validate minimum
      const currentBidsSnap = await getDocs(
        query(collection(db, 'auctions', auction.id, 'bids'), orderBy('bidAmount', 'desc'), limit(1))
      );
      
      let currentMinBid = auction.basePrice;
      if (!currentBidsSnap.empty) {
        const highestBid = currentBidsSnap.docs[0].data();
        currentMinBid = highestBid.bidAmount + auction.bidIncrement;
      }
      
      // NEW: Fixed validation - bid must be exactly the required amount
      if (bidAmount !== currentMinBid) {
        alert(`Bid must be exactly ₹${currentMinBid} (current highest bid + increment)`);
        byId('bidAmount').value = currentMinBid;
        isSubmitting = false;
        return;
      }
      
      // Place the bid
      await addDoc(collection(db, 'auctions', auction.id, 'bids'), {
        bidAmount,
        bidderUid: session.uid,
        bidderName: session.name,
        bidderEmail: session.email,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      
      alert('Bid placed successfully!');
      updateCurrentBid(auction.id);
      
      // NEW: Auto-update the bid amount for the next bidder
      const nextBidAmount = bidAmount + auction.bidIncrement;
      byId('bidAmount').value = nextBidAmount;
      currentMinBidHint.textContent = `Next bid must be exactly: ₹${nextBidAmount}`;
      
    } catch (err) {
      console.error('Error placing bid:', err);
      alert('Error placing bid. Please try again.');
    } finally {
      isSubmitting = false;
    }
  });
}

// Load bid history
async function loadBidHistory(auctionId, session, isManageMode) {
  const bidHistoryEl = byId('bidHistory');
  
  try {
    const bidsSnap = await getDocs(
      query(collection(db, 'auctions', auctionId, 'bids'), orderBy('bidAmount', 'desc'))
    );
    
    bidHistoryEl.innerHTML = '';
    
    if (bidsSnap.empty) {
      bidHistoryEl.innerHTML = '<p class="muted">No bids yet.</p>';
      return;
    }
    
    bidsSnap.forEach(docSnap => {
      const bid = docSnap.data();
      const bidEl = document.createElement('div');
      bidEl.className = 'bid-item';
      
      bidEl.innerHTML = `
        <div>
          <strong>${bid.bidderName}</strong>
          <div class="muted">${bid.timestamp?.toDate().toLocaleString() || 'Just now'}</div>
        </div>
        <div class="bid-amount">₹${bid.bidAmount}</div>
      `;
      
      bidHistoryEl.appendChild(bidEl);
    });
    
  } catch (err) {
    console.error('Error loading bid history:', err);
  }
}

// Setup real-time bid listener - MODIFIED to return unsubscribe function
function setupBidListener(auctionId, session, isManageMode) {
  // Return the unsubscribe function from onSnapshot
  return onSnapshot(
    query(collection(db, 'auctions', auctionId, 'bids'), orderBy('timestamp', 'desc')),
    (snapshot) => {
      loadBidHistory(auctionId, session, isManageMode);
      updateCurrentBid(auctionId);
      
      // NEW: Auto-update the bid form when new bids are placed
      if (!isManageMode) {
        updateBidFormForNextBid(auctionId);
      }
    }
  );
}

// NEW: Function to update bid form for the next bid
async function updateBidFormForNextBid(auctionId) {
  try {
    const auctionDoc = await getDoc(doc(db, 'auctions', auctionId));
    const auction = auctionDoc.data();
    
    const bidsSnap = await getDocs(
      query(collection(db, 'auctions', auctionId, 'bids'), orderBy('bidAmount', 'desc'), limit(1))
    );
    
    let nextBidAmount = auction.basePrice;
    if (!bidsSnap.empty) {
      const highestBid = bidsSnap.docs[0].data();
      nextBidAmount = highestBid.bidAmount + auction.bidIncrement;
    }
    
    // Update the bid form
    const bidAmountInput = byId('bidAmount');
    const minBidHint = byId('minBidHint');
    
    if (bidAmountInput && minBidHint) {
      bidAmountInput.value = nextBidAmount;
      minBidHint.textContent = `Next bid must be exactly: ₹${nextBidAmount}`;
    }
    
  } catch (err) {
    console.error('Error updating bid form:', err);
  }
}

// Enhanced bid management for farmers
async function setupBidManagement(auctionId) {
  const bidListEl = byId('bidList');
  const highestBidInfo = byId('highestBidInfo');
  const acceptBtn = byId('acceptBidBtn');
  let selectedBidId = null;
  
  try {
    // First check if auction is already sold or ended
    const auctionDoc = await getDoc(doc(db, 'auctions', auctionId));
    const auction = auctionDoc.data();
    
    if (auction.status === 'sold' || auction.status === 'ended') {
      // Auction already ended, show appropriate status
      bidListEl.innerHTML = '';
      
      if (auction.status === 'sold') {
        highestBidInfo.innerHTML = `
          <div style="background: var(--primary-50); padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: var(--primary-700);">🏆 Bid Accepted</div>
            <div style="margin-top: 12px;">
              <strong>Winner: ${auction.winningBidder}</strong>
              <div class="muted">${auction.winningBidderEmail}</div>
              <div style="font-size: 20px; font-weight: bold; color: var(--primary-700); margin-top: 8px;">
                Final Price: ₹${auction.finalPrice}
              </div>
              <div class="muted">Sold on: ${auction.soldAt?.toDate().toLocaleString() || 'Recently'}</div>
              ${auction.endedEarly ? '<div class="muted">(Ended early by farmer)</div>' : ''}
            </div>
          </div>
        `;
      } else {
        highestBidInfo.innerHTML = `
          <div style="background: #fef3cd; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #b45309;">⏰ Auction Ended</div>
            <div style="margin-top: 12px;">
              <div style="font-size: 18px; color: #b45309;">Time limit reached</div>
              <div class="muted">Ended on: ${auction.endedAt?.toDate().toLocaleString() || 'Recently'}</div>
            </div>
          </div>
        `;
      }
      
      acceptBtn.classList.add('hidden');
      return;
    }
    
    const bidsSnap = await getDocs(
      query(collection(db, 'auctions', auctionId, 'bids'), orderBy('bidAmount', 'desc'))
    );
    
    bidListEl.innerHTML = '';
    acceptBtn.classList.add('hidden');
    
    if (bidsSnap.empty) {
      bidListEl.innerHTML = '<p class="muted">No bids yet.</p>';
      highestBidInfo.innerHTML = '<p class="muted">No bids placed yet.</p>';
      return;
    }
    
    // Show highest bid
    const highestBid = bidsSnap.docs[0].data();
    highestBidInfo.innerHTML = `
      <div style="font-size: 24px; font-weight: bold; color: var(--primary-700);">₹${highestBid.bidAmount}</div>
      <div style="margin-top: 8px;">
        <strong>${highestBid.bidderName}</strong>
        <div class="muted">${highestBid.bidderEmail}</div>
        <div class="muted">Placed on: ${highestBid.timestamp?.toDate().toLocaleString() || 'Recently'}</div>
      </div>
    `;
    
    // Show all bids for selection
    bidsSnap.forEach(docSnap => {
      const bid = { id: docSnap.id, ...docSnap.data() };
      const bidEl = document.createElement('div');
      bidEl.className = 'bid-item';
      bidEl.dataset.bidId = docSnap.id;
      
      bidEl.innerHTML = `
        <div style="flex: 1;">
          <strong>${bid.bidderName}</strong>
          <div class="muted">${bid.bidderEmail}</div>
          <div class="muted">${bid.timestamp?.toDate().toLocaleString() || 'Recently'}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="bid-amount">₹${bid.bidAmount}</div>
          <input type="radio" name="selectedBid" value="${docSnap.id}" />
        </div>
      `;
      
      bidEl.addEventListener('click', (e) => {
        if (e.target.type !== 'radio') {
          const radio = bidEl.querySelector('input[type="radio"]');
          radio.checked = !radio.checked;
        }
        
        if (bidEl.querySelector('input[type="radio"]').checked) {
          selectedBidId = docSnap.id;
          qsa('.bid-item').forEach(item => item.classList.remove('selected'));
          bidEl.classList.add('selected');
          acceptBtn.classList.remove('hidden');
        } else {
          selectedBidId = null;
          acceptBtn.classList.add('hidden');
        }
      });
      
      bidListEl.appendChild(bidEl);
    });
    
    acceptBtn.addEventListener('click', async () => {
      if (!selectedBidId) return;
      
      if (confirm('Are you sure you want to accept this bid? This will immediately end the auction for all buyers and create a chat with the winner.')) {
        try {
          // Get the selected bid
          const bidDoc = await getDoc(doc(db, 'auctions', auctionId, 'bids', selectedBidId));
          const selectedBid = bidDoc.data();
          
          // End auction immediately for all buyers (manual acceptance)
          const success = await endAuction(
            auctionId, 
            selectedBidId, 
            selectedBid.bidderName,
            selectedBid.bidderEmail,
            selectedBid.bidAmount
          );
          
          if (success) {
            // Create chat between farmer and winning bidder
            const chatId = await createAuctionChat(
              auctionId, 
              selectedBid.bidderName,
              selectedBid.bidderEmail,
              selectedBid.bidAmount
            );
            
            if (chatId) {
              // Refresh the bid management view to show sold status
              setupBidManagement(auctionId);
              
              // Show success message
              alert(`Bid accepted! Chat created with ${selectedBid.bidderName}. The buyer will see their bid was accepted in the auction listings.`);
              
              // Redirect to chat immediately
              const goToChat = confirm(`Would you like to go to the chat now?`);
              if (goToChat) {
                window.location.href = `./chat.html?id=${chatId}`;
              }
            }
          }
          
        } catch (err) {
          console.error('Error accepting bid:', err);
          alert('Error accepting bid. Please try again.');
        }
      }
    });
    
  } catch (err) {
    console.error('Error setting up bid management:', err);
  }
}

// -------------------- Transport Services --------------------

// Google Maps API Key (Replace with your actual key)
const GOOGLE_MAPS_API_KEY = 'AIzaSyCUGAx4Zue7PCjB1e3Qr5YGwGEV9xyCHjg';

// Load transport services
async function loadTransportServices() {
  const container = byId('transportServices');
  if (!container) return;

  try {
    // Sample transport services data
    const services = [
      {
        id: '1',
        name: 'AgriLogistics Express',
        type: 'Refrigerated Truck',
        capacity: '5 tons',
        coverage: 'Pan-India',
        rating: 4.5,
        pricePerKm: 15,
        features: ['Refrigerated', 'GPS Tracking', 'Same Day'],
        description: 'Specialized in perishable goods transport with temperature control'
      },
      {
        id: '2', 
        name: 'Green Transport Solutions',
        type: 'Multi-Temperature Van',
        capacity: '2 tons',
        coverage: 'North India',
        rating: 4.2,
        pricePerKm: 12,
        features: ['Multi-Temp', 'Real-time Tracking', 'Insurance'],
        description: 'Reliable transport for all agricultural products'
      },
      {
        id: '3',
        name: 'Fresh Delivery Network',
        type: 'Cold Chain Logistics',
        capacity: '10 tons',
        coverage: 'Major Cities',
        rating: 4.7,
        pricePerKm: 18,
        features: ['Cold Chain', '24/7 Support', 'Express Delivery'],
        description: 'Premium cold chain logistics for sensitive agricultural products'
      }
    ];

    renderTransportServices(services);
    setupTransportEventListeners();
  } catch (err) {
    console.error('Error loading transport services:', err);
  }
}

// Render transport services
function renderTransportServices(services) {
  const container = byId('transportServices');
  container.innerHTML = '';

  services.forEach(service => {
    const card = document.createElement('div');
    card.className = 'card transport-card';
    card.innerHTML = `
      <div class="transport-header">
        <h4>${service.name}</h4>
        <span class="transport-type">${service.type}</span>
      </div>
      
      <div class="transport-features">
        ${service.features.map(feature => 
          `<span class="feature-tag">${feature}</span>`
        ).join('')}
      </div>
      
      <p class="muted">${service.description}</p>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
        <div>
          <span class="rating">⭐ ${service.rating}</span>
          <span class="muted">• ${service.capacity} • ${service.coverage}</span>
        </div>
        <div style="text-align: right;">
          <div class="price">₹${service.pricePerKm}/km</div>
          <button class="btn btn-primary book-transport" data-id="${service.id}">Book Now</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Setup transport event listeners
function setupTransportEventListeners() {
  // Quote form
  const quoteForm = byId('quoteForm');
  if (quoteForm) {
    quoteForm.addEventListener('submit', handleQuoteRequest);
  }

  // Track shipment
  const trackBtn = byId('trackShipment');
  if (trackBtn) {
    trackBtn.addEventListener('click', trackShipment);
  }

  // Provider registration
  const registerBtn = byId('registerProvider');
  if (registerBtn) {
    registerBtn.addEventListener('click', () => {
      byId('providerModal').classList.remove('hidden');
    });
  }

  // Close provider modal
  const closeModal = byId('closeProviderModal');
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      byId('providerModal').classList.add('hidden');
    });
  }

  // Provider form submission
  const providerForm = byId('providerForm');
  if (providerForm) {
    providerForm.addEventListener('submit', handleProviderRegistration);
  }

  // Book transport buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('book-transport')) {
      const serviceId = e.target.dataset.id;
      bookTransportService(serviceId);
    }
  });
}

// Enhanced distance calculation with real Google Maps API
async function calculateRealDistance(origin, destination) {
  try {
    // Use Google Maps Distance Matrix API
    const apiKey = GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'AIzaSyCUGAx4Zue7PCjB1e3Qr5YGwGEV9xyCHjg') {
      // Fallback to mock calculation if no API key
      return calculateDistanceMock(origin, destination);
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
      const distanceMeters = data.rows[0].elements[0].distance.value;
      const distanceKm = distanceMeters / 1000;
      return Math.ceil(distanceKm);
    } else {
      throw new Error('Google Maps API error: ' + data.status);
    }
  } catch (error) {
    console.error('Real distance calculation failed:', error);
    // Fallback to mock calculation
    return calculateDistanceMock(origin, destination);
  }
}

// Mock distance calculation (fallback)
function calculateDistanceMock(origin, destination) {
  const cityDistances = {
    // North India
    'delhi-chandigarh': 250, 'delhi-jaipur': 280, 'delhi-dehradun': 250,
    'delhi-lucknow': 550, 'delhi-amritsar': 450, 'delhi-varanasi': 800,
    'delhi-agra': 240, 'delhi-allahabad': 650, 'delhi-bareilly': 250,
    'delhi-meerut': 70, 'delhi-gurgaon': 30, 'delhi-noida': 40,
    'delhi-faridabad': 25, 'delhi-ghaziabad': 20, 'delhi-rohtak': 80,
    'delhi-karnal': 130, 'delhi-panipat': 90, 'delhi-sonipat': 50,
    'delhi-ambala': 200, 'delhi-ludhiana': 310, 'delhi-jalandhar': 380,
    'delhi-patiala': 250, 'delhi-bathinda': 320, 'delhi-hisar': 160,
    'delhi-roorkee': 170, 'delhi-haridwar': 210, 'delhi-rishikesh': 230,
    'delhi-moradabad': 160, 'delhi-saharanpur': 170, 'delhi-muzaffarnagar': 130,
    'delhi-bijnor': 150, 'delhi-aligarh': 140, 'delhi-mathura': 150,
    'delhi-vrindavan': 150, 'delhi-ayodhya': 600, 'delhi-gorakhpur': 750,
    'delhi-jammu': 580, 'delhi-srinagar': 830, 'delhi-leh': 1050,

    // West India
    'mumbai-pune': 150, 'mumbai-ahmedabad': 530, 'mumbai-goa': 600,
    'mumbai-hyderabad': 700, 'mumbai-surat': 280, 'mumbai-vadodara': 400,
    'mumbai-rajkot': 800, 'mumbai-bhavnagar': 650, 'mumbai-jamnagar': 850,
    'mumbai-gandhinagar': 540, 'mumbai-nashik': 170, 'mumbai-nagpur': 850,
    'mumbai-aurangabad': 350, 'mumbai-solapur': 400, 'mumbai-kolhapur': 400,
    'mumbai-sangli': 370, 'mumbai-malegaon': 280, 'mumbai-nanded': 550,
    'mumbai-latur': 450, 'mumbai-dhule': 330, 'mumbai-jalgaon': 420,
    'mumbai-akola': 550, 'mumbai-amravati': 670, 'mumbai-chandrapur': 850,
    'mumbai-ratnagiri': 330, 'mumbai-thane': 30, 'mumbai-navimumbai': 30,
    'mumbai-kalyan': 50, 'mumbai-ulhasnagar': 60, 'mumbai-bhiwandi': 40,
    'mumbai-panvel': 40, 'mumbai-vasai': 60, 'mumbai-virar': 70,

    // South India
    'bangalore-chennai': 350, 'bangalore-hyderabad': 570, 
    'bangalore-kochi': 550, 'bangalore-coimbatore': 360,
    'chennai-hyderabad': 625, 'chennai-bangalore': 350,
    'bangalore-mysore': 150, 'bangalore-mangalore': 350,
    'bangalore-hubli': 410, 'bangalore-belgaum': 500,
    'bangalore-gulbarga': 620, 'bangalore-bellary': 300,
    'bangalore-bijapur': 530, 'bangalore-shimoga': 280,
    'bangalore-tumkur': 70, 'bangalore-kolar': 70,
    'bangalore-chikkaballapur': 60, 'bangalore-hassan': 180,
    'bangalore-udupi': 400, 'bangalore-madikeri': 260,
    'chennai-coimbatore': 500, 'chennai-madurai': 450,
    'chennai-trichy': 320, 'chennai-salem': 340,
    'chennai-vellore': 130, 'chennai-pondicherry': 160,
    'chennai-tirupati': 130, 'chennai-nellore': 180,
    'chennai-kanyakumari': 700, 'chennai-ooty': 550,
    'chennai-karaikudi': 400, 'chennai-thanjavur': 350,
    'chennai-kumbakonam': 320, 'chennai-rameshwaram': 580,
    'hyderabad-vijayawada': 270, 'hyderabad-visakhapatnam': 620,
    'hyderabad-warangal': 140, 'hyderabad-khammam': 200,
    'hyderabad-karimnagar': 160, 'hyderabad-nizamabad': 170,
    'hyderabad-mahabubnagar': 100, 'hyderabad-adilabad': 290,
    'hyderabad-nellore': 450, 'hyderabad-guntur': 270,
    'hyderabad-kurnool': 210, 'hyderabad-anantapur': 350,
    'hyderabad-kadapa': 410, 'hyderabad-tirupati': 550,

    // East India
    'kolkata-patna': 550, 'kolkata-bhubaneswar': 440,
    'kolkata-guwahati': 980, 'kolkata-ranchi': 400,
    'kolkata-dhanbad': 260, 'kolkata-asansol': 220,
    'kolkata-siliguri': 560, 'kolkata-durgapur': 160,
    'kolkata-bardhaman': 100, 'kolkata-malda': 340,
    'kolkata-kharagpur': 120, 'kolkata-howrah': 10,
    'kolkata-saltlake': 10, 'kolkata-newtown': 15,
    'kolkata-barrackpore': 25, 'kolkata-serenity': 30,
    'kolkata-haldia': 120, 'kolkata-kalyani': 50,
    'kolkata-bankura': 180, 'kolkata-midnapore': 130,
    'kolkata-purulia': 300, 'kolkata-coochbehar': 680,
    'kolkata-jalpaiguri': 590, 'kolkata-alipurduar': 640,
    'patna-ranchi': 340, 'patna-gaya': 100,
    'patna-bhagalpur': 230, 'patna-muzaffarpur': 80,
    'patna-darbhanga': 140, 'patna-purnia': 330,
    'patna-sitamarhi': 140, 'patna-sasaram': 150,
    'patna-hajipur': 20, 'patna-bettiah': 160,
    'patna-katihar': 310, 'patna-arrah': 60,
    'patna-buxar': 120, 'patna-chapra': 70,
    'bhubaneswar-pur': 60, 'bhubaneswar-cuttack': 30,
    'bhubaneswar-berhampur': 170, 'bhubaneswar-sambalpur': 300,
    'bhubaneswar-roukela': 330, 'bhubaneswar-balasore': 200,
    'bhubaneswar-bhadrak': 130, 'bhubaneswar-jajpur': 100,
    'bhubaneswar-kendrapara': 90, 'bhubaneswar-paradeep': 110,
    'bhubaneswar-angul': 150, 'bhubaneswar-jharsuguda': 350,

    // Central India
    'bhopal-indore': 190, 'bhopal-gwalior': 420,
    'bhopal-jabalpur': 330, 'bhopal-ujjain': 180,
    'bhopal-sagar': 170, 'bhopal-rewa': 500,
    'bhopal-satna': 480, 'bhopal-chhindwara': 280,
    'bhopal-khandwa': 220, 'bhopal-burhanpur': 300,
    'bhopal-dewas': 140, 'bhopal-dhar': 240,
    'bhopal-ratlam': 280, 'bhopal-neemuch': 320,
    'indore-gwalior': 480, 'indore-jabalpur': 400,
    'indore-ujjain': 55, 'indore-dhar': 60,
    'indore-khandwa': 150, 'indore-dewas': 35,
    'indore-mhow': 25, 'indore-ratlam': 130,
    'indore-burhanpur': 180, 'indore-khargone': 140,
    'indore-barwani': 150, 'indore-alirajpur': 200,

    // Northeast India
    'guwahati-shillong': 100, 'guwahati-agartala': 550,
    'guwahati-silchar': 320, 'guwahati-dibrugarh': 440,
    'guwahati-jorhat': 310, 'guwahati-tezpur': 180,
    'guwahati-nagaon': 120, 'guwahati-bongaigaon': 150,
    'guwahati-kokrajhar': 220, 'guwahati-dhubri': 280,
    'guwahati-goalpara': 130, 'guwahati-barpeta': 110,
    'guwahati-mangaldoi': 70, 'guwahati-nalbari': 60,
    'guwahati-north lakhimpur': 380, 'guwahati-dhemaji': 420,
    'guwahati-tinsukia': 470, 'guwahati-itangar': 380,

    // Major inter-regional routes
    'delhi-mumbai': 1400, 'delhi-bangalore': 2150, 'delhi-chennai': 2200,
    'delhi-kolkata': 1300, 'mumbai-chennai': 1300, 'mumbai-kolkata': 1650,
    'bangalore-delhi': 2150, 'chennai-kolkata': 1350,
    'hyderabad-mumbai': 700, 'hyderabad-delhi': 1250,
    'kolkata-mumbai': 1650, 'kolkata-bangalore': 1550,
    'kolkata-hyderabad': 1150, 'kolkata-chennai': 1350,
    'mumbai-hyderabad': 700, 'mumbai-bangalore': 980,
    'bangalore-hyderabad': 570, 'bangalore-chennai': 350,
    'chennai-hyderabad': 625, 'chennai-bangalore': 350,
    'delhi-hyderabad': 1250, 'delhi-chennai': 2200,
    'mumbai-kolkata': 1650, 'bangalore-kolkata': 1550,
    'hyderabad-kolkata': 1150, 'chennai-delhi': 2200,
    
    // Additional major city pairs
    'pune-bangalore': 840, 'pune-hyderabad': 560,
    'pune-chennai': 1150, 'pune-kolkata': 1650,
    'ahmedabad-delhi': 950, 'ahmedabad-mumbai': 530,
    'ahmedabad-bangalore': 1500, 'ahmedabad-chennai': 1750,
    'ahmedabad-kolkata': 1950, 'ahmedabad-hyderabad': 1220,
    'surat-mumbai': 280, 'surat-delhi': 1150,
    'surat-bangalore': 1450, 'surat-chennai': 1650,
    'vadodara-mumbai': 400, 'vadodara-delhi': 1000,
    'goa-mumbai': 600, 'goa-bangalore': 560,
    'goa-chennai': 850, 'goa-hyderabad': 650,
    'kochi-chennai': 690, 'kochi-bangalore': 550,
    'kochi-hyderabad': 1050, 'kochi-mumbai': 1300,
    'coimbatore-chennai': 500, 'coimbatore-bangalore': 360,
    'coimbatore-hyderabad': 850, 'coimbatore-mumbai': 1150,
    'mysore-bangalore': 150, 'mysore-chennai': 470,
    'mysore-hyderabad': 750, 'madurai-chennai': 450,
    'madurai-bangalore': 430, 'madurai-hyderabad': 950,
    'visakhapatnam-chennai': 800, 'visakhapatnam-hyderabad': 620,
    'visakhapatnam-bangalore': 1050, 'visakhapatnam-kolkata': 880,
    'bhubaneswar-kolkata': 440, 'bhubaneswar-chennai': 1200,
    'bhubaneswar-hyderabad': 1050, 'bhubaneswar-bangalore': 1350,
    'patna-kolkata': 550, 'patna-delhi': 1000,
    'patna-mumbai': 1650, 'patna-chennai': 1750,
    'lucknow-delhi': 550, 'lucknow-mumbai': 1350,
    'lucknow-kolkata': 990, 'lucknow-bangalore': 1950,
    'kanpur-delhi': 480, 'kanpur-mumbai': 1250,
    'kanpur-kolkata': 940, 'kanpur-bangalore': 1850,
    'nagpur-mumbai': 850, 'nagpur-hyderabad': 500,
    'nagpur-bangalore': 1100, 'nagpur-kolkata': 1150,
    'indore-mumbai': 590, 'indore-delhi': 800,
    'indore-hyderabad': 750, 'indore-bangalore': 1400,
    'bhopal-mumbai': 780, 'bhopal-delhi': 740,
    'bhopal-hyderabad': 610, 'bhopal-bangalore': 1450,
    'jaipur-delhi': 280, 'jaipur-mumbai': 1150,
    'jaipur-ahmedabad': 650, 'jaipur-bangalore': 2100,
    'chandigarh-delhi': 250, 'chandigarh-mumbai': 1650,
    'chandigarh-shimla': 110, 'chandigarh-amritsar': 230,
    'amritsar-delhi': 450, 'amritsar-jammu': 210,
    'jammu-delhi': 580, 'jammu-srinagar': 290,
    'srinagar-delhi': 830, 'srinagar-leh': 420,
    'leh-delhi': 1050, 'leh-manali': 470,
    
    // Union Territories
    'delhi-chandigarh': 250, 'delhi-puducherry': 2200,
    'mumbai-daman': 170, 'mumbai-diu': 850,
    'mumbai-dadra': 160, 'ahmedabad-daman': 350,
    'chennai-puducherry': 160, 'bangalore-puducherry': 310,
    'kolkata-andaman': 1250, 'chennai-andaman': 1350

    
};
  
  const key = `${origin.toLowerCase()}-${destination.toLowerCase()}`;
  const reverseKey = `${destination.toLowerCase()}-${origin.toLowerCase()}`;
  
  const distance = cityDistances[key] || cityDistances[reverseKey];
  
  if (distance) {
    console.log('Using cached distance:', distance, 'km');
    return distance;
  }
  
  // Default average distance
  console.log('Using default distance: 100 km');
  return 100;
}

// Enhanced cost calculation based on real logistics factors
function calculateRealisticCost(distanceKm, weightKg, cargoType, urgency, options = {}) {
  // Base rates per km (₹ per km)
  const baseRates = {
    'vegetables': 12, 'fruits': 14, 'grains': 8, 
    'dairy': 18, 'livestock': 30, 'other': 10
  };
  
  // Urgency multipliers
  const urgencyMultipliers = {
    'standard': 1.0,
    'express': 1.6,
    'same_day': 2.8
  };
  
  // Special handling multipliers
  const handlingMultipliers = {
    'refrigerated': 1.4,
    'fragile': 1.3,
    'insurance': 1.2
  };
  
  // Calculate base cost
  let baseCost = distanceKm * baseRates[cargoType] * (weightKg / 1000); // Convert to ton basis
  
  // Apply urgency multiplier
  let urgencyCost = baseCost * urgencyMultipliers[urgency];
  
  // Apply special handling multipliers
  let finalCost = urgencyCost;
  Object.keys(options).forEach(option => {
    if (options[option] && handlingMultipliers[option]) {
      finalCost *= handlingMultipliers[option];
    }
  });
  
  // Add fixed costs
  const fixedCosts = {
    loading: 500,
    documentation: 200,
    fuelSurcharge: distanceKm * 0.5, // ₹0.5 per km
    tollCharges: distanceKm * 0.3,   // ₹0.3 per km
    driverAllowance: Math.ceil(distanceKm / 300) * 800 // ₹800 every 300km
  };
  
  const totalFixedCosts = Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0);
  
  // Calculate total before tax
  const subtotal = finalCost + totalFixedCosts;
  
  // Add GST (18%)
  const gst = subtotal * 0.18;
  
  // Add profit margin (15%)
  const profitMargin = subtotal * 0.15;
  
  // Final total
  const totalCost = subtotal + gst + profitMargin;
  
  return {
    distance: distanceKm,
    weight: weightKg,
    baseCost: Math.ceil(baseCost),
    urgencySurcharge: Math.ceil(baseCost * (urgencyMultipliers[urgency] - 1)),
    handlingCharges: Math.ceil(finalCost - urgencyCost),
    fixedCosts: Math.ceil(totalFixedCosts),
    gst: Math.ceil(gst),
    profitMargin: Math.ceil(profitMargin),
    totalCost: Math.ceil(totalCost),
    deliveryTime: calculateDeliveryTime(distanceKm, urgency)
  };
}

// Calculate delivery time
function calculateDeliveryTime(distanceKm, urgency) {
  const averageSpeed = 45; // km/h considering Indian road conditions
  const totalHours = distanceKm / averageSpeed;
  const totalDays = Math.max(1, Math.ceil(totalHours / 10)); // 10 hours driving per day
  
  switch (urgency) {
    case 'same_day':
      return '24 hours';
    case 'express':
      return `${Math.max(1, Math.ceil(totalDays * 0.6))} day(s)`;
    default:
      return `${totalDays} day(s)`;
  }
}

// Enhanced quote handler with real distance and cost calculation
async function handleQuoteRequest(e) {
  e.preventDefault();
  
  const pickup = byId('pickupLocation').value.trim();
  const delivery = byId('deliveryLocation').value.trim();
  const weight = parseFloat(byId('cargoWeight').value);
  const cargoType = byId('cargoType').value;
  const urgency = byId('urgency').value;
  
  // Get additional options
  const options = {
    refrigerated: byId('needRefrigeration')?.checked || false,
    fragile: byId('isFragile')?.checked || false,
    insurance: byId('needInsurance')?.checked || false
  };

  if (!pickup || !delivery || !weight) {
    alert('Please fill in all required fields');
    return;
  }

  // Show loading
  const resultEl = byId('quoteResult');
  resultEl.innerHTML = '<div class="loading">🔄 Calculating best route and cost...</div>';
  resultEl.classList.remove('hidden');

  try {
    // Calculate real distance
    const distance = await calculateRealDistance(pickup, delivery);
    
    // Calculate realistic cost
    const quote = calculateRealisticCost(distance, weight, cargoType, urgency, options);
    
    // Display results
    displayQuoteResult(quote, pickup, delivery, cargoType, urgency);
    
  } catch (error) {
    console.error('Quote calculation failed:', error);
    resultEl.innerHTML = `
      <div class="error-message">
        <h4>⚠️ Calculation Error</h4>
        <p>Unable to calculate route. Please check the locations and try again.</p>
        <p class="muted">Error: ${error.message}</p>
        <button class="btn btn-outline" onclick="retryCalculation()">Retry</button>
      </div>
    `;
  }
}

// Display quote results
function displayQuoteResult(quote, pickup, delivery, cargoType, urgency) {
  const resultEl = byId('quoteResult');
  
  resultEl.innerHTML = `
    <h4>📦 Real-Time Shipping Quote</h4>
    <div class="quote-summary">
      <div class="route-info">
        <strong>${pickup}</strong> → <strong>${delivery}</strong>
      </div>
      <div class="quote-meta">
        <span>${quote.distance} km • ${quote.weight} kg • ${cargoType.charAt(0).toUpperCase() + cargoType.slice(1)} • ${urgency.toUpperCase()}</span>
      </div>
    </div>
    
    <div class="cost-breakdown">
      <h5>Cost Breakdown:</h5>
      <div class="breakdown-item">
        <span>Base Transport Cost:</span>
        <span>₹${quote.baseCost}</span>
      </div>
      <div class="breakdown-item">
        <span>${urgency.toUpperCase()} Surcharge:</span>
        <span>₹${quote.urgencySurcharge}</span>
      </div>
      <div class="breakdown-item">
        <span>Special Handling:</span>
        <span>₹${quote.handlingCharges}</span>
      </div>
      <div class="breakdown-item">
        <span>Fixed Costs (Loading, Fuel, Tolls):</span>
        <span>₹${quote.fixedCosts}</span>
      </div>
      <div class="breakdown-item">
        <span>GST (18%):</span>
        <span>₹${quote.gst}</span>
      </div>
      <div class="breakdown-item profit">
        <span>Service Fee:</span>
        <span>₹${quote.profitMargin}</span>
      </div>
      <hr>
      <div class="breakdown-item total">
        <span><strong>Total Cost:</strong></span>
        <span><strong class="price">₹${quote.totalCost}</strong></span>
      </div>
    </div>
    
    <div class="delivery-info">
      <div class="delivery-time">
        <strong>Estimated Delivery:</strong> ${quote.deliveryTime}
      </div>
      <p class="muted">* Actual delivery time may vary based on road conditions and weather</p>
    </div>
    
    <button class="btn btn-primary" onclick="proceedWithBooking()" style="margin-top: 16px; width: 100%;">
      📋 Book This Shipment
    </button>
  `;
}


// Handle provider registration
async function handleProviderRegistration(e) {
  e.preventDefault();
  
  const providerData = {
    companyName: byId('companyName').value,
    contactPerson: byId('contactPerson').value,
    email: byId('providerEmail').value,
    phone: byId('providerPhone').value,
    services: Array.from(document.querySelectorAll('input[name="services"]:checked')).map(cb => cb.value),
    coverage: byId('coverage').value,
    registeredAt: new Date().toISOString()
  };

  try {
    // Save to Firestore
    await addDoc(collection(db, 'transportProviders'), providerData);
    alert('Application submitted successfully! We will contact you soon.');
    byId('providerModal').classList.add('hidden');
    byId('providerForm').reset();
  } catch (err) {
    console.error('Error registering provider:', err);
    alert('Error submitting application. Please try again.');
  }
}

// Book transport service
function bookTransportService(serviceId) {
  const session = getSession();
  if (!session.uid) {
    alert('Please log in to book transport services.');
    window.location.href = './login.html';
    return;
  }
  
  // Redirect to booking page or open booking modal
  window.location.href = `./transport-booking.html?service=${serviceId}`;
}

// Proceed with booking from quote
function proceedWithBooking() {
  const session = getSession();
  if (!session.uid) {
    alert('Please log in to continue with booking.');
    window.location.href = './login.html';
    return;
  }
  
  window.location.href = './transport-booking.html';
}

// Retry function
function retryCalculation() {
  byId('quoteResult').innerHTML = '';
  handleQuoteRequest(new Event('submit'));
}



// -------------------- Chat System --------------------

// FIXED: Load chats from user's chat subcollection with sync
async function loadMyChats() {
  const session = getSession();
  const chatsListEl = byId('chatsList');
  if (!chatsListEl) return;
  
  try {
    console.log('Loading chats for user:', session.uid, session.email);
    
    // Sync user chats first to ensure all chats are properly linked
    await syncUserChats(session.uid, session.email);
    
    // Query chats from user's chat subcollection
    const chatsQuery = query(
      collection(db, 'users', session.uid, 'chats'),
      orderBy('lastMessageTime', 'desc')
    );
    
    const chatsSnapshot = await getDocs(chatsQuery);
    
    chatsListEl.innerHTML = '';
    
    console.log('Found chats after sync:', chatsSnapshot.size);
    
    if (chatsSnapshot.empty) {
      chatsListEl.innerHTML = `
        <div class="card text-center">
          <h3>No Chats Yet</h3>
          <p class="muted">Chats will appear here when you win an auction or when a farmer accepts your bid.</p>
          <a href="./auction.html" class="btn btn-primary">Browse Auctions</a>
        </div>
      `;
      return;
    }
    
    // Render chats
    chatsSnapshot.forEach((docSnap) => {
      const chat = { id: docSnap.id, ...docSnap.data() };
      renderChatCard(chat, session);
    });
    
  } catch (err) {
    console.error('Error loading chats:', err);
    chatsListEl.innerHTML = `
      <div class="card text-center">
        <h3>Error Loading Chats</h3>
        <p class="muted">There was a problem loading your chats. Please try again later.</p>
        <button onclick="loadMyChats()" class="btn btn-primary">Retry</button>
      </div>
    `;
  }
}

// Render chat card
function renderChatCard(chat, session) {
  const card = document.createElement('div');
  card.className = 'card chat-card';
  card.style.cursor = 'pointer';
  card.style.marginBottom = '12px';
  card.style.transition = 'all 0.2s ease';
  
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-2px)';
    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
    card.style.boxShadow = 'none';
  });
  
  const otherUser = session.uid === chat.farmerUid ? 
    { name: chat.buyerName, role: 'Buyer' } : 
    { name: chat.farmerName, role: 'Farmer' };
  
  const lastMessageTime = chat.lastMessageTime?.toDate?.();
  const timeText = lastMessageTime ? 
    lastMessageTime.toLocaleDateString() + ' ' + lastMessageTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
    'New chat';
  
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start;">
      <div style="flex: 1;">
        <h4 style="margin: 0 0 8px 0; color: var(--primary-700);">${chat.auctionTitle || 'Auction Chat'}</h4>
        <p style="margin: 4px 0; font-weight: 600;">${otherUser.role}: ${otherUser.name}</p>
        <p style="margin: 4px 0; color: var(--primary-600);">Final Price: ₹${chat.finalPrice || '0'}</p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666; line-height: 1.4;">
          ${chat.lastMessage || 'Start a conversation about delivery details...'}
        </p>
      </div>
      <div style="text-align: right; min-width: 120px;">
        <div class="muted" style="font-size: 12px; margin-bottom: 8px;">${timeText}</div>
        <span class="badge" style="background: var(--primary); color: white; font-size: 11px;">
          ${session.uid === chat.farmerUid ? 'Farmer' : 'Buyer'}
        </span>
      </div>
    </div>
  `;
  
  card.addEventListener('click', () => {
    window.location.href = `./chat.html?id=${chat.id}`;
  });
  
  byId('chatsList').appendChild(card);
}

// FIXED: Load specific chat from user's chat subcollection
async function loadChat() {
  const chatId = getParam('id');
  if (!chatId) {
    window.location.href = './my-chats.html';
    return;
  }
  
  const session = getSession();
  
  try {
    // Load chat from user's chat subcollection
    const chatDoc = await getDoc(doc(db, 'users', session.uid, 'chats', chatId));
    if (!chatDoc.exists()) {
      window.location.href = './my-chats.html';
      return;
    }
    
    const chat = chatDoc.data();
    
    // Set chat title and info
    const otherUser = session.uid === chat.farmerUid ? 
      { name: chat.buyerName, role: 'Buyer' } : 
      { name: chat.farmerName, role: 'Farmer' };
    
    byId('chatTitle').textContent = `Chat: ${chat.auctionTitle}`;
    
    const auctionInfoEl = byId('auctionInfo');
    auctionInfoEl.innerHTML = `
      <strong>Auction:</strong> ${chat.auctionTitle} | 
      <strong>${otherUser.role}:</strong> ${otherUser.name} | 
      <strong>Final Price:</strong> ₹${chat.finalPrice}
    `;
    auctionInfoEl.classList.remove('hidden');
    
    // Load initial messages
    await loadChatMessages(chatId, session);
    
    // Setup chat input
    setupChatInput(chatId, session);
    
    // Setup real-time message listener for THIS USER'S messages
    if (chatListenerUnsubscribe) {
      chatListenerUnsubscribe();
    }
    
    chatListenerUnsubscribe = onSnapshot(
      query(collection(db, 'users', session.uid, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc')),
      (snapshot) => {
        console.log('Real-time message update received');
        loadChatMessages(chatId, session);
      }
    );
    
  } catch (err) {
    console.error('Error loading chat:', err);
    window.location.href = './my-chats.html';
  }
}

// FIXED: Load messages from user's chat messages subcollection
async function loadChatMessages(chatId, session) {
  const messagesEl = byId('chatMessages');
  if (!messagesEl) return;
  
  try {
    const messagesSnapshot = await getDocs(
      query(collection(db, 'users', session.uid, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'))
    );
    
    messagesEl.innerHTML = '';
    
    if (messagesSnapshot.empty) {
      messagesEl.innerHTML = `
        <div class="empty-chat">
          <p>No messages yet. Start the conversation!</p>
        </div>
      `;
      return;
    }
    
    messagesSnapshot.forEach((docSnap) => {
      const message = docSnap.data();
      const messageEl = document.createElement('div');
      messageEl.className = `message ${message.senderUid === session.uid ? 'sent' : 'received'}`;
      
      const time = message.timestamp?.toDate().toLocaleTimeString() || 'Just now';
      
      messageEl.innerHTML = `
        ${message.type !== 'system' ? `<div class="message-sender">${message.senderName}</div>` : ''}
        <div>${message.content}</div>
        <div class="message-time">${time}</div>
      `;
      
      messagesEl.appendChild(messageEl);
    });
    
    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
    
  } catch (err) {
    console.error('Error loading messages:', err);
  }
}

// FIXED: Enhanced chat input that reliably syncs messages to both users
function setupChatInput(chatId, session) {
  const messageInput = byId('messageInput');
  const sendButton = byId('sendMessage');
  
  if (!messageInput || !sendButton) return;
  
  const sendMessage = async () => {
    const content = messageInput.value.trim();
    if (!content) return;
    
    try {
      // Get chat data to find the other user
      const chatDoc = await getDoc(doc(db, 'users', session.uid, 'chats', chatId));
      if (!chatDoc.exists()) {
        alert('Chat not found!');
        return;
      }
      
      const chat = chatDoc.data();
      const otherUserId = session.uid === chat.farmerUid ? chat.buyerUid : chat.farmerUid;
      const otherUserEmail = session.uid === chat.farmerUid ? chat.buyerEmail : chat.farmerEmail;
      
      const messageData = {
        senderUid: session.uid,
        senderName: session.name,
        senderRole: session.role,
        content: content,
        timestamp: serverTimestamp(),
        type: 'text',
        chatId: chatId
      };
      
      console.log('Sending message from:', session.uid, 'to other user:', otherUserId);
      
      // STEP 1: Add message to current user's chat messages
      await addDoc(collection(db, 'users', session.uid, 'chats', chatId, 'messages'), messageData);
      console.log('Message saved to current user');
      
      // STEP 2: Try to find and update the other user
      if (otherUserId && !otherUserId.startsWith('email_') && !otherUserId.startsWith('error_')) {
        await syncMessageToOtherUser(otherUserId, chatId, messageData, chat, session);
      } else {
        // If we don't have a proper UID, try to find the user by email
        await findUserByEmailAndSync(otherUserEmail, chatId, messageData, chat, session);
      }
      
      // STEP 3: Update last message in both chats
      await updateLastMessage(chatId, session.uid, content, session.name);
      if (otherUserId && !otherUserId.startsWith('email_') && !otherUserId.startsWith('error_')) {
        await updateLastMessage(chatId, otherUserId, content, session.name);
      }
      
      console.log('Message sent successfully');
      messageInput.value = '';
      
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Error sending message. Please try again.');
    }
  };
  
  // Helper function to sync message to other user
  async function syncMessageToOtherUser(otherUserId, chatId, messageData, chat, session) {
    try {
      // Check if other user has this chat
      const otherUserChatRef = doc(db, 'users', otherUserId, 'chats', chatId);
      const otherUserChatDoc = await getDoc(otherUserChatRef);
      
      if (!otherUserChatDoc.exists()) {
        console.log('Creating chat for other user:', otherUserId);
        // Create complete chat structure for other user
        const otherUserChatData = {
          chatId: chatId,
          auctionId: chat.auctionId,
          auctionTitle: chat.auctionTitle,
          farmerUid: chat.farmerUid,
          farmerName: chat.farmerName,
          farmerEmail: chat.farmerEmail,
          buyerUid: chat.buyerUid,
          buyerName: chat.buyerName,
          buyerEmail: chat.buyerEmail,
          finalPrice: chat.finalPrice,
          createdAt: serverTimestamp(),
          lastMessage: messageData.content,
          lastMessageTime: serverTimestamp(),
          lastMessageSender: session.name,
          status: 'active',
          userRole: session.uid === chat.farmerUid ? 'buyer' : 'farmer',
          otherUserName: session.name,
          otherUserUid: session.uid,
          otherUserEmail: session.email,
          myUid: otherUserId,
          myName: session.uid === chat.farmerUid ? chat.buyerName : chat.farmerName,
          myEmail: session.uid === chat.farmerUid ? chat.buyerEmail : chat.farmerEmail
        };
        
        await setDoc(otherUserChatRef, otherUserChatData);
        console.log('Chat created for other user');
        
        // Copy all existing messages to the new chat
        await copyAllMessagesToOtherUser(session.uid, otherUserId, chatId);
      }
      
      // Add the new message to other user's chat
      await addDoc(collection(db, 'users', otherUserId, 'chats', chatId, 'messages'), messageData);
      console.log('Message synced to other user');
      
    } catch (otherUserErr) {
      console.error('Failed to sync message to other user:', otherUserErr);
      // Don't throw error - message is still saved for current user
    }
  }
  
  // Helper function to find user by email and sync
  async function findUserByEmailAndSync(otherUserEmail, chatId, messageData, chat, session) {
    try {
      console.log('Looking for user by email:', otherUserEmail);
      
      const usersQuery = query(collection(db, 'users'), where('email', '==', otherUserEmail));
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const otherUserDoc = usersSnapshot.docs[0];
        const otherUserId = otherUserDoc.id;
        console.log('Found user by email:', otherUserId);
        
        // Update the chat with the correct UID for future messages
        await updateDoc(doc(db, 'users', session.uid, 'chats', chatId), {
          [session.uid === chat.farmerUid ? 'buyerUid' : 'farmerUid']: otherUserId
        });
        
        // Now sync the message with the correct UID
        await syncMessageToOtherUser(otherUserId, chatId, messageData, chat, session);
      } else {
        console.log('User not found by email, message saved only for current user');
      }
    } catch (emailErr) {
      console.error('Error finding user by email:', emailErr);
    }
  }
  
  // Helper function to copy all messages to other user
  async function copyAllMessagesToOtherUser(fromUserId, toUserId, chatId) {
    try {
      const messagesQuery = query(
        collection(db, 'users', fromUserId, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const batch = [];
      for (const messageDoc of messagesSnapshot.docs) {
        const messageData = messageDoc.data();
        batch.push(addDoc(collection(db, 'users', toUserId, 'chats', chatId, 'messages'), messageData));
      }
      
      await Promise.all(batch);
      console.log(`Copied ${batch.length} messages to other user`);
    } catch (copyErr) {
      console.warn('Could not copy all messages:', copyErr);
    }
  }
  
  // Helper function to update last message
  async function updateLastMessage(chatId, userId, content, senderName) {
    try {
      await updateDoc(doc(db, 'users', userId, 'chats', chatId), {
        lastMessage: content,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: senderName
      });
    } catch (updateErr) {
      console.warn('Could not update last message for user:', userId, updateErr);
    }
  }
  
  sendButton.addEventListener('click', sendMessage);
  
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

// -------------------- Order Details Page --------------------
async function loadOrderDetails() {
  const orderId = getParam('id');
  const loadingEl = byId('orderLoading');
  const notFoundEl = byId('orderNotFound');
  const orderDetailsEl = byId('orderDetails');
  
  if (!orderId) {
    loadingEl.classList.add('hidden');
    notFoundEl.classList.remove('hidden');
    return;
  }

  try {
    const uid = sessionStorage.getItem('sessionUid');
    if (!uid) {
      window.location.href = './login.html';
      return;
    }

    // Query the user's orders subcollection
    const ordersRef = collection(db, 'users', uid, 'orders');
    const q = query(ordersRef, where('orderId', '==', orderId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      loadingEl.classList.add('hidden');
      notFoundEl.classList.remove('hidden');
      return;
    }

    // Get the order document
    const orderDoc = querySnapshot.docs[0];
    const orderData = orderDoc.data();
    
    // Display order details
    displayOrderDetails(orderData);
    
    loadingEl.classList.add('hidden');
    orderDetailsEl.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error loading order details:', error);
    loadingEl.classList.add('hidden');
    notFoundEl.classList.remove('hidden');
  }
}

function displayOrderDetails(orderData) {
  // Order Header
  byId('orderId').textContent = orderData.orderId || 'N/A';
  byId('orderDate').textContent = orderData.createdAt?.toDate?.().toLocaleString() || new Date().toLocaleString();
  byId('orderTotal').textContent = `₹${orderData.totalAmount?.toFixed(2) || '0.00'}`;
  byId('paymentMethod').textContent = getPaymentMethodDisplayName(orderData.paymentMethod);
  byId('paymentStatus').textContent = orderData.paymentStatus || 'Unknown';
  byId('transactionId').textContent = orderData.transactionId || 'N/A';
  
  // Status Badge
  const statusBadge = byId('orderStatusBadge');
  statusBadge.textContent = (orderData.paymentStatus || 'unknown').toUpperCase();
  statusBadge.className = `status-badge status-${orderData.paymentStatus || 'unknown'}`;
  
  // Shipping Information
  byId('customerEmail').textContent = orderData.customerEmail || 'N/A';
  byId('shippingAddress').textContent = orderData.shippingAddress || 'No shipping address provided';
  
  // Order Items
  const orderItemsEl = byId('orderItems');
  orderItemsEl.innerHTML = '';
  
  let subtotal = 0;
  
  if (orderData.items && orderData.items.length > 0) {
    orderData.items.forEach(item => {
      const unitPrice = item.prices?.[item.unit] ?? item.price ?? 0;
      const itemTotal = unitPrice * (item.qty || 1);
      subtotal += itemTotal;
      
      const itemEl = document.createElement('div');
      itemEl.className = 'order-item-row';
      itemEl.innerHTML = `
        <div class="order-item-info">
          <div class="order-item-name">${item.name || 'Unknown Product'}</div>
          <div class="order-item-meta muted">
            ${item.qty || 1} × ${item.unit} @ ₹${unitPrice.toFixed(2)} each
          </div>
        </div>
        <div class="order-item-total">₹${itemTotal.toFixed(2)}</div>
      `;
      orderItemsEl.appendChild(itemEl);
    });
  } else {
    orderItemsEl.innerHTML = '<p class="muted">No items in this order.</p>';
  }
  
  // Order Summary
  byId('subtotalAmount').textContent = `₹${subtotal.toFixed(2)}`;
  byId('grandTotal').textContent = `₹${orderData.totalAmount?.toFixed(2) || subtotal.toFixed(2)}`;
  
  // Print functionality
  byId('printOrder').addEventListener('click', () => {
    window.print();
  });
}

function getPaymentMethodDisplayName(method) {
  const names = {
    card: 'Credit/Debit Card',
    upi: 'UPI',
    netbanking: 'Net Banking'
  };
  return names[method] || method || 'Unknown';
}

// -------------------- Profile Page --------------------
async function loadProfilePage(user) {
  const uid = user.uid;
  const docSnap = await getDoc(doc(db, 'users', uid));
  const data = docSnap.data() || {};
  byId('profName').value = data.name || '';
  byId('profEmail').value = data.email || user.email || '';
  byId('profPhone').value = data.phone || '';
  byId('profLocation').value = data.location || '';
  byId('profAddress').value = data.address || '';

  const welcome = byId('welcomeMsg');
  if (welcome) welcome.textContent = `Welcome, ${data.name || user.email || 'User'}`;

  const form = byId('profileForm');
  const saveBtn = byId('profileSaveBtn');
  const editBtn = byId('editProfileBtn');
  const nameEl = byId('profName');
  const emailEl = byId('profEmail');
  const phoneEl = byId('profPhone');
  const locEl = byId('profLocation');
  const addrEl = byId('profAddress');
  const msg = byId('profileMsg');

  function setDisabled(disabled) {
    nameEl.disabled = disabled;
    // Email always disabled
    emailEl.disabled = true;
    phoneEl.disabled = disabled;
    locEl.disabled = disabled;
    addrEl.disabled = disabled;
    if (saveBtn) saveBtn.style.display = disabled ? 'none' : '';
  }

  setDisabled(true);

  if (editBtn) {
    on(editBtn, 'click', (e) => {
      e.preventDefault();
      setDisabled(false);
      if (msg) msg.textContent = '';
    });
  }

  on(form, 'submit', async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = '';

    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const location = locEl.value.trim();
    const address = addrEl.value.trim();

    if (!name) { if (msg) msg.textContent = 'Name is required.'; return; }
    if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) { if (msg) msg.textContent = 'Please enter a valid phone number.'; return; }

    const upd = { name, phone, location, address, updatedAt: serverTimestamp() };
    try {
      await updateDoc(doc(db, 'users', uid), upd).catch(async () => {
        await setDoc(doc(db, 'users', uid), { email: user.email, ...upd });
      });
      if (msg) msg.textContent = 'Profile updated successfully';
      setDisabled(true);
      if (welcome) welcome.textContent = `Welcome, ${name || user.email || 'User'}`;
    } catch (err) {
      if (msg) msg.textContent = 'Error updating profile: ' + err.message;
    }
  });
}

// -------------------- Page wiring --------------------
function init() {
  setupNavbar();
  // Initialize navbar cart count from persisted storage on every page
  updateCartCount();

  // Guard: restrict access to protected pages when no active session
  const PROTECTED = ['marketplace','cart','profile','product-details','farmer-dashboard','auction','create-auction','auction-detail','order-details','my-chats','chat','transport'];
  if (PROTECTED.includes(page) && !isSessionActive()) {
    alertLoginOnce(window.location.pathname);
    return;
  }

  // NEW: Clean up bid listener when navigating away from auction detail
  if (page !== 'auction-detail' && bidListenerUnsubscribe) {
    bidListenerUnsubscribe();
    bidListenerUnsubscribe = null;
  }

  // NEW: Clean up chat listener when navigating away from chat
  if (page !== 'chat' && chatListenerUnsubscribe) {
    chatListenerUnsubscribe();
    chatListenerUnsubscribe = null;
  }

  // Initialize payment system on cart page
  if (page === 'cart') {
    renderCart();
    initializePaymentSystem();
  }

  // Intercept navbar links when no session (on home only)
  if (page === 'home' && !isSessionActive()) {
    const navLinks = Array.from(document.querySelectorAll('.navbar a[href$=".html"]'));
    navLinks.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href.endsWith('index.html')) {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          alertLoginOnce(href);
        });
      }
    });
  }

  if (page === 'signup') {
    const form = byId('signupForm');
    if (getParam('role')) {
      const r = getParam('role');
      const input = qs(`input[name="role"][value="${r}"]`);
      if (input) input.checked = true;
    }
    on(form, 'submit', handleSignup);
  }

  if (page === 'login') {
    on(byId('loginForm'), 'submit', handleLogin);
  }

  if (page === 'farmer-dashboard') {
    requireAuth('farmer').then(() => {
      on(byId('productForm'), 'submit', saveProduct);
      on(byId('resetFormBtn'), 'click', () => { byId('productForm').reset(); byId('productId').value=''; byId('productFormMsg').textContent=''; });
      loadMyProducts();
    });
  }

  if (page === 'marketplace') {
    on(byId('applyFilters'), 'click', applyMarketplaceFilters);
    on(byId('searchInput'), 'input', applyMarketplaceFilters);
    loadMarketplace();
  }

  // Auction pages
  if (page === 'auction') {
    loadAuctions();
  }

  if (page === 'create-auction') {
    requireAuth('farmer').then(() => {
      loadFarmerDetails();
      on(byId('auctionForm'), 'submit', handleCreateAuction);
    });
  }

  if (page === 'auction-detail') {
    loadAuctionDetail();
  }

  // Transport Services Page
  if (page === 'transport') {
    loadTransportServices();
  }

  // Chat pages
  if (page === 'my-chats') {
    loadMyChats();
  }

  if (page === 'chat') {
    loadChat();
  }

  // Order Details Page
  if (page === 'order-details') {
    loadOrderDetails();
  }

  // Home page: role-based behavior for hero farmer button
  if (page === 'home') {
    const heroFarmerBtn = document.querySelector('.hero .btn-farmer');
    const heroBuyBtn = document.querySelector('.hero .btn-primary');
    // Gate hero buttons by session
    [heroBuyBtn, heroFarmerBtn].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        if (!isSessionActive()) {
          e.preventDefault();
          alertLoginOnce(btn.getAttribute('href') || './marketplace.html');
        }
      });
    });
    if (heroFarmerBtn) {
      onAuthStateChanged(auth, async (user) => {
        if (!user) { return; }
        try {
          const role = await getUserRole(user.uid);
          if (role === 'buyer') {
            // Disable visually and functionally without breaking layout
            heroFarmerBtn.classList.add('is-disabled');
            heroFarmerBtn.setAttribute('aria-disabled', 'true');
            heroFarmerBtn.setAttribute('tabindex', '-1');
            heroFarmerBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
          }
        } catch {}
      });
    }
  }

  if (page === 'product-details') {
    loadProductDetails();
  }

  if (page === 'profile') {
    requireAuth().then(loadProfilePage);
  }
}

window.addEventListener('DOMContentLoaded', init);