import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
    DEFAULT_PRODUCT_IMAGE,
    MAX_PRODUCT_IMAGE_FILE_BYTES,
    normalizeImageSource,
    normalizeProduct,
    validateProductForWrite
} from "./product-security.mjs";

const firebaseConfig = {
    apiKey: "AIzaSyCzSpkYnbenWySywpL7UWaR2XG6fmtPE0M",
    authDomain: "leme-catalogo.firebaseapp.com",
    projectId: "leme-catalogo",
    storageBucket: "leme-catalogo.firebasestorage.app",
    messagingSenderId: "392758923254",
    appId: "1:392758923254:web:bad1bee41384f954df01d7"
};

let app, db, productsRef, auth;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    productsRef = collection(db, "produtos");
} catch (error) {
    console.error("Erro na inicialização do Firebase:", error);
    alert("ERRO: Falha ao conectar no Firebase. Verifique o console.");
}

const defaultProducts = [
    { id: 1, name: "T-Shirts Básicas Leme", category: "t-shirts-basicas", price: 69.99, stock: 15, sizes: "P, M, G", badge: "Mais Vendido", image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800", description: "Descrição T-Shirts Básicas Leme." },
    { id: 2, name: "Religiosas Leme", category: "religiosas", price: 89.90, stock: 10, sizes: "P, M, G, GG", badge: "Lançamento", image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800", description: "Descrição Religiosas Leme." }
];

let products = [];
let cart = [];
let isAdmin = false;
let pendingAdminLogin = false;
let authStateGeneration = 0;
let catalogUsesLocalDefaults = false;

window.selectedSize = 'M';
window.selectedModalQuantity = 1;

async function loadProducts() {
    if (!productsRef) return;

    try {
        const querySnapshot = await getDocs(productsRef);

        if (querySnapshot.empty) {
            catalogUsesLocalDefaults = true;
            products = defaultProducts.map(normalizeProduct);
        } else {
            catalogUsesLocalDefaults = false;
            products = [];
            querySnapshot.forEach((snapshot) => {
                const fallbackId = Number.parseInt(snapshot.id, 10);
                products.push(normalizeProduct(snapshot.data(), { fallbackId }));
            });
        }

        products.sort((a, b) => a.id - b.id);
        renderProducts(products);

    } catch (error) {
        console.error("Erro ao puxar dados da nuvem:", error);
        products = defaultProducts.map(normalizeProduct);
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

function element(tagName, options = {}) {
    const node = document.createElement(tagName);
    if (options.className) node.className = options.className;
    if (options.textContent !== undefined) node.textContent = String(options.textContent);
    if (options.attributes) {
        Object.entries(options.attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
    }
    if (options.onClick) node.addEventListener('click', options.onClick);
    return node;
}

function icon(className) {
    return element('i', { className });
}

function formatPrice(value) {
    return Number(value).toFixed(2).replace('.', ',');
}

function setAdminUi(enabled) {
    isAdmin = enabled;
    adminPanel.style.display = enabled ? 'block' : 'none';
    renderProducts(products);
}

async function reconcileAdminState(user, generation) {
    let hasAdminClaim = false;

    try {
        if (user) {
            const tokenResult = await user.getIdTokenResult();
            hasAdminClaim = tokenResult.claims.admin === true;
        }
    } catch (error) {
        console.error("Não foi possível validar as permissões da conta:", error);
    }

    if (generation !== authStateGeneration || auth.currentUser?.uid !== user?.uid) return;
    setAdminUi(hasAdminClaim);

    if (pendingAdminLogin && !hasAdminClaim) {
        pendingAdminLogin = false;
        if (user) await signOut(auth);
        document.getElementById('adminErrorMsg').style.display = 'block';
        alert("Esta conta não possui acesso administrativo.");
        return;
    }

    if (pendingAdminLogin && hasAdminClaim) {
        pendingAdminLogin = false;
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminErrorMsg').style.display = 'none';
        alert("Acesso administrativo liberado.");
        window.closeAllDrawers();
    }
}

if (auth) {
    onAuthStateChanged(auth, (user) => {
        const generation = ++authStateGeneration;
        setAdminUi(false);
        void reconcileAdminState(user, generation);
    });
}

window.openSidebar = function () { window.closeAllDrawers(); sidebarMenu.classList.add('active'); overlay.classList.add('active'); }
window.openCart = function () { window.closeAllDrawers(); cartDrawer.classList.add('active'); overlay.classList.add('active'); }
window.closeModal = function () { productModal.classList.remove('active'); overlay.classList.remove('active'); }
window.closeAllDrawers = function () {
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

    document.getElementById('adminLoginBtn').addEventListener('click', async () => {
        if (isAdmin) {
            try {
                await signOut(auth);
                alert("Modo Admin desativado.");
            } catch (error) {
                console.error("Não foi possível encerrar a sessão:", error);
                alert("Não foi possível encerrar a sessão agora.");
            }
        } else {
            adminLoginModal.classList.add('active');
            overlay.classList.add('active');
        }
    });
    document.getElementById('closeAdminLoginBtn').addEventListener('click', window.closeAllDrawers);
    document.getElementById('closeEditModalBtn').addEventListener('click', window.closeAllDrawers);
    document.getElementById('closeAddModalBtn').addEventListener('click', window.closeAllDrawers);
}

window.processImage = function (inputElement, hiddenInputId, previewImgId, urlInputId) {
    const file = inputElement.files[0];
    if (file) {
        const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
        if (file.size > MAX_PRODUCT_IMAGE_FILE_BYTES || !allowedTypes.has(file.type)) {
            alert("Use uma imagem PNG, JPEG ou WebP com até 674 KB.");
            inputElement.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            const base64String = e.target.result;
            const safeSource = normalizeImageSource(base64String);
            if (safeSource === DEFAULT_PRODUCT_IMAGE) {
                alert("A imagem selecionada não é válida.");
                inputElement.value = '';
                return;
            }
            document.getElementById(hiddenInputId).value = safeSource;
            const previewImg = document.getElementById(previewImgId);
            previewImg.src = safeSource;
            previewImg.style.display = 'inline-block';
            if (urlInputId) document.getElementById(urlInputId).value = '';
        };
        reader.readAsDataURL(file);
    }
}

window.handleUrlInput = function (urlValue, fileInputId, hiddenInputId, previewImgId) {
    document.getElementById(fileInputId).value = '';
    document.getElementById(hiddenInputId).value = '';
    const previewImg = document.getElementById(previewImgId);
    const safeSource = normalizeImageSource(urlValue);
    if (urlValue.trim() !== '' && safeSource !== DEFAULT_PRODUCT_IMAGE) {
        previewImg.src = safeSource;
        previewImg.style.display = 'inline-block';
    } else {
        previewImg.style.display = 'none';
    }
}

window.verifyAdmin = async function () {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPassword').value;
    const btn = document.getElementById('btnFazerLogin');

    if (!email || !pass) {
        alert("Preencha o e-mail e a senha.");
        return;
    }

    btn.innerText = "Aguarde...";

    try {
        pendingAdminLogin = true;
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        pendingAdminLogin = false;
        console.error(error);
        document.getElementById('adminErrorMsg').style.display = 'block';
    }

    btn.innerText = "Entrar";
}

function renderProducts(items) {
    productsGrid.replaceChildren();
    if (items.length === 0) {
        const empty = element('p', { textContent: 'Nenhum produto encontrado.' });
        empty.style.gridColumn = '1 / -1';
        empty.style.textAlign = 'center';
        productsGrid.appendChild(empty);
        return;
    }

    items.forEach(product => {
        const card = element('div', { className: 'product-card' });

        if (isAdmin && !catalogUsesLocalDefaults) {
            const controls = element('div', { className: 'admin-card-controls' });
            const editButton = element('button', { className: 'btn-edit-product', attributes: { title: 'Editar' }, onClick: () => window.openEditModal(product.id) });
            editButton.appendChild(icon('fa-solid fa-pen'));
            const deleteButton = element('button', { className: 'btn-delete-product', attributes: { title: 'Excluir' }, onClick: () => window.deleteProduct(product.id) });
            deleteButton.appendChild(icon('fa-solid fa-trash-can'));
            controls.append(editButton, deleteButton);
            card.appendChild(controls);
        }

        const badge = element('span', { className: 'product-badge', textContent: product.badge });
        if (product.stock === 0) badge.textContent = 'Esgotado';
        card.appendChild(badge);

        const imageContainer = element('div', { className: 'product-image' });
        const image = element('img', { attributes: { src: product.image, alt: product.name } });
        const quickView = element('button', { className: 'quick-view-btn', onClick: () => window.openQuickView(product.id) });
        quickView.append(icon('fa-solid fa-eye'), document.createTextNode(' Ver Peça'));
        imageContainer.append(image, quickView);

        const info = element('div', { className: 'product-info' });
        info.append(
            element('span', { className: 'product-category', textContent: product.category.replace(/-/g, ' ') }),
            element('h3', { className: 'product-title', textContent: product.name }),
            element('div', { className: 'product-price', textContent: `R$ ${formatPrice(product.price)}` })
        );
        if (isAdmin) info.appendChild(element('p', { className: 'stock-badge', textContent: `Estoque: ${product.stock} un.` }));

        const cartButton = element('button', {
            className: 'btn-add-cart',
            textContent: product.stock > 0 ? 'Comprar' : 'Esgotado',
            onClick: product.stock > 0 ? () => window.openQuickView(product.id) : undefined
        });
        cartButton.prepend(icon(product.stock > 0 ? 'fa-solid fa-bag-shopping' : 'fa-solid fa-ban'));
        if (product.stock <= 0) {
            cartButton.disabled = true;
            cartButton.style.opacity = '0.5';
            cartButton.style.cursor = 'not-allowed';
        }
        info.appendChild(cartButton);
        card.append(imageContainer, info);
        productsGrid.appendChild(card);
    });
}

window.openAddModal = function () {
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

window.saveNewProduct = async function () {
    if (!isAdmin) return alert("Você precisa estar logado para salvar.");

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

    const validation = validateProductForWrite(newProd);
    if (!validation.ok) return alert(`Revise os campos: ${validation.errors.join(', ')}.`);
    if (!productsRef) return alert("Banco de dados indisponível. O produto não foi salvo.");

    try {
        await setDoc(doc(productsRef, newProd.id.toString()), validation.value);
        if (catalogUsesLocalDefaults) {
            products = [];
            catalogUsesLocalDefaults = false;
        }
        products.push(validation.value);
        window.closeAllDrawers();
        window.filterCategory('todos');
        alert("Produto adicionado com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar na nuvem:", error);
        alert("Permissão negada ou erro ao gravar no banco.");
    }
}

window.openEditModal = function (id) {
    if (catalogUsesLocalDefaults) return alert("Os produtos de exemplo não estão salvos. Crie o primeiro produto real para substituí-los.");
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

window.saveProductEdits = async function () {
    if (!isAdmin) return alert("Você precisa estar logado para editar.");

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

    const validation = validateProductForWrite(updatedProd);
    if (!validation.ok) return alert(`Revise os campos: ${validation.errors.join(', ')}.`);
    if (!productsRef) return alert("Banco de dados indisponível. As alterações não foram salvas.");

    try {
        await setDoc(doc(productsRef, id.toString()), validation.value);
        products[index] = validation.value;
        window.closeAllDrawers();
        window.filterCategory('todos');
        alert("Produto atualizado com sucesso!");
    } catch (error) {
        console.error("Erro ao atualizar nuvem:", error);
        alert("Permissão negada ou erro ao atualizar o banco.");
    }
}

window.deleteProduct = async function (id) {
    if (!isAdmin) return alert("Você precisa estar logado para excluir.");
    if (catalogUsesLocalDefaults) return alert("Os produtos de exemplo não estão salvos e não podem ser excluídos.");

    if (confirm("ATENÇÃO: Tem certeza que deseja excluir este produto?")) {
        if (!productsRef) return alert("Banco de dados indisponível. O produto não foi excluído.");
        try {
            await deleteDoc(doc(productsRef, id.toString()));
            products = products.filter(p => p.id !== id);
            window.filterCategory('todos');
        } catch (error) {
            console.error("Erro ao excluir na nuvem:", error);
            alert("Permissão negada ou erro ao excluir do banco.");
        }
    }
}

window.filterCategory = function (category) {
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

window.openQuickView = function (id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    window.selectedModalQuantity = 1;
    const sizesArray = product.sizes ? product.sizes.split(',').map(s => s.trim()) : ['Único'];
    window.selectedSize = sizesArray[0];

    const isAvailable = product.stock > 0;
    const modalBody = document.getElementById('modalBody');
    const grid = element('div', { className: 'modal-grid' });
    const imageBox = element('div', { className: 'modal-image' });
    imageBox.appendChild(element('img', { attributes: { src: product.image, alt: product.name } }));

    const details = element('div', { className: 'modal-details' });
    details.append(
        element('h2', { textContent: product.name }),
        element('div', { className: 'modal-price', textContent: `R$ ${formatPrice(product.price)}` }),
        element('p', { className: 'modal-description', textContent: product.description })
    );

    const stockRow = element('p');
    stockRow.style.marginBottom = '15px';
    stockRow.appendChild(element('span', {
        className: isAvailable ? 'stock-badge stock-ok' : 'stock-badge',
        textContent: isAvailable ? `Em estoque (${product.stock} disponíveis)` : 'Esgotado'
    }));
    details.appendChild(stockRow);

    const sizeSelector = element('div', { className: 'size-selector' });
    sizeSelector.appendChild(element('label', { textContent: 'Selecione o Tamanho:' }));
    const sizeOptions = element('div', { className: 'size-options' });
    sizesArray.forEach(size => {
        const sizeButton = element('button', {
            className: `size-btn${window.selectedSize === size ? ' selected' : ''}`,
            textContent: size
        });
        sizeButton.addEventListener('click', () => window.selectSize(sizeButton, size));
        sizeOptions.appendChild(sizeButton);
    });
    sizeSelector.appendChild(sizeOptions);
    details.appendChild(sizeSelector);

    const quantitySelector = element('div', { className: 'quantity-selector' });
    quantitySelector.appendChild(element('label', { textContent: 'Quantidade:' }));
    const quantityControls = element('div', { className: 'qty-controls' });
    const decrease = element('button', { className: 'qty-btn', onClick: () => window.changeModalQuantity(-1, product.stock) });
    decrease.appendChild(icon('fa-solid fa-minus'));
    const quantityValue = element('span', { className: 'qty-val', textContent: '1', attributes: { id: 'modalQtyVal' } });
    const increase = element('button', { className: 'qty-btn', onClick: () => window.changeModalQuantity(1, product.stock) });
    increase.appendChild(icon('fa-solid fa-plus'));
    quantityControls.append(decrease, quantityValue, increase);
    quantitySelector.appendChild(quantityControls);
    details.appendChild(quantitySelector);

    const addButton = element('button', {
        className: 'btn-gold',
        textContent: isAvailable ? ' Confirmar e Adicionar' : ' Indisponível',
        onClick: isAvailable ? () => {
            window.addToCart(product.id, window.selectedSize, window.selectedModalQuantity);
            window.closeModal();
            window.openCart();
        } : undefined
    });
    addButton.style.width = '100%';
    addButton.style.justifyContent = 'center';
    addButton.prepend(icon('fa-solid fa-bag-shopping'));
    if (!isAvailable) {
        addButton.disabled = true;
        addButton.style.opacity = '0.5';
    }
    details.appendChild(addButton);
    grid.append(imageBox, details);
    modalBody.replaceChildren(grid);
    productModal.classList.add('active');
    overlay.classList.add('active');
}

window.selectSize = function (buttonElement, size) {
    window.selectedSize = size;
    const buttons = document.querySelectorAll('.size-btn');
    buttons.forEach(b => b.classList.remove('selected'));
    buttonElement.classList.add('selected');
}

window.changeModalQuantity = function (delta, maxStock) {
    window.selectedModalQuantity += delta;
    if (window.selectedModalQuantity < 1) window.selectedModalQuantity = 1;
    if (window.selectedModalQuantity > maxStock) {
        window.selectedModalQuantity = maxStock;
        alert(`Temos apenas ${maxStock} unidades em estoque.`);
    }
    document.getElementById('modalQtyVal').textContent = window.selectedModalQuantity;
}

window.addToCart = function (productId, size = 'M', quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock < 1) return;

    const existingItem = cart.find(item => item.id === productId && item.size === size);

    if (existingItem) {
        if (existingItem.quantity + quantity > product.stock) {
            alert(`Você não pode adicionar mais que ${product.stock} unidades.`);
            return;
        }
        existingItem.quantity += quantity;
    } else {
        if (quantity > product.stock) return;
        cart.push({ ...product, size: size, quantity: quantity });
    }
    window.updateCartUI();
}

window.updateCartQuantity = function (index, delta) {
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

window.removeFromCart = function (index) {
    cart.splice(index, 1);
    window.updateCartUI();
}

window.updateCartUI = function () {
    const cartContainer = document.getElementById('cartItemsContainer');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');

    cartCount.classList.remove('pop');
    void cartCount.offsetWidth;
    cartCount.classList.add('pop');

    cartCount.textContent = cart.reduce((acc, item) => acc + item.quantity, 0);

    if (cart.length === 0) {
        const empty = element('div');
        empty.style.textAlign = 'center';
        empty.style.color = 'var(--text-muted)';
        empty.style.padding = '40px 0';
        const emptyIcon = icon('fa-solid fa-bag-shopping');
        emptyIcon.style.fontSize = '2.5rem';
        emptyIcon.style.color = 'var(--border-color)';
        emptyIcon.style.marginBottom = '10px';
        empty.append(emptyIcon, element('p', { textContent: 'Seu carrinho está vazio.' }));
        cartContainer.replaceChildren(empty);
        cartTotal.textContent = "R$ 0,00";
        return;
    }

    cartContainer.replaceChildren();
    let subtotal = 0;

    cart.forEach((item, index) => {
        subtotal += item.price * item.quantity;
        const itemElement = element('div', { className: 'cart-item' });
        itemElement.appendChild(element('img', { attributes: { src: item.image, alt: item.name } }));

        const itemInfo = element('div', { className: 'cart-item-info' });
        itemInfo.appendChild(element('div', { className: 'cart-item-title', textContent: item.name }));
        const itemSize = element('div', { className: 'cart-item-size', textContent: 'Tam: ' });
        itemSize.appendChild(element('strong', { textContent: item.size }));
        itemInfo.appendChild(itemSize);

        const quantityRow = element('div', { className: 'cart-qty-row' });
        const minusButton = element('button', { className: 'btn-qty-mini', onClick: () => window.updateCartQuantity(index, -1) });
        minusButton.appendChild(icon('fa-solid fa-minus'));
        const plusButton = element('button', { className: 'btn-qty-mini', onClick: () => window.updateCartQuantity(index, 1) });
        plusButton.appendChild(icon('fa-solid fa-plus'));
        quantityRow.append(minusButton, element('span', { className: 'cart-qty-num', textContent: item.quantity }), plusButton);
        itemInfo.append(quantityRow, element('div', { className: 'cart-item-price', textContent: `R$ ${formatPrice(item.price * item.quantity)}` }));

        const removeButton = element('button', { className: 'cart-item-remove', onClick: () => window.removeFromCart(index) });
        removeButton.appendChild(icon('fa-solid fa-trash-can'));
        itemElement.append(itemInfo, removeButton);
        cartContainer.appendChild(itemElement);
    });

    cartTotal.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
}

window.checkoutWhatsApp = function () {
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
    const checkoutWindow = window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank', 'noopener');
    if (checkoutWindow) checkoutWindow.opener = null;
}
