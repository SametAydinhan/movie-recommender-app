import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getAuthToken } from "@/utils/auth";

interface AuthState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  userName: string | null;
}

// SSR sırasında localStorage erişimi olmadığından başlangıçta false değerini kullan
// Client tarafında kullanıcı kontrolü ayrıca yapılacak
const initialState: AuthState = {
  isAuthenticated: false,
  isInitialized: false,
  userName: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.userName = null;
    },
    checkAuth: (state) => {
      if (typeof window !== "undefined") {
        state.isAuthenticated = !!getAuthToken();
      } else {
        state.isAuthenticated = false;
      }
      state.isInitialized = true;
    },
    checkUserAuth: (state) => {
      if (typeof window !== "undefined") {
        state.isAuthenticated = !!getAuthToken();
      } else {
        state.isAuthenticated = false;
      }
      state.isInitialized = true;
    },
    setUserName: (state, action: PayloadAction<string>) => {
      state.userName = action.payload;
    },
  },
});

export const { setAuth, logout, checkAuth, checkUserAuth, setUserName } =
  authSlice.actions;
export default authSlice.reducer;
