import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getAuthToken } from "@/utils/auth";

interface AuthState {
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  isAuthenticated: typeof window !== "undefined" ? !!getAuthToken() : false,
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
    },
    checkAuth: (state) => {
      state.isAuthenticated = !!getAuthToken();
    },
  },
});

export const { setAuth, logout, checkAuth } = authSlice.actions;
export default authSlice.reducer;
