import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../app/Store";
import { fetchAllVideos } from "../../Features/UserVideoSlice";
import { VideoCard } from "../Card";

export const VideoList = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { videos, loading, error } = useSelector(
    (state: RootState) => state.videos
  );

  useEffect(() => {
    dispatch(fetchAllVideos({ page: 1, limit: 10 }));
  }, [dispatch]);

  if (loading) return <p>Loading videos...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <>
      {videos.map((video) => (
        <VideoCard
          key={video._id}
          thumbnail={video.thumbnail?.url || ""}
          title={video.title}
          description={video.description}
          views={video.views}
          likes={video.likes}
          dislikes={video.dislikes}
          duration={video.duration}
          onClick={() => console.log(`Clicked on ${video._id}`)}
        />
      ))}
    </>
  );
};
