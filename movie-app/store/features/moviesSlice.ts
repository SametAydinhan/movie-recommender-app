import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchUserInfo, fetchWatchedMovies } from "@/lib/utils/api";
import { Movie } from "@/lib/types";

// State tipi
interface MoviesState {
  watchedMovies: number[];
  watchlistMovies: number[];
  recommendedMovies: Movie[];
  cachedRecommendations: Movie[]; // Önbelleğe alınmış öneriler
  recommendationsLoading: boolean;
  recommendationsError: string | null;
  lastRecommendationUpdate: number | null;
  shouldRefreshRecommendations: boolean; // Önerilerin yenilenmesi gerekip gerekmediğini takip eder
  isLoading: boolean;
  error: string | null;
}

// Başlangıç durumu
const initialState: MoviesState = {
  watchedMovies: [],
  watchlistMovies: [],
  recommendedMovies: [],
  cachedRecommendations: [], // Önbelleğe alınmış öneriler
  recommendationsLoading: false,
  recommendationsError: null,
  lastRecommendationUpdate: null,
  shouldRefreshRecommendations: false, // Başlangıçta yenileme gerekmiyor
  isLoading: false,
  error: null,
};

// İzlenen filmleri çeken async thunk
export const fetchWatchedMoviesAsync = createAsyncThunk(
  "movies/fetchWatchedMovies",
  async (_, { rejectWithValue }) => {
    try {
      // Kullanıcı bilgilerini getir
      const userInfo = await fetchUserInfo();

      if ("error" in userInfo) {
        return rejectWithValue(userInfo.error);
      }

      // İzlenen filmleri getir
      const watchedResponse = await fetchWatchedMovies(userInfo.userId, 1, 100);

      if (watchedResponse.error) {
        return rejectWithValue(watchedResponse.error);
      }

      // Film ID'lerini döndür
      const watchedIds = watchedResponse.movies.map((movie: Movie) => movie.id);
      return watchedIds;
    } catch (error: any) {
      return rejectWithValue(error.message || "İzlenen filmler alınamadı");
    }
  }
);

// Movies slice
const moviesSlice = createSlice({
  name: "movies",
  initialState,
  reducers: {
    // İzlenen film ekle
    addToWatched: (state, action: PayloadAction<number>) => {
      if (!state.watchedMovies.includes(action.payload)) {
        state.watchedMovies.push(action.payload);
        // İzlenen film eklendiğinde öneri yenileme bayrağını aktif et
        state.shouldRefreshRecommendations = true;

        // LocalStorage'a kaydet
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "watchedMovies",
            JSON.stringify(state.watchedMovies)
          );
        }
      }
    },
    // İzlenen filmden çıkar
    removeFromWatched: (state, action: PayloadAction<number>) => {
      state.watchedMovies = state.watchedMovies.filter(
        (id) => id !== action.payload
      );
      // İzlenen film kaldırıldığında öneri yenileme bayrağını aktif et
      state.shouldRefreshRecommendations = true;

      // LocalStorage'a kaydet
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "watchedMovies",
          JSON.stringify(state.watchedMovies)
        );
      }
    },
    // İzlenen filmleri toplu güncelle
    setWatchedMovies: (state, action: PayloadAction<number[]>) => {
      state.watchedMovies = action.payload;
      // İzlenen filmler değiştiğinde öneri yenileme bayrağını aktif et
      state.shouldRefreshRecommendations = true;

      // LocalStorage'a kaydet
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "watchedMovies",
          JSON.stringify(state.watchedMovies)
        );
      }
    },
    // İzleme listesine ekle
    addToWatchlist: (state, action: PayloadAction<number>) => {
      if (!state.watchlistMovies.includes(action.payload)) {
        state.watchlistMovies.push(action.payload);
      }
    },
    // İzleme listesinden çıkar
    removeFromWatchlist: (state, action: PayloadAction<number>) => {
      state.watchlistMovies = state.watchlistMovies.filter(
        (id) => id !== action.payload
      );
    },
    // İzleme listesini toplu güncelle
    setWatchlistMovies: (state, action: PayloadAction<number[]>) => {
      state.watchlistMovies = action.payload;
    },
    // LocalStorage'dan filmleri yükle
    loadFromLocalStorage: (state) => {
      if (typeof window !== "undefined") {
        try {
          const savedWatchedMovies = localStorage.getItem("watchedMovies");
          if (savedWatchedMovies) {
            state.watchedMovies = JSON.parse(savedWatchedMovies);
          }

          const savedWatchlistMovies = localStorage.getItem("watchlistMovies");
          if (savedWatchlistMovies) {
            state.watchlistMovies = JSON.parse(savedWatchlistMovies);
          }

          // Ayrıca önbelleğe alınmış önerileri de yükle
          const cachedRecommendations = localStorage.getItem(
            "cachedRecommendations"
          );
          if (cachedRecommendations) {
            try {
              const parsed = JSON.parse(cachedRecommendations);
              state.cachedRecommendations = parsed.recommendations || [];
              state.lastRecommendationUpdate = parsed.timestamp || null;

              // Aynı zamanda görüntülenen önerileri de güncelle
              // Böylece sayfa yenilendiğinde veya sayfalar arası geçişte
              // önbellekten anında veriler görüntülenebilir
              state.recommendedMovies = parsed.recommendations || [];

              // İzlenen film sayısı değişmediyse öneri yenilemeye gerek yok
              state.shouldRefreshRecommendations = false;
            } catch (e) {
              console.error("Önbellek yüklenirken hata:", e);
            }
          }
        } catch (error) {
          console.error(
            "LocalStorage'dan veriler yüklenirken hata oluştu:",
            error
          );
        }
      }
    },
    setRecommendedMovies: (state, action: PayloadAction<Movie[]>) => {
      state.recommendedMovies = action.payload;
      // Aynı zamanda önbelleğe de kaydet
      state.cachedRecommendations = action.payload;
      state.lastRecommendationUpdate = Date.now();
      state.shouldRefreshRecommendations = false; // Öneriler güncellendi, yenilemeye gerek yok

      // Önbelleği localStorage'a kaydet
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            "cachedRecommendations",
            JSON.stringify({
              recommendations: action.payload,
              timestamp: Date.now(),
            })
          );
        } catch (e) {
          console.error("Önbellek kaydedilirken hata:", e);
        }
      }
    },
    setRecommendationsLoading: (state, action: PayloadAction<boolean>) => {
      state.recommendationsLoading = action.payload;
    },
    setRecommendationsError: (state, action: PayloadAction<string | null>) => {
      state.recommendationsError = action.payload;
    },
    setShouldRefreshRecommendations: (
      state,
      action: PayloadAction<boolean>
    ) => {
      state.shouldRefreshRecommendations = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWatchedMoviesAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWatchedMoviesAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.watchedMovies = action.payload;

        // İzlenen filmler değiştiğinde önerilerin yenilenmesi gerekir
        state.shouldRefreshRecommendations = true;

        // LocalStorage'a kaydet
        if (typeof window !== "undefined") {
          localStorage.setItem("watchedMovies", JSON.stringify(action.payload));
        }
      })
      .addCase(fetchWatchedMoviesAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  addToWatched,
  removeFromWatched,
  setWatchedMovies,
  addToWatchlist,
  removeFromWatchlist,
  setWatchlistMovies,
  loadFromLocalStorage,
  setRecommendedMovies,
  setRecommendationsLoading,
  setRecommendationsError,
  setShouldRefreshRecommendations,
} = moviesSlice.actions;

export default moviesSlice.reducer;
