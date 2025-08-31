import Layout from "../../Components/Layout/Layout";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";

const Home = () => {
  return (
    <>
      <Layout />
      <Box>
        <Outlet />
      </Box>
    </>
  );
};

export default Home;
