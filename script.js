/*  BANCO DE DADOS DE PRODUTOS DA LEME  */
const products = [
    {
        id: 1,
        name: "T-Shirts Básicas Leme",
        category: "t-shirts-basicas",
        price: 9.99,
        badge: "Mais Vendido",
        image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop",
        description: "Descrição T-Shirts Básicas Leme."
    },
    {
        id: 2,
        name: "Religiosas Leme",
        category: "religiosas",
        price: 9.99,
        badge: "Lançamento",
        image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800&auto=format&fit=crop",
        description: "Descrição Religiosas Leme."
    },
    {
        id: 3,
        name: "Personalizadas Leme",
        category: "personalizadas",
        price: 9.90,
        badge: "Exclusivo",
        image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop",
        description: "Descrição Personalizadas Leme."
    },
    {
        id: 4,
        name: "Camisas Masculinas Leme",
        category: "camisas-masculinas",
        price: 9.99,
        badge: "Tendência",
        image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop",
        description: "Descrição Camisas Masculinas Leme."
    },
    {
        id: 5,
        name: "Oversized Leme",
        category: "oversized",
        price: 9.99,
        badge: "Coleção Ouro",
        image: "https://images.unsplash.com/photo-1554568218-0f1715e72254?q=80&w=800&auto=format&fit=crop",
        description: "Descrição Oversized Leme."
    },
    {
        id: 6,
        name: "T-Shirts Básicas Premium",
        category: "t-shirts-basicas",
        price: 9.99,
        badge: "Novo",
        image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=800&auto=format&fit=crop",
        description: "Descrição T-Shirts Básicas Premium."
    }
];

let cart = [];
let selectedSize = 'M';
let selectedModalQuantity = 1;

document.addEventListener('DOMContentLoaded', () => {
    renderProducts(products);
    setupEventListeners();
});

const productsGrid = document.getElementById('productsGrid');
const sidebarMenu = document.getElementById('sidebarMenu');
const cartDrawer = document.getElementById('cartDrawer');
const overlay = document.getElementById('overlay');
const productModal = document.getElementById('productModal');

function setupEventListeners() {
    document.getElementById('openNavBtn').addEventListener('click', openSidebar);
    document.getElementById('closeNavBtn').addEventListener('click', closeAllDrawers);

    document.getElementById('openCartBtn').addEventListener('click', openCart);
    document.getElementById('closeCartBtn').addEventListener('click', closeAllDrawers);

    overlay.addEventListener('click', closeAllDrawers);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
}

function renderProducts(items) {
    productsGrid.innerHTML = '';

    if (items.length === 0) {
        productsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum produto encontrado nesta categoria.</p>`;
        return;
    }

    items.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
      <span class="product-badge">${product.badge}</span>
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}">
        <button class="quick-view-btn" onclick="openQuickView(${product.id})">
          <i class="fa-solid fa-eye"></i> Ver Peça
        </button>
      </div>
      <div class="product-info">
        <span class="product-category">${product.category}</span>
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>
        <button class="btn-add-cart" onclick="addToCart(${product.id}, 'M', 1)">
          <i class="fa-solid fa-bag-shopping"></i> Adicionar ao Carrinho
        </button>
      </div>
    `;
        productsGrid.appendChild(card);
    });
}

function filterCategory(category) {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    const activeBtn = Array.from(buttons).find(
        btn => btn.textContent.toLowerCase().includes(category) || (category === 'todos' && btn.textContent === 'Todos')
    );
    if (activeBtn) activeBtn.classList.add('active');

    if (category === 'todos') {
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category === category);
        renderProducts(filtered);
    }

    closeAllDrawers();
}

function openSidebar() {
    closeAllDrawers();
    sidebarMenu.classList.add('active');
    overlay.classList.add('active');
}

function openCart() {
    closeAllDrawers();
    cartDrawer.classList.add('active');
    overlay.classList.add('active');
}

function closeAllDrawers() {
    sidebarMenu.classList.remove('active');
    cartDrawer.classList.remove('active');
    overlay.classList.remove('active');
}

