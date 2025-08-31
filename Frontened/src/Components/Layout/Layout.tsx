import HistoryIcon from "@mui/icons-material/History";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HomeIcon from "@mui/icons-material/Home";
import SubscriptionsIcon from "@mui/icons-material/Subscriptions";
import InboxIcon from "@mui/icons-material/Inbox";
import { AppDrawer } from "../Drawer"; // adjust path as needed
import type { MenuItem } from "../Drawer";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Outlet } from "react-router-dom";

const drawerWidth = 260;

const mainMenu: MenuItem[] = [
  { label: "Home", icon: <HomeIcon />, path: "/" },
  { label: "Subscriptions", icon: <SubscriptionsIcon />, path: "/subscriptions" },
  { label: "Watch History", icon: <HistoryIcon />, path: "/watch-history" },
  { label: "Profile", icon: <AccountCircleIcon />, path: "/profile" },
];

const secondaryMenu: MenuItem[] = [
  { label: "Settings", icon: <InboxIcon />, path: "/settings" },
];

export default function Layout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <div style={{ display: "flex" }}>
      <AppDrawer
        menuItems={mainMenu}
        secondaryItems={secondaryMenu}
        drawerWidth={drawerWidth}
        onItemClick={(path) => {
          console.log("Navigate to:", path);
        }}
      />
      <main
        style={{
          flex: 1,
          padding: "16px",
          marginLeft: isDesktop ? `${drawerWidth}px` : 0,
          marginTop:"16px", // shift content when drawer is permanent
          transition: "margin-left 0.3s ease",
        }}
      >
      <Outlet/>
      </main>
    </div>
  );
}
