const API_BASE_URL = "http://localhost:5000";

// =====================================================
// AUTH
// =====================================================

// LOGIN
export const loginUser = async (loginData) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  // Save JWT token
  if (data.token) {
    localStorage.setItem("token", data.token);
  }

  // Save user information if backend sends it
  if (data.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
};


// LOGOUT
export const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};


// GET LOGGED-IN USER
export const getCurrentUser = () => {
  const user = localStorage.getItem("user");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch (error) {
    return null;
  }
};


// GET TOKEN
export const getToken = () => {
  return localStorage.getItem("token");
};


// =====================================================
// HELPER - AUTH HEADERS
// =====================================================

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token && {
      Authorization: `Bearer ${token}`,
    }),
  };
};


// =====================================================
// TESTS
// =====================================================

// GET TESTS
export const getTests = async () => {
  const response = await fetch(`${API_BASE_URL}/api/tests`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch tests");
  }

  return data;
};


// ADD TEST
export const addTest = async (testData) => {
  const response = await fetch(`${API_BASE_URL}/api/tests`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(testData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to add test");
  }

  return data;
};


// UPDATE TEST
export const updateTest = async (id, testData) => {
  const response = await fetch(`${API_BASE_URL}/api/tests/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(testData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update test");
  }

  return data;
};


// DELETE TEST
export const deleteTest = async (id) => {
  const response = await fetch(`${API_BASE_URL}/api/tests/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete test");
  }

  return data;
};