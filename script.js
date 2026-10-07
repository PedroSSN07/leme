
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCzSpkYnbenWySywpL7UWaR2XG6fmtPE0M",
  authDomain: "leme-catalogo.firebaseapp.com",
  projectId: "leme-catalogo",
  storageBucket: "leme-catalogo.firebasestorage.app",
  messagingSenderId: "392758923254",
  appId: "1:392758923254:web:bad1bee41384f954df01d7"
};

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    productsRef = collection(db, "produtos");
} catch (error) {
    console.error("Erro na inicialização do Firebase:", error);
    alert("ERRO: As chaves do Firebase não estão preenchidas corretamente no topo do arquivo script.js.");
}

const defaultProducts = [
    { id: 1, name: "T-Shirts Básicas Leme", category: "t-shirts-basicas", price: 69.99, stock: 15, sizes: "P, M, G", badge: "Mais Vendido", image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800", description: "Descrição T-Shirts Básicas Leme." },
    { id: 2, name: "Religiosas Leme", category: "religiosas", price: 89.90, stock: 10, sizes: "P, M, G, GG", badge: "Lançamento", image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800", description: "Descrição Religiosas Leme." }
];

let products = [];
let cart = [];
let isAdmin = false;
const ADMIN_PASSWORD = "leme2026";

// Tornando as variáveis de seleção globais para o HTML enxergar
window.selectedSize = 'M';
window.selectedModalQuantity = 1;

async function loadProducts() {
    if (!productsRef) return; 

    try {
        const querySnapshot = await getDocs(productsRef);
        
        if (querySnapshot.empty) {
            products = [...defaultProducts];
            for (let p of products) {
                await setDoc(doc(productsRef, p.id.toString()), p);
            }
        } else {
            products = [];
            querySnapshot.forEach((doc) => {
                products.push(doc.data());
            });
        }
        
        products.sort((a, b) => a.id - b.id);
        renderProducts(products);
        
    } catch (error) {
        console.error("Erro ao puxar dados:", error);
        alert("Aviso: O banco de dados está vazio ou com erro de permissão. Exibindo produtos locais temporariamente.");
        // Se der erro na nuvem, mostra os locais para não quebrar o site
        products = [...defaultProducts];
        renderProducts(products);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
});

const productsGrid = document.getElementById('productsGrid');
const sidebarMenu = document.getElementById('sidebarMenu');
const cartDrawer = document.getElementById('cartDrawer');
const overlay = document.getElementById('overlay');
const productModal = document.getElementById('productModal');
const adminLoginModal = document.getElementById('adminLoginModal');
const editProductModal = document.getElementById('editProductModal');
const addProductModal = document.getElementById('addProductModal');
const adminPanel = document.getElementById('adminPanel');

// ------ FUNÇÕES DE JANELAS (Globais) ------
window.openSidebar = function() { window.closeAllDrawers(); sidebarMenu.classList.add('active'); overlay.classList.add('active'); }
window.openCart = function() { window.closeAllDrawers(); cartDrawer.classList.add('active'); overlay.classList.add('active'); }
window.closeModal = function() { productModal.classList.remove('active'); overlay.classList.remove('active'); }
window.closeAllDrawers = function() {
    sidebarMenu.classList.remove('active');
    cartDrawer.classList.remove('active');
    productModal.classList.remove('active');
    adminLoginModal.classList.remove('active');
    editProductModal.classList.remove('active');
    addProductModal.classList.remove('active');
    overlay.classList.remove('active');
}

function setupEventListeners() {
    document.getElementById('openNavBtn').addEventListener('click', window.openSidebar);
    document.getElementById('closeNavBtn').addEventListener('click', window.closeAllDrawers);
    document.getElementById('openCartBtn').addEventListener('click', window.openCart);
    document.getElementById('closeCartBtn').addEventListener('click', window.closeAllDrawers);
    document.getElementById('closeModalBtn').addEventListener('click', window.closeModal);
    overlay.addEventListener('click', window.closeAllDrawers);

    document.getElementById('adminLoginBtn').addEventListener('click', () => {
        if(isAdmin) {
            isAdmin = false;
            adminPanel.style.display = 'none';
            alert("Modo Admin desativado.");
            renderProducts(products);
        } else {
            adminLoginModal.classList.add('active');
            overlay.classList.add('active');
        }
    });
    document.getElementById('closeAdminLoginBtn').addEventListener('click', window.closeAllDrawers);
    document.getElementById('closeEditModalBtn').addEventListener('click', window.closeAllDrawers);
    document.getElementById('closeAddModalBtn').addEventListener('click', window.closeAllDrawers);
}

// ------ PROCESSADOR DE IMAGENS ------
window.processImage = function(inputElement, hiddenInputId, previewImgId, urlInputId) {
    const file = inputElement.files[0];
    if (file) {
        if (file.size > 800000) { 
            alert("A imagem é muito pesada (maior que 800kb). Escolha uma foto menor ou use a opção de Link (URL).");
            inputElement.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64String = e.target.result;
            document.getElementById(hiddenInputId).value = base64String; 
            const previewImg = document.getElementById(previewImgId);
            previewImg.src = base64String;
            previewImg.style.display = 'inline-block';
            if(urlInputId) document.getElementById(urlInputId).value = ''; 
        };
        reader.readAsDataURL(file);
    }
}

window.handleUrlInput = function(urlValue, fileInputId, hiddenInputId, previewImgId) {
    document.getElementById(fileInputId).value = '';
    document.getElementById(hiddenInputId).value = '';
    const previewImg = document.getElementById(previewImgId);
    if (urlValue.trim() !== '') {
        previewImg.src = urlValue; 
        previewImg.style.display = 'inline-block';
    } else {
        previewImg.style.display = 'none';
    }
}

// ------ LOGIN ADMIN ------
window.verifyAdmin = function() {
    const pass = document.getElementById('adminPassword').value;
    if (pass === ADMIN_PASSWORD) {
        isAdmin = true;
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminErrorMsg').style.display = 'none';
        adminPanel.style.display = 'block';
        alert("Acesso liberado! Banco de dados conectado.");
        window.closeAllDrawers();
        renderProducts(products);
    } else {
        document.getElementById('adminErrorMsg').style.display = 'block';
    }
}

function renderProducts(items) {
    productsGrid.innerHTML = '';
    if (items.length === 0) {
        productsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Nenhum produto encontrado.</p>`;
        return;
    }

    items.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        let btnCartHtml = product.stock > 0 
            ? `<button class="btn-add-cart" onclick="window.openQuickView(${product.id})"><i class="fa-solid fa-bag-shopping"></i> Comprar</button>`
            : `<button class="btn-add-cart" style="opacity: 0.5; cursor: not-allowed;"><i class="fa-solid fa-ban"></i> Esgotado</button>`;
        
        if (product.stock === 0) product.badge = "Esgotado";

        const adminControlsHtml = isAdmin ? `
            <div class="admin-card-controls">
                <button class="btn-edit-product" onclick="window.openEditModal(${product.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete-product" onclick="window.deleteProduct(${product.id})" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        ` : '';

        card.innerHTML = `
            ${adminControlsHtml}
            <span class="product-badge">${product.badge}</span>
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}">
                <button class="quick-view-btn" onclick="window.openQuickView(${product.id})"><i class="fa-solid fa-eye"></i> Ver Peça</button>
            </div>
            <div class="product-info">
                <span class="product-category">${product.category.replace(/-/g, ' ')}</span>
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}</div>
                ${isAdmin ? `<p class="stock-badge">Estoque: ${product.stock} un.</p>` : ''}
                ${btnCartHtml}
            </div>
        `;
        productsGrid.appendChild(card);
    });
}

// ------ ADICIONAR, EDITAR E EXCLUIR PRODUTOS (NUVEM + TELA IMEDIATA) ------
window.openAddModal = function() {
    document.getElementById('addProdName').value = '';
    document.getElementById('addProdImageUrl').value = '';
    document.getElementById('addProdImageFile').value = '';
    document.getElementById('addProdImageBase64').value = '';
    document.getElementById('addProdImagePreview').style.display = 'none';
    document.getElementById('addProdCategory').value = 't-shirts-basicas';
    document.getElementById('addProdBadge').value = 'Novo';
    document.getElementById('addProdPrice').value = '';
    document.getElementById('addProdStock').value = '';
    document.getElementById('addProdSizes').value = 'P, M, G';
    document.getElementById('addProdDesc').value = '';
    addProductModal.classList.add('active');
    overlay.classList.add('active');
}

window.saveNewProduct = async function() {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const base64Img = document.getElementById('addProdImageBase64').value;
    const urlImg = document.getElementById('addProdImageUrl').value;
    const finalImage = base64Img || urlImg || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800";

    const newProd = {
        id: newId,
        name: document.getElementById('addProdName').value || "Novo Produto",
        image: finalImage,
        category: document.getElementById('addProdCategory').value,
        badge: document.getElementById('addProdBadge').value || "Novo",
        price: parseFloat(document.getElementById('addProdPrice').value) || 0,
        stock: parseInt(document.getElementById('addProdStock').value) || 0,
        sizes: document.getElementById('addProdSizes').value || "Único",
        description: document.getElementById('addProdDesc').value || "Descrição do produto"
    };

    // 1. Atualiza a tela IMEDIATAMENTE (sem esperar o Firebase)
    products.push(newProd);
    window.closeAllDrawers();
    window.filterCategory('todos'); 
    alert("Produto adicionado com sucesso!");

    // 2. Salva na Nuvem no Fundo
    if(productsRef) {
        try {
            await setDoc(doc(productsRef, newProd.id.toString()), newProd);
        } catch (error) {
            console.error("Erro ao salvar na nuvem:", error);
        }
    }
}

window.openEditModal = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('editProdId').value = product.id;
    document.getElementById('editProdName').value = product.name;
    
    const isBase64 = product.image.startsWith('data:image');
    document.getElementById('editProdImageUrl').value = isBase64 ? '' : product.image;
    document.getElementById('editProdImageBase64').value = isBase64 ? product.image : '';
    document.getElementById('editProdImageFile').value = ''; 
    
    const previewImg = document.getElementById('editProdImagePreview');
    previewImg.src = product.image;
    previewImg.style.display = 'inline-block';

    document.getElementById('editProdCategory').value = product.category;
    document.getElementById('editProdBadge').value = product.badge;
    document.getElementById('editProdPrice').value = product.price;
    document.getElementById('editProdStock').value = product.stock;
    document.getElementById('editProdSizes').value = product.sizes || "";
    document.getElementById('editProdDesc').value = product.description;

    editProductModal.classList.add('active');
    overlay.classList.add('active');
}

window.saveProductEdits = async function() {
    const id = parseInt(document.getElementById('editProdId').value);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return;

    const base64Img = document.getElementById('editProdImageBase64').value;
    const urlImg = document.getElementById('editProdImageUrl').value;
    const finalImage = base64Img || urlImg || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800";

    const updatedProd = {
        id: id,
        name: document.getElementById('editProdName').value,
        image: finalImage,
        category: document.getElementById('editProdCategory').value,
        badge: document.getElementById('editProdBadge').value,
        price: parseFloat(document.getElementById('editProdPrice').value),
        stock: parseInt(document.getElementById('editProdStock').value),
        sizes: document.getElementById('editProdSizes').value,
        description: document.getElementById('editProdDesc').value
    };

    // 1. Atualiza a tela IMEDIATAMENTE
    products[index] = updatedProd;
    window.closeAllDrawers();
    window.filterCategory('todos');
    alert("Produto atualizado com sucesso!");

    // 2. Salva na Nuvem
    if(productsRef) {
        try {
            await setDoc(doc(productsRef, id.toString()), updatedProd);
        } catch (error) {
            console.error("Erro ao atualizar nuvem:", error);
        }
    }
}

window.deleteProduct = async function(id) {
    if(confirm("ATENÇÃO: Tem certeza que deseja excluir este produto?")) {
        // 1. Apaga da tela IMEDIATAMENTE
        products = products.filter(p => p.id !== id);
        window.filterCategory('todos');

        // 2. Apaga da Nuvem
        if(productsRef) {
            try {
                await deleteDoc(doc(productsRef, id.toString()));
            } catch (error) {
                console.error("Erro ao excluir na nuvem:", error);
            }
        }
    }
}

// ------ FILTRO E CARRINHO ------

window.filterCategory = function(category) {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const categoryText = category.replace(/-/g, ' ');
    const activeBtn = Array.from(buttons).find(
        btn => btn.textContent.toLowerCase().includes(categoryText) || (category === 'todos' && btn.textContent.toLowerCase().includes('todos'))
    );
    if (activeBtn) activeBtn.classList.add('active');

    if (category === 'todos') renderProducts(products);
    else renderProducts(products.filter(p => p.category === category));
}

window.openQuickView = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    window.selectedModalQuantity = 1;
    const sizesArray = product.sizes ? product.sizes.split(',').map(s => s.trim()) : ['Único'];
    window.selectedSize = sizesArray[0];
    
    let sizesHtml = sizesArray.map(size => 
        `<button class="size-btn ${window.selectedSize === size ? 'selected' : ''}" onclick="window.selectSize(this, '${size}')">${size}</button>`
    ).join('');

    const isAvailable = product.stock > 0;
    const stockStatus = isAvailable ? `<span class="stock-badge stock-ok">Em estoque (${product.stock} disponíveis)</span>` : `<span class="stock-badge">Esgotado</span>`;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
    <div class="modal-grid">
      <div class="modal-image">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="modal-details">
        <h2>${product.name}</h2>
        <div class="modal-price">R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}</div>
        <p class="modal-description">${product.description}</p>
        <p style="margin-bottom: 15px;">${stockStatus}</p>
        
        <div class="size-selector">
          <label>Selecione o Tamanho:</label>
          <div class="size-options">${sizesHtml}</div>
        </div>

        <div class="quantity-selector">
          <label>Quantidade:</label>
          <div class="qty-controls">
            <button class="qty-btn" onclick="window.changeModalQuantity(-1, ${product.stock})"><i class="fa-solid fa-minus"></i></button>
            <span class="qty-val" id="modalQtyVal">1</span>
            <button class="qty-btn" onclick="window.changeModalQuantity(1, ${product.stock})"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>

        <button class="btn-gold" style="width:100%; justify-content:center;" ${!isAvailable ? 'disabled style="opacity:0.5;"' : ''} onclick="window.addToCart(${product.id}, window.selectedSize, window.selectedModalQuantity); window.closeModal(); window.openCart();">
          <i class="fa-solid fa-bag-shopping"></i> ${isAvailable ? 'Confirmar e Adicionar' : 'Indisponível'}
        </button>
      </div>
    </div>
  `;
    productModal.classList.add('active');
    overlay.classList.add('active');
}

window.selectSize = function(buttonElement, size) {
    window.selectedSize = size;
    const buttons = document.querySelectorAll('.size-btn');
    buttons.forEach(b => b.classList.remove('selected'));
    buttonElement.classList.add('selected');
}

window.changeModalQuantity = function(delta, maxStock) {
    window.selectedModalQuantity += delta;
    if (window.selectedModalQuantity < 1) window.selectedModalQuantity = 1;
    if (window.selectedModalQuantity > maxStock) {
        window.selectedModalQuantity = maxStock;
        alert(`Temos apenas ${maxStock} unidades em estoque.`);
    }
    document.getElementById('modalQtyVal').textContent = window.selectedModalQuantity;
}

window.addToCart = function(productId, size = 'M', quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock < 1) return;

    const existingItem = cart.find(item => item.id === productId && item.size === size);

    if (existingItem) {
        if(existingItem.quantity + quantity > product.stock) {
            alert(`Você não pode adicionar mais que ${product.stock} unidades.`);
            return;
        }
        existingItem.quantity += quantity;
    } else {
        if(quantity > product.stock) return;
        cart.push({ ...product, size: size, quantity: quantity });
    }
    window.updateCartUI();
}

