import { createSlice, createAsyncThunk} from "@reduxjs/toolkit";
import axios from "axios";

interface Video {
  _id: string;
  title: string;
  description: string;
  thumbnail: {
    url: string;
    type: string;
    public_id: string;
  };
  views: number;
  comments: {
    _id: string;
    user: {
      userName: string;
      avatar: string;
    };
    content: string;
    createdAt: string;
  }[];
  createdAt: string;
  ownerDetails: {
    _id: string;
    userName: string;
    avatar: string;
  };
}

interface VideosState {
  videos: Video[];
  count: number;
  loading: boolean;
  error: string | null;
}

const initialState: VideosState = {
  videos: [],
  count: 0,
  loading: false,
  error: null,
};

// Fetch all videos with pagination
export const fetchAllVideos = createAsyncThunk<
  { videos: Video[]; count: number },
  { page?: number; limit?: number },
  { rejectValue: string }
>("videos/fetchAll", async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
  try {
    const response = await axios.get(`/Api/v1/video?page=${page}&limit=${limit}`);
    return {
      videos: response.data.data.videos,
      count: response.data.data.count,
    };
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch videos");
  }
});

// Fetch videos of a specific user with pagination
export const fetchUserVideos = createAsyncThunk<
  { videos: Video[]; count: number },
  { userId: string; page?: number; limit?: number },
  { rejectValue: string }
>(
  "videos/fetchUser",
  async ({ userId, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `/Api/v1/video/user/${userId}?page=${page}&limit=${limit}`
      );
      return {
        videos: response.data.data.videos,
        count: response.data.data.count,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch user videos");
    }
  }
);

const videosSlice = createSlice({
  name: "videos",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllVideos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllVideos.fulfilled, (state, action) => {
        state.loading = false;
        state.videos = action.payload.videos;
        state.count = action.payload.count;
      })
      .addCase(fetchAllVideos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch videos";
      })
      .addCase(fetchUserVideos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserVideos.fulfilled, (state, action) => {
        state.loading = false;
        state.videos = action.payload.videos;
        state.count = action.payload.count;
      })
      .addCase(fetchUserVideos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch user videos";
      });
  },
});

export default videosSlice.reducer;
