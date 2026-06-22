/**
 * YEC Gilam API Service
 * 
 * All API calls to the backend. Handles authentication headers,
 * error responses, and token expiry.
 */

const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD
      ? 'https://yec-backend-saller-xs8r.vercel.app/api'
      : 'http://localhost:5000/api');

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function handleAuthError() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

async function handleResponse(response) {
  if (response.status === 403) {
    handleAuthError();
    throw new Error('Yaroqsiz token. Iltimos, qaytadan kiring.');
  }

  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Email yoki parol noto\'g\'ri.');
  }

  // Handle CORS errors (no Access-Control-Allow-Origin)
  if (response.type === 'opaqueredirect' || response.type === 'opaque') {
    throw new Error('CORS xatosi: Serverga ulanishda muammo yuz berdi.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Tizim xatoligi yuz berdi.');
  }

  const json = await response.json();
  if (json && json.success !== undefined) {
    if (!json.success) {
      throw new Error(json.message || 'Xatolik yuz berdi.');
    }
    return json.data !== undefined ? json.data : json;
  }
  return json;
}

// ── Authentication ──

export async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Serverga ulanishda xatolik. Server ishlayotganligini tekshiring.');
    }
    throw err;
  }
}

export async function logoutUser() {
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (err) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Serverga ulanishda xatolik.');
    }
    throw err;
  }
}

// ── Products ──

export async function getProducts() {
  const response = await fetch(`${API_URL}/products`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createProduct(data) {
  const response = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateProduct(id, data) {
  const response = await fetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteProduct(id) {
  const response = await fetch(`${API_URL}/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// ── Branches ──

export async function getBranches() {
  const response = await fetch(`${API_URL}/branches`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createBranch(data) {
  const response = await fetch(`${API_URL}/branches`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateBranch(id, data) {
  const response = await fetch(`${API_URL}/branches/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteBranch(id) {
  const response = await fetch(`${API_URL}/branches/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// ── Orders ──

export async function getOrders(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_URL}/orders?${params}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function getOrderById(id) {
  const response = await fetch(`${API_URL}/orders/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createOrder(data) {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateOrder(id, data) {
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteOrder(id) {
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// ── Users ──

export async function getUsers() {
  const response = await fetch(`${API_URL}/users`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function createUser(data) {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function updateUser(id, data) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function deleteUser(id) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// ── Statistics ──

export async function getStatistics() {
  const response = await fetch(`${API_URL}/stats/dashboard`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}