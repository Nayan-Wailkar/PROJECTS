// payment.js - Mock Payment Gateway Integration

import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { db } from './firebaseConfig.js';

class MockPaymentGateway {
  constructor() {
    this.testCards = {
      success: '4111111111111111',
      failure: '4000000000000002',
      pending: '4000000000000003'
    };
    
    this.testUPIs = {
      success: 'success@upi',
      failure: 'failure@upi', 
      pending: 'pending@upi'
    };
    
    this.banks = {
      sbi: { name: 'State Bank of India', success: true },
      hdfc: { name: 'HDFC Bank', success: true },
      icici: { name: 'ICICI Bank', success: false },
      axis: { name: 'Axis Bank', success: true },
      kotak: { name: 'Kotak Mahindra Bank', success: true }
    };
  }

  // Validate card number using Luhn algorithm
  validateCard(cardNumber) {
    const cleanNumber = (cardNumber || '').replace(/\s/g, '');
    
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  // Validate expiry date
  validateExpiry(expiryDate) {
    const [month, year] = expiryDate.split('/');
    if (!month || !year || month.length !== 2 || year.length !== 2) {
      return false;
    }
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);
    
    if (expMonth < 1 || expMonth > 12) return false;
    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;
    
    return true;
  }

  // Validate CVV
  validateCVV(cvv) {
    return /^\d{3,4}$/.test(cvv);
  }

