import { configureStore } from '@reduxjs/toolkit';
import videosReducer from '../Features/UserVideoSlice';
import authReducer from "../Features/AuthSlice"

export const store = configureStore({
  reducer: {
    videos: videosReducer,
    user:authReducer,
  },
});

// Types for dispatch and state
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;