function openQuickView(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    selectedSize = 'M';
    selectedModalQuantity = 1;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
    <div class="modal-grid">
      <div class="modal-image">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="modal-details">
        <h2>${product.name}</h2>
        <div class="modal-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>
        <p class="modal-description">${product.description}</p>
        
        <div class="size-selector">
          <label>Selecione o Tamanho:</label>
          <div class="size-options">
            <button class="size-btn ${selectedSize === 'P' ? 'selected' : ''}" onclick="selectSize(this, 'P')">P</button>
            <button class="size-btn ${selectedSize === 'M' ? 'selected' : ''}" onclick="selectSize(this, 'M')">M</button>
            <button class="size-btn ${selectedSize === 'G' ? 'selected' : ''}" onclick="selectSize(this, 'G')">G</button>
            <button class="size-btn ${selectedSize === 'GG' ? 'selected' : ''}" onclick="selectSize(this, 'GG')">GG</button>
          </div>
        </div>

        <div class="quantity-selector">
          <label>Quantidade:</label>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeModalQuantity(-1)"><i class="fa-solid fa-minus"></i></button>
            <span class="qty-val" id="modalQtyVal">1</span>
            <button class="qty-btn" onclick="changeModalQuantity(1)"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>

        <button class="btn-gold" style="width:100%; justify-content:center;" onclick="addToCart(${product.id}, selectedSize, selectedModalQuantity); closeModal(); openCart();">
          <i class="fa-solid fa-bag-shopping"></i> Confirmar e Adicionar
        </button>
      </div>
    </div>
  `;

    productModal.classList.add('active');
}

function selectSize(buttonElement, size) {
    selectedSize = size;
    const buttons = document.querySelectorAll('.size-btn');
    buttons.forEach(b => b.classList.remove('selected'));
    buttonElement.classList.add('selected');
}

function changeModalQuantity(delta) {
    selectedModalQuantity += delta;
    if (selectedModalQuantity < 1) selectedModalQuantity = 1;
    const qtyElement = document.getElementById('modalQtyVal');
    if (qtyElement) {
        qtyElement.textContent = selectedModalQuantity;
    }
}

function closeModal() {
    productModal.classList.remove('active');
}

function addToCart(productId, size = 'M', quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId && item.size === size);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            ...product,
            size: size,
            quantity: quantity
        });
    }

    updateCartUI();
    openCart();
}

function updateCartQuantity(index, delta) {
    if (!cart[index]) return;

    cart[index].quantity += delta;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    const cartContainer = document.getElementById('cartItemsContainer');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');

    cartCount.classList.remove('pop');
    void cartCount.offsetWidth;
    cartCount.classList.add('pop');

    const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartCount.textContent = totalQuantity;

    if (cart.length === 0) {
        cartContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
        <i class="fa-solid fa-bag-shopping" style="font-size: 2.5rem; color: var(--border-color); margin-bottom: 10px;"></i>
        <p>Seu carrinho está vazio.</p>
      </div>
    `;
        cartTotal.textContent = "R$ 0,00";
        return;
    }

    cartContainer.innerHTML = '';
    let subtotal = 0;

    cart.forEach((item, index) => {
        subtotal += item.price * item.quantity;

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-size">Tam: <strong>${item.size}</strong></div>
        <div class="cart-qty-row">
            <button class="btn-qty-mini" onclick="updateCartQuantity(${index}, -1)" title="Diminuir"><i class="fa-solid fa-minus"></i></button>
            <span class="cart-qty-num">${item.quantity}</span>
            <button class="btn-qty-mini" onclick="updateCartQuantity(${index}, 1)" title="Aumentar"><i class="fa-solid fa-plus"></i></button>
        </div>
        <div class="cart-item-price">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${index})" title="Remover item">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;
        cartContainer.appendChild(itemElement);
    });

    cartTotal.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
}

function checkoutWhatsApp() {
    if (cart.length === 0) {
        alert("Adicione pelo menos um produto ao seu carrinho antes de enviar o pedido.");
        return;
    }

    const phoneNumber = "5588996645739";

    let message = `*Olá, Leme! Gostaria de fazer o seguinte pedido pelo Catálogo:* \n\n`;

    let total = 0;
    cart.forEach((item, i) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += `${i + 1}. *${item.name}*\n   - Tam: ${item.size}\n   - Qtd: ${item.quantity}\n   - Valor: R$ ${itemTotal.toFixed(2).replace('.', ',')}\n\n`;
    });

    message += `*Total da Compra:* R$ ${total.toFixed(2).replace('.', ',')}\n\n`;
    message += `Aguardando informações sobre disponibilidade de estoque e opções de frete! ✨`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
}