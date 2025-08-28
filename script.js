// ------ Configuration ------
const API_BASE_URL = "YOUR_DEPLOYED_SCRIPT_URL"; // যেমন: https://script.google.com/macros/s/AKfycbx4_xxx/exec
const AUTH_URL = API_BASE_URL + "?auth=1";

// ------ DOM Elements ------
const loginSection = document.getElementById("login-section");
const adminPanel = document.getElementById("admin-panel");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const ordersTableBody = document.getElementById("orders-table-body");
const loadingSpinner = document.getElementById("loading-spinner");
const noOrdersMessage = document.getElementById("no-orders-message");
const totalOrders = document.getElementById("total-orders");
const logoutBtn = document.getElementById("logout-btn");
const darkModeToggle = document.getElementById("dark-mode-toggle");
const togglePassword = document.getElementById("toggle-password");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const dateFilter = document.getElementById("date-filter");
const paginationDiv = document.getElementById("pagination");

// Modal
const modalOverlay = document.getElementById("modal-overlay");
const confirmationModal = document.getElementById("confirmation-modal");
const confirmBtn = document.getElementById("confirm-btn");
const cancelBtn = document.getElementById("cancel-btn");
const modalText = document.getElementById("modal-text");

// ------ State ------
let currentUserToken = null;
let orders = [];
let filteredOrders = [];
let currentPage = 1;
const ORDERS_PER_PAGE = 8;
let pendingUpdate = null;

document.body.setAttribute("lang", "bn");

// ------ Login System ------
loginBtn.onclick = async function() {
  loginError.textContent = "";
  loginBtn.disabled = true;
  showSpinner(true);
  const password = passwordInput.value;
  try {
    // Authentication API call (Apps Script)
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const result = await res.json();
    if (result.success && result.token) {
      currentUserToken = result.token;
      sessionStorage.setItem("loggedIn", "true");
      sessionStorage.setItem("authToken", currentUserToken);
      loginSection.style.display = "none";
      adminPanel.style.display = "block";
      fetchOrders();
    } else {
      loginError.textContent = "পাসওয়ার্ড ভুল!";
    }
  } catch (err) {
    loginError.textContent = "লগইন করতে সমস্যা হয়েছে!";
  } finally {
    showSpinner(false);
    loginBtn.disabled = false;
  }
};

togglePassword.onclick = togglePassword.onkeypress = function(e) {
  if (e.type === "click" || e.key === "Enter" || e.key === " ") {
    passwordInput.type = (passwordInput.type === "password" ? "text" : "password");
    togglePassword.textContent = (passwordInput.type === "password" ? "👁️" : "🙈");
  }
};
togglePassword.tabIndex = 0;

logoutBtn.onclick = function() {
  sessionStorage.removeItem("loggedIn");
  sessionStorage.removeItem("authToken");
  location.reload();
};

darkModeToggle.onclick = function() {
  document.body.classList.toggle("dark");
  sessionStorage.setItem("darkMode", document.body.classList.contains("dark"));
};
window.addEventListener("DOMContentLoaded", function() {
  if (sessionStorage.getItem("darkMode") === "true") document.body.classList.add("dark");
});

// ------ Fetch Orders ------
async function fetchOrders() {
  showSpinner(true);
  noOrdersMessage.style.display = "none";
  ordersTableBody.innerHTML = "";
  try {
    // Token must be sent as URL param for Apps Script CORS
    const res = await fetch(API_BASE_URL + "?token=" + currentUserToken);
    const result = await res.json();
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      orders = result.data;
      applyFilters();
    } else {
      noOrdersMessage.style.display = "block";
      orders = [];
      renderOrders([]);
    }
  } catch {
    noOrdersMessage.textContent = "অর্ডার লোড করতে সমস্যা হয়েছে।";
    noOrdersMessage.style.display = "block";
    orders = [];
    renderOrders([]);
  } finally {
    showSpinner(false);
  }
}

searchInput.oninput = statusFilter.onchange = dateFilter.onchange = function() {
  currentPage = 1;
  applyFilters();
};

function applyFilters() {
  let temp = [...orders];
  const searchText = searchInput.value.trim().toLowerCase();
  const statusVal = statusFilter.value;
  const dateVal = dateFilter.value;

  if (searchText) {
    temp = temp.filter(order =>
      (order.CustomerName || '').toLowerCase().includes(searchText) ||
      (order.PhoneNumber || '').toLowerCase().includes(searchText) ||
      (order.OrderID || '').toLowerCase().includes(searchText)
    );
  }
  if (statusVal) temp = temp.filter(order => order.Status === statusVal);
  if (dateVal) {
    temp = temp.filter(order => {
      const orderDate = new Date(order.Timestamp);
      const filterDate = new Date(dateVal);
      return orderDate.toDateString() === filterDate.toDateString();
    });
  }

  filteredOrders = temp;
  renderOrders(paginate(filteredOrders, currentPage));
  renderPagination(filteredOrders.length, currentPage);
  totalOrders.textContent = `মোট অর্ডার: ${filteredOrders.length}`;
}

