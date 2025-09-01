import React from "react";
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Stack
} from "@mui/material";

interface VideoCardProps {
  thumbnail?: string;
  title?: string;
  description?: string;
  views?: number;
  likes?: number;
  dislikes?: number;
  duration?: string;
  onClick?: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({
  thumbnail = "",
  title = "Untitled Video",
  description = "No description available.",
  views = 0,
  likes = 0,
  dislikes = 0,
  duration = "00:00",
  onClick
}) => {
  return (
    <Card sx={{ width: 300, borderRadius: 2, boxShadow: 3 }}>
      <CardActionArea onClick={onClick}>
        <Box sx={{ position: "relative" }}>
          <CardMedia
            component="img"
            height="170"
            image={thumbnail}
            alt={title}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              bgcolor: "rgba(0, 0, 0, 0.7)",
              color: "#fff",
              px: 0.8,
              py: 0.2,
              borderRadius: 0.5,
              fontSize: "0.75rem"
            }}
          >
            {duration}
          </Box>
        </Box>
        <CardContent>
          <Typography
            gutterBottom
            variant="subtitle1"
            component="div"
            sx={{ fontWeight: 600 }}
            noWrap
          >
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ height: 40, overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {description}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 0.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              {views.toLocaleString()} views
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • {likes} 👍
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • {dislikes} 👎
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default VideoCard;
