export const setAuthToken = (token: string) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 1); // 1 gün ekle

  const tokenData = {
    token,
    expiry: expiryDate.getTime(),
  };

  localStorage.setItem("authToken", JSON.stringify(tokenData));
};

export const getAuthToken = () => {
  const tokenData = localStorage.getItem("authToken");
  if (!tokenData) return null;

  const { token, expiry } = JSON.parse(tokenData);

  if (new Date().getTime() > expiry) {
    localStorage.removeItem("authToken");
    return null;
  }

  return token;
};

export const removeAuthToken = () => {
  localStorage.removeItem("authToken");
};
