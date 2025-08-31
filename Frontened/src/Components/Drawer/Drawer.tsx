import { useState } from "react";
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles"; // <-- Only this
import { Link } from "react-router-dom";

export interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path?: string; // Optional for navigation
}

interface AppDrawerProps {
  menuItems: MenuItem[];
  secondaryItems?: MenuItem[];
  drawerWidth?: number;
  title?: string;
  onItemClick?: (path?: string) => void;
}

export const AppDrawer = ({
  menuItems,
  secondaryItems = [],
  drawerWidth = 260,
  title = "Vtube",
  onItemClick,
}: AppDrawerProps) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme(); // You missed this earlier
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const handleItemClick = (path?: string) => {
    if (onItemClick) onItemClick(path);
    if (!isDesktop) setOpen(false); // close drawer on mobile
  };

  const DrawerContent = (
    <Box sx={{ width: drawerWidth }} role="presentation">
      <Typography
  variant="h6"
  sx={{
    p: 2,
    fontWeight: "bold",
    textAlign: "center",
    borderBottom: "1px solid #e0e0e0",
  }}
>
  <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
    {title}
  </Link>
</Typography>
      <Divider />

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton onClick={() => handleItemClick(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {secondaryItems.length > 0 && (
        <>
          <Divider />
          <List>
            {secondaryItems.map((item) => (
              <ListItem key={item.label} disablePadding>
                <ListItemButton onClick={() => handleItemClick(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );

  return (
    <>
      {!isDesktop && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{ position: "fixed", top: 16, left: 16, zIndex: 1300 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop || open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        {DrawerContent}
      </Drawer>
    </>
  );
};
