// localStorage kullanılabilirliğini kontrol et
const isLocalStorageAvailable = () => {
  if (typeof window === "undefined") return false;

  try {
    const testKey = "test-localstorage";
    window.localStorage.setItem(testKey, "test");
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

export const setAuthToken = (token: string) => {
  if (!isLocalStorageAvailable()) return false;

  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1); // 1 gün ekle

    const tokenData = {
      token,
      expiry: expiryDate.getTime(),
    };

    localStorage.setItem("authToken", JSON.stringify(tokenData));
    return true;
  } catch (error) {
    console.error("Token kaydedilirken hata:", error);
    return false;
  }
};

export const getAuthToken = () => {
  if (!isLocalStorageAvailable()) return null;

  try {
    const tokenData = localStorage.getItem("authToken");
    if (!tokenData) return null;

    const { token, expiry } = JSON.parse(tokenData);

    if (new Date().getTime() > expiry) {
      localStorage.removeItem("authToken");
      return null;
    }

    return token;
  } catch (error) {
    console.error("Token alınırken hata:", error);
    return null;
  }
};

export const removeAuthToken = () => {
  if (!isLocalStorageAvailable()) return false;

  try {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userName");
    return true;
  } catch (error) {
    console.error("Token silinirken hata:", error);
    return false;
  }
};

export const setUserNameInStorage = (userName: string) => {
  if (!isLocalStorageAvailable()) return false;

  try {
    localStorage.setItem("userName", userName);
    return true;
  } catch (error) {
    console.error("Kullanıcı adı kaydedilirken hata:", error);
    return false;
  }
};

export const getUserNameFromStorage = () => {
  if (!isLocalStorageAvailable()) return null;

  try {
    return localStorage.getItem("userName");
  } catch (error) {
    console.error("Kullanıcı adı alınırken hata:", error);
    return null;
  }
};
