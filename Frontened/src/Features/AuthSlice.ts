import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

interface Avatar {
  url: string;
  public_id: string;
}

interface UserData {
  _id: string;
  userName: string;
  fullName: string;
  email: string;
  bio: string;
  isVerified: boolean;
  watchHistory: any[];
  createdAt: string;
  updatedAt: string;
  avatar?: Avatar;
  coverImage?: Avatar;
}

interface UserState {
  user: UserData | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  loading: false,
  error: null,
};

// 1) Fetch Current User
export const fetchCurrentUser = createAsyncThunk<
  UserData, // return type
  void, // argument type
  { rejectValue: string }
>("user/fetchCurrentUser", async (_, { rejectWithValue, dispatch }) => {
  try {
    const response = await axios.get("/vTube/api/v1/users", {
      withCredentials: true,
    });
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      try {
        await dispatch(refreshAccessToken()).unwrap();
        const retryResponse = await axios.get("/vTube/api/v1/users", {
          withCredentials: true,
        });
        return retryResponse.data.data;
      } catch {
        return rejectWithValue("Unauthorized");
      }
    }
    return rejectWithValue(error.response?.data?.message || "Failed to fetch user");
  }
});

// 2) Refresh Token
export const refreshAccessToken = createAsyncThunk<void, void, { rejectValue: string }>(
  "user/refreshAccessToken",
  async (_, { rejectWithValue }) => {
    try {
      await axios.get("/vTube/api/v1/token/refresh", { withCredentials: true });
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Refresh failed");
    }
  }
);


// 3) Logout User
export const logoutUser = createAsyncThunk<void, void, { rejectValue: string }>(
  "user/logout",
  async (_, { rejectWithValue }) => {
    try {
      await axios.get("/vTube/api/v1/user/logout", { withCredentials: true });
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Logout failed");
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Current User
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<UserData>) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch user";
      })
      // Refresh Token
      .addCase(refreshAccessToken.rejected, (state) => {
        state.user = null; // force logout if refresh fails
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.user = null; // still log out locally
        state.error = action.payload || "Logout failed";
      });
  },
});

export default userSlice.reducer;
