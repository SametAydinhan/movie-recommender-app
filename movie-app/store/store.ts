import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/store/features/authSlice";
import moviesReducer from "@/store/features/moviesSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    movies: moviesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