  // Validate UPI ID
  validateUPI(upiId) {
    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId);
  }

  // Process payment
  async processPayment(paymentData) {
    const { method, amount, cardDetails, upiId, bankCode } = paymentData;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let success = false;
    let transactionId = this.generateTransactionId();
    let message = '';
    let upiResponse = null;
    
    switch (method) {
      case 'card':
        const cleanCardNumber = (cardDetails?.number || '').replace(/\s/g, '');
        
        console.log('Processing card:', cleanCardNumber);
        console.log('Expected success card:', this.testCards.success);
        console.log('Match:', cleanCardNumber === this.testCards.success);
        
        if (cleanCardNumber === this.testCards.success) {
          success = true;
          message = 'Payment processed successfully';
        } else if (cleanCardNumber === this.testCards.failure) {
          success = false;
          message = 'Insufficient funds';
        } else if (cleanCardNumber === this.testCards.pending) {
          success = false;
          message = 'Transaction pending - please try again';
        } else {
          success = this.validateCard(cleanCardNumber) && Math.random() > 0.3;
          message = success ? 'Payment processed successfully' : 'Card declined';
        }
        break;
        
      case 'upi':
        // Enhanced UPI processing
        if (upiId === this.testUPIs.success) {
          success = true;
          message = 'UPI payment successful';
          upiResponse = {
            appRedirect: true,
            deepLink: `upi://pay?pa=${upiId}&pn=Farmer%20Marketplace&am=${amount}&cu=INR`,
            transactionNote: `Payment for Farmer Marketplace Order - ${transactionId}`
          };
        } else if (upiId === this.testUPIs.failure) {
          success = false;
          message = 'UPI transaction failed - Insufficient balance';
          upiResponse = {
            appRedirect: false,
            error: 'Transaction declined by bank'
          };
        } else if (upiId === this.testUPIs.pending) {
          success = false;
          message = 'UPI transaction pending - Please check your UPI app';
          upiResponse = {
            appRedirect: true,
            deepLink: `upi://pay?pa=${upiId}&pn=Farmer%20Marketplace&am=${amount}&cu=INR`,
            status: 'pending'
          };
        } else {
          success = this.validateUPI(upiId) && Math.random() > 0.2;
          message = success ? 'UPI payment successful' : 'UPI transaction failed';
          if (success) {
            upiResponse = {
              appRedirect: true,
              deepLink: `upi://pay?pa=${upiId}&pn=Farmer%20Marketplace&am=${amount}&cu=INR`,
              transactionNote: `Payment for Farmer Marketplace Order - ${transactionId}`
            };
          }
        }
        break;
        
      case 'netbanking':
        const bank = this.banks[bankCode];
        success = bank ? bank.success : false;
        message = success ? 'Bank transfer successful' : 'Bank transfer failed';
        break;
    }
    
    return {
      success,
      transactionId,
      message,
      amount,
      method,
      upiResponse,
      timestamp: new Date().toISOString()
    };
  }

  generateTransactionId() {
    return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  generateOrderId() {
    return 'ORD' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
}

class PaymentManager {
  constructor() {
    this.gateway = new MockPaymentGateway();
    this.currentStep = 1;
    this.paymentData = {};
    this.cartItems = [];
    this.totalAmount = 0;
  }

  initialize() {
    this.bindEvents();
    this.loadCartData();
    console.log('Payment system initialized');
  }

  bindEvents() {
    console.log('Binding payment events...');
    
    this.on('proceedPayment', 'click', () => this.openPaymentModal());
    this.on('closeModal', 'click', () => this.closePaymentModal());
    this.on('continueToPayment', 'click', () => this.showPaymentMethod());
    this.on('backToSummary', 'click', () => this.showOrderSummary());
    this.on('payNow', 'click', () => this.processPayment());
    this.on('retryPayment', 'click', () => this.retryPayment());
    this.on('cancelPayment', 'click', () => this.closePaymentModal());
    this.on('continueShopping', 'click', () => this.completePayment());
    this.on('viewOrder', 'click', () => this.viewOrderDetails());
    
    document.addEventListener('click', (e) => {
      if (e.target.closest('.payment-method')) {
        this.selectPaymentMethod(e.target.closest('.payment-method'));
      }
    });
    
    this.on('cardNumber', 'input', (e) => this.formatCardNumber(e.target));
    this.on('expiryDate', 'input', (e) => this.formatExpiryDate(e.target));
    
    this.on('paymentModal', 'click', (e) => {
      if (e.target.id === 'paymentModal') {
        this.closePaymentModal();
      }
    });
  }

  on(elementId, event, handler) {
    const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    if (element) {
      element.addEventListener(event, handler.bind(this));
    }
  }

  byId(id) {
    return document.getElementById(id);
  }

  loadCartData() {
    this.cartItems = this.getCart();
    this.totalAmount = this.calculateTotal();
    console.log('Cart data loaded:', this.cartItems.length, 'items');
  }

  getCart() {
    try {
      const cartData = localStorage.getItem(this.currentCartKey());
      return cartData ? JSON.parse(cartData) : [];
    } catch {
      return [];
    }
  }

  currentCartKey() {
    try {
      const uid = sessionStorage.getItem('sessionUid');
      return uid ? `cart:${uid}` : 'cart';
    } catch {
      return 'cart';
    }
  }

  calculateTotal() {
    return this.cartItems.reduce((total, item) => {
      const unitPrice = item.prices?.[item.unit] ?? item.price ?? 0;
      return total + (unitPrice * (item.qty || 1));
    }, 0);
  }

  openPaymentModal() {
    console.log('Opening payment modal...');
    
    if (this.cartItems.length === 0) {
      this.showNotification('Your cart is empty', 'error');
      return;
    }
    
    this.renderOrderSummary();
    this.byId('paymentModal').classList.remove('hidden');
    this.showStep('stepOrderSummary');
    
    try {
      const userEmail = sessionStorage.getItem('sessionEmail');
      if (userEmail) {
        this.byId('customerEmail').value = userEmail;
      }
    } catch (e) {}
  }

  closePaymentModal() {
    this.byId('paymentModal').classList.add('hidden');
    this.resetPaymentFlow();
  }

  showStep(stepId) {
    console.log('Showing step:', stepId);
    
    document.querySelectorAll('.payment-step').forEach(step => {
      step.classList.add('hidden');
    });
    
    const targetStep = this.byId(stepId);
    if (targetStep) {
      targetStep.classList.remove('hidden');
    }
  }

  renderOrderSummary() {
    const summaryEl = this.byId('orderSummary');
    if (!summaryEl) return;
    
    summaryEl.innerHTML = '';
    
    this.cartItems.forEach(item => {
      const unitPrice = item.prices?.[item.unit] ?? item.price ?? 0;
      const subtotal = unitPrice * (item.qty || 1);
      
      const itemEl = document.createElement('div');
      itemEl.className = 'order-item';
      itemEl.innerHTML = `
        <span>${item.name} (${item.qty} ${item.unit})</span>
        <span>₹${subtotal.toFixed(2)}</span>
      `;
      summaryEl.appendChild(itemEl);
    });
    
    const totalEl = document.createElement('div');
    totalEl.className = 'order-total';
    totalEl.innerHTML = `
      <span>Total Amount</span>
      <span>₹${this.totalAmount.toFixed(2)}</span>
    `;
    summaryEl.appendChild(totalEl);
  }

  showOrderSummary() {
    this.showStep('stepOrderSummary');
  }

  showPaymentMethod() {
    const email = this.byId('customerEmail').value.trim();
    const address = this.byId('shippingAddress').value.trim();
    
    if (!email || !this.validateEmail(email)) {
      this.showNotification('Please enter a valid email address', 'error');
      return;
    }
    
    if (!address) {
      this.showNotification('Please enter shipping address', 'error');
      return;
    }
    
    this.paymentData.email = email;
    this.paymentData.shippingAddress = address;
    this.showStep('stepPaymentMethod');
    this.initializeDefaultPaymentMethod();
  }

  initializeDefaultPaymentMethod() {
    document.querySelectorAll('.payment-method').forEach(m => {
      m.classList.remove('active');
    });
    
    document.querySelectorAll('.payment-form').forEach(f => {
      f.classList.add('hidden');
    });
    
    const defaultMethod = document.querySelector('.payment-method[data-method="card"]');
    if (defaultMethod) {
      defaultMethod.classList.add('active');
      this.paymentData.method = 'card';
      
      const cardForm = this.byId('cardPaymentForm');
      if (cardForm) {
        cardForm.classList.remove('hidden');
      }
    }
  }

  selectPaymentMethod(methodEl) {
    if (!methodEl) return;
    
    document.querySelectorAll('.payment-method').forEach(m => {
      m.classList.remove('active');
    });
    
    methodEl.classList.add('active');
    const method = methodEl.dataset.method;
    this.paymentData.method = method;
    
    document.querySelectorAll('.payment-form').forEach(form => {
      form.classList.add('hidden');
    });
    
    const paymentForm = this.byId(`${method}PaymentForm`);
    if (paymentForm) {
      paymentForm.classList.remove('hidden');
      console.log(`Showing payment form: ${method}PaymentForm`);
    } else {
      console.error(`Payment form not found: ${method}PaymentForm`);
    }
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  formatCardNumber(input) {
    let value = input.value.replace(/\s/g, '');
    if (value.length > 16) value = value.substr(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = value;
  }

  formatExpiryDate(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substr(0, 4);
    if (value.length > 2) {
      value = value.substr(0, 2) + '/' + value.substr(2);
    }
    input.value = value;
  }

  validatePaymentForm() {
    const method = this.paymentData.method;
    
    if (!method) {
      this.showNotification('Please select a payment method', 'error');
      return false;
    }
    
    switch (method) {
      case 'card':
        const cardNumber = this.byId('cardNumber').value.replace(/\s/g, '');
        const cardName = this.byId('cardName').value.trim();
        const expiryDate = this.byId('expiryDate').value;
        const cvv = this.byId('cvv').value;
        
        if (!cardNumber || !this.gateway.validateCard(cardNumber)) {
          this.showNotification('Please enter a valid card number', 'error');
          return false;
        }
        if (!cardName) {
          this.showNotification('Please enter name on card', 'error');
          return false;
        }
        if (!expiryDate || !this.gateway.validateExpiry(expiryDate)) {
          this.showNotification('Please enter a valid expiry date (MM/YY)', 'error');
          return false;
        }
        if (!cvv || !this.gateway.validateCVV(cvv)) {
          this.showNotification('Please enter a valid CVV', 'error');
          return false;
        }
        
        this.paymentData.cardDetails = {
          number: cardNumber,
          name: cardName,
          expiry: expiryDate,
          cvv: cvv
        };
        break;
        
      case 'upi':
        const upiId = this.byId('upiId').value.trim();
        if (!upiId || !this.gateway.validateUPI(upiId)) {
          this.showNotification('Please enter a valid UPI ID', 'error');
          return false;
        }
        this.paymentData.upiId = upiId;
        break;
        
      case 'netbanking':
        const bankCode = this.byId('bankSelect').value;
        if (!bankCode) {
          this.showNotification('Please select a bank', 'error');
          return false;
        }
        this.paymentData.bankCode = bankCode;
        break;
    }
    
    return true;
  }

  async processPayment() {
    if (!this.validatePaymentForm()) return;
    
    const payNowBtn = this.byId('payNow');
    if (payNowBtn) {
      payNowBtn.classList.add('loading');
      payNowBtn.disabled = true;
    }
    
    this.showStep('stepProcessing');
    
    const processingAmount = this.byId('processingAmount');
    const processingMethod = this.byId('processingMethod');
    
    if (processingAmount) processingAmount.textContent = `₹${this.totalAmount.toFixed(2)}`;
    if (processingMethod) processingMethod.textContent = this.getPaymentMethodName(this.paymentData.method);
    
    try {
      // For UPI payments, show a different processing message
      if (this.paymentData.method === 'upi') {
        this.byId('processingAmount').parentElement.innerHTML = `
          <p>Amount: <span id="processingAmount">₹${this.totalAmount.toFixed(2)}</span></p>
          <p>Method: <span id="processingMethod">UPI</span></p>
          <p class="muted">Redirecting to UPI app...</p>
        `;
      }
      
      const paymentResult = await this.gateway.processPayment({
        ...this.paymentData,
        amount: this.totalAmount,
        items: this.cartItems
      });
      
      // Handle UPI app redirect if needed
      if (paymentResult.method === 'upi' && paymentResult.upiResponse?.appRedirect) {
        this.handleUPIRedirect(paymentResult);
        return; // Don't proceed to normal flow for UPI redirects
      }
      
      await this.handlePaymentResult(paymentResult);
      
    } catch (error) {
      console.error('Payment processing error:', error);
      this.showPaymentFailed('Payment processing error: ' + error.message);
    } finally {
      if (payNowBtn) {
        payNowBtn.classList.remove('loading');
        payNowBtn.disabled = false;
      }
    }
  }

  // New method to handle UPI redirect flow
  handleUPIRedirect(paymentResult) {
    const upiResponse = paymentResult.upiResponse;
    
    // Show UPI redirect step
    this.showStep('stepUPIRedirect');
    
    const upiRedirectEl = this.byId('stepUPIRedirect');
    if (upiRedirectEl) {
      upiRedirectEl.innerHTML = `
        <div class="processing-animation">
          <div class="spinner"></div>
          <h4>Redirecting to UPI App</h4>
          <p>Please complete the payment in your UPI app</p>
          <div class="processing-details">
            <p>Amount: <span>₹${paymentResult.amount.toFixed(2)}</span></p>
            <p>UPI ID: <span>${this.paymentData.upiId}</span></p>
            <p>Transaction ID: <span>${paymentResult.transactionId}</span></p>
          </div>
          <div class="action-buttons">
            <button class="btn btn-primary" id="checkUPIStatus">I've Completed Payment</button>
            <button class="btn btn-outline" id="cancelUPIPayment">Cancel</button>
          </div>
          <p class="muted" style="margin-top: 20px;">
            If not redirected automatically, 
            <a href="${upiResponse.deepLink}" class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;">
              Click here to open UPI App
            </a>
          </p>
        </div>
      `;
      
      // Add event listeners for UPI flow buttons
      setTimeout(() => {
        const checkStatusBtn = this.byId('checkUPIStatus');
        const cancelBtn = this.byId('cancelUPIPayment');
        
        if (checkStatusBtn) {
          checkStatusBtn.addEventListener('click', () => this.checkUPIStatus(paymentResult));
        }
        
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => this.cancelUPIPayment());
        }
      }, 100);
      
      // Auto-redirect to UPI app after 3 seconds
      setTimeout(() => {
        if (upiResponse.deepLink) {
          window.location.href = upiResponse.deepLink;
        }
      }, 3000);
    }
  }

  // Check UPI payment status
  async checkUPIStatus(paymentResult) {
    this.showStep('stepProcessing');
    
    // Simulate checking UPI status
    setTimeout(async () => {
      // For demo purposes, assume success for test UPI IDs
      const isSuccess = this.paymentData.upiId === 'success@upi';
      
      if (isSuccess) {
        paymentResult.success = true;
        paymentResult.message = 'UPI payment verified successfully';
        await this.handlePaymentResult(paymentResult);
      } else {
        this.showPaymentFailed('UPI payment not completed. Please try again.');
      }
    }, 2000);
  }

  // Cancel UPI payment
  cancelUPIPayment() {
    this.showPaymentFailed('UPI payment cancelled by user.');
  }

  async handlePaymentResult(result) {
    console.log('Payment result:', result);
    
    const orderId = this.gateway.generateOrderId();
    const orderData = {
      orderId,
      items: this.cartItems,
      totalAmount: this.totalAmount,
      paymentMethod: this.paymentData.method,
      customerEmail: this.paymentData.email,
      shippingAddress: this.paymentData.shippingAddress,
      paymentStatus: result.success ? 'completed' : 'failed',
      transactionId: result.transactionId,
      status: result.success ? 'confirmed' : 'payment_failed',
      createdAt: serverTimestamp(),
      paymentResponse: result.message
    };
    
    try {
      await this.saveOrderToFirebase(orderData);
      
      if (result.success) {
        this.showPaymentSuccess(orderData, result);
      } else {
        this.showPaymentFailed(result.message);
      }
    } catch (error) {
      console.error('Error in handlePaymentResult:', error);
      this.showPaymentFailed('Error saving order details: ' + error.message);
    }
  }

  async saveOrderToFirebase(orderData) {
    const uid = sessionStorage.getItem('sessionUid');
    
    if (!uid) {
      throw new Error('User not authenticated');
    }
    
    try {
      const ordersRef = collection(db, 'users', uid, 'orders');
      const docRef = await addDoc(ordersRef, orderData);
      console.log('Order saved with ID:', docRef.id);
      
      if (orderData.paymentStatus === 'completed') {
        this.clearCart();
        this.updateCartCount();
      }
      
      return docRef;
    } catch (error) {
      console.error('Firebase save error:', error);
      
      if (error.code === 'permission-denied') {
        throw new Error('Database permission denied. Please contact support.');
      } else if (error.code === 'unauthenticated') {
        throw new Error('Please log in again to complete your order.');
      } else {
        throw new Error('Failed to save order: ' + error.message);
      }
    }
  }

  clearCart() {
    localStorage.removeItem(this.currentCartKey());
  }

  updateCartCount() {
    const cart = this.getCart();
    const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    const countEl = this.byId('cartCount');
    if (countEl) {
      countEl.textContent = totalItems;
    }
  }

  showPaymentSuccess(orderData, paymentResult) {
    const successOrderId = this.byId('successOrderId');
    const successAmount = this.byId('successAmount');
    const successMethod = this.byId('successMethod');
    const successTransactionId = this.byId('successTransactionId');
    
    if (successOrderId) successOrderId.textContent = orderData.orderId;
    if (successAmount) successAmount.textContent = `₹${orderData.totalAmount.toFixed(2)}`;
    if (successMethod) successMethod.textContent = this.getPaymentMethodName(orderData.paymentMethod);
    if (successTransactionId) successTransactionId.textContent = paymentResult.transactionId;
    
    this.showStep('stepSuccess');
  }

  showPaymentFailed(reason) {
    const failureReason = this.byId('failureReason');
    if (failureReason) {
      failureReason.textContent = reason;
    }
    this.showStep('stepFailed');
  }

  retryPayment() {
    this.showStep('stepPaymentMethod');
  }

  completePayment() {
    this.closePaymentModal();
    window.location.href = './marketplace.html';
  }

  viewOrderDetails() {
    // Get the current order data from the success step
    const orderId = this.byId('successOrderId')?.textContent;
    const transactionId = this.byId('successTransactionId')?.textContent;
    
    if (orderId) {
      // Close the payment modal
      this.closePaymentModal();
      
      // Redirect to order details page with the order ID
      setTimeout(() => {
        window.location.href = `./order-details.html?id=${encodeURIComponent(orderId)}`;
      }, 500);
    } else {
      alert('Order information not available. Please check your order history.');
    }
  }

  getPaymentMethodName(method) {
    const names = {
      card: 'Credit/Debit Card',
      upi: 'UPI',
      netbanking: 'Net Banking'
    };
    return names[method] || method;
  }

  resetPaymentFlow() {
    this.currentStep = 1;
    this.paymentData = {};
    this.showStep('stepOrderSummary');
    
    const fields = ['shippingAddress', 'cardNumber', 'cardName', 'expiryDate', 'cvv', 'upiId', 'bankSelect'];
    fields.forEach(field => {
      const el = this.byId(field);
      if (el) el.value = '';
    });
    
    this.initializeDefaultPaymentMethod();
  }

  showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.cart-notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `cart-notification ${type}`;
    notification.textContent = message;
    notification.style.background = type === 'error' ? 'var(--danger)' : 'var(--primary)';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

let paymentManager;

function initializePaymentSystem() {
  console.log('Initializing payment system...');
  paymentManager = new PaymentManager();
  paymentManager.initialize();
}

export { initializePaymentSystem, MockPaymentGateway, PaymentManager };