window.updateCartQuantity = function(index, delta) {
    if (!cart[index]) return;
    const product = products.find(p => p.id === cart[index].id);
    const newQty = cart[index].quantity + delta;

    if (newQty > product.stock) {
        alert(`Estoque máximo atingido (${product.stock} disponíveis).`);
        return;
    }

    cart[index].quantity = newQty;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    window.updateCartUI();
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    window.updateCartUI();
}

window.updateCartUI = function() {
    const cartContainer = document.getElementById('cartItemsContainer');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');

    cartCount.classList.remove('pop');
    void cartCount.offsetWidth;
    cartCount.classList.add('pop');

    cartCount.textContent = cart.reduce((acc, item) => acc + item.quantity, 0);

    if (cart.length === 0) {
        cartContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
        <i class="fa-solid fa-bag-shopping" style="font-size: 2.5rem; color: var(--border-color); margin-bottom: 10px;"></i>
        <p>Seu carrinho está vazio.</p>
      </div>`;
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
            <button class="btn-qty-mini" onclick="window.updateCartQuantity(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
            <span class="cart-qty-num">${item.quantity}</span>
            <button class="btn-qty-mini" onclick="window.updateCartQuantity(${index}, 1)"><i class="fa-solid fa-plus"></i></button>
        </div>
        <div class="cart-item-price">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</div>
      </div>
      <button class="cart-item-remove" onclick="window.removeFromCart(${index})"><i class="fa-solid fa-trash-can"></i></button>
    `;
        cartContainer.appendChild(itemElement);
    });

    cartTotal.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
}

window.checkoutWhatsApp = function() {
    if (cart.length === 0) {
        alert("Adicione pelo menos um produto ao seu carrinho.");
        return;
    }

    const phoneNumber = "5585997560937";
    let message = `*Olá, Leme! Gostaria de fazer o seguinte pedido:* \n\n`;
    let total = 0;

    cart.forEach((item, i) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += `${i + 1}. *${item.name}*\n   - Tam: ${item.size}\n   - Qtd: ${item.quantity}\n   - Valor: R$ ${itemTotal.toFixed(2).replace('.', ',')}\n\n`;
    });

    message += `*Total da Compra:* R$ ${total.toFixed(2).replace('.', ',')}\n\n`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
}