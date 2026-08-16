import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/MainLayout";
import { ShareListsView } from "./components/ShareListsView";
import { PlaylistView } from "./components/PlaylistView";
import { UserManagement } from "./components/UserManagement";
import { CreateShareList } from "./components/CreateShareList";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: ShareListsView },
      { path: "list/:id", Component: PlaylistView },
      { path: "create", Component: CreateShareList },
      { path: "admin", Component: UserManagement },
    ],
  },
]);