function paginate(data, page) {
  const start = (page - 1) * ORDERS_PER_PAGE;
  return data.slice(start, start + ORDERS_PER_PAGE);
}

function renderPagination(total, page) {
  paginationDiv.innerHTML = "";
  const pageCount = Math.ceil(total / ORDERS_PER_PAGE);
  if (pageCount <= 1) return;
  for (let i = 1; i <= pageCount; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "page-btn" + (i === page ? " active" : "");
    btn.onclick = () => {
      currentPage = i;
      renderOrders(paginate(filteredOrders, currentPage));
      renderPagination(filteredOrders.length, currentPage);
    };
    paginationDiv.appendChild(btn);
  }
}

function renderOrders(showOrders) {
  ordersTableBody.innerHTML = "";
  if (!showOrders.length) {
    noOrdersMessage.style.display = "block";
    return;
  } else {
    noOrdersMessage.style.display = "none";
  }
  showOrders.forEach(order => {
    const row = document.createElement("tr");
    const orderDate = new Date(order.Timestamp).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
    });
    row.innerHTML = `
      <td data-label="তারিখ ও সময়">${orderDate}</td>
      <td data-label="নাম">${order.CustomerName || ''}</td>
      <td data-label="ঠিকানা">${order.Address || ''}</td>
      <td data-label="ফোন">${order.PhoneNumber || ''}</td>
      <td data-label="ডিটেইলস"><div class="details">${order.OrderDetails || ''}</div></td>
      <td data-label="অর্ডার ID">${order.OrderID || ''}</td>
      <td data-label="স্ট্যাটাস">
        <select class="status-select" id="status-${order.rowNum}">
          <option value="Pending" ${order.Status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="Shipped" ${order.Status === "Shipped" ? "selected" : ""}>Shipped</option>
          <option value="Delivered" ${order.Status === "Delivered" ? "selected" : ""}>Delivered</option>
          <option value="Cancelled" ${order.Status === "Cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
      <td data-label="একশন">
        <button class="update-btn" data-rownum="${order.rowNum}">Update</button>
      </td>
    `;
    ordersTableBody.appendChild(row);
    const select = document.getElementById(`status-${order.rowNum}`);
    updateStatusColor(select);
    select.onchange = function() { updateStatusColor(select); };
    select.tabIndex = 0;
    row.querySelector('.update-btn').onclick = function() {
      showConfirmationModal(order.rowNum, select.value);
    };
  });
}

function updateStatusColor(selectElement) {
  selectElement.classList.remove('status-pending', 'status-shipped', 'status-delivered', 'status-cancelled');
  const statusClass = 'status-' + selectElement.value.toLowerCase();
  selectElement.classList.add(statusClass);
}

function showConfirmationModal(rowNum, newStatus) {
  pendingUpdate = { rowNum, newStatus };
  modalText.textContent = `আপনি কি "${newStatus}" স্ট্যাটাসে পরিবর্তন করতে চান?`;
  modalOverlay.style.display = "flex";
  confirmBtn.focus();
}
confirmBtn.onclick = async function() {
  if (!pendingUpdate) return;
  modalOverlay.style.display = "none";
  await updateOrderStatus(pendingUpdate.rowNum, pendingUpdate.newStatus);
  pendingUpdate = null;
};
cancelBtn.onclick = function() {
  modalOverlay.style.display = "none";
  pendingUpdate = null;
};
modalOverlay.onclick = function(e) {
  if (e.target === modalOverlay) {
    modalOverlay.style.display = "none";
    pendingUpdate = null;
  }
};

async function updateOrderStatus(rowNum, newStatus) {
  showSpinner(true);
  try {
    // Token as param for CORS
    const res = await fetch(API_BASE_URL + "?token=" + currentUserToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowNum, newStatus })
    });
    const result = await res.json();
    if (result.success) {
      alert(`স্ট্যাটাস "${newStatus}" এ সফলভাবে পরিবর্তিত হয়েছে!`);
      fetchOrders();
    } else {
      alert("স্ট্যাটাস পরিবর্তন হয়নি!");
    }
  } catch (err) {
    alert("স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে!");
  } finally {
    showSpinner(false);
  }
}

function showSpinner(show) {
  loadingSpinner.style.display = show ? "block" : "none";
}

window.addEventListener("DOMContentLoaded", function() {
  if (sessionStorage.getItem("loggedIn") === "true") {
    currentUserToken = sessionStorage.getItem("authToken");
    loginSection.style.display = "none";
    adminPanel.style.display = "block";
    fetchOrders();
  